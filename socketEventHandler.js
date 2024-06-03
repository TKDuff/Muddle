async function socketHandler(io, collection, uuidv4, fakePostLatLongValues) {
    io.on('connection', async (socket) => {
        /*When client connects, emit all the posts already in the database to them to be drawn to the screen*/
        const documents = await collection.find({}).toArray();
        socket.emit('allDocumentsFromDatabase', documents);

        
        // Handle chat message event from the client
    socket.on('confessionFromClient', (message) => {
    insertPostIntoLocationsCollection(message, collection, io);
    });

    socket.on('voteOnMarker', (markerKey) => {
        voteOnMarker(collection, io, markerKey);
    });

    socket.on('wipeDB', () => {
        const result = collection.deleteMany({});
        console.log(`${result.deletedCount} documents deleted`);
    });

    socket.on('createFakePost', (count) => {
        let lat_row = fakePostLatLongValues.BASE_LAT
        let long_row = fakePostLatLongValues.BASE_LONG
  
        for(let i = 0; i < count; i++){
            let uuid = uuidv4();
            const data = {
                time: i,
                location: {
                  type: "Point",
                  coordinates: [long_row, lat_row ]
                },
                confession: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent finibus mattis orci dignissim finibus. 
                Nulla dapibus ut nunc at rhoncus. Morbi sagittis sed arcu quis semper. 
                Integer placerat dignissim tellus. Cras sed augue diam. In eget magna nec.`,
                Up: [],
                Down: []
            };
            if(i % 5 == 0){
                long_row -= fakePostLatLongValues.LONG_DIFF
                lat_row = fakePostLatLongValues.BASE_LAT
            }
            lat_row += fakePostLatLongValues.LAT_DIFF
            insertPostIntoLocationsCollection({messageVar: data, keyVar: uuid},collection, io);
        };
    });
})

}

// Insert strings into the "Locations" collection
async function insertPostIntoLocationsCollection(message, collection, io) {
    const {messageVar, keyVar} = message; //extracts the variables from the received data object, using object deconstruction
    // Insert the string into the collection
    console.log(keyVar);
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
    let oppositeDirection;
    const query = {
      _id: confessionKeyID,
      $or: [
        { Up: keyID },   // Check if keyID exists in the 'up' array
        { Down: keyID }  // Check if keyID exists in the 'down' array
      ]
    };
  
    const matchingDocument = await collection.findOne(query);
    let action;
    if(!matchingDocument){    //if both arrays don't contain User Cookie, add to target array, '$addToSet'
      await modifyVoteDirectionArray(collection, '$addToSet', direction, confessionKeyID ,keyID);
      action = 1//'add';
    } else if(matchingDocument[direction].includes(keyID)){     //if target array already contains User Cookie, remove it, '$pull'
      await modifyVoteDirectionArray(collection, '$pull', direction, confessionKeyID ,keyID);
      action = -1//'remove'
    } else{   //if opposite of target array contains U.C, remove it from there and add it to target array
      oppositeDirection = direction === 'Up' ? 'Down' : 'Up';
      await modifyVoteDirectionArray(collection, '$pull', oppositeDirection, confessionKeyID ,keyID);
      await modifyVoteDirectionArray(collection, '$addToSet', direction, confessionKeyID ,keyID);
    }
    io.emit('newArrayLengths', action ,direction, oppositeDirection ,confessionKeyID);
}

async function modifyVoteDirectionArray(collection, modification, direction, confessionKeyID ,keyID) {
    await collection.updateOne(
      { _id: confessionKeyID },
      { [modification]: { [direction]: keyID }}
      );
}

module.exports = socketHandler