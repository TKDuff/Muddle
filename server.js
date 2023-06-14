const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
var collection = client.db('Muddle').collection('Locations');

async function connectToDatabase() {
    try {
        await client.connect();
        collection = client.db('Muddle').collection('Locations');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}


// Handle client connections
io.on('connection', async (socket) => {
    console.log('A client connected');
    /*
    try {  
      const locations = await collection.find({}).toArray();

      // Emit the "locations" event to the client with the locations data
      socket.emit('locations', locations);
    } catch (error) {
      console.error('Error loading locations from the collection:', error);
    }*/
    
    // Handle chat message event from the client
    socket.on('confessionFromClient', (message) => {
        console.log(message);
        insertStringIntoLocationsCollection(message);
        //socket.broadcast.emit('receive-message', message);    Broadcast the message to all connected clients
    });

});

// Insert strings into the "Locations" collection
async function insertStringIntoLocationsCollection(message) {
    try {
      // Insert the string into the collection
      const result = await collection.insertOne(message);
      console.log(result.insertedId);
    } catch (error) {
      console.error('Error inserting string into the collection:', error);
    }
  }

// Start the server
httpServer.listen(3000, () => {
    console.log(`Server is running on port 3000`);
    app.use(express.static('public'))   //display html file in public file
    connectToDatabase();    // Call the connectToDatabase function to establish the connection
  });