## 29-05-2024
No clustering, don't think it is necessary. What is the point of clustering? It reduces the amount of points on the screen to make it clearer, however no one uses the website (or will) so no need, just extra work
I rather a users sees loads of posts than a number of how many posts, which is better, a dozen points (by the eye) or stating there is 10 posts
Clustering also adds more confusion, extra clicks, need to zoom in to ungroup the cluster, then actually click on the post. 
Cannot add the arrow keys/quick movement feature using clustering 
Simply, it is a barrier between the users and the posts, extra layer of uneeded complexity. 
I will make it that if a post overlaps with another, the next post will be moved to free space (keep on looking until a space is free), may throw off location a bit, doesn't matter all that much

Solve overlapping posts
Fix UI problem of circle showing up now and again, seems buggy, on phone it happens

## 02-06-2024
You are not going to cache on the server side yet, still prototyping with mongoDB phase
When you have the fully working server functionality, then optimise with redis
Like, know what data should be cached now
You learned from FYP, NEVER PRE-OPTIMISE, get it working now. 

You should focus on centralised server on source of truth approach
Makes for fastest initial loading time, concern with chatty system but for plain user just looking at posts, it is the quickest approach to get it loading
Don't pre-optimise

So overlapping check on the server side, simple mongoDB query. Have a load of helper functions. 
Big thing, you need to change the lat/long fields from doubles to geojson types. 

GPT: Deployment and Scaling: In real-life applications, especially in production environments, you might handle database migrations and index creations separately from your application code, often using dedicated scripts or during the CI/CD pipeline. This helps in managing different stages of deployment, including development, testing, and production, without mixing deployment logic with application logic.

Currently each post circle diameter is around '0.4653' metres, so radius is 0.23265 meters
Need to re-affirm this is for phone primarily, trying to get location on mobile device is hard and wrong
So primarily for phones

## 07-06-2024
To check if two posts overlap, create a new post, find the lat long on the edge of the circle
THen in client.js manually set the lat/long of the new posts created to that lat/long,
Don't use the 'parseFloat(position.coords' in the 'SendtoServer' function

Use these for ease
long, lat
-7.35761046409607,53.53674824756847

## 9-6-2024
Question: Do you understand the markers are initially circles, but when clicked on expand into rectangles? and when rectangles are clicked to go back to default circles? A key thing is when virtual scroll is enabled, the circles on the map cannot be clicked and expanded out into rectangles, so only the virtual scroll has the rectangles, until it is back 100% map again (no v.s)

You are going to store the post SVGs in the cache map, thus both the virtual scroll and the markers get their String SVG from the same area
However, if you want the V.S post to differ to the marker posts, then you can differ them from each other simpler

Here what GPT says
"Dynamic Modification for Context
When you need to use the SVG, modify it according to where it's being used. For example, if the virtual scroll requires a different attribute, can dynamically when generating the HTML for the virtual scroll.

function getVirtualScrollSVG(keyID, postData) {
    // Assume the base SVG is valid and make a modification
    let svgString = postData.baseSVG;
    // Modify the SVG string by adding or changing details specific to the virtual scroll
    return svgString.replace('</svg>', '<circle cx="100" cy="100" r="10" fill="red"></circle></svg>');
}
"
**Simply**
postCahceMap stores metadata about post and the SVG html string itself
Marker and Virtual Scroll posts will both reference the associate SVG string in cache, thus same region in memory
Two different areas, marker and V.S post using 1 part of memory, halfing the memory

As of now, each SVG string is bound to the marker, now the marker will reference the associated cache SVG string

## 24-6-2024
You are going to go with a central def for all the linear gradients 
As of now have a single linear gradient is used by 3 seperate SVGs
1) Map rectangle
2) Map circle
3) V.S post

Was thinking of giving each of them their own linearGradient in the SVG string, thus that is 3 times the linear gradient
So is 10 posts, that is 10*3 = 30 linear gradients
The V.S, Map circle and rectangle is added/removed from the dom dynamicically, thus eaach of their linear gradients is not stable on the dom, have to be re-added

Simply better to have a central defenition containing all the linearGradients in one place that is created upon page load. 
A single post references a single linearGradient defenition in the 3 different locations
So upon page load, create all the linearGradients and hide them, each has an id, then 1,2 and 3 just references the single ID that is not removed at any stage

A change to the linear gradient is reflected in each, better than giving each their own l.g and having to write javascript to change each upon changing one

What about laoding times? You thougt, well either way the linear gradients will have to be loaded, and better load N amount of l.g at the start instead of N*3 linear gradients (and extra code to reflect changes)