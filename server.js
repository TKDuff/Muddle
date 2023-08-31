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
    
    /*When client connects, emit all the posts already in the database to them to be drawn to the screen*/
    const posts = await collection.find({}).toArray();
    socket.emit('allPostsFromDatabase', posts);
    
    
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
          Up: [],
          Down: []
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
  const oppositeDirection = direction === 'Up' ? 'Down' : 'Up';

  const query = {
    _id: +confessionKeyID,
    $or: [
      { Up: keyID },   // Check if keyID exists in the 'up' array
      { Down: keyID }  // Check if keyID exists in the 'down' array
    ]
  };

  const matchingDocument = await collection.findOne(query);
  let updatedDirectionArrayLength
  if(!matchingDocument){    //if both arrays don't contain User Cookie, add to target array, '$addToSet'
    updatedDirectionArrayLength = await modifyVoteDirectionArray('$addToSet', direction, confessionKeyID ,keyID);
  } else if(matchingDocument[direction].includes(keyID)){     //if target array already contains User Cookie, remove it, '$pull'
    updatedDirectionArrayLength = await modifyVoteDirectionArray('$pull', direction, confessionKeyID ,keyID);
  } else if(matchingDocument[oppositeDirection].includes(keyID)){   //if opposite of target array contains U.C, remove it from there and add it to target array
    await modifyVoteDirectionArray('$pull', oppositeDirection, confessionKeyID ,keyID);
    updatedDirectionArrayLength = await modifyVoteDirectionArray('$addToSet', direction, confessionKeyID ,keyID);
  }

  //console.log(updatedDirectionArrayLength);
  io.emit('testDirectionCount', updatedDirectionArrayLength, direction, confessionKeyID);
}

/*
Get lenth of voted on direction array after the modification took place (hence returnDocument: 'after'), return it*/
async function modifyVoteDirectionArray(modification, direction, confessionKeyID ,keyID) {
  //console.log(modification, direction);
  const updatedDocument = await collection.findOneAndUpdate(
    { _id: +confessionKeyID },
    { [modification]: { [direction]: keyID }},
    { returnDocument: 'after' }
    );
    return updatedDocument.value[direction].length;
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