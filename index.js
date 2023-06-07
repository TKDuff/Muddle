const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const port = 3000;

// Start the server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });

// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle client connections
io.on('connection', (socket) => {
    console.log('A client connected');
    
    // Handle chat message event from the client
    socket.on('chat message', (message) => {
        console.log(`Received message: ${message}`);
        // Broadcast the message to all connected clients
        io.emit('receive-message', message);
    });
    
    socket.on('disconnect', () => {
        console.log('A client disconnected');
    });
});