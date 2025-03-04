import { Server } from 'socket.io';
import Redis from 'ioredis';

export let io: Server;

export function setupWebsocket(socketServer: Server, redis: Redis): void {
  console.log('socket-time')
  io = socketServer;
  
  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });
  
  // Subscribe to Redis pub/sub for inventory updates
  // const subscriber = redis.duplicate();
  
  // subscriber.subscribe('inventory-updates');
  // subscriber.on('message', (channel, message) => {
  //   if (channel === 'inventory-updates') {
  //     const data = JSON.parse(message);
  //     io.emit('inventoryUpdate', data);
  //   }
  // });
}
