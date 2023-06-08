const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const port = 3000;

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);

async function connectToDatabase() {
    try {
        await client.connect();
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}


// Serve the index.html file
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// Handle client connections
io.on('connection', async (socket) => {
    console.log('A client connected');
    try {
      const database = client.db('Muddle');
      const collection = database.collection('Locations');
  
      const locations = await collection.find({}).toArray();

      // Emit the "locations" event to the client with the locations data
      socket.emit('locations', locations);
    } catch (error) {
      console.error('Error loading locations from the collection:', error);
    }
    /*
    // Handle chat message event from the client
    socket.on('chat message', (message) => {
        console.log('Received message: ${message}');
        insertStringIntoLocationsCollection(message);
        console.log(`Received message: ${message}`);
        //socket.broadcast.emit('receive-message', message);    Broadcast the message to all connected clients
    });*/

});

// Insert strings into the "Locations" collection
async function insertStringIntoLocationsCollection(string) {
    try {
      const database = client.db('Muddle');
      const collection = database.collection('Locations');
  
      // Insert the string into the collection
      await collection.insertOne({ message: string });
      console.log('String inserted into the "Locations" collection');
    } catch (error) {
      console.error('Error inserting string into the collection:', error);
    }
  }

// Start the server
httpServer.listen(port, () => {
    console.log(`Server is running on port ${port}`);
    connectToDatabase();    // Call the connectToDatabase function to establish the connection
  });