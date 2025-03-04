import { Request, Response, NextFunction } from "express";
import { Order, Sale, IOrder, Inventory } from "../db/mongo/mongo";
import mongoose, { Document, Types } from "mongoose";
import { redisClient } from "../app";
import { io } from "../utils/realtime";
import { connection } from "mongoose";
import { SaleEndReason } from "../utils/enums";

export async function fetchSale(req: Request, res: Response): Promise<any> {
  const sale_id = req.params.id;
  //fetch from cache
  //cache miss?  fetch from db
  const sale = await getFlashSaleStatus(sale_id);

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

  const statusKey = `flashsale:${sale_id}:status`;
  if (!statusKey) {
    throw new Error("Failed to read inventory");
  }
  const stat = await redisClient.get(statusKey);
  if(stat != 'active') {
    return res.status(403).json({ success: false, msg: "out of stock!" });
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

 
  if (currentInventory < quantity) {
    await redisClient.unwatch(); // Release watch if condition fails
    return res.status(403).json({ msg: "Not enough units available" });
  }

  const transaction = redisClient.multi();
  transaction.decrby(inventoryKey, quantity);
  const results = await transaction.exec();

  console.log(results);

  if (!results) {
    throw new Error("Inventory update failed due to concurrent modification");
  }

  if (Number(results[0][1]) < 0) {
    await redisClient.incrby(inventoryKey, quantity);
    return res.status(403).json({success: false, msg: "Not enough units available" });
  }

  console.log("Inventory decremented successfully.");

  //begin txn

  const session = await connection.startSession();

  session.startTransaction();
  let order;
  let failed = false;
  try {
    order = await Order.create(
      [
        {
          _id: new Types.ObjectId(),
          product_id: sale.product_id,
          user_id,
          quantity,
          amount_paid: sale.price_per_unit * quantity,
          status: "completed",
        },
      ],
      { session }
    );

    // // Complete the purchase
    await session.commitTransaction();

    // Check if sale is over after this purchase
    const newInventory = await redisClient.get(inventoryKey);
    if (parseInt(newInventory as string, 10) <= 0) {
      await endFlashSale(sale_id, SaleEndReason.INVENTORY_OUT_OF_STOCK);
    }

    // Broadcast inventory update
    io.emit("inventoryUpdate", {
      sale,
      currentInventory: sale.remaining_units,
    });
  } catch (error) {
    
    failed = true;
    
    await redisClient.incrby(inventoryKey, quantity);
    await session.abortTransaction();
    throw error;
  }

  await session.endSession();

  if (failed) {
    return res.status(500).json({ success: false, msg: "could not buy stock" });
  }

  return res.status(200).json({ success: true, data: order[0] });
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

async function endFlashSale(flashSaleId: string, reason: SaleEndReason): Promise<any> {

  try {
    const flashSale = await Sale.findById(flashSaleId)
    if (!flashSale) {
      throw new Error("Flash sale not found");
    }

    flashSale.status = "ended";
    flashSale.end_time = new Date();

    if (reason == SaleEndReason.INVENTORY_OUT_OF_STOCK) {
      flashSale.remaining_units = 0
    }
    await flashSale.save();


    await redisClient.set(`flashsale:${flashSaleId}:status`, "ended");

    return flashSale;
  } catch (error) {
    // await session.abortTransaction();
    throw error;
  } finally {
    // session.endSession();
  }
}


export async function leaderboard(req: Request, res: Response): Promise<any> {

  const product_id = req.params.id

  const leaderboard = await Order.aggregate([
    {
      $match: { 
        product_id: new Types.ObjectId(product_id)
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user_id',
        foreignField: '_id',
        as: 'user',
      },
    },
    { $unwind: '$user' },
    { $sort: { createdAt: 1 } },
    {
      $group: {
        _id: null,
        purchases: { $push: '$$ROOT' },
      },
    },
    { $unwind: '$purchases' },
    {
      $project: {
        _id: 0,
        user: {
          username: '$purchases.user.name',
          email: '$purchases.user.email',
        },
        quantity: '$purchases.quantity',
        createdAt: '$purchases.createdAt',
      },
    },
    {
      $sort: { createdAt: 1 },
    },
    {
      $group: {
        _id: null,
        purchases: { $push: '$$ROOT' },
      },
    },
    {
      $unwind: {
        path: '$purchases',
        includeArrayIndex: 'rank',
      },
    },
    {
      $project: {
        _id: 0,
        rank: { $add: ['$rank', 1] },
        user: '$purchases.user',
        quantity: '$purchases.quantity',
        createdAt: '$purchases.createdAt',
      },
    },
  ]);

  return res.status(200).json({sucess: true, data: leaderboard});
}