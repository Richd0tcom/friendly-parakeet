import { Request, Response, NextFunction } from "express";
import { Inventory, Product } from "../db/mongo/mongo";

export const createProduct = async(req: Request, res: Response): Promise<any> => {
    const { name, price, description } = req.body;

    const product = await Product.create({ name, price, description });

    return res.status(200).json({msg: 'success', data: product});
}

export const createInventory = async(req: Request, res: Response): Promise<any> => {
    const { product_id, quantity } = req.body;

    const p = Product.findById(product_id)
    if(!p) return res.status(404).json({msg: 'product not found'})

    const stock = await Inventory.create({
        product_id, quantity
    })

    return res.status(200).json({msg: 'success', data: stock});
}