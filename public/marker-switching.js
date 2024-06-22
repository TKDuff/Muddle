/*In the file 'vote-handling', ctrl-f the line svgMarkerGroup.on('click', function(e) {, thats the function to switch between circle and rectangle icon upon click*/

/*When viewing virtual scroll, user cannot expand marker icons from circles into rectangles
  See posts in V.S and corresponding circle icons on the maps are shaded
  Thus, in V.S mode, the switch from circle to rectangle event does not happen
  Implemented by switching off the 'handleZoomEnd' and 'markerIconSVGSwitch' even functions
  'handleZoomAnim' is always on  */
map.on('zoomanim', handleZoomAnim);
map.on('zoomend', handleZoomEnd);
svgMarkerGroup.on('click', markerIconSVGSwitch);

const maxZoomLevel = 22;
const RECTICONSIZE = 200;
const CIRCICONSIZE = 20;
const CIRCICONANCHOR = CIRCICONSIZE/2;

let svgElement;


function handleZoomAnim(e) {
    let currentZoom =  e.zoom//map.getZoom();
    globalscaleFactor = Math.pow(1.125, currentZoom - maxZoomLevel);

    svgMarkerGroup.eachLayer(function(marker) {
        let icon = marker.getIcon();
        svgElement = $(marker._icon).find('.marker-svg');
        svgElement.css('transform', `scale(${globalscaleFactor})`);  
        

        let isCircle = svgElement.hasClass('circle');
        let iconSizeVal = isCircle ? CIRCICONSIZE : RECTICONSIZE;
        let anchorValue = iconSizeVal/2;

        let newSize = [iconSizeVal * globalscaleFactor, iconSizeVal * globalscaleFactor];
        let newAnchor = [anchorValue * globalscaleFactor, anchorValue * globalscaleFactor];

        icon.options.iconSize = newSize;
        icon.options.iconAnchor = newAnchor;

        /*First branch is special condition
        IF in virtual scroll mode (!mapIsFullScreen) and the current marker icon id is equal to the current id of the SVG post viewed in the virtual scroll (the row)
        THEN set the html to be the circle icon, but pass the 'darken-svg' parameter, which is applies that CSS class to the SVG, thus shading the circle
        
        When user viws virtual scroll post, the corresponding map marker circle is shaded, however when zoom the SVG string is re-applied and thus the CSS class shading is removed (darken-svg)
        This condition check if the current marker element is the corresponding currently viewed V.S post, if so, it updates the html and includes the CSS shading class in the html
        */

        if(!mapIsFullScreen && svgElement.attr('id') === observedVSmarkerSvgID) {
            icon.options.html = createCircleSVG(svgElement.attr('id'), 25, "darken-svg");
        } else if (isCircle) {
            icon.options.html = createCircleSVG(svgElement.attr('id'), 25);//createSVGTemplate(svgElement.attr('id'), 'circle', 25);
        }else {
            icon.options.html = createSVGTemplate(svgElement.attr('id'), 'rectangle', 200);
        }
        marker.setIcon(icon);
    });

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
        //console.log(keyID, 'has', postCacheMap.get(keyID)['Up'], 'upvotes');
        return createRectangleSVG(keyID, viewBox);
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


function adjustBrightness(zoomLevel) {
    let baseBrightness = 70;  // Base percentage for the brightness filter
    let adjustedBrightness = baseBrightness / Math.pow(1.125, zoomLevel - maxZoomLevel);
    return Math.min(Math.max(adjustedBrightness, 50), 100);  // Clamp the value to a reasonable range
}