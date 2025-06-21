const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

const sessions = {};

app.use(express.static(path.join(__dirname, 'voice-chat')));

io.on('connection', (socket) => {
    console.log(`一个新用户连接成功: ${socket.id}`);

    socket.on('session-start', (data) => {
        if (!io.sockets.sockets.has(data.to)) {
            return socket.emit('connection-failed', { reason: '未找到该用户或对方已离线。' });
        }
        if (sessions[socket.id]) {
            return socket.emit('connection-failed', { reason: '你已经在一个会话中，请先结束当前会话。' });
        }
        if (sessions[data.to]) {
            return socket.emit('connection-failed', { reason: '对方正在通话中，请稍后再试。' });
        }
        console.log(`会话开始: ${socket.id} -> ${data.to}`);
        sessions[socket.id] = data.to;
        sessions[data.to] = socket.id;
        socket.to(data.to).emit('session-start', { from: socket.id });
    });

    socket.on('session-end', (data) => {
        const peerId = sessions[socket.id];
        if (peerId) delete sessions[peerId];
        delete sessions[socket.id];
        socket.to(data.to).emit('session-end', { from: socket.id });
    });

    socket.on('offer', (data) => {
        if (io.sockets.sockets.has(data.to)) {
            socket.to(data.to).emit('offer', { from: socket.id, offer: data.offer });
        }
    });
    socket.on('answer', (data) => { socket.to(data.to).emit('answer', { from: socket.id, answer: data.answer }); });
    socket.on('ice-candidate', (data) => { socket.to(data.to).emit('ice-candidate', { from: socket.id, candidate: data.candidate }); });
    socket.on('private message', (data) => { socket.to(data.to).emit('private message', { text: data.text, from: socket.id }); });

    socket.on('disconnect', () => {
        console.log(`用户 ${socket.id} 已断开连接`);
        const peerId = sessions[socket.id];
        if (peerId) {
            console.log(`通知 ${peerId} 它的伙伴已掉线`);
            socket.to(peerId).emit('peer-disconnected');
            delete sessions[peerId];
            delete sessions[socket.id];
        }
    });
});

server.listen(PORT, () => {
    console.log(`通讯平台服务器 v17 启动成功，正在监听端口: ${PORT}`);
});
