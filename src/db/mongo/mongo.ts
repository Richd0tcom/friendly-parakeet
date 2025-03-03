import { connect, Schema, Model, model, Types, Document } from "mongoose";

export const conn = connect(process.env.NODE_ENV! == 'production' ? process.env.MONGO_URI_PROD! : 'mongodb://localhost:27017/flash-sale')


export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string
    email: string
    password: string
}
type MUser = Model<IUser>

const userSchema = new Schema<IUser, MUser>({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true, select: false },
},{
    timestamps: true,
  })

export const User = model("User", userSchema)

interface IProduct extends Document {
    _id: Types.ObjectId;
    name: string;
    desc: string;
    price: number;
}

type MProduct = Model<IProduct>

const productSchema = new Schema<IProduct, MProduct>({
    name: { type: String, required: true },
    desc: { type: String },
    price: { type: Number, required: true },
},{
    timestamps: true,
  })
export const Product = model("Product", productSchema)


export interface IInventory extends Document {
    _id: Types.ObjectId;
    product_id: Types.ObjectId;
    quantity: number;
}

type MInventory = Model<IInventory>

const inventorySchema = new Schema<IInventory, MInventory>({
    product_id: { type: Schema.Types.ObjectId, required: true, ref: 'Product' },
    quantity: { type: Number, required: true },
}, {
    timestamps: true,
  })

export const Inventory = model("Inventory", inventorySchema)

export interface IOrder extends Document {
    _id: Types.ObjectId;
    user_id: Types.ObjectId;
    product_id: Types.ObjectId;
    quantity: number;
    
    amount_paid: number;
    status: 'pending' | 'completed' | 'failed';
}

type MOrder = Model<IOrder>

const orderSchema = new Schema<IOrder, MOrder>({
    user_id: { type: Schema.Types.ObjectId, required: true,  ref: 'User'},
    product_id: { type: Schema.Types.ObjectId, required: true, ref: 'Product'},
    quantity: { type: Number, required: true },
    amount_paid: { type: Number, required: true },

    status: { 
        type: String, 
        enum: ['pending', 'completed', 'failed'], 
        default: 'pending',
        required: true 
    }
},{
    timestamps: true,
  })

export const Order = model("Order", orderSchema)


interface ISale extends Document {
    _id: Types.ObjectId;
    product_id: Types.ObjectId;
    start_time: Date | string;
    end_time?: Date | string;
    allocated_units: number;
    price_per_unit: number;

    remaining_units: number;
    status: 'scheduled' | 'active' | 'ended';
    purchase_limit: number;  // maximum number of purchases per sale per user. 0 for unlimited.
}

type MSale = Model<ISale>

const saleSchema = new Schema<ISale, MSale>({
    product_id: { type: Schema.Types.ObjectId, required: true, ref: 'Product'},
    start_time: { type: Date, required: true },
    end_time: { type: Date, required: false},
    allocated_units: { type: Number, required: true, default: 1},
    remaining_units: { type: Number, required: true },
    price_per_unit: { type: Number, required: true, default: 0},
    status: { 
        type: String, 
        enum: ['scheduled', 'active', 'ended'], 
        default: 'scheduled',
        required: true 
      },
    purchase_limit: { type: Number, default: 1 }
},{
    timestamps: true,
    optimisticConcurrency: true,
  })

export const Sale = model("Sale", saleSchema)