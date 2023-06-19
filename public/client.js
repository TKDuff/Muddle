//map setup
const map = L.map('brookfieldMap').setView([53.306, -6.183], 16);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);

// Connect to the server
const socket = io('http://localhost:3000'); //the localhost address is not needed, will work without

socket.on('locations', locations => {
    locations.forEach((obj) => {
        createMarker(obj.lat, obj.long, obj.confession);
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
    let key = `${time},${lat},${long},${confession}`

    const data = {time, lat, long, confession};
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
}

function createMarker(lat, long, confession) {
    L.marker([lat, long]).addTo(map).bindPopup(confession).openPopup();
}

// Listen for the 'newLocation' event from the server
socket.on('newLocation', (newLocation) => {
    console.log('New location added:', newLocation);
    createMarker(newLocation.lat, newLocation.long, newLocation.confession);
});