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