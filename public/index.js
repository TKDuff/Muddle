//map setup
const map = L.map('brookfieldMap').setView([53.306, -6.183], 16);
const attribution ='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const tiles = L.tileLayer(tileUrl, { attribution });
tiles.addTo(map);

// Connect to the server
const socket = io('http://localhost:3000'); //the localhost address is not needed, will work without

// Function to send a message to the server
function sendMessage() {
    const messageInput = document.getElementById('messageInput');
    const message = messageInput.value;
    socket.emit('chat message', message);
    messageInput.value = ''; // Clear the input field
}

socket.on('locations', locations => {
    //addParagraph(message);
    //const jsonObject = JSON.parse(locations);
    locations.forEach((obj) => {
        console.log(obj.confession);
    }); 
})

/*
function addParagraph(message) {
    // Create a new paragraph element
    const newParagraph = document.createElement('p');

    // Set the content of the paragraph
    newParagraph.textContent = message;

    // Append the new paragraph to the container
    paragraphContainer.appendChild(newParagraph);
}*/


function postConfession() {
    //get the users location
    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, {
        enableHighAccuracy: true,
        maximumAge: 5000
    });
}


const successCallback = (position) => {
    let lat = parseFloat(position.coords.latitude) * ( 1 + (Math.random() * 0.00005));
    let long = parseFloat(position.coords.longitude)* ( 1 + (Math.random() * 0.00005));
    let time = Date.now();
    //let confession = document.getElementById("confessionBox").value;
    //createMarker(lat, long, confession);
    console.log(lat, long, time);

}

const errorCallback = (position) => {
    console.error(error);
}