import express from "express";
import "express-async-errors";
import dotenv from "dotenv";
import routes from "./router/routes";
import { createServer } from "node:http";
import { Server } from "socket.io";
import Redis from "ioredis";
import mongoose from "mongoose";
// import { Authorize } from "./common/middleware/auth.middleware";
// import { errorHandlingMiddleware } from "./common/middleware/error.middleware";

dotenv.config();

// Initialize express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/flash-sale')
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// Initialize Redis client
export const redisClient = new Redis(process.env.REDIS_URI || 'redis://localhost:6379');
redisClient.on('connect', () => console.log('Redis connected'));
redisClient.on('error', (err) => console.error('Redis error:', err));


//TODO: add cors

dotenv.config();
app.use(express.json());

app.use(express.urlencoded({ extended: true }));

// app.use(Authorize())

app.use('/api',routes);


// app.use(errorHandlingMiddleware)

export default app;