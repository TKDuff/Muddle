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

socket.on('locations', locations => {
    locations.forEach((obj) => {
        createMarker(obj.lat, obj.long, obj.confession, obj._id);
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
        up: [],
        down: []
    };
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
} 

// Listen for the 'newLocation' event from the server
socket.on('newLocation', (newLocation) => {
    console.log('New location added:', newLocation);
    createMarker(newLocation.lat, newLocation.long, newLocation.confession ,newLocation._id);
});


function createMarker(lat, long, confession, keyID) {
    const marker = L.marker([lat, long], {icon: createDivIcon(keyID)});
    marker.addTo(map).bindPopup(confession).openPopup();
}

const createDivIcon = (keyID) => {
    return L.divIcon({
        className: 'SVG-Icon',
        html: `<div id=${keyID}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="120" height="120">
        <defs>
        <linearGradient id="myGradient" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" id="Down" stop-color="rgb(255, 255, 100)"/>
        <stop offset="50%" id="Middle" stop-color="rgb(255, 255, 100)"/>
        <stop offset="100%" id="Up" stop-color="rgb(255, 255, 100)"/>
        </linearGradient>
        </defs>
        <g>
        <rect width="200" height="200" fill="url(#myGradient)" />
        <foreignObject width="100%" height="100%">
        <button class = "voteButton" id="up" >Upvote</button>
        <button class = "voteButton" id="down" >Downvote</button>
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