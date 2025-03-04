import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import routes from "./router/routes";
import { createServer } from "node:http";
import { Server } from "socket.io";
import Redis from "ioredis";
import mongoose from "mongoose";
// import { Authorize } from "./common/middleware/auth.middleware";
import { errorHandlingMiddleware } from "./middleware/error.middleware";
import { setupWebsocket } from "./utils/realtime";
import { connect } from "mongoose";



dotenv.config();

// Initialize express app
const app = express();


// Connect to MongoDB
connect(process.env.NODE_ENV! == 'production' ? process.env.MONGO_URI_PROD! : process.env.MONGO_URI_DEV!)
  .then((r) => { console.log('MongoDB connected')})
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Redis client
export const redisClient = new Redis(process.env.NODE_ENV! == 'production' ? process.env.REDIS_URI_PROD! : process.env.REDIS_URI_DEV!);
redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('error', (err) => console.error('Redis error:', err));


//TODO: add cors


app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// app.use(Authorize())

app.use('/api',routes);


app.use(errorHandlingMiddleware)

const httpServer = createServer(app);
const io = new Server(httpServer);
setupWebsocket(io, redisClient);

export default httpServer;