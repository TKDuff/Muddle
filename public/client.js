//map setup
const map = L.map('brookfieldMap').setView([53.366, -6.292], 15);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);
const mapDiv = document.getElementById('brookfieldMap');

// Connect to the server
const socket = io('http://localhost:3000'); //the localhost address is not needed, will work without
const key = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]);//Math.floor((Math.random() * 1000) + 1); //You need to look into this key variable, is it better to init it here, like a global variable

/*When client connects, they receive all docuements already in collection
For every document, an SVG Icon is created and put on the map using createMarker() function */
socket.on('allPostsFromDatabase', posts => {
    posts.forEach((obj) => {
        console.log(obj._id, obj.Down.length, obj.Up.length);
        createMarker(obj.lat, obj.long, obj.confession, obj._id, obj.Down.length, obj.Up.length);
    }); 
})

function postConfession() {
    //get the users location
    navigator.geolocation.getCurrentPosition(sendToServer, errorCallback, {
        enableHighAccuracy: true,
        maximumAge: 5000
    });
}

function wipeDB() {
    socket.emit('wipeDB');
}

function createFakePost() {
    socket.emit('createFakePost', document.getElementById("fakePostCommentBox").value)
}

const errorCallback = (position) => {
    console.error(error);
}


//method that gets user location and sends it to the server
const sendToServer = (position) => {
    //be sure to set the cookie back to the document cookie 🧙‍♂️️👴️🚶️
    //const key = Math.floor((Math.random() * 1000) + 1);//decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]);
    const data = {
        time: Date.now(),
        lat: parseFloat(position.coords.latitude) * (1 + (Math.random() * 0.000005)),
        long: parseFloat(position.coords.longitude) * (1 + (Math.random() * 0.000005)),
        confession: document.getElementById("confessionBox").value,
        Up: [],
        Down: []
    };
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
} 

// Listen for the 'newLocation' event from the server
socket.on('newLocation', (newLocation) => {
    createMarker(newLocation.lat, newLocation.long, newLocation.confession ,newLocation._id, 0, 0);
});

/*After voting in a certain direction on a post, the modified length the direction array post is returned 
This length is used to select the new direction gradient for the post*/
const MIDDLE = 50
const MIDDLE_OFFSET = 5
socket.on('testDirectionCount', (updatedDirectionArrayLength, direction, confessionKeyID) => {
    console.log(updatedDirectionArrayLength, direction, confessionKeyID);   
    var svgPost = $(`#svg${confessionKeyID}`);
    let middleOffsetString = svgPost.find(`#Middle${confessionKeyID}`).attr('offset');
    let middleOffsetValue = parseInt(middleOffsetString, 10);
    var gradientIndex;

    if(direction === 'Up'){
        gradientIndex = `--up-gradient-${updatedDirectionArrayLength}`;
        middleOffsetValue -= MIDDLE_OFFSET;
      } else {
        gradientIndex = `--down-gradient-${updatedDirectionArrayLength}`;
        middleOffsetValue += MIDDLE_OFFSET;
    }

    console.log('The gradient index is', gradientIndex, 'the updated count is ', updatedDirectionArrayLength);
    
    svgPost.find(`#${direction}${confessionKeyID}`).attr('stop-color', `var(${gradientIndex})`);
    //svgPost.find(`#Middle${confessionKeyID}`).attr('offset', `${middleOffsetValue}%`);


    /*
    var svgPost = $(`#svg${data.confessionKeyID}`);
    let middleOffsetString = svgPost.find(`#Middle${data.confessionKeyID}`).attr('offset');
  let middleOffsetValue = parseInt(middleOffsetString, 10);
  var gradientIndex;*/
})

/*Creates the Post to be displayed on the map.
Takes in the lat/long co-ords, confession which is the user text, keyID which is the posters Cookie and both direction Vote Counts */
function createMarker(lat, long, confession, keyID, downVoteCount, upVoteCount) {
    const marker = L.marker([lat, long], {icon: createDivIcon(keyID, downVoteCount, upVoteCount)});
    marker.addTo(map).bindPopup(confession).openPopup();
}

/*Each SVG is identified using the keyID, which is the user cookie
The voteCounts (down/up) are used to specifiy which gradient should be used*/
const createDivIcon = (keyID, downVoteCount, upVoteCount) => {
    return L.divIcon({
        className: 'SVG-Icon',
        html: `<div id=${keyID}>
        <svg xmlns="http://www.w3.org/2000/svg" id="svg${keyID}" viewBox="0 0 200 200" width="120" height="120">
        <defs>
        <linearGradient id="Gradient${keyID}" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" id="Down${keyID}" stop-color="var(--down-gradient-${downVoteCount})"/>
        <stop offset="50%" id="Middle${keyID}" stop-color="rgb(255, 255, 100)"/>
        <stop offset="100%" id="Up${keyID}" stop-color="var(--up-gradient-${upVoteCount})"/>
        </linearGradient>
        </defs>
        <g>
        <rect width="200" height="200" fill="url(#Gradient${keyID})" />
        <foreignObject width="100%" height="100%">
        <button class = "voteButton up" id="Up" >Upvote</button>
        <button class = "voteButton down" id="Down" >Downvote</button>
        </foreignObject>
        </g>
        </svg>
        </div>`,
        iconSize: [120, 120],
        iconAnchor: [0, 0]});
};

$(document).on('click', '.voteButton', function () {
    socket.emit('voteOnMarker', {direction: this.id, confessionKeyID: $(this).closest('div').attr('id'), keyID: key});
});
/*
big change, for now, the KeyId will be the time it was posed, due to jquery have a length limit on the id it returns when calling
$(this).closest('div').attr('id'); */