//map setup
const map = L.map('brookfieldMap').setView([53.306, -6.183], 16);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);

// Connect to the server
const socket = io('http://localhost:3000'); //the localhost address is not needed, will work without

socket.on('locations', locations => {
    //addParagraph(message);
    //const jsonObject = JSON.parse(locations);
    locations.forEach((obj) => {
        console.log(obj.confession);
    }); 
})

function postConfession() {
    //get the users location
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
        enableHighAccuracy: true,
        maximumAge: 5000
    });
}

/*
function addParagraph(message) {
    // Create a new paragraph element
    const newParagraph = document.createElement('p');

    // Set the content of the paragraph
    newParagraph.textContent = message;

    // Append the new paragraph to the container
    paragraphContainer.appendChild(newParagraph);
}*/

const successCallback = (position) => {
    let lat = parseFloat(position.coords.latitude) * ( 1 + (Math.random() * 0.00005));
    let long = parseFloat(position.coords.longitude)* ( 1 + (Math.random() * 0.00005));
    let time = Date.now();
    let confession = document.getElementById("confessionBox").value;

    const data = {time, lat, long, confession};
    //createMarker(lat, long, confession);
    createMarker(lat, long, confession);
    sendMessage(data);
}

// Function to send a message to the server
function sendMessage(message) {
    //const messageInput = document.getElementById('submit');
    //const message = messageInput.value;
    socket.emit('confessionFromClient', message);
}


const errorCallback = (position) => {
    console.error(error);
}

function createMarker(lat, long, confession) {
    L.marker([lat, long]).addTo(map).bindPopup(confession).openPopup();
    
}