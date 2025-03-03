import { Request, Response, NextFunction } from "express";
import { conn, Order, Sale, IOrder, Inventory } from "../db/mongo/mongo";
import mongoose, { Document } from "mongoose";
import { redisClient } from "../app";
import { io } from "../utils/realtime";
import { connection } from "mongoose";

export async function fetchSale(req: Request, res: Response): Promise<any> {
  const sale_id = req.params.id;
  //fetch from cache

  const sale = await getFlashSaleStatus(sale_id);

  //cache miss?  fetch from db

  if (!sale) return res.status(404).json({ msg: "Product not found" });

  return res.status(200).json({ msg: "success", data: sale });
}

export async function buyStock(req: Request, res: Response): Promise<any> {
  const { sale_id, quantity, user_id } = req.body; //TODO: change to fetch user_id from token

  const sale = await Sale.findById(sale_id);

  if (!sale) return res.status(404).json({ msg: "Product not found" });

  //check for timing restrictions
  if (new Date() < sale.start_time) {
    throw new Error("Flash sale has not started yet");
  }

  //Use Redis WATCH for optimistic locking
  const inventoryKey = `flashsale:${sale_id}:inventory`;
  await redisClient.watch(inventoryKey);

  const currentInventoryStr = await redisClient.get(inventoryKey);
  if (!currentInventoryStr) {
    throw new Error("Failed to read inventory");
  }

  const currentInventory = parseInt(currentInventoryStr, 10);
  console.log("Current Inventory:", currentInventory);

  // **Step 2: Check Inventory Before Proceeding**
  if (currentInventory < quantity) {
    await redisClient.unwatch(); // Release watch if condition fails
    return res.status(403).json({ msg: "Not enough units available" });
  }

  const transaction = redisClient.multi();
  transaction.decrby(inventoryKey, quantity);
  const results = await transaction.exec();

  console.log(results)

  if (!results) {
    throw new Error("Inventory update failed due to concurrent modification");
  }

  console.log("Inventory decremented successfully.");

  //begin txn
 
  const session = await connection.startSession();

  session.startTransaction();
  let order;
  let failed = false;
  try {
	console.log('ruuuuu')
    order = new Order({
      product_id: sale.product_id,
      user_id,
      quantity,
      amount_paid: sale.price_per_unit * quantity,
    }, { session });
	console.log('ruuuuu')
    const f = await Sale.findOneAndUpdate(
      { _id: sale_id, remaining_units: { $gte: Number(quantity) } }, // Prevents decrement if not enough stock
      { $inc: { remaining_units: -Number(quantity) } },
      { session }
    );

	console.log('ffff', f)

    // Complete the purchase
    order.status = "completed";
    await order.save({ session });
    await session.commitTransaction();

    // const status = await getFlashSaleStatus(sale_id)

    // Broadcast inventory update

    io.emit("inventoryUpdate", {
      sale,
      currentInventory: sale.remaining_units,
    });
  } catch (error) {
    failed = true;
    // If MongoDB transaction fails, rollback Redis changes
    await redisClient.incrby(inventoryKey, quantity);
    await session.abortTransaction();
	throw error
  }

  await session.endSession();

  if (failed) {
    return res.status(500).json({ msg: "could not buy stock" });
  }

  return res.status(200).json({ msg: "success", data: order });
}

export async function createSale(req: Request, res: Response): Promise<any> {
  const { product_id, allocated_units, start_time, end_time, price_per_unit } =
    req.body;

  const inv = await Inventory.findOne({ product_id });

  if (!inv) return res.status(404).json({ msg: "product not found" });

  if (inv.quantity < allocated_units)
    return res.status(403).json({ msg: "not enough stock in inventory" });

  const flashSale = await Sale.create({
    product_id,
    allocated_units,
    start_time,
    remaining_units: allocated_units,
    end_time,
    price_per_unit,
  });

  inv.$inc("quantity", -allocated_units);
  inv.save();

  return res.status(200).json({ msg: "success", data: flashSale });
}

export async function startSale(req: Request, res: Response): Promise<any> {
  const { start_time, end_time } = req.body;
  const sale_id = req.params.id;

  const sale = await Sale.findByIdAndUpdate(sale_id, {
    start_time,
    end_time,
    status: "active",
  });

  if (!sale) return res.status(404).json({ msg: "sale not found" });

  await initFlashSaleCache(sale_id, sale?.remaining_units, "active");

  io.emit("flashSaleStarted", {
    id: sale_id,
    currentInventory: sale.remaining_units,
    status: sale.status,
  });

  return res.status(200).json({ msg: "success", data: sale });
}

async function initFlashSaleCache(
  flashSaleId: string,
  inventory: number,
  status = "scheduled"
): Promise<void> {
  await redisClient.set(`flashsale:${flashSaleId}:inventory`, inventory);
  await redisClient.set(`flashsale:${flashSaleId}:status`, status);
}

async function getFlashSaleStatus(flashSaleId: string): Promise<any> {
  // First check cache
  const [inventoryStr, statusStr] = await Promise.all([
    redisClient.get(`flashsale:${flashSaleId}:inventory`),
    redisClient.get(`flashsale:${flashSaleId}:status`),
  ]);

  // If not in cache, fetch from DB
  if (!inventoryStr || !statusStr) {
    const flashSale = await Sale.findById(flashSaleId);
    if (!flashSale) {
      throw new Error("Flash sale not found");
    }

    return {
      id: flashSale._id,
      currentInventory: flashSale.remaining_units,
      totalInventory: flashSale.allocated_units,
      status: flashSale.status,
      startTime: flashSale.start_time,
      endTime: flashSale.end_time,
    };
  }

  // Return cache data
  return {
    id: flashSaleId,
    currentInventory: parseInt(inventoryStr, 10),
    status: statusStr,
  };
}
