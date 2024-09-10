let startTime = 0;
const maynoothCoords = [53.380022, -6.593628]

//map setup
const map = L.map('MaynoothMap', {
    zoomControl: false})
    .setView(maynoothCoords, 14);  //Upon launc the zoom is 13, that fits the bounding map of Mulligar set by the 'bounds' variable (see 'fitBounds')
    
L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=18a1d8df90d14c23949921bcb3d0b5fc', {
    attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    apikey: '18a1d8df90d14c23949921bcb3d0b5fc',
    minZoom: 14,
    maxZoom: 22
}).addTo(map).on('load', function() {
    startTime = performance.now();
});


var southWest = L.latLng(53.36458707964082, -6.617803573608399);
var northEast = L.latLng(53.39709744476498, -6.572227478027345);

var bounds = L.latLngBounds(southWest, northEast);

map.setMaxBounds(bounds);
map.fitBounds(bounds);      //Makes entire map visuble upon laoding, want this to be true, so when launch app see scope of all the posts. Better for user experience, see all the potential posts


map.on('drag', function() {
    map.panInsideBounds(bounds, { animate: false });
});

const mapDiv = document.getElementById('brookfieldMap');

const localIO = 'http://localhost:3000/';
const flyIo = 'https://red-surf-7071.fly.dev/';

// Connect to the server
const socket = io(localIO, { //REMEBER TO ADD 'https://red-surf-7071.fly.dev/'
    transports: ['websocket'],
    withCredentials: true
  }); //the localhost address is not needed, will work without


const key = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]); //You need to look into this key variable, is it better to init it here, like a global variable
//let key = Math.floor((Math.random() * 1000) + 1);
const postCacheMap = new Map();
let svgMarkerGroup = L.featureGroup().addTo(map);


let userPosts = JSON.parse(localStorage.getItem('userPosts') || 'null');    //This stores the IDs of the posts created by the client, if the array is not in local storage it is null

if (userPosts === null) {       //if not array in local storage called 'userPosts' (user hasn't created a post)
    userPosts = new Map();             //initialize as an empty array for userPosts
    localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries())));  // Store the empty array in localStorage
} else {
    userPosts = new Map(userPosts);
}


let viewedPostStorage = localStorage.getItem('viewedPosts');
let viewedPostSet;

// Check if 'viewedPosts' exists in localStorage and initialize if not
if (viewedPostStorage === null) {
    viewedPostSet = new Set();
    localStorage.setItem('viewedPosts', JSON.stringify([...viewedPostSet]));
} else {
    viewedPostSet = new Set(JSON.parse(viewedPostStorage));  // Parse the existing value into the global variable
}

let isPostDataUsed;
let postData = [];
let userPostData = [];

/*When client connects, all docuements in the database are sent to the client
when a new post is added to the mongoDB database, its mongoDB document data is sent to all clients
In both cases, handePostData(), handles the data as follows */
socket.on('allDocumentsFromDatabase', documents => { 
    documents.sort((a, b) => b.time - a.time);      //Can remove the sort
    documents.forEach(document => {
        /*You are passing the current documents svg string by reference here, not by value. This is key, as the postData holds a reference to the svg field of the current postCacheMap element. It does not have
        a duplicate copy of the string, thus reducing memory. This is how the feed container post and marker icon use a reference to the same SVG string in the postCacheMap, not duplicate string*/
        createPost(document);
    });
    document.getElementById('zoomTime').textContent = `Time taken: ${(performance.now() - startTime)} ms`;
    initClusterize(postData);
})

socket.on('newPost', (Post) => {
    createPost(Post)
    isPostDataUsed = true;
    clusterize.update(postData);
});

socket.on('postError', (error) => {
    showErrorSvg(error)
    //alert(error.error); // Display an alert to the user, or you could update the UI differently
});


