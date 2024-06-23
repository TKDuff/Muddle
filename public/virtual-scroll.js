let mapIsFullScreen = true;
let clusterize = null;  // Holds the Clusterize instance
let observer;
let observedVSmarkerSvg = null;
let observedVSmarkerSvgID = null;   //id used by 'handleZoomAnim' to know which circle should retain the dark shading

$('#buttonsContainer').on('click', '#feedButton', function() {
    if (mapIsFullScreen) { //map is currently full screen, so switch it to half screen, turn off the event listener
        switchAllRectanglesToCircles();

        $('#MaynoothMap').css('height', '50%');
        $('#feedContainer').css('height', '50%');

        svgMarkerGroup.off('click', markerIconSVGSwitch);
        map.off('zoomend', handleZoomEnd);

        map.invalidateSize({pan: false});   //Updates map to reflect change in container size (map truly now half the screen), pan false prevents the map from automatically panning when its size is invalidated
        mapIsFullScreen = false; // Update the state
    } else {    
        /*if map is half screen (V.S) then switch is back to full screen and turn on event listener
        Don't need listeners...
        1) Upon clicking a marker don't need switch between circle and rectangle
        2) Upon zooming in past zoom 20, don't need to switch from circle to rectangle
        */
        $('#MaynoothMap').css('height', '100%');
        $('#feedContainer').css('height', '0%');

        svgMarkerGroup.on('click', markerIconSVGSwitch);    
        map.on('zoomend', handleZoomEnd);

        map.invalidateSize({pan: false});
        mapIsFullScreen = true; // Update the state
    }  
});

function initIntersectionObserver() {
//config for interaction observer
const options = {
    root: document.getElementById('feedContainer'), //element relative to which the visibility of the SVGs is checked, container with ID 'feedContainer'
    threshold: 0.5  // Adjust based on when you consider the SVG "in view"
};

/*Actually obtains the id of the current SVG post viewed in the Virtual Scrool feed (the row)
observedVSmarkerSvgID - store of the viewed SVG id
Upon vieing an SVG, the corresponding map marker icon is shaded*/
observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            //console.log("Currently viewing", entry.target.id); //this happens twice on some for some reason
            observedVSmarkerSvgID = entry.target.id; //only if observed
            document.querySelector(`.leaflet-marker-icon svg[id="${entry.target.id}"]`).classList.add('darken-svg');
        }else {
            document.querySelector(`.leaflet-marker-icon svg[id="${entry.target.id}"]`).classList.remove('darken-svg');
        }
    });
}, options);
}


/*attaches the Intersection Observer to all SVG elements in the feed container
Use the attribute 'data-observed' to only select SVGs within this container that have not been previously observed */
function observeSVGs() {
    const feedContainer = document.getElementById('feedContainer');
    // Select only SVGs within this container that have not been previously observed
    const svgs = feedContainer.querySelectorAll('.SVG-Icon svg');
    svgs.forEach(svg => {
        observer.observe(svg);  
        svg.setAttribute('data-observed', 'true'); // Mark as observed
    });
}  


function initClusterize(postData) {
    initIntersectionObserver();
    clusterize = new Clusterize({
        rows: postData,
        scrollId: 'feedContainer',
        contentId: 'clusterize-content',
        rows_in_block: 2,
        blocks_in_cluster: 2,
        callbacks: {
            clusterChanged: observeSVGs
        }
    });
    observeSVGs();
}

/*When SVG goes off screen, be sure to un-observe, so no longer hold reference to it */
function disconnectObserver() {
    const feedContainer = document.getElementById('feedContainer');
    const observedSVGs = feedOverlayContainer.querySelectorAll('svg[data-observed="true"]');
    observedSVGs.forEach(svg => {
        observer.unobserve(svg);
        svg.removeAttribute('data-observed'); // Clean up attribute
    });
}


/*In V.S mode, if observed SVG not withing map viewing bounds, if click on text then pan to the corresponding circle marker on the map
Receives id of clicked V.S SVG post, get the corresponding internal leaflet id
Use internal leaflet id to get actual markers lat/long
If marker lat/long out of bounds, pan to it
 */
function panToCorrespondingMapMarker(svgElement) {
    let marker = svgMarkerGroup.getLayer(postCacheMap.get(svgElement.attr('id')).leafletID);
    let markerLatLng = marker.getLatLng();
    
    if (!map.getBounds().contains(markerLatLng)) {
        map.panTo(markerLatLng);
    }
}