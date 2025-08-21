const { createClient } = require('redis');
require('dotenv').config()



class Redis {
    constructor() {
        this.client = createClient({
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            socket: {
                host: process.env.REDIS_HOST,
                port: process.env.REDIS_PORT
            }
        });

        this.client.on('error', (err) => {
            console.error('Redis connection error:', err);
        });

        this.connect()
    }

    async connect() {
        try {
            await this.client.connect();
            console.log('Connected to Redis');
        } catch (error) {
            console.error('Redis connection failed:', error);

        }
    }


    async set(roomId, data) {
        return await this.client.hSet(`room:${roomId}`, data.id, JSON.stringify(data));
    }

    async getAll(roomId) {
        const data = await this.client.hGetAll(`room:${roomId}`);
        return data;
    }

    async remove(roomId, id) {
        return await this.client.hDel(`room:${roomId}`, id);
    }
}

module.exports = Redis;