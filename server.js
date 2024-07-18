const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const { GoogleGenerativeAI } = require("@google/generative-ai");
const server = http.createServer(app);
require('dotenv').config();
const io = new Server(server);

app.use(express.static('build'));
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code });
    });
    socket.on('chat_with_friends', ({ roomId, username, message }) => {
        console.log('Received chat_with_friends:', roomId, username, message);
        socket.to(roomId).emit('response_friend', { username, message });
        console.log("hello");
    });
    socket.on('chat_message', async ({ roomId, message }) => {
        const history = []; // You can load chat history here if needed

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const chat = model.startChat({
            history,
            generationConfig: {
                maxOutputTokens: 100,
            },
        });

        try {
            const result = await chat.sendMessage(message);
            const response = await result.response;
            const text = response.text();

            // Emit the response to all clients in the room
            io.to(roomId).emit('chat_response', { message: text });
        } catch (error) {
            console.error('Error generating response:', error);
            socket.emit('chat_error', "Error generating response");
        }
    });

 
    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});




const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));

