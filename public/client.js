//map setup
const map = L.map('brookfieldMap').setView([53.306, -6.183], 18);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);

// Connect to the server
const socket = io('http://localhost:3000'); //the localhost address is not needed, will work without

const SVGIcon = L.divIcon({
    className: 'SVG-Icon',
    html: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="120" height="120">
    <defs>
    <linearGradient id="myGradient" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
    <stop offset="0%" id="Down" stop-color="rgb(255, 255, 100)"/>
    <stop offset="50%" id="Middle" stop-color="rgb(255, 255, 100)"/>
    <stop offset="100%" id="Up" stop-color="rgb(255, 255, 100)"/>
    </linearGradient>
    </defs>
    <g>
    <rect width="200" height="200" fill="url(#myGradient)" />
    <foreignObject x="110" y="160" width="80" height="25">
    <button id="Up" onclick="checkVote(this.id)">Upvote</button>
    </foreignObject>
    <foreignObject x="10" y="160" width="80" height="25">
    <button id="Down" onclick="checkVote(this.id)">Downvote</button>
    </foreignObject>
    </g>
    </svg>`,
    iconSize: [60, 60],
    iconAnchor: [0, 0]
})

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

const errorCallback = (position) => {
    console.error(error);
}

//method that gets user location and sends it to the server
const sendToServer = (position) => {
    let lat = parseFloat(position.coords.latitude) * ( 1 + (Math.random() * 0.00005));
    let long = parseFloat(position.coords.longitude)* ( 1 + (Math.random() * 0.00005));
    let time = Date.now();
    let confession = document.getElementById("confessionBox").value;
    let key = `${time},${confession}`

    const data = {time, lat, long, confession};
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
}

// Listen for the 'newLocation' event from the server
socket.on('newLocation', (newLocation) => {
    console.log('New location added:', newLocation);
    createMarker(newLocation.lat, newLocation.long, newLocation.confession ,newLocation._id);
});


function createMarker(lat, long, confession, keyID) {
    const marker = L.marker([lat, long], {icon: SVGIcon, keyID: keyID}).on('click', getConfessionKey)
    marker.addTo(map).bindPopup(confession).openPopup();
}

const getConfessionKey = (e) => {
    console.log('You clicked on ',e.target.options.keyID);
}