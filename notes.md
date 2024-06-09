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

