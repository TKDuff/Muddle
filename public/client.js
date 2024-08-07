//map setup
const map = L.map('MaynoothMap', {
    zoomControl: false
}).setView([53.5366871,  -7.3576551], 13);  //Upon launc the zoom is 13, that fits the bounding map of Mulligar set by the 'bounds' variable (see 'fitBounds')
L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=18a1d8df90d14c23949921bcb3d0b5fc', {
    attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    apikey: '18a1d8df90d14c23949921bcb3d0b5fc',
    maxZoom: 22,
    minZoom: 13

}).addTo(map);

var southWest = L.latLng(53.512570, -7.391644);
var northEast = L.latLng(53.552589, -7.328690);

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
const socket = io(flyIo, { //REMEBER TO ADD 'https://red-surf-7071.fly.dev/'
    transports: ['websocket'],
    withCredentials: true
  }); //the localhost address is not needed, will work without
const key = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]); //You need to look into this key variable, is it better to init it here, like a global variable
//let key = Math.floor((Math.random() * 1000) + 1);
const postCacheMap = new Map();
let svgMarkerGroup = L.featureGroup().addTo(map);

let postData = [];
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
    initClusterize(postData);
})

socket.on('newPost', (Post) => {
    createPost(Post)
    clusterize.update(postData);
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

    createCentralGradientDef(Post._id); //create single linear gradient, add it to the static dom, will be hidden but the id will be shared among all SVGs for that post (map circle, rectangle and V.S post)
    

    const storedDocument = postCacheMap.get(Post._id);
    let svgString = createVSRectangleSVG(Post._id, 400);

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

function wipeDB() {
    socket.emit('wipeDB');
}

function createFakePost() {
    socket.emit('createFakePost', document.getElementById("fakePostCommentBox").value)
}

const errorCallback = (position) => {
    console.error(error);
}


//########      Method that gets user location and sends it to the server     ##############################
const sendToServer = (position) => {
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
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
    // console.log(key);
    // key++;
    // console.log(key);
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

function createCentralGradientDef(keyID) {
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
                <stop offset="0%" id="Down" stop-color="var(--Down-gradient-${postCacheMap.get(keyID)['Down']})"/>
                <stop offset="50%" id="Middle" stop-color="yellow"/>
                <stop offset="100%" id="Up" stop-color="var(--Up-gradient-${postCacheMap.get(keyID)['Up']})"/>
            </linearGradient>
        `;
    defs.innerHTML += gradientMarkup; 
}

function createRectangleSVG(keyID, viewBox) {
    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 ${viewBox} ${viewBox}">
                <rect x="0" y="0" width="200" height="200" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="200" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="svg-text-content" >${keyID}, ${postCacheMap.get(keyID)['time']}</div>
                </foreignObject>
                <g id="Up">
                  <rect x="100" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="upArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                </g> 
      
                <g id="Down">
                  <rect x="0" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="downArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                </g>
                </svg>
                </div>`
}

function createVSRectangleSVG(keyID, viewBox) {
    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 ${viewBox} ${viewBox}">
                <rect x="0" y="0" width="200" height="200" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="200" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="svg-text-content" >${postCacheMap.get(keyID)['confession']}</div>
                </foreignObject>
                <g id="Up">
                  <rect x="100" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="upArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                </g> 
      
                <g id="Down">
                  <rect x="0" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="downArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                </g>
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

/*Server side check for post
-More than 10, less than 250
-Not Spam
-Not outside maynooth
-Not contains slurs*/