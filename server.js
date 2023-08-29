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
  } 
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
    
    const LONG_DIFF = 0.008442649
    const LAT_DIFF = 0.00432114886
    const BASE_LAT = 53.36416607458011
    const BASE_LONG = -6.2923026417947545

    socket.on('createFakePost', (count) => {
      let lat_row = BASE_LAT
      let long_row = BASE_LONG

      for(let i = 0; i < count; i++){
        const data = {
          time: i,
          lat: lat_row,
          long: long_row,
          confession: `${i}`,
          up: [],
          down: []
        };
        if(i % 5 == 0){
          long_row -= LONG_DIFF
          lat_row = BASE_LAT
        }
        lat_row += LAT_DIFF
        insertStringIntoLocationsCollection({messageVar: data, keyVar: i});
      };

      
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

  sendUserDirectionArrayLength(direction, confessionKeyID);
}

async function addVoteToDirectionArray(direction, confessionKeyID ,keyID) {
  const update = { $push/*addToSet*/: { [direction]: keyID } };
  collection.updateOne({_id: +confessionKeyID}, update);
}
async function removeVoteFromDirectionArray(direction, confessionKeyID ,keyID) {
  const update = { $pull: { [direction]: keyID } };
  collection.updateOne({_id: +confessionKeyID}, update);
}

/*
After a user votes, this function is called. Takes in vote direction & what post was voted on.
Gets size of array for the direction (direction) that was amended for the post that was voted on (confessionKeyID)
Then calls emits it to all clients in order for them to change their colour. 
*/
async function sendUserDirectionArrayLength(direction, confessionKeyID) {
  console.log(confessionKeyID)
  
  const result = await collection.aggregate([
    { $match: { _id: +confessionKeyID } }, // Match the specific document
    { $project: { upArrayLength: { $size: `$${direction}`}}}
  ]).toArray();

  io.emit('testDirectionCount', result[0].upArrayLength, confessionKeyID)
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


/*The + infront of confessionID will have to be removed to allow for UUID cookies */