function createPost(Post) {
    /*
    * Handles the post data from the server:
    * - Adds the "isCircle" boolean for SVG rendering.
    * - Converts "Up" and "Down" arrays to ints, the values are their lengths.
    * - Adds the post to the "postCacheMap".
    * - Creates an SVG Icon on the map.
    * - Adds SVG to postData array, which is used by virtual scroll feed
    */
    Post.Up = Post.Up.length;
    Post.Down = Post.Down.length;
    postCacheMap.set(Post._id, Post);
    
    //create single linear gradient, add it to the static dom, will be hidden but the id will be shared among all SVGs for that post (map circle, rectangle and V.S post)
    if (!viewedPostSet.has(Post._id)) {
        createCentralGradientDef(Post._id, "unviewed-default", "unviewed"); //if not viewed before make it white TODO: Change this to yellow
    } else {
        createCentralGradientDef(Post._id); //if viewed, by default made yellow TODO: Change to white
    }

    let svgString = createVSRectangleSVG(Post._id, 400);

    
    if (userPosts.has(Post._id)) {  //check if the current post is a user post
        localStorageVoteNotification(Post._id, Post.Up, Post.Down ) //if votes on user post while gone, the virtual scroll SVG string will display the notification icon, hence it is pushed to the postData array
        userPostData.push(svgString);
    }

    const storedDocument = postCacheMap.get(Post._id);
    //map field 'leafletID' is the internal ID of that marker in the featureGroup, not the cookie ID. postCacheMap has both cookieID and internal leaflet ID, 1:1, so no need iterate given speicific cookie ID
    storedDocument.leafletID = createMarker(Post.location.coordinates[1], Post.location.coordinates[0], Post._id);
    postData.push(svgString);
}

function postConfession() {
    navigator.geolocation.getCurrentPosition(sendToServer, errorCallback, {
        enableHighAccuracy: true,
        maximumAge: 5000
    });
}

//Doesn't wipe other clients local storage arrays, need to do that manually
function wipeDB() {
    localStorage.removeItem('viewedPosts');
    localStorage.removeItem('userPosts');
    socket.emit('wipeDB');
}

function createUniformFakePost() {
    socket.emit('createUniformFakePost', document.getElementById("fakePostCommentBox").value)
}

function createRandomFakePost() {
    socket.emit('createRandomFakePost', document.getElementById("fakePostCommentBox").value)
}

const errorCallback = (position) => {
    console.error(error);
}


//########      Method that gets user location and sends it to the server     ##############################
const sendToServer = (position) => {
    let keyValue;   // <user cookie>-<number of posts created by user>

    //fixme - create userPosts should be automatic if not exising, not dependant on calling this function
    if (userPosts.size === 0) {       //if not array in local storage called 'userPosts' (user hasn't created a post)
        keyValue = `${key}-0`;      //append 0 to their cookie
        userPosts.set(keyValue,  { Up: 0, Down: 0 } )
        localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries())));
    } else {        //if the 'userPost' array already exists (already created posts)   
        const keys = Array.from(userPosts.keys());
        const lastElementKey = keys.sort((a, b) => parseInt(a.split('-')[1]) - parseInt(b.split('-')[1])).pop();  //get the last posted items ID

        /*Check if the wait period since the last post has expired; if not, alert the user and halt further execution.
        This function doesn't need to be called if */ 
        
        /*
        const postCheck = checkNewPostCreatedAfterTimeWindow(lastElementKey);
        if (!postCheck.canPost) {
            const nextPostTimeFormatted = `You can post again at: ${format24HourTime(postCheck.nextPostTime)}` ;
            showErrorSvg( { error : nextPostTimeFormatted });            //TODO: Make alert actual popup, along with other alerts
            return;
        }*/

        let numberAfterHyphen = lastElementKey.substring(lastElementKey.lastIndexOf('-') + 1);   //get the number after the hyphon of the ID (this is the number of posts so far by that user)
        keyValue = `${key}-${parseInt(numberAfterHyphen) + 1}`;     //increment the number of posts so far by one and append to the user cookie (this is they new post ID)

        userPosts.set(keyValue, { Up: 0, Down: 0 });
        localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries()))); //push the new keyValue (user cookie + incremented number of post by user)   
    }

    const data = {
        time: Date.now(),
        location: {
            type: "Point",
            coordinates: [
                parseFloat(position.coords.longitude),  // longitude first
                parseFloat(position.coords.latitude)   // latitude second
            ]
        },
        // lat: parseFloat(position.coords.latitude/*53.385574*/) /* * (1 + (Math.random() * 0.000005))*/,
        // long: parseFloat(position.coords.longitude/*-6.598420*/) /* * (1 + (Math.random() * 0.000005)) */,
        confession: $('#customInput').val(), 
        Up: [],
        Down: []
    };

    socket.emit('confessionFromClient', {messageVar: data, keyVar: keyValue});
}

/*Creates the post circle to be displayed on the map.
Takes in the lat/long co-ords, confession which is the user text, keyID which is the posters Cookie and both direction Vote Counts */
function createMarker(lat, long, keyID) {
    const marker = L.marker([lat, long], {icon: createMarkerSVGIcon(keyID)});
    svgMarkerGroup.addLayer(marker);
    return L.stamp(marker); //returns the internal ID of the leaflet marker
}

/*
globalscaleFactor = Math.pow(1.125, currentZoom - maxZoomLevel);
Expression for GSF is above, decided the max bounds zoom will be the launch zoom, that being level 13. 
So (13-22)^1.25 is 0.3464394161146186
If change the starting view height, will have change hardcoded value (why not make it dynamic? No point in computing something that can be hardcoded)
See the method 'handleZoomAnim(e)' for extra on this, they a tied together. 
*/
let globalscaleFactor = 0.3464394161146186

const createMarkerSVGIcon = (keyID) => {  
    return L.divIcon({
        className: 'SVG-Icon',
        html:       createCircleSVG(keyID, 25),
        iconSize: [(CIRCICONSIZE*globalscaleFactor), (CIRCICONSIZE*globalscaleFactor)],
        //TODO: Look into whether CIRCICONANCHOR is needed, is just the iconsize divided by 2, only used in 2 areas of the code, hard to keep track
        iconAnchor: [CIRCICONANCHOR*globalscaleFactor, CIRCICONANCHOR*globalscaleFactor]});
};

function createCentralGradientDef(keyID, middleColour = 'viewed-default', viewed = "viewed") {
    /*
    Creates central defenition of all gradients used by each SVG
    Single post has three SVGs
    1) Map circle marker
    2) Map rectangle marker
    3) V.S post

    Instead of giving each of these having their own linearGradient, a single linearGradient is defined in the dom and hidden upon loading, each SVG for a posts references this single linear gradient
    So if N posts, instead of N*3 linear gradients, all 3 SVGs share the single linear gradient ID
    Changing this single linear gradient (the 'changeOneGradient()' function) is reflected in all SVGs using it, no need for extra code
    */
    const defs = document.getElementById('global-defs');

    let gradientMarkup = `
            <linearGradient id="Gradient-${keyID}" gradientUnits="objectBoundingBox" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" id="Down" stop-color="var(--${viewed}-Down-gradient-${postCacheMap.get(keyID)['Down']})"/>
                <stop offset="50%" id="Middle" stop-color="var(--${middleColour}"/>
                <stop offset="100%" id="Up" stop-color="var(--${viewed}-Up-gradient-${postCacheMap.get(keyID)['Up']})"/>
            </linearGradient>
        `;
    defs.innerHTML += gradientMarkup; 
}


const THIRTY_SECONDS_MS = 30 * 1000;    //TODO: can remove this, for testing
const THREE_HOURS_MS = 3 * 60 * 60 * 1000; //3 hours in milliseconds, TODO: change this value to set the time between user posts, could be 24
/*Check if new post to be created was made after set time period since the last post. Checking if new posts was made after the blocked posting period  */

function checkNewPostCreatedAfterTimeWindow(lastPostKey) {
    const timeSinceLastPost = Date.now() - postCacheMap.get(lastPostKey)['time'];

    if (timeSinceLastPost > THIRTY_SECONDS_MS) {
        return { canPost: true };
    } else {
        const remainingTime = THIRTY_SECONDS_MS - timeSinceLastPost;
        const nextPostTime = Date.now() + remainingTime; // When they can post next
        return { canPost: false, remainingTime, nextPostTime };
    }
}


function createRectangleSVG(keyID, viewBox) {
    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 ${viewBox} ${viewBox}">
                <rect x="0" y="0" width="200" height="200" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="200" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="svg-text-content" >${postCacheMap.get(keyID)['confession']}</div>
                </foreignObject>
                <g id="Up">
                  <rect x="100" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="upMapIconArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                  <text id="Up-Count-${keyID}" x="130" y="195" font-size="25" fill="rgb(33, 202, 73)">${postCacheMap.get(keyID)['Up']}</text>
                </g> 
      
                <g id="Down">
                  <rect x="0" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="downMapIconArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                  <text id="Down-Count-${keyID}" x="60" y="195" font-size="25" fill="rgb(255, 117, 117)">${postCacheMap.get(keyID)['Down']}</text>
                </g>
                </svg>
                </div>`
}

function createVSRectangleSVG(keyID, viewBox, notificationOption = "hidden-option") {
    /*
    If is a userpost, cannot be hidden. See the function 'toggleSVGVisibility()' in post-filtering.js
    TODO: CHange userPosts to a set (not array) so checking if id inside is O(1)*/ 

    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 400 250">
                <rect x="0" y="0" width="400" height="230" rx="10" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="400" height="230">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="svg-text-content" >${postCacheMap.get(keyID)['confession']}</div>
                </foreignObject>
                <text x="200" y="215" class="svg-bottom-text" text-anchor="middle">${format24HourTime(postCacheMap.get(keyID)['time'])}</text>
                <g id="Up">
                  <rect x="200" y="200" width="200" height="30" fill-opacity="0" />
                  <path  id="upArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                  <text id="Up-Count-${keyID}" x="320" y="215" font-size="25" fill="rgb(33, 202, 73)" data-id="Up-Count">${postCacheMap.get(keyID)['Up']}</text>
                </g> 
                
                <g id="Down">
                  <rect x="0" y="200" width="200" height="30" fill-opacity="0" />
                  <path  id="downArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                  <text id="Down-Count-${keyID}" x="70" y="215" font-size="25" fill="rgb(255, 117, 117)" data-id="Down-Count">${postCacheMap.get(keyID)['Down']}</text>
                </g>
                <circle id="red-circle" cx="200" cy="30" r="9" fill="red" class=${notificationOption}>
                </svg>
                </div>`
}

//problem with the darken-svg, seems to only darken upon switching circle -> rect -> circle
function createCircleSVG(keyID, viewBox, darken = "") {
    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg circle ${darken}" viewBox="0 0 ${viewBox} ${viewBox}">
                    <defs>
                        <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="1.5" dy="1.5" stdDeviation="2"/>
                        </filter>    
                    </defs>
                    <circle cx="12.5" cy="12.5" r="10" fill="url(#Gradient-${keyID})" filter="url(#f1)" />
                </svg>
            </div>`
}


function showErrorSvg(error) {
    console.log(error);
    const container = document.getElementById('svgErrorContainer');

    const svgError = `<svg width="500" height="100">
    <rect width="500" height="100" style="fill: red;"></rect>
    <text x="50" y="25" alignment-baseline="middle" text-anchor="middle" fill="white">${error.error}</text>
    </svg>`;
    
    container.innerHTML = svgError;  

    // Set a timer to clear the SVG after 5 seconds
    setTimeout(() => {
        container.innerHTML = '';  // Clears the SVG from the container
    }, 5000);  // 5000 milliseconds = 5 seconds
}

$('#buttonsContainer').on('click', '#postButton', function() {
    $('#inputPopup').show();
});


    // Handle hiding the popup
$(".closePopup, #exitButton").on('click', function() {
    $('#inputPopup').hide();
});

// Handle posting and hiding the popup
$('.post').on('click', function() {
    postConfession();
    //need handshake method here
    $('#inputPopup').hide();
});


// Function to format timestamp to a 24-hour time format
function format24HourTime(timestamp) {
    const date = new Date(timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
}

/*
Add post ID to the local storage viewedPosts array as store of viewed posts
Change colour of corresponding gradient from white to yellow (from unviewed to viewed CSS variable) TODO: Should be yellow to white, down the line
 */
function pushViewedPostID(postID) {
    viewedPostSet.add(postID);  // Attempt to add the postID to the set
    localStorage.setItem('viewedPosts', JSON.stringify([...viewedPostSet]));    // Convert the Set to an array and save it back to localStorage

    let gradient = document.getElementById("Gradient-" + postID);
    let stops = gradient.querySelectorAll('stop');
    
    stops[0].setAttribute('stop-color', stops[0].getAttribute('stop-color').replace('unviewed', 'viewed'));
    stops[1].setAttribute('stop-color', stops[1].getAttribute('stop-color').replace('unviewed', 'viewed'));
    stops[2].setAttribute('stop-color', stops[2].getAttribute('stop-color').replace('unviewed', 'viewed'));
}

