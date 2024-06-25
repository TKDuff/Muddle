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
    
    const defs = document.getElementById('global-defs');
    let gradient = defs.querySelector(`#Gradient-${confessionKeyID}`);

    let stop = gradient.querySelector(`stop#${direction}`);
    stop.setAttribute('stop-color', `var(--${direction}-gradient-${DirectionArrayLength})`);
}


let highestZIndex = 100;

//Event listener for markers on map, vote on post and switch between circle/rectangle upon click marker
function markerIconSVGSwitch (e) {
    let closestElement = $(e.originalEvent.target).closest('g#Down, g#Up');
    const clickedMarker = e.layer;  // The marker instance that was clicked
    const svgElement = $(clickedMarker._icon).find('svg');

    if (closestElement.length) {
        //socket.emit('voteOnMarker', {direction: closestElement.attr('id'), confessionKeyID: svgElement.attr('id'), keyID: key});
        handleVote(svgElement, closestElement.attr('id'));
        return;
    }   

    /*This should go in the marker-switching file, as it is the main code for switching between circle and rectangle on the map (upon clicking a marker) */
    if (svgElement.hasClass('circle')) {
        highestZIndex += 100
        clickedMarker.setZIndexOffset(highestZIndex);
        updateIcon(clickedMarker, svgElement.attr('id') ,'rectangle', RECTICONSIZE, 200);
    } else {
        updateIcon(clickedMarker, svgElement.attr('id') ,'circle', CIRCICONSIZE, 25);
    }
}

$('#clusterize-content').on('click', '.marker-svg', function(e) {
    let closestUpOrDown = $(e.target).closest('g#Up, g#Down');

    if (closestUpOrDown.length) {
        handleVote($(this), closestUpOrDown.attr('id'));
    } else {
        panToCorrespondingMapMarker($(this));
    }
});

//Helprer function to handle vote
function handleVote(svgElement, voteType) {
    let confessionID = svgElement.attr('id');
    socket.emit('voteOnMarker', {direction: voteType, confessionKeyID: confessionID, keyID: key});
}