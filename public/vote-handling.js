/*
When a user votes on a value, this even is called
action is either 1, -1 or null, direction is either 'up' or 'down', oppositeDirection is either null or the opposite, 
confessionKeyID is the id of the post that was voted on
If action is null, that means switched vote, so call amendpostCacheMapVoteValues() twice,
to decrement opposite direction int, then to increment target direction int
*/

let changedVoteValue;
socket.on('newArrayLengths', (action, direction, oppositeDirection , confessionKeyID) => {
    if(action){
        changedVoteValue = amendpostCacheMapVoteValues(action, confessionKeyID, direction);
    } else {
        amendpostCacheMapVoteValues(-1, confessionKeyID, oppositeDirection);
        changedVoteValue = amendpostCacheMapVoteValues(1, confessionKeyID, direction);
    }

    /*This may be the most innefficent part of the program
    Every time a vote happens above, this checks if the voted on post ID is contained in the 'userPosts' array, since using array is O(N) TODO: Change array to set
    Could make socket emit to specific client who's post was voted on (io.to(socket.id).emit('hello',) but socket doesn't correspond client ID to user connection, would have to implement map
    So for every vote, there is a useless check 99% of the time
     */
    if ( userPosts.has(confessionKeyID) ) {
        voteNotificationStyling(action, direction, oppositeDirection , confessionKeyID, changedVoteValue);
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
    changeVoteTextValue(postDirectionValue[direction], direction, confessionKeyID);
    return postDirectionValue[direction];
}


const MIDDLE = 50
const MIDDLE_OFFSET = 5
function changeOneGradient(DirectionArrayLength, direction, confessionKeyID) {
    let middleOffsetValue = postCacheMap.get(confessionKeyID).Down - postCacheMap.get(confessionKeyID).Up
    middleOffsetValue = (middleOffsetValue * 5) +50;
    
    const defs = document.getElementById('global-defs');
    let gradient = defs.querySelector(`#Gradient-${confessionKeyID}`);

    let stop = gradient.querySelector(`stop#${direction}`);
    stop.setAttribute('stop-color', `var(--viewed-${direction}-gradient-${DirectionArrayLength})`);
}

function changeVoteTextValue(DirectionArrayLength, direction, confessionKeyID) {
    /*This will change a particualr vote direction value, doing 2 things
    1) Change the actual post html text, so the user will see the changw
    2) Update the coressponding SVG string element in both the postData and userPostData arrays
    This is better than calling update, no need update entire array when only one text item changes, also since both arrays updated cauases screen jank

    Then get working for posts voted on in real time but that are not user posts

    Doing this would require changing 3 things, the postCacheMap string SVG, the postData and userPostData svg string arrays at that element
    This has been done before
     */
    let existingSVGPattern = new RegExp(`data-id="${direction}-Count">\\d+</text>`);

    modifyClusterizeArraysElementStrings(confessionKeyID, existingSVGPattern, `data-id="${direction}-Count">${DirectionArrayLength}</text>`)
    document.getElementById(`${direction}-Count-${confessionKeyID}`).textContent = DirectionArrayLength;

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
        pushViewedPostID(svgElement.attr('id'))
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


function voteNotificationStyling(action, direction, oppositeDirection , KeyID, changedVoteValue) {
    let currentEntry = userPosts.get(KeyID);
    currentEntry[direction] = changedVoteValue;
    userPosts.set(KeyID, currentEntry);

    if (oppositeDirection !== null) { //if switch vote, ensures the corresponding local storage elements Up and Down fields swap values appropriatly
        currentEntry[oppositeDirection] = currentEntry[oppositeDirection]-1;
        userPosts.set(KeyID, currentEntry);
    }    
    localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries())));
    document.styleSheets[1].cssRules[27].style.display = 'inline';

    sessionVirtualScrollPostNotification(KeyID, "hidden-option", "visible-option");
}


/*
function testFunctionModifySVGStringCode(postID, existingSVGString, newSVGString) {
    let index = 0;
    let count = 0;
    for (let key of postCacheMap.keys()) {
        if (key === postID) {
            console.log(existingSVGString, "\n", newSVGString); 
            
            let updatedSVG = postData[index].replace(existingSVGString, newSVGString);
            postData[index] = updatedSVG;
            userPostData[count] = updatedSVG;
            break;
        } else if (userPosts.has(key)) {
            count++;
        }  
        index++;
    }
}*/

function modifyClusterizeArraysElementStrings(postID, existingSVGString, newSVGString) {
    //console.log("The string", existingSVGString, " has to be changed to ", newSVGString);
    let updatedSVG = ""
    let index = 0;
    let count = 0;

    for (let key of postCacheMap.keys()) {
        if (key === postID) {     
            updatedSVG = postData[index]
            updatedSVG = updatedSVG.replace(existingSVGString, newSVGString);
            postData[index] = updatedSVG;
            userPostData[count] = updatedSVG;
            break;
        } else if (userPosts.has(key)) {
            count++;
        }  
        index++;
    }
}