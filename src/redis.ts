import redis from 'ioredis';

export const rio = new redis({
    host: 'localhost',
    port: 6379,
})



