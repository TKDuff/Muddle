$('#buttonsContainer').on('click', '#toggleButton', function() {
    isPostDataUsed = false;
    clusterize.update(userPostData);
    virtualScrollToggling('toggleButton');
    
    toggleSVGVisibility(1, 29 , 'none')

    
});


function toggleSVGVisibility(i, j, option) {
    const stylesheet = document.styleSheets[i];
    const cssRule = stylesheet.cssRules[j]; 
    /* TODO: This ensures the re-paint happens, is needed solely for the line 'toggleSVGVisibility(1,27, 'none')' called when hiding notification on clicking toggle button
    Beginning to show crack in such a large code-base
    */
    console.log(cssRule.style.display); 
    cssRule.style.display = option;//(cssRule.style.display === 'none' ? 'inline' : 'none'); //if currently none, set to inline, otherwise sets it to none
    
}

/*Takes in the postID, the corresponding up up/down votes the post has on the server side
If a posts vote numbers from the server side don't match the local storage corresponding post vote numbers, that means the post has been voted on while the user was gone thus...
1) Set the notification icon on the 'toggleButton' to true
2) Set the local storage 'userPosts' map field elements for the correpsonding posts match the server votes
3) Show the notification icon on the corresponding virtual scroll post, hence why the string is returned with 'visible-option' set (by default it is hidden)

If the votes are the same upon coming back, then just return the normal virtaul scroll SVG with no notification
 */
function localStorageVoteNotification(postId, UpNumber, DownNumber ) {
    let currentEntry = userPosts.get(postId);

    if (currentEntry.Up != UpNumber || currentEntry.Down != DownNumber) {
        document.styleSheets[1].cssRules[27].style.display = 'inline';
        // Update userPosts map if postId exists in it
        userPosts.set(postId, { Up: UpNumber, Down: DownNumber });
        localStorage.setItem('userPosts', JSON.stringify(Array.from(userPosts.entries())));
    }
}

/*Handles votes to user posts while user is active
Given the ID of the user post that was voted on
Find the index of the user post in the map
The postCacheMap and userPost have a 1:1 correspondance, so the index of a postCacheMap element corresponds direclty to its postData string 

Thus, iterate over each postCahceMap key keeping an index for iteration, if the key matches the passed in key the current index if the index of the corresponding postData element for that post
Using index, update the voted on postData element

Have 'count' to keep track of all the postCacheMap keys iterated that are userPost keys (belong in userPostData)
When eventaullu find the index for the postData, will also have the index in the userPostData array, and thus also update the SVG string in the userPostData array
Increments the count if the current key exists within userPosts. This seems to serve as a way to count how many user posts are encountered before finding the specific postID
Update the corresponding userPost element SVG, replacing the 'hidden' to the 'visible' option for the notification circle
  */
function sessionVirtualScrollPostNotification(postID, existingClass, newClass) {
    modifyClusterizeArraysElementStrings(postID, existingClass, newClass);

    if (isPostDataUsed) {
        /*TODO: On update replacing the SVG strings, thus the CSS transition (hidden-option) for the notification can't apply, SVG update before CSS finish */
        // If isPostDataUsed is true, update userPostData first, then postData
        clusterize.update(userPostData);
        clusterize.update(postData);
    } else {
        // If isPostDataUsed is false, update postData first, then userPostData
        clusterize.update(postData);
        clusterize.update(userPostData);
    }
}

/* TODO: Remove this, helper function to get the index of the 'non-user-post-svg' function, which gets the index of that class to display/hide the SVGs (for virtual scroll)*/
/*
getSVGVisibility();
function getSVGVisibility() {
    
    const stylesheets = document.styleSheets;
    const cssClass = 'non-user-post-svg';
    const svgContainer = document.querySelector('.SVG-Icon'); 

    
    for (let i = 0; i < stylesheets.length; i++) {  // stylesheets array-like object that holds all the stylesheets loaded on a webpage

        //stylesheet has a collection of rules, consist of a selector (classes) and declarations (properties of class)
        const rules = stylesheets[i].cssRules || stylesheets[i].rules;  

        //when iterate over rules, checking each rules selector text, in this case finding the matching class selector '.non-user-post-svg'
        for (let j = 0; j < rules.length; j++) {
            if (rules[j].selectorText === '.notification-circle-icon') {   //so if current rule is 'non-user-post-svg' then print the stylesheet number (1) and rule number (27)
                console.log("The i is",i, " the j is ", j)
                console.log(rules[j].style.display);
                break; // Stop the loop once we make the change
            }
        }
        //The index 27 means that within the specific stylesheet at index 1 in the document.styleSheets array, the rule for .non-user-post-svg is the 28th rule (because indexing starts at 0).
        //Knowing the exact location of the rule allows you to directly manipulate its properties, such as changing display from inline to none, without needing to iterate through all rules again
    }
}*/