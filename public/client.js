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
const showSplashScreen = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('showSplashScreen=')).split('=')[1]);

if (showSplashScreen === 'true') {showSplashScreenSVG()}

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
        a duplicate copy of the string, thus reducing memory. This is how the feed container post and marker icon use a reference to the same SVG string in the postCacheMap, not duplicate string

        The false means no need for new circle animation, as this is a pre-existing circle
        */
        createPost(document, Array.prototype.push, false);
    });
    document.getElementById('zoomTime').textContent = `Time taken: ${(performance.now() - startTime)} ms`;
    initClusterize(postData);
})

/*Adding a new post to top of the postData array
If added to top, shifts the current VS view up bu one post, so if looking at bottom, upon new post will shift view upto 2nd at bottom 
This code Preserves the Scroll Position, by recording pre addition height then re-applying post height when the new post is added simply maintains the height
*/
const feedContainer = document.getElementById('feedContainer');
socket.on('newPost', (Post) => {
    const previousScrollTop = feedContainer.scrollTop;

    createPost(Post, Array.prototype.unshift, true); //true: play the newly added circle animation while the user is viewing the map
    isPostDataUsed = true;
    clusterize.update(postData);


    feedContainer.scrollTop = previousScrollTop + 269;  //
});

socket.on('postError', (errorData) => {
    showErrorSvg(errorData.error, errorData.fontSize)
    //alert(error.error); // Display an alert to the user, or you could update the UI differently
});

socket.on('max-down-vote-delete', keyID => {
    deletePost(keyID);
});

function createPost(Post, arrayMethod, liveNewPost) {
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

    let svgString;

    
    if (userPosts.has(Post._id)) {  //check if the current post is a user post
        //use this to check if user post, if so create SVG string and now include the Bin SVG. Thus both the VS has the bin, not the map icon post
        let deleteButtonSVG = `
        <g transform="scale(1.4) translate(100, 140)" id="deleteButtonSVG">
        <path d="M3 4L5.30343 18.0765C5.54671 19.5633 6.60471 20.7872 8.04061 21.2431L8.36905 21.3473C10.7316 22.0973 13.2684 22.0973 15.6309 21.3473L15.9594 21.2431C17.3953 20.7872 18.4533 19.5633 18.6966 18.0765L21 4" fill="white" stroke="rgb(255, 0, 100)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        <ellipse cx="12" cy="4" rx="9" ry="2" fill="white" stroke="rgb(255, 0, 100)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
        </g>`

        svgString = createVSRectangleSVG(Post._id, 400, "hidden-option", deleteButtonSVG);

        localStorageVoteNotification(Post._id, Post.Up, Post.Down ) //if votes on user post while gone, the virtual scroll SVG string will display the notification icon, hence it is pushed to the postData array
        arrayMethod.call(userPostData, svgString)
    } else {
        svgString = createVSRectangleSVG(Post._id, 400)
    }

    const storedDocument = postCacheMap.get(Post._id);
    //map field 'leafletID' is the internal ID of that marker in the featureGroup, not the cookie ID. postCacheMap has both cookieID and internal leaflet ID, 1:1, so no need iterate given speicific cookie ID
    storedDocument.leafletID = createMarker(Post.location.coordinates[1], Post.location.coordinates[0], Post._id, liveNewPost);
    arrayMethod.call(postData, svgString)
    
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
            showErrorSvg( { error : nextPostTimeFormatted }, 20);            //TODO: Make alert actual popup, along with other alerts
            return;
        }*/

        let numberAfterHyphen = lastElementKey.substring(lastElementKey.lastIndexOf('-') + 1);   //get the number after the hyphon of the ID (this is the number of posts so far by that user)
        keyValue = `${key}-${parseInt(numberAfterHyphen) + 1}`;     //increment the number of posts so far by one and append to the user cookie (this is they new post ID)

        userPosts.set(keyValue, { Up: 0, Down: 0 });
        localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries()))); //push the new keyValue (user cookie + incremented number of post by user)   
    }

    if (invalidPostLength($('#customInput').val().trim().length)) {
        showErrorSvg( { error : "Post length must be between 5 and 250 characters" }, 16);
        return;
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
function createMarker(lat, long, keyID, liveNewPost) {
    const marker = L.marker([lat, long], {icon: createMarkerSVGIcon(keyID, liveNewPost)});
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

const createMarkerSVGIcon = (keyID, liveNewPost) => {  
    /*liveNewPost means the circle is added while the user is viewing the map. The animation plays in this case only, hence if true pass the classes which apply the animation */
    return L.divIcon({
        className: 'SVG-Icon',
        html : liveNewPost
        ? createCircleSVG(keyID, 25, "", "circle-pulse", "pulse-circle")
        : createCircleSVG(keyID, 25),  // Defaults will apply here
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


function createRectangleSVG(keyID, viewBox, deleteButtonSVG = "") {
    let [fontSize, textHeight] = getFontSize(postCacheMap.get(keyID)['confession'].length);

    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 ${viewBox} ${viewBox}">
                <rect x="0" y="0" width="200" height="200" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="200" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" 
                    style="font-size: ${fontSize}px;
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: ${textHeight}%; 
                    width: 100%; 
                    text-align: center;
                    word-break: break-word;
                    "
                    class="svg-text-content" >${postCacheMap.get(keyID)['confession']}</div>
                </foreignObject>
                <g id="Up">
                  <rect x="100" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="upMapIconArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                  <text id="Up-Count-${keyID}" x="130" y="195" font-size="25" fill="rgb(33, 202, 73)" class="svg-text-content">${postCacheMap.get(keyID)['Up']}</text>
                </g> 
      
                <g id="Down">
                  <rect x="0" y="170" width="100" height="30" fill-opacity="0" />
                  <path  id="downMapIconArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                  <text id="Down-Count-${keyID}" x="60" y="195" font-size="25" fill="rgb(255, 117, 117)" class="svg-text-content">${postCacheMap.get(keyID)['Down']}</text>
                </g>

                ${deleteButtonSVG}

                </svg>
                </div>`
}

function createVSRectangleSVG(keyID, viewBox, notificationOption = "hidden-option", deleteButtonSVG = "") {
    let [fontSize, textHeight] = getFontSize(postCacheMap.get(keyID)['confession'].length);
    return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg rectangle" viewBox="0 0 400 250">
                <rect x="0" y="0" width="400" height="230" rx="10" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="400" height="230">
                    <div xmlns="http://www.w3.org/1999/xhtml" 
                    style=
                    "font-size: ${fontSize * 1.4 + 3}px;
                    display: flex; 
                    justify-content: center; 
                    align-items: center; 
                    height: ${textHeight}%; 
                    width: 100%; 
                    text-align: center;
                    word-break: break-word;
                    "
                    class="svg-text-content" >${postCacheMap.get(keyID)['confession']}</div>
                </foreignObject>
                <text x="200" y="215" class="svg-bottom-text" text-anchor="middle">${format24HourTime(postCacheMap.get(keyID)['time'])}</text>
                <g id="Up">
                  <rect x="200" y="200" width="200" height="30" fill-opacity="0" />
                  <path  id="upArrow" d="M325.606,229.393l-150.004-150C172.79,76.58,168.974,75,164.996,75c-3.979,0-7.794,1.581-10.607,4.394
                  l-149.996,150c-5.858,5.858-5.858,15.355,0,21.213c5.857,5.857,15.355,5.858,21.213,0l139.39-139.393l139.397,139.393
                  C307.322,253.536,311.161,255,315,255c3.839,0,7.678-1.464,10.607-4.394C331.464,244.748,331.464,235.251,325.606,229.393z"/>
                  <text id="Up-Count-${keyID}" x="320" y="215" font-size="25" fill="rgb(33, 202, 73)" class="svg-text-content" data-id="Up-Count">${postCacheMap.get(keyID)['Up']}</text>
                </g> 
                
                <g id="Down">
                  <rect x="0" y="200" width="200" height="30" fill-opacity="0" />
                  <path  id="downArrow" d="M325.607,79.393c-5.857-5.857-15.355-5.858-21.213,0.001l-139.39,139.393L25.607,79.393
                  c-5.857-5.857-15.355-5.858-21.213,0.001c-5.858,5.858-5.858,15.355,0,21.213l150.004,150c2.813,2.813,6.628,4.393,10.606,4.393
                  s7.794-1.581,10.606-4.394l149.996-150C331.465,94.749,331.465,85.251,325.607,79.393z"/>
                  <text id="Down-Count-${keyID}" x="70" y="215" font-size="25" fill="rgb(255, 117, 117)" class="svg-text-content" data-id="Down-Count">${postCacheMap.get(keyID)['Down']}</text>
                </g>
                <circle id="red-circle" cx="200" cy="30" r="9" fill="red"  class=${notificationOption}></circle>

                ${deleteButtonSVG}

                </svg>
                </div>`
}

//problem with the darken-svg, seems to only darken upon switching circle -> rect -> circle
function createCircleSVG(keyID, viewBox, darken = "", circlePulse = "", pulseCircle = "") {
    return `<div class="SVG-Icon ${circlePulse}">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg circle ${darken}" viewBox="0 0 ${viewBox} ${viewBox}">
                <defs>
                    <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
                        <feDropShadow dx="1.5" dy="1.5" stdDeviation="2"/>
                    </filter>
                </defs>
                
                <circle cx="12.5" cy="12.5" r="12.5" fill="url(#Gradient-${keyID})" filter="url(#f1)" class="${pulseCircle}"/>
                </svg>
            </div>`
}

function getFontSize(characterCount) {
    if (characterCount <= 15) {
        return [40, 100];
    } else if (characterCount <= 30) {
        return [30, 100];
    } else if (characterCount <= 50) {
        return [25, 89];
    } else if (characterCount <= 75) {
        return [22, 89];
    } else if (characterCount <= 100) {
        return [19, 89];
    } else if (characterCount <= 150) {
        return [17, 85];
    } else if (characterCount <= 200) {
        return [15, 85];
    } else if (characterCount <= 225) {
        return [14, 85];
    } else {
        return [13, 85];
    }
}


function showErrorSvg(error, fontSize) {
    const container = document.getElementById('svgErrorContainer');

    const svgError =
    `<svg class="fade-in" width="415" height="65">
        <rect x="2" y="2" width="410" height="55" style="fill: red; stroke: black; stroke-width: 3;"  rx="30" ry="40"></rect>
        <text x="50%" y="45%" style="font-weight:bold;" fill="white" font-size="${fontSize}" text-anchor="middle" dominant-baseline="middle">${error.error}</text>
    </svg>`;
    
    container.innerHTML = svgError;


    setTimeout(() => {
        container.innerHTML = '';
    }, 4000); 
}


$('#buttonsContainer').on('click', '#postButton', function() {
    $('#inputPopup').show();
});

// Handle posting and hiding the popup
$('.post').on('click', function() {
    postConfession();
    toggleColor(document.getElementById('firstBackgroundCircle'));
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

// Variable to store the last clicked circle
let lastClickedCircle = null;

// Function to handle the toggling and ensure only one button is darkened
function toggleColor(clickedCircle) {
    const isCurrentlyDarkened = clickedCircle.classList.contains('animated-darken');

    // If a circle was clicked and is already darkened, lighten it and reset
    if (isCurrentlyDarkened) {
        clickedCircle.classList.remove('animated-darken');
        clickedCircle.classList.add('animated-lighten');
        lastClickedCircle = null;
    } 
    // If a different button was clicked
    else {
        if (lastClickedCircle) {
            lastClickedCircle.classList.replace('animated-darken', 'animated-lighten');
        }

        clickedCircle.classList.replace('animated-lighten', 'animated-darken');
        lastClickedCircle = clickedCircle;
    }
}

// Attach a single event listener to the buttons container
document.getElementById('buttonsContainer').addEventListener('click', (event) => {
    if(lastClickedCircle && lastClickedCircle.getAttribute('id') === 'firstBackgroundCircle') {
        $('#inputPopup').hide();
    }
    // Check if the clicked element is a button that should trigger the color toggle
    const clickedButton = event.target.closest('div');
    if (!clickedButton) return;

    // Get the associated circle using data attribute
    const circleId = clickedButton.getAttribute('data-circle-id');
    if (!circleId) return;

    if (circleId === 'firstBackgroundCircle' && !mapIsFullScreenVirtualScroll) {
        toggleVirtualScroll();
    }

    const circle = document.getElementById(circleId);
    if (circle) {
        toggleColor(circle);
    }
});

// Get the textarea, character count display, and foreignObject element
const customInput = document.getElementById('customInput');
const charCountDisplay = document.getElementById('postCharCount');

customInput.addEventListener('input', function () {
    // Get the current length of the input text
    const currentLength = customInput.value.length;

    // Update the character count display
    charCountDisplay.textContent = `${currentLength}/250`;

    // Get the appropriate font size and height based on the character count
    const [fontSize, textHeight] = getFontSize(currentLength);

    // Dynamically update the font size and height of the textarea
    customInput.style.fontSize = `${fontSize }px`;
    console
    document.getElementById('customForeignObject').setAttribute('y', (textHeight/2)-20)
});

function invalidPostLength(length) {
    return length <= 0 || length > 250;
}

function deletePost(postID) {
    socket.emit('deletePost', {keyVar: postID});
    removeFromLeaflet(postID);
    removeFromBothClusterizeArrays(postID);
    removeFromLocalStorage(postID);
    removePostGradient(postID);
}

function removeFromLeaflet(postID) {
    let marker = map._layers[postCacheMap.get(postID)['leafletID']];
    map.removeLayer(marker);
    svgMarkerGroup.removeLayer(marker);
}

function removeFromBothClusterizeArrays(postID) {

    let currentScrollTop = feedContainer.scrollTop;

    let index = postData.findIndex(item => item.includes(postID));
    postData.splice(index, 1);

    index = userPostData.findIndex(item => item.includes(postID));
    userPostData.splice(index, 1);
    postCacheMap.delete(postID);
    
    clusterize.update(postData);


    feedContainer.scrollTop = currentScrollTop - 134.5//heightDifference;
}
/*Be sure to put this after the function 'removeFromBothClusterizeArrays()' has been called, since that function iterates over 'userPosts' */
function removeFromLocalStorage(postID) {
    userPosts.delete(postID);
    localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries())));
    viewedPostSet.delete(postID); 
    localStorage.setItem('viewedPosts', JSON.stringify([...viewedPostSet]));
}

function removePostGradient(keyID) {
    const gradientElement = document.getElementById(`Gradient-${keyID}`);
    gradientElement.parentNode.removeChild(gradientElement);
}


function showSplashScreenSVG() {
    const container = document.getElementById('splashScreen');
    
    const svgError = 
                `<svg width="350" height="420">
                    <rect width="350" height="420" style="fill:#7192AD;" rx="10" ry="10"></rect>  <!-- Added rounded corners -->

                    <rect x="305" y="4" width="43" height="45" fill="transparent" cursor="pointer" class="closePopup"/>
                    <line x1="315" y1="15" x2="335" y2="35" class="closePopupLine closePopup"/>
                    <line x1="315" y1="35" x2="335" y2="15" class="closePopupLine closePopup"/>


                    <!-- Welcome Header -->
                    <text x="175" y="30" alignment-baseline="middle" text-anchor="middle" fill="white" font-size="18" class="svg-text-content svg-bold">
                        Welcome to Maynooths-Bored
                    </text>

                    <!-- Use foreignObject for auto-wrapping -->
                    <foreignObject x="20" y="35" width="310" height="390">
                    <div xmlns="http://www.w3.org/1999/xhtml" 
                        style="color:white; font-size:14px; font-family:'Roboto', sans-serif; line-height:1.6; margin: 0; padding: 0; word-wrap: break-word;">

                        <!-- Adjust line height and spacing for paragraphs -->
                        <p style="margin-bottom: 10px;">You've been assigned a unique ID that's stored in your browser, making you anonymous.</p>
                        <p style="margin-bottom: 10px;">Each 'post' is bound to the user's unique ID.</p>

                        <!-- Title for You Can Section -->
                        <p style="font-weight:bold; margin-top: 10px; margin-bottom: 5px;">You can...</p>
                        <ul style="padding-left: 15px; list-style-type: disc; margin-top: 5px; margin-bottom: 15px;">
                        <li>Create a new post every 3 hours</li>
                        <li>Vote up or down on posts</li>
                        <li>Delete posts you created</li>
                        </ul>

                        <!-- Title for Posts Section -->
                        <p style="font-weight:bold; margin-top: 10px; margin-bottom: 5px;">Posts...</p>
                        <ul style="padding-left: 15px; list-style-type: disc; margin-top: 5px; margin-bottom: 15px;">
                        <li>Can only be created within Maynooth's geographic area</li>
                        <li>Are deleted automatically after 5 downvotes</li>
                        </ul>

                        <!-- Final Note with wrapping and adjusted spacing -->
                        <p style="margin-top: 10px;">Please be respectful and downvote posts you don't like to see.</p>
                    </div>
                    </foreignObject>
                </svg>`;    
    container.innerHTML = svgError; 
}

$(".closePopup, #exitButton").on('click', function() {
    const container = document.getElementById('splashScreen');
    container.innerHTML = ''; 
    
});//Is it possible on the client side browser to check if there is a cookie in the cookie storage?