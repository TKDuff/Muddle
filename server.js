const express = require('express');
const cookieParser = require('cookie-parser');
const app = express();
const httpServer = require('http').createServer(app);
const io = require('socket.io')(httpServer);
const { v4: uuidv4 } = require('uuid');


const { MongoClient, MaxKey } = require('mongodb');
const uri = "mongodb+srv://thomaskilduff:leonard@cluster0.wns9h.mongodb.net/?retryWrites=true&w=majority";
const client = new MongoClient(uri);
var collection = client.db('Muddle').collection('Locations');

// Create a change stream for the "Locations" collection
const changeStream = collection.watch();
var count = 0;
app.use(cookieParser());



async function connectToDatabase() {
    try {
        await client.connect();
        collection = client.db('Muddle').collection('Locations');
        console.log('Connected to the database');
    } catch (error) {
        console.error('Error connecting to the database:', error);
    }
}

app.get('/', (req, res) => {
  if (!req.cookies.userData) {
    res.cookie("userData", uuidv4());
  } else {
  }
  count++;
  res.sendFile(__dirname + '/public/index.html');
});

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

    socket.on('voteOnMarker', (markerKey) => {
      voteOnMarker(markerKey);
    });

    socket.on('wipeDB', () => {
      const result = collection.deleteMany({});
    console.log(`${result.deletedCount} documents deleted`);
    }) 

});

// Insert strings into the "Locations" collection
async function insertStringIntoLocationsCollection(message) {
  const {messageVar, keyVar} = message; //extracts the variables from the received data object, using object deconstruction
    try {
      // Insert the string into the collection
      messageVar._id = keyVar
      const result = await collection.insertOne(messageVar);
    } catch (error) {
      console.error('Error inserting string into the collection:', error);
    }
}

//voting on a marker is pushing the cookie I.D into either the up/down array depending on the vote
async function voteOnMarker(markerKey) {
  const {direction, confessionKeyID ,keyID} = markerKey;
  const oppositeDirection = direction === 'up' ? 'down' : 'up';

  const query = {
    _id: +confessionKeyID,
    $or: [
      { up: keyID },   // Check if keyID exists in the 'up' array
      { down: keyID }  // Check if keyID exists in the 'down' array
    ]
  };

  const matchingDocument = await collection.findOne(query);

  if(!matchingDocument){    //if both arrays don't contain User Cookie, add to target array
    addVoteToDirectionArray(direction, confessionKeyID ,keyID);
  } else if(matchingDocument[direction].includes(keyID)){     //if target array already contains User Cookie, remove it
    removeVoteFromDirectionArray(direction, confessionKeyID ,keyID);
  } else if(matchingDocument[oppositeDirection].includes(keyID)){   //if opposite of target array contains U.C, remove it from there and add it to target array
    removeVoteFromDirectionArray(oppositeDirection, confessionKeyID ,keyID);
    addVoteToDirectionArray(direction, confessionKeyID ,keyID);
  }
}

async function addVoteToDirectionArray(direction, confessionKeyID ,keyID) {
  const update = { $addToSet: { [direction]: keyID } };
  collection.updateOne({_id: +confessionKeyID}, update);
}

async function removeVoteFromDirectionArray(direction, confessionKeyID ,keyID) {
  const update = { $pull: { [direction]: keyID } };
  collection.updateOne({_id: +confessionKeyID}, update);
}

//these (2 app.use lines) have to be here for some reason, or else the http route will not assign cookies
app.use(express.static('public'))   //display html file in public file
app.use('/node_modules', express.static('node_modules'));
// Start the server
httpServer.listen(3000, () => {
    console.log(`Server is running on port 3000`);
    connectToDatabase();    // Call the connectToDatabase function to establish the connection
  });

  
// Listen for change events
changeStream.on('change', (change) => {  
  if (change.operationType === 'insert') {
    const confession = change.fullDocument.confession
    const key = change.fullDocument._id
    console.log(confession, key);
    // Emit the newLocation object to all connected clients
    io.emit('newLocation', change.fullDocument);
  }
});