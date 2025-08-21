const https = require('https');
const fs = require('fs');

const express = require('express');
const { createServer } = require('node:http');
const { Server } = require('socket.io');
const { AvatarGenerator } = require('random-avatar-generator');
const randomName = require('random-name')
const Redis = require('./redis')

const options = {
    key: fs.readFileSync('./ssl/key.pem'),
    cert: fs.readFileSync('./ssl/cert.pem'),
    passphrase: '140902'
};


const app = express();

// const server = https.createServer(options, app);
const server = createServer(app);
const generator = new AvatarGenerator();

const io = new Server(server, {
    cors: {
        origin: '*',
    }
});


app.get('/', (req, res) => {
    res.send('Hello World');
});



const redis = new Redis()

//redis.client.flushAll()

io.on('connection', (socket) => {

    console.log(`${socket.id} connected!`);


    socket.on('REGISTER', async ({ roomId }) => {

        socket.join(roomId);
        const newUser = {
            id: socket.id,
            name: randomName(),
            avatar: generator.generateRandomAvatar(),
            roomId
        }

        socket._roomId = roomId;


        try {
            await redis.set(roomId, newUser);

            const list = await redis
                .getAll(roomId)
                .then((data) => Object.values(data).map((user) => JSON.parse(user)));


            socket.emit(
                "REGISTER_RESPONSE",
                newUser,
                list
            );

            socket.to(roomId).emit(
                "USER_LIST",
                list
            );


        } catch (error) {
            console.log(error);
        }



    });

    socket.on('SIGNAL', (data) => {
        io.to(data.to).emit('SIGNAL', data)
    })


    socket.on('disconnect', async () => {
        console.log(`${socket.id} disconnected`);
        const roomId = socket._roomId

        socket.leave(roomId);


        try {

            await redis.remove(roomId, socket.id);
            const list = await redis
                .getAll(roomId)
                .then((data) => Object.values(data).map((user) => JSON.parse(user)));

            io.to(roomId).emit("USER_LIST", list);


        } catch (error) {
            console.log(error);

        }
    });

});


server.listen(8000, () => {
    console.log('Server started');
})