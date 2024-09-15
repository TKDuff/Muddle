const { contains } = require("jquery");

const southWest = { lat: 53.364587, lng: -6.617803 };
const northEast = { lat: 53.397097, lng: -6.572227 };

async function socketHandler(io, collection, uuidv4, fakePostLatLongValues) {
    io.on('connection', async (socket) => {
        /*When client connects, emit all the posts already in the database to them to be drawn to the screen*/
        const documents = await collection.find({}).toArray();
        socket.emit('allDocumentsFromDatabase', documents);

        
        // Handle chat message event from the client
    socket.on('confessionFromClient', (message) => {
    insertPostIntoLocationsCollection(message, collection, io, socket);
    });

    socket.on('voteOnMarker', (markerKey) => {
        voteOnMarker(collection, io, markerKey);
    });

    socket.on('wipeDB', () => {
      collection.deleteMany({});
    });
    
    socket.on('createUniformFakePost', (count) => {
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
    
    socket.on('createRandomFakePost', (count) => {
      for (let i = 0; i < count; i++) {
        let uuid = uuidv4();
        const data = {
            time: i,
            location: {
                type: "Point",
                coordinates: [
                    getRandomInRange(southWest.lng, northEast.lng, 6),
                    getRandomInRange(southWest.lat, northEast.lat, 6)
                ]
            },
            confession: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Praesent finibus mattis orci dignissim finibus. 
            Nulla dapibus ut nunc at rhoncus. Morbi sagittis sed arcu quis semper. 
            Integer placerat dignissim tellus. Cras sed augue diam. In eget magna nec.`,
            Up: [],
            Down: []
        };
        insertPostIntoLocationsCollection({ messageVar: data, keyVar: uuid }, collection, io);
    };
  });

  socket.on('deletePost', (postID) => {
    collection.deleteOne({ _id: postID.keyVar });
  });

})
}

// Insert strings into the "Locations" collection
async function insertPostIntoLocationsCollection(message, collection, io, socket) {

  
    const {messageVar, keyVar} = message; //extracts the variables from the received data object, using object deconstruction
    
    // Give fake bounds
    messageVar.location = {
      type: "Point",
      coordinates: [
        getRandomInRange(southWest.lng, northEast.lng, 6),
        getRandomInRange(southWest.lat, northEast.lat, 6)
      ]
    };

    if (isOutOfBounds(messageVar.location)) {  //if post out of bounds, don't add to database, return an error to the user to let them know   
      socket.emit('postError', { error: "Posting out of bounds" });
      return;
    } else if (containSlur(messageVar.confession)) {
      socket.emit('postError', { error: "Nuh uh" }); //no slur
      return;
    }
    
    messageVar._id = keyVar
    messageVar.location = await findNonOverlappingLocation(messageVar.location, collection)
    await collection.insertOne(messageVar);
    io.emit('newPost', messageVar);
  }


  function isOutOfBounds(point) {
    return (
        point.coordinates[1] < southWest.lat || point.coordinates[1] > northEast.lat ||
        point.coordinates[0] < southWest.lng || point.coordinates[0] > northEast.lng
    );
}

/*TODO: Expand this function to email you the text over post, so you can check for pure slurs, for now simple check using regex */
function containSlur (text) {
  const n1Regex = /\b[nΠñÑη]\s*[iíîïì1!lLyYÝýỳι]\s*[gGbB]{2}\s*[^lL]\b/i;    //guys I found this online so don't cancel me
  const n2Regex = /\b[NnΠñÑη]\s*[ÏIÎÍÌ|iíîïì1!lyYÝýỳι]\s*[KkGBgbg]\s*[KkGGBgbg]\s*[^lL]\s*[Rr]\b/i;   
  const f1Regex = /\b[fphƒ]{1}\s*[a@α4]{1}\s*[g69]{2}\s*[o0öσ]{1}\s*[t7+]{1}\b/i; //I changed the one above for this, don't cancel me  
  const f2Regex = /\b[fphƒ]{1}\s*[a@α4]{1}\s*[g69]{2}\s*[o0öσ]{1}\s*[t7+]{1}\s*[Ss5]{1}\b/i; //I changed the one above for this, don't cancel me  

  const combinedRegex = new RegExp(`${f1Regex.source}|${f2Regex.source}|${n1Regex.source}|${n2Regex.source}`, 'i');
  return combinedRegex.test(text);

}



  async function findNonOverlappingLocation(location, collection, depth = 0) {
    /*Baic function for now, nothing special, will improve later when post GUIs finished
    Uses mongoDB built in 2dSpere index, has a special query 'maxDistance', to find all posts within distance
    Find all posts with distance of new post (.3 metres), if exist then overlap, move new post to different lat/long
    Recursive, so keep doing so until not overlapping
    Has a depth of 3, to ensure no infinite loops, cost money, on 3rd check will put post in Mullingar
    */
    const RecursiveDepth = 3;
    const stepDistance = 0.00001

    const isOverlapping = await checkOverlap(location, collection);
    if(!isOverlapping) {
      return location
    } else if (depth < RecursiveDepth) {
      const angle = Math.random() * 2 * Math.PI;
      const newLatitude = location.coordinates[1] + stepDistance * Math.sin(angle);
      const newLongitude = location.coordinates[0] + stepDistance * Math.cos(angle);
      
      const newLocation = {
        type: "Point",
        coordinates: [newLongitude, newLatitude]
    };
    
    return await findNonOverlappingLocation(newLocation, collection, depth + 1);
  } else {
    const fakePoint = {
      type: "Point",
      coordinates: [-7.35761046409607, 53.53674824756847]
    }
    return fakePoint
  }
  
}

  async function checkOverlap(location, collection) {
    const radius = 0.33265;
    const radiusInRadians = radius / 6371; // Convert radius in meters to radians

        const existingPosts = await collection.find({
            location: {
                $nearSphere: {
                    $geometry: {
                        type: "Point",
                        coordinates: [location.coordinates[0], location.coordinates[1]]
                    },
                    $maxDistance: radiusInRadians
                }
            }
        }).toArray();

        return existingPosts.length > 0;
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

module.exports = socketHandler //This exports the function 'socketHandler' above to server.js, in which it is stored as 'socketHandler' and invoked with the 4 parms



/*To be removed */
function getRandomInRange(from, to, fixed) {
  return (Math.random() * (to - from) + from).toFixed(fixed) * 1;
  // .toFixed() returns string, so ' * 1' is a quick way to convert it back to a number
}
