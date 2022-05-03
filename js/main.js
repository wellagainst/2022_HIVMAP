var map;

// functions for basic buttons
$(window).on('load', function () {
    $('#myModal').modal('show');
});

function changeButtonColor() {
    var buttons = $('button');
    buttons.click(function () {
        buttons.css('background-color', '#6495ED');
        buttons.css('color', 'black');
        $(this).css('background-color', '#4169E1');
        $(this).css('color', 'white');
    });
    // let count = 0
    // $("#"+2010).on('click', function() {
    //     $("#"+2010).css('background', '#ccc');
    //     count = 1
    // }); 
}
changeButtonColor();

function createMap() {
    //create the map
    map = L.map('map', {
        center: [40.775741717047744, -73.9586279476652],
        zoom: 10
    });

    L.tileLayer('https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
        attribution: '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 0,
        maxZoom: 22,
        subdomains: 'abcd',
        accessToken: 'gwIiZPEQplmK2l7l4pwuEAVeZR4VuHCCnf3NcC3X7vchYsSelzzDihxtA592jh3b'
    }).addTo(map);
    getData()
};
function getData() {
    //load the data
    fetch("data/PolicePrecincts.geojson")
        .then(function (response) {
            return response.json();
        })
        .then(function (json) {
            addPrecincts(json)
        });
};

function addPrecincts(precinctData){
    //initialize svg to add to map
    L.svg({clickable:true}).addTo(map) // we have to make the svg layer clickable 
    //Create selection using D3
    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto")
    // create a group that is hidden during zooming
    const g = svg.append('g').attr('class', 'leaflet-zoom-hide')
    
    // Use Leaflets projection API for drawing svg path (creates a stream of projected points)
    const projectPoint = function(x, y) {
      const point = map.latLngToLayerPoint(new L.LatLng(y, x))
      this.stream.point(point.x, point.y)
    }
    
    
    // Use d3's custom geo transform method to implement the above
    const projection = d3.geoTransform({point: projectPoint})
    // creates geopath from projected points (SVG)
    const pathCreator = d3.geoPath().projection(projection)
    
    const areaPaths = g.selectAll('path')
      .data(precinctData.features)
      .join('path')
      .attr('fill-opacity', 0.3)
      .attr('stroke', 'black')
      .attr("z-index", 3000)
      .attr('stroke-width', 2.5)
      .on("mouseover", function(d){
                  d3.select(this).attr("fill", "red")
              })
      .on("mouseout", function(d){
                  d3.select(this).attr("fill", "black")
              })
    
    // Function to place svg based on zoom
    const onZoom = () => areaPaths.attr('d', pathCreator)
    // initialize positioning
    onZoom()
    // reset whenever map is moved
    map.on('zoomend', onZoom)
}
createMap();

