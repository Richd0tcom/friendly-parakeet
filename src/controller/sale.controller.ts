import { Request, Response, NextFunction } from "express";
import { conn, Order, Sale, IOrder } from "../db/mongo/mongo";
import mongoose, { Document } from "mongoose";
import { redisClient } from "../app";

export async function fetchSale(req: Request, res: Response): Promise<any> {
	const { sale_id } = req.body;
	//fetch from cache

	const sale = await getFlashSaleStatus(sale_id)

	//cache miss?  fetch from db

	
	if (!sale) return res.status(404).json({ msg: "Product not found" });

	return res.status(200).json({msg: 'success', data: sale});
}

export async function buyStock(req: Request, res: Response): Promise<any> {
	const { sale_id, quantity, user_id } = req.body;

	const sale = await Sale.findById(sale_id); //TODO: change to fetch first from cache

	if (!sale) return res.status(404).json({ msg: "Product not found" });

	//check for timing restrictions
	if (new Date() < sale.start_time) {
		throw new Error("Flash sale has not started yet");
	}

	//Use Redis WATCH for optimistic locking
	const inventoryKey = `flashsale:${sale_id}:inventory`;

	// Start a Redis transaction to handle concurrency
	const result = await redisClient.multi().get(inventoryKey).exec();

	if (!result || !result[0] || result[0][0]) {
		throw new Error("Failed to read inventory");
	}

	const currentInventory = parseInt(result[0][1] as string, 10);

	// Check if enough inventory
	if (currentInventory < quantity) {
		return res.status(403).json({ msg: "Not enough units available" });
	}

	// Use Lua script for atomic decrement and check
	const decrementScript = `
          local current = tonumber(redis.call('get', KEYS[1]))
          local decrement = tonumber(ARGV[1])
          if current >= decrement then
            redis.call('decrby', KEYS[1], decrement)
            return 1
          else
            return 0
          end
        `;

	const decrementResult = await redisClient.eval(
		decrementScript,
		1,
		inventoryKey,
		quantity.toString()
	);

	if (decrementResult !== 1) {
		throw new Error("Failed to reserve inventory");
	}

	//begin txn

	const session = await (await conn).startSession();

	session.startTransaction();
	let order;
	let failed = false;
	try {
		order = await Order.create({
			product_id: sale.product_id,
			user_id,
			quantity,
			amount_paid: sale.price_per_unit * quantity,
		});


		await Sale.findByIdAndUpdate(sale_id, {
			$inc: { remaining_units: -Number(quantity) },
		}, { session });


		// Complete the purchase
		order.status = 'completed';
		await order.save({ session });

		session.commitTransaction();

		// const status = await getFlashSaleStatus(sale_id)

		// Broadcast inventory update

		// io.emit('inventoryUpdate', {
		// 	sale,
		// 	currentInventory: status.currentInventory
		// });
	} catch (error) {
		failed = true;
		// If MongoDB transaction fails, rollback Redis changes
		await redisClient.incrby(inventoryKey, quantity);
		session.abortTransaction();
	}

	session.endSession();

	if (!failed) {
		return res.status(500).json({ msg: "could not buy stock" });
	}

	return res.status(200).json({ msg: "success", data: order });
}

export async function startSale(req: Request, res: Response): Promise<any> {
	const { product_id, allocated_units, start_time, end_time } = req.body;

	const flashSale = await Sale.create({
		product_id,
		allocated_units,
		start_time,
		remaining_units: allocated_units,
	});

	await initFlashSaleCache(flashSale._id.toString(), flashSale.remaining_units);

	// io.emit('flashSaleStarted', {
    //     id: flashSale._id,
    //     currentInventory: flashSale.remaining_units,
    //     status: flashSale.status
    // });
}

async function initFlashSaleCache(
	flashSaleId: string,
	inventory: number
): Promise<void> {
	await redisClient.set(`flashsale:${flashSaleId}:inventory`, inventory);
	await redisClient.set(`flashsale:${flashSaleId}:status`, "active");
}


async function getFlashSaleStatus(flashSaleId: string): Promise<any> {
    // First check cache
    const [inventoryStr, statusStr] = await Promise.all([
      redisClient.get(`flashsale:${flashSaleId}:inventory`),
      redisClient.get(`flashsale:${flashSaleId}:status`)
    ]);
    
    // If not in cache, fetch from DB
    if (!inventoryStr || !statusStr) {
      const flashSale = await Sale.findById(flashSaleId);
      if (!flashSale) {
        throw new Error('Flash sale not found');
      }
      
      return {
        id: flashSale._id,
        currentInventory: flashSale.remaining_units,
        totalInventory: flashSale.allocated_units,
        status: flashSale.status,
        startTime: flashSale.start_time,
        endTime: flashSale.end_time
      };
    }
    
    // Return cache data
    return {
      id: flashSaleId,
      currentInventory: parseInt(inventoryStr, 10),
      status: statusStr
    };
}


