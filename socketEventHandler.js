/*
const LONG_DIFF = 0.008442649
const LAT_DIFF = 0.00432114886
const BASE_LAT = 53.36416607458011
const BASE_LONG = -6.2923026417947545*/

async function socketHandler(io, collection, uuidv4) {
    io.on('connection', async (socket) => {
        const LONG_DIFF = 0.008442649
        const LAT_DIFF = 0.00432114886
        const BASE_LAT = 53.36416607458011
        const BASE_LONG = -6.2923026417947545

        console.log('Client Connected, printed via module');
        
        /*When client connects, emit all the posts already in the database to them to be drawn to the screen*/
        const posts = await collection.find({}).toArray();
        socket.emit('allPostsFromDatabase', posts);

        
        // Handle chat message event from the client
    socket.on('confessionFromClient', (message) => {
    insertPostIntoLocationsCollection(collection, message, io);
    });

    socket.on('voteOnMarker', (markerKey) => {
        voteOnMarker(collection, io, markerKey);
    });

    socket.on('wipeDB', () => {
        const result = collection.deleteMany({});
        console.log(`${result.deletedCount} documents deleted`);
    });

    socket.on('createFakePost', (count) => {
        console.log('Module file creating the fake posts');
        let lat_row = BASE_LAT
        let long_row = BASE_LONG
  
        for(let i = 0; i < count; i++){
            let uuid = uuidv4();
            const data = {
                time: i,
                lat: lat_row,
                long: long_row,
                confession: uuid,
                Up: [],
                Down: []
            };
            if(i % 5 == 0){
                long_row -= LONG_DIFF
                lat_row = BASE_LAT
            }
            lat_row += LAT_DIFF
            insertPostIntoLocationsCollection(collection, {messageVar: data, keyVar: uuid}, io);
        };
    });
})

}

// Insert strings into the "Locations" collection
async function insertPostIntoLocationsCollection(collection, message, io) {
    const {messageVar, keyVar} = message; //extracts the variables from the received data object, using object deconstruction
    // Insert the string into the collection
    messageVar._id = keyVar
    await collection.insertOne(messageVar);
    io.emit('newPost', messageVar);
  }

/*voting on a marker is either pushing/pulling the cookie I.D to/from the up/down array depending on the vote 
Upvote is adding to the array
Downvote is pulling from the array
"Switching" is when a user votes in the opposite direction on the same vote, so up to down and vice versa */
async function voteOnMarker(collection, io, markerKey) {
    const {direction, confessionKeyID ,keyID} = markerKey;
    const oppositeDirection = direction === 'Up' ? 'Down' : 'Up';
  
    const query = {
      _id: confessionKeyID,
      $or: [
        { Up: keyID },   // Check if keyID exists in the 'up' array
        { Down: keyID }  // Check if keyID exists in the 'down' array
      ]
    };
  
    const matchingDocument = await collection.findOne(query);
    let updatedDirectionArrayLength
    let updatedOppositeDirectionArrayLength
    if(!matchingDocument){    //if both arrays don't contain User Cookie, add to target array, '$addToSet'
      updatedDirectionArrayLength = await modifyVoteDirectionArray(collection, '$addToSet', direction, confessionKeyID ,keyID);
    } else if(matchingDocument[direction].includes(keyID)){     //if target array already contains User Cookie, remove it, '$pull'
      updatedDirectionArrayLength = await modifyVoteDirectionArray(collection, '$pull', direction, confessionKeyID ,keyID);
    } else if(matchingDocument[oppositeDirection].includes(keyID)){   //if opposite of target array contains U.C, remove it from there and add it to target array
      updatedOppositeDirectionArrayLength = await modifyVoteDirectionArray(collection, '$pull', oppositeDirection, confessionKeyID ,keyID);
      updatedDirectionArrayLength = await modifyVoteDirectionArray(collection, '$addToSet', direction, confessionKeyID ,keyID);
    }
    
    io.emit('newArrayLengths', updatedDirectionArrayLength, updatedOppositeDirectionArrayLength ,direction, oppositeDirection ,confessionKeyID);
}

async function modifyVoteDirectionArray(collection, modification, direction, confessionKeyID ,keyID) {
    const updatedDocument = await collection.findOneAndUpdate(
      { _id: confessionKeyID },
      { [modification]: { [direction]: keyID }},
      { returnDocument: 'after' }
      );
      return updatedDocument[direction].length;
  }

module.exports = socketHandler



/*as of now, the function to get the documents from the db and draw their SVGs when the browser connects is not here
, you cannot upvote/downvote on refreshed screen*/