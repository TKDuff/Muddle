//map setup
const map = L.map('brookfieldMap').setView([53.366, -6.292], 15);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);
const mapDiv = document.getElementById('brookfieldMap');

// Connect to the server
const socket = io('https://red-surf-7071.fly.dev/', {
    transports: ['websocket'],
    withCredentials: true
  }); //the localhost address is not needed, will work without
const key = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]);//Math.floor((Math.random() * 1000) + 1); //You need to look into this key variable, is it better to init it here, like a global variable

/*When client connects, they receive all docuements already in collection
For every document, an SVG Icon is created and put on the map using createMarker() function */
socket.on('allPostsFromDatabase', posts => {
    posts.forEach((obj) => {
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

// Listen for the 'newPost' event from the server
socket.on('newPost', (Post) => {
    createMarker(Post.lat, Post.long, Post.confession ,Post._id, 0, 0);
});

/*After voting in a certain direction on a post, the new lengths the direction and opposite direction arrays for the document are returned 
The lengths are used to choose a CSS gradient value from 0-10
The function changeOneGradient() changes the up/down side gradient
If the updatedOppositeDirectionArrayLength is not null, that means the opposite direction array was updated and thus a vote switch took place
For vote switching the changeOneGradient() is called twice, once for the voted side (to increment) and again for the unvoted side (to decrement)*/

const MIDDLE = 50
const MIDDLE_OFFSET = 5
socket.on('newArrayLengths', (updatedDirectionArrayLength, updatedOppositeDirectionArrayLength, direction, oppositeDirection , confessionKeyID) => {
    if(updatedOppositeDirectionArrayLength === null){
        changeOneGradient(updatedDirectionArrayLength, direction, confessionKeyID)
    } else {
        changeOneGradient(updatedDirectionArrayLength, direction, confessionKeyID)
        changeOneGradient(updatedOppositeDirectionArrayLength, oppositeDirection, confessionKeyID)
    };
})

function changeOneGradient(updatedDirectionArrayLength, direction, confessionKeyID) {
    var svgPost = $(`#svg${confessionKeyID}`);
    let middleOffsetValue = parseInt(svgPost.find(`#Middle${confessionKeyID}`).attr('offset'), 10); //parseing to remove % from offset value
    middleOffsetValue = (direction === 'Up') ? middleOffsetValue-MIDDLE_OFFSET : middleOffsetValue+MIDDLE_OFFSET;
    let gradientIndex = `--${direction}-gradient-${updatedDirectionArrayLength}`;
    svgPost.find(`#${direction}${confessionKeyID}`).attr('stop-color', `var(${gradientIndex})`);
    svgPost.find(`#Middle${confessionKeyID}`).attr('offset', `${middleOffsetValue}%`);
}

/*Creates the Post to be displayed on the map.
Takes in the lat/long co-ords, confession which is the user text, keyID which is the posters Cookie and both direction Vote Counts */
function createMarker(lat, long, confession, keyID, downVoteCount, upVoteCount) {
    const marker = L.marker([lat, long], {icon: createDivIcon(keyID, downVoteCount, upVoteCount)});
    marker.addTo(map).bindPopup(confession).openPopup();
}

/*Each SVG is identified using the keyID, which is the user cookie
The voteCounts (down/up) are used to specifiy which gradient should be used*/
const createDivIcon = (keyID, downVoteCount, upVoteCount) => {
    let offsetValue = ((downVoteCount - upVoteCount) * 5) + 50
    return L.divIcon({
        className: 'SVG-Icon',
        html: `<div id=${keyID}>
        <svg xmlns="http://www.w3.org/2000/svg" id="svg${keyID}" viewBox="0 0 200 200" width="120" height="120">
        <defs>
        <linearGradient id="Gradient${keyID}" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" id="Down${keyID}" stop-color="var(--Down-gradient-${downVoteCount})"/>
        <stop offset="${offsetValue}%" id="Middle${keyID}" stop-color="rgb(255, 255, 100)"/>
        <stop offset="100%" id="Up${keyID}" stop-color="var(--Up-gradient-${upVoteCount})"/>
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