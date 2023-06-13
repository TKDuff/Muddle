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
    
    function addParagraph(message) {
        // Create a new paragraph element
        const newParagraph = document.createElement('p');
        
        // Set the content of the paragraph
        newParagraph.textContent = message;
        
        // Append the new paragraph to the container
        paragraphContainer.appendChild(newParagraph);
}