const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);

const { MongoClient } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
var collection = client.db('Muddle').collection('Locations');

// Create a change stream for the "Locations" collection
const changeStream = collection.watch();


async function connectToDatabase() {
    try {
        await client.connect();
        collection = client.db('Muddle').collection('Locations');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}


// Handle client connections, when client connect find all confessions in DB and post to client, to create markers
io.on('connection', async (socket) => {
    console.log('A client connected');
    
    // Emit the "locations" event to the client with the locations data
    const locations = await collection.find({}).toArray();
    socket.emit('locations', locations);
    
    
    // Handle chat message event from the client
    socket.on('confessionFromClient', (message) => {
        insertStringIntoLocationsCollection(message);
    });

});

// Insert strings into the "Locations" collection
async function insertStringIntoLocationsCollection(message) {
  const {messageVar, keyVar} = message; //extracts the variables from the received data object, using object deconstruction
    try {
      // Insert the string into the collection
      messageVar._id = keyVar
      const result = await collection.insertOne(messageVar);
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

// Listen for change events
changeStream.on('change', (change) => {
  if (change.operationType === 'insert') {
    const newLocation = change.fullDocument;
    // Emit the newLocation object to all connected clients
    io.emit('newLocation', newLocation);
  }
});