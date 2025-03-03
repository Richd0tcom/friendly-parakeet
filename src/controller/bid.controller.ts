import { Request, Response, NextFunction } from 'express'
import { conn, Order, Sale, IOrder } from '../db/mongo/mongo'
import mongoose, { Document } from 'mongoose'
import { redisClient } from '../app'


export async function fetchSale(req: Request, res: Response) {
    const { product_id } = req.body
    //fetch from cache

    //cache miss?  fetch from db

    const sale = await Sale.findById(product_id)
    if(!sale ) return res.status(404).json({ msg: 'Product not found'})
}

export async function buyStock(req: Request, res: Response) {
    const { sale_id, quantity, user_id } = req.body
    //prevent underselling
    const sale = await Sale.findById(sale_id) //TODO: change to fetch first from cache

    if(!sale ) return res.status(404).json({ msg: 'Product not found'});
    if(sale.remaining_units < quantity) return res.status(403).json({ msg: 'Not enough units available'});

    //check for timing restrictions

    //prevent overselling

    //begin txn

    const session = await (await conn).startSession()

    session.startTransaction()
    let order;
    let failed = false
    try {
        await Sale.findByIdAndUpdate(sale_id, {
            $inc: { remaining_units: -Number(quantity)}
        })
        order = await Order.create({
            product_id: sale.product_id,
            user_id,
            quantity,
            amount_paid: sale.price_per_unit * quantity,
        })

        session.commitTransaction()
        

    } catch (error) {
        failed = true
        session.abortTransaction()
    }

    session.endSession()

    if (!failed) {
        return res.status(500).json({msg: 'could not buy stock'})
    }

    return res.status(200).json({msg: 'success', data: order})

}

export async function startSale(req: Request, res: Response) {
    const { product_id, allocated_units, start_time, end_time } = req.body
    
    const flashSale = await Sale.create({
        product_id,
        allocated_units,
        start_time,
        remaining_units: allocated_units
    })



    await initFlashSaleCache(flashSale._id.toString(), flashSale.remaining_units,);
}

async function initFlashSaleCache(flashSaleId: string, inventory: number): Promise<void> {
    await redisClient.set(`flashsale:${flashSaleId}:inventory`, inventory);
    await redisClient.set(`flashsale:${flashSaleId}:status`, 'active');
}
