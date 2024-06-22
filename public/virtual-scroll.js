let mapIsFullScreen = true;
let clusterize = null;  // Holds the Clusterize instance
let observer;
let observedVSmarkerSvg = null;

$('#buttonsContainer').on('click', '#feedButton', function() {
    if (mapIsFullScreen) { //map is currently full screen, so switch it to half screen, turn off the event listener
        switchAllRectanglesToCircles();

        $('#MaynoothMap').css('height', '50%');
        $('#feedContainer').css('height', '50%');

        svgMarkerGroup.off('click', markerIconSVGSwitch);
        map.off('zoomend', handleZoomEnd);

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

        mapIsFullScreen = true; // Update the state
    }  
});

function initIntersectionObserver() {
//config for interaction observer
const options = {
    root: document.getElementById('feedContainer'), //element relative to which the visibility of the SVGs is checked, container with ID 'feedContainer'
    threshold: 0.5  // Adjust based on when you consider the SVG "in view"
};

observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        observedVSmarkerSvg = document.querySelector(`.leaflet-marker-icon svg[id="${entry.target.id}"]`);
        if (entry.isIntersecting) {
            console.log("Currently viewing", entry.target.id);
            console.log(observedVSmarkerSvg);
            observedVSmarkerSvg.classList.add('darken-svg');
        }else {
            observedVSmarkerSvg.classList.remove('darken-svg');
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