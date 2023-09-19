//map setup
const map = L.map('brookfieldMap').setView([53.384271,  -6.600583], 19);
L.tileLayer('https://tile.thunderforest.com/neighbourhood/{z}/{x}/{y}.png?apikey=18a1d8df90d14c23949921bcb3d0b5fc', {
    attribution: '&copy; <a href="http://www.thunderforest.com/">Thunderforest</a>, &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    apikey: '18a1d8df90d14c23949921bcb3d0b5fc',
    maxZoom: 22

}).addTo(map);
const mapDiv = document.getElementById('brookfieldMap');

const localIO = 'http://localhost:3000/';
const flyIo = 'https://red-surf-7071.fly.dev/';

// Connect to the server
const socket = io(localIO, { //REMEBER TO ADD 'https://red-surf-7071.fly.dev/'
    transports: ['websocket'],
    withCredentials: true
  }); //the localhost address is not needed, will work without
const key = decodeURIComponent(document.cookie.split(';').find(cookie => cookie.trim().startsWith('userData=')).split('=')[1]);//Math.floor((Math.random() * 1000) + 1); //You need to look into this key variable, is it better to init it here, like a global variable
const postCacheMap = new Map();
let svgMarkerGroup = L.featureGroup().addTo(map);

/*When client connects, all docuements in the database are sent to the client
when a new post is added to the mongoDB database, its mongoDB document data is sent to all clients
In both cases, handePostData(), handles the data as follows */
socket.on('allDocumentsFromDatabase', documents => {
    documents.forEach(handlePostData); 
})
socket.on('newPost', (Post) => {
    handlePostData(Post);
});

/*
 * Handles the post data from the server:
 * - Adds the "isCircle" boolean for SVG rendering.
 * - Converts "Up" and "Down" arrays to ints, the values are their lengths.
 * - Adds the post to the "postCacheMap".
 * - Creates an SVG Icon on the map.
 */
function handlePostData(obj) {
    obj.Up = obj.Up.length 
    obj.Down = obj.Down.length
    postCacheMap.set(obj._id, obj)
    createMarker(obj.lat, obj.long, obj._id/*, obj.confession, obj.Down, obj.Up*/);
}

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
    const data = {
        time: Date.now(),
        lat: parseFloat(/*position.coords.latitude*/53.385574) * (1 + (Math.random() * 0.000005)),
        long: parseFloat(/*position.coords.longitude*/-6.598420) * (1 + (Math.random() * 0.000005)),
        confession: document.getElementById("confessionBox").value,
        Up: [],
        Down: []
    };
    socket.emit('confessionFromClient', {messageVar: data, keyVar: key});
} 


/*
When a user votes on a value, this even is called
action is either 1, -1 or null, direction is either 'up' or 'down', oppositeDirection is either null or the opposite, 
confessionKeyID is the id of the post that was voted on
If action is null, that means switched vote, so call amendpostCacheMapVoteValues() twice,
to decrement opposite direction int, then to increment target direction int
*/
socket.on('newArrayLengths', (action, direction, oppositeDirection , confessionKeyID) => {
    if(action){
        amendpostCacheMapVoteValues(action, confessionKeyID, direction);
    } else {
        amendpostCacheMapVoteValues(-1, confessionKeyID, oppositeDirection);
        amendpostCacheMapVoteValues(1, confessionKeyID, direction);
    }
})
/*amends the direction int values for the specific post object in postCacheMap map collection
action is 1 or -1, thus it get the current value and adds action, then sets the value to be the inc/decremented value
Then changeOneGradient() is called with the new value*/
function amendpostCacheMapVoteValues (action, confessionKeyID, direction) {
    let postDirectionValue = postCacheMap.get(confessionKeyID);
    postDirectionValue[direction] += action;
    postCacheMap.set(confessionKeyID, postDirectionValue);
    changeOneGradient(postDirectionValue[direction], direction, confessionKeyID);
}
const MIDDLE = 50
const MIDDLE_OFFSET = 5
function changeOneGradient(DirectionArrayLength, direction, confessionKeyID) {
    let middleOffsetValue = postCacheMap.get(confessionKeyID).Down - postCacheMap.get(confessionKeyID).Up
    middleOffsetValue = (middleOffsetValue * 5) +50;

    var svgPost = $(`#${confessionKeyID}`);
    let gradientIndex = `--${direction}-gradient-${DirectionArrayLength}`;


    console.log(svgPost, gradientIndex , DirectionArrayLength, direction, confessionKeyID);
    svgPost.find(`linearGradient#Gradient-${confessionKeyID} stop#${direction}`).attr('stop-color', `var(${gradientIndex})`);
    svgPost.find(`linearGradient#Gradient stop#Middle`).attr('offset', `${middleOffsetValue}%`);
}

/*Creates the post circle to be displayed on the map.
Takes in the lat/long co-ords, confession which is the user text, keyID which is the posters Cookie and both direction Vote Counts */
function createMarker(lat, long, keyID) {
    const marker = L.marker([lat, long], {icon: createCircleDivIcon(keyID)});
    svgMarkerGroup.addLayer(marker);
}
let globalscaleFactor = 1;
const RECTICONSIZE = 200;
const CIRCICONSIZE = 20;
const CIRCICONANCHOR = CIRCICONSIZE/2;

const createCircleDivIcon = (keyID) => {
    return L.divIcon({
        className: 'SVG-Icon',
        html: createSVGTemplate(keyID, 'circle', 30),
        iconSize: [CIRCICONSIZE, CIRCICONSIZE],
        iconAnchor: [CIRCICONANCHOR, CIRCICONANCHOR]});
};



let highestZIndex = 100;
let test = 'blue';
svgMarkerGroup.on('click', function(e) {
    let closestElement = $(e.originalEvent.target).closest('g#Down, g#Up');
    const clickedMarker = e.layer;  // The marker instance that was clicked
    const svgElement = $(clickedMarker._icon).find('svg');

    if (closestElement.length) {
        socket.emit('voteOnMarker', {direction: closestElement.attr('id'), confessionKeyID: svgElement.attr('id'), keyID: key});
        return;
    }

    if (svgElement.hasClass('circle')) {
        highestZIndex += 100
        clickedMarker.setZIndexOffset(highestZIndex);
        updateIcon(clickedMarker, svgElement.attr('id') ,'rectangle', RECTICONSIZE, 200);
    } else {
        updateIcon(clickedMarker, svgElement.attr('id') ,'circle', CIRCICONSIZE, 25);
    }

    test = 'red';
})

function updateIcon(marker, key ,newShape, newSize, newViewBox) {
    newSize *= globalscaleFactor;
    let Anchor = newSize/2;
    let icon = marker.getIcon();
    icon.options.iconSize = [newSize, newSize];
    icon.options.iconAnchor = [Anchor, Anchor]
    icon.options.html = createSVGTemplate(key, newShape, newViewBox);
    marker.setIcon(icon);
}

function createSVGTemplate(keyID, shape, viewBox) {
    if(shape === 'rectangle'){
        //console.log(keyID, 'has', postCacheMap.get(keyID)['Up'], 'upvotes');
        return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg ${shape}" viewBox="0 0 ${viewBox} ${viewBox}">
                <defs>
                <linearGradient id="Gradient-${keyID}" gradientUnits="userSpaceOnUse" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" id="Down" stop-color="var(--Down-gradient-${postCacheMap.get(keyID)['Down']})"/>
                <stop offset="33.33%" id="Middle" stop-color="yellow"/>
                <stop offset="100%" id="Up" stop-color="var(--Up-gradient-${postCacheMap.get(keyID)['Up']})"/>
                </linearGradient>
                </defs>
                <rect x="0" y="0" width="200" height="200" filter="url(#f1)" fill="url(#Gradient-${keyID})"/>
                <foreignObject x="0" y="0" width="200" height="200">
                    <div xmlns="http://www.w3.org/1999/xhtml" class="svg-text-content" >Test with some text</div>
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
    } else {
        return `<div class="SVG-Icon">
                <svg xmlns="http://www.w3.org/2000/svg" id="${keyID}" class="marker-svg circle" viewBox="0 0 ${viewBox} ${viewBox}">
                <use href="#circle" />
                </svg>
                </div>`;
    }
}
