const { User } = require('../models/user');
const { app } = require('../app');
const http = require('http');

const server = http.createServer(app);
const io = require('socket.io').listen(server);

io.on('connection', (socket) => {
  socket.on('change connection status', async (data) => {
    await User.findByIdAndUpdate(data.userId, { $set: {status: data.status}});
    socket.broadcast.emit('connection changed', data);
  });
});

module.exports = server;
