/*In the file 'vote-handling', ctrl-f the line svgMarkerGroup.on('click', function(e) {, thats the function to switch between circle and rectangle icon upon click*/

/*When viewing virtual scroll, user cannot expand marker icons from circles into rectangles
  See posts in V.S and corresponding circle icons on the maps are shaded
  Thus, in V.S mode, the switch from circle to rectangle event does not happen
  Implemented by switching off the 'handleZoomEnd' and 'markerIconSVGSwitch' even functions
  'handleZoomAnim' is always on  */
//map.on('zoomanim', handleZoomAnim);

map.on('zoomanim', function(e) {
    handleZoomAnim(e.zoom);
});

map.on('zoomend', handleZoomEnd);
svgMarkerGroup.on('click', markerIconSVGSwitch);

const maxZoomLevel = 22;
const RECTICONSIZE = 200;
const CIRCICONSIZE = 20;
const CIRCICONANCHOR = CIRCICONSIZE/2;

let svgElement;

/*
Circle
icon size: 20
anchor: 10
Circle SVG size: 25
 */

function handleZoomAnim(currentZoom) {
    let startTime = performance.now();
    
    console.log(currentZoom)
    globalscaleFactor = Math.pow(1.125, currentZoom - maxZoomLevel);

    //Pre-compute the size of both circles/rectangles based on zoom GSF
    let circleSize = [CIRCICONSIZE * globalscaleFactor, CIRCICONSIZE * globalscaleFactor];
    let circleAnchor = [(CIRCICONSIZE / 2) * globalscaleFactor, (CIRCICONSIZE / 2) * globalscaleFactor];

    let rectangleSize = [RECTICONSIZE * globalscaleFactor, RECTICONSIZE * globalscaleFactor];
    let rectangleAnchor = [(RECTICONSIZE / 2) * globalscaleFactor, (RECTICONSIZE / 2) * globalscaleFactor];


    
    svgMarkerGroup.eachLayer(function(marker) {
        let icon = marker.getIcon();
        svgElement = $(marker._icon).find('.marker-svg');
        svgElement.css('transform', `scale(${globalscaleFactor})`); 
        let isCircle = svgElement.hasClass('circle');


        if (isCircle) {
            icon.options.iconSize = circleSize;
            icon.options.iconAnchor = circleAnchor;
        } else {
            icon.options.iconSize = rectangleSize;
            icon.options.iconAnchor = rectangleAnchor;
        }
        
        /*
        First branch is special condition
        IF in virtual scroll mode (!mapIsFullScreenVirtualScroll) and the current marker icon id is equal to the current id of the SVG post viewed in the virtual scroll (the row)
        THEN set the html to be the circle icon, but pass the 'darken-svg' parameter, which is applies that CSS class to the SVG, thus shading the circle
        
        When user viws virtual scroll post, the corresponding map marker circle is shaded, however when zoom the SVG string is re-applied and thus the CSS class shading is removed (darken-svg)
        This condition check if the current marker element is the corresponding currently viewed V.S post, if so, it updates the html and includes the CSS shading class in the html
        */

        if(!mapIsFullScreenVirtualScroll && svgElement.attr('id') === observedVSmarkerSvgID) {   //could use the postCacheMap leafletID field to make this O(1), no need to check on each iteration. No big difference if done
            icon.options.html = createCircleSVG(svgElement.attr('id'), 25, "darken-svg");
        } else if (isCircle) {
            icon.options.html = createCircleSVG(svgElement.attr('id'), 25);
        }else {
            icon.options.html = createSVGTemplate(svgElement.attr('id'), 'rectangle', 200);
        }
        
        marker.setIcon(icon);
    });
    //TODO: Remove these
    let endTime = performance.now();
    document.getElementById('zoomTime').textContent = `Time taken: ${(endTime - startTime).toFixed(4)} ms`;

};


let previousZoom = 16;
/*When zoom ends, if in V.S mode this function is not called upon zoom in event*/
function handleZoomEnd(e) {
    let bounds = map.getBounds();   //current bounds of map (visible map)
    currentZoom = map.getZoom();    //current zoom

    //Upon zooming in
    if(currentZoom > previousZoom && currentZoom >= 20){    //if zooming in and zoom greater than 20
        svgMarkerGroup.eachLayer(function(marker) {         //for each marker
        svgElement = $(marker._icon).find('.marker-svg');   //get the marker SVG

        if(bounds.contains(marker.getLatLng()) && svgElement.hasClass('circle')) {  //if a marker is within the current visible bounds (viewing it) AND it is a circle (not a rectangle)
            updateIcon(marker, svgElement.attr('id'), 'rectangle', RECTICONSIZE, 200);  //switch the icon from the circle to a rectangle
            pushViewedPostID(svgElement.attr('id'))
        }
    }) 
    }
    previousZoom = map.getZoom();
};

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
        //do simple check here, if userPostData contains keyID, then include delete button
        let result = userPostData.some(item => item.includes(keyID)) 
        ? `<g transform="scale(1.2) translate(70, 144)" id="deleteButtonSVG">
           <path d="M3 4L5.30343 18.0765C5.54671 19.5633 6.60471 20.7872 8.04061 21.2431L8.36905 21.3473C10.7316 22.0973 13.2684 22.0973 15.6309 21.3473L15.9594 21.2431C17.3953 20.7872 18.4533 19.5633 18.6966 18.0765L21 4" fill="white" stroke="rgb(255, 0, 100)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
           <ellipse cx="12" cy="4" rx="9" ry="2" fill="white" stroke="rgb(255, 0, 100)" stroke-width="1" stroke-linecap="round" stroke-linejoin="round"/>
           </g>`
           :
           "";
        return createRectangleSVG(keyID, viewBox, result);
    } else {
        return createCircleSVG(keyID, viewBox);
    }
}

function switchAllRectanglesToCircles () {
    svgMarkerGroup.eachLayer(function(marker) {
        svgElement = $(marker._icon).find('.marker-svg');
        if (svgElement.hasClass('rectangle')) {
            updateIcon(marker, svgElement.attr('id') ,'circle', CIRCICONSIZE, 25);
        } 
    });
};
