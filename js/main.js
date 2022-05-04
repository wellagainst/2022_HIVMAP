var map;
var attrArray = ["Borough", "Asian_Population", "2021_S1", "2021_S2", "2021_S3", "2021_S4",
    "2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010",
    "FELONY_2021_S1", "FELONY_2021_S2", "FELONY_2021_S3", "FELONY_2021_S4",
    "MISDEMEANDOR_2021_S1", "MISDEMEANDOR_2021_S2", "MISDEMEANDOR_2021_S3",
    "MISDEMEANDOR_2021_S4", "VIOLATION_2021_S1", "VIOLATION_2021_S2",
    "VIOLATION_2021_S3", "VIOLATION_2021_S4", "FELONY_2020", "FELONY_2019",
    "FELONY_2018", "FELONY_2017", "FELONY_2016", "FELONY_2015", "FELONY_2014",
    "FELONY_2013", "FELONY_2012", "FELONY_2011", "FELONY_2010", "MISDEMEANDOR_2020",
    "MISDEMEANDOR_2019", "MISDEMEANDOR_2018", "MISDEMEANDOR_2017", "MISDEMEANDOR_2016",
    "MISDEMEANDOR_2015", "MISDEMEANDOR_2014", "MISDEMEANDOR_2013", "MISDEMEANDOR_2012",
    "MISDEMEANDOR_2011", "MISMEANDOR_2010", "VIOLATION_2020", "VIOLATION_2019",
    "VIOLATION_2018", "VIOLATION_2017", "VIOLATION_2016", "VIOLATION_2015", "VIOLATION_2014",
    "VIOLATION_2013", "VIOLATION_2012", "VIOLATION_2011", "VIOLATION_2010"];
var timeAttrArray = ["2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];
var expressed = attrArray[2];
var colorClasses = [
    "#fee5d9",
    "#fcae91",
    "#fb6a4a",
    "#de2d26",
    "#a50f15"]
var domainArray = [];

// functions for basic buttons
$(window).on('load', function () {
    $('#myModal').modal('show');
});



function createMap() {
    //create the map
    map = L.map('map', {
        center: [40.68130531920554, -74.01790189286542],
        zoom: 10
    });

    L.tileLayer('https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
        attribution: '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 0,
        maxZoom: 22,
        subdomains: 'abcd',
        accessToken: 'gwIiZPEQplmK2l7l4pwuEAVeZR4VuHCCnf3NcC3X7vchYsSelzzDihxtA592jh3b'
    }).addTo(map);
    //getData()
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/finalcrimedata.csv")); //load attributes from csv  
    promises.push(d3.json("data/PolicePrecincts.geojson")); //load background spatial data         
    Promise.all(promises).then(callback);

    function callback(data) {
        var csvData = data[0];
        var precincts = data[1];
        precincts = joinData(precincts, csvData);
        var colorScale = makeColorScale(csvData);
        addPrecincts(precincts, colorScale);
        clickYearButton(csvData);
    };
};

// join the csv to the police precincts
function joinData(precincts, csvData) {
    //loop through csv to assign each set of csv attribute values to geojson region
    for (var i = 0; i < csvData.length; i++) {
        var csvRegion = csvData[i]; //the current region
        var csvKey = csvRegion.Precincts; //the CSV primary key
        //loop through geojson regions to find correct region
        for (var a = 0; a < precincts.features.length; a++) {
            var geojsonProps = precincts.features[a].properties; //the current region geojson properties
            var geojsonKey = geojsonProps.Precinct_1; //the geojson primary key
            //where primary keys match, transfer csv data to geojson properties object
            if (geojsonKey == csvKey) {
                //assign all attributes and values
                attrArray.forEach(function (attr) {
                    var val = csvRegion[attr]; //get csv attribute value
                    geojsonProps[attr] = val; //assign attribute and value to geojson properties
                });
            };
        };
    };

    return precincts;
};
// add the police precincts map to the base map
function addPrecincts(precinctData, colorScale) {
    //initialize svg to add to map
    L.svg({ clickable: true }).addTo(map) // we have to make the svg layer clickable 
    //Create selection using D3
    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto").attr("class","overlay")
    // create a group that is hidden during zooming
    const g = svg.append('g').attr('class', 'leaflet-zoom-hide')

    // Use Leaflets projection API for drawing svg path (creates a stream of projected points)
    const projectPoint = function (x, y) {
        const point = map.latLngToLayerPoint(new L.LatLng(y, x))
        this.stream.point(point.x, point.y)
    }


    // Use d3's custom geo transform method to implement the above
    const projection = d3.geoTransform({ point: projectPoint })
    // creates geopath from projected points (SVG)
    const pathCreator = d3.geoPath().projection(projection)

    const areaPaths = g.selectAll('path')
        .data(precinctData.features)
        .join('path')
        .attr("class", function (d) {
            return "precincts";
        })
        .attr('fill-opacity', 0.3)
        .attr('stroke', 'blue')
        .attr("z-index", 3000)
        .attr('stroke-width', 2.5)
        .style("fill", function (d) {
            return colorScale(d.properties[expressed])
        })
        .on('mouseover', function (event,d) {
            d3.select(this).transition()
                .duration('150')
                .attr('stroke-width', 4)
                .attr('stroke', 'yellow')
            info.update(d.properties);
            //setLabel(d.properties)

        })
        .on('mouseout', function (event) {
            d3.select(this).transition()
                .duration('150')
                .attr('stroke', 'blue')
        });

    // Function to place svg based on zoom
    const onZoom = () => areaPaths.attr('d', pathCreator)
    // initialize positioning
    onZoom()
    // reset whenever map is moved
    map.on('zoomend', onZoom)
}
//function to create color scale generator
function makeColorScale(data) {
    // natural breaks
    var colorScale = d3.scaleThreshold()
        .range(colorClasses);

    //build array of all values of the expressed attribute
    
    for (var i = 0; i < data.length; i++) {
        var val = parseFloat(data[i][expressed]);
        domainArray.push(val);
    };

    //cluster data using ckmeans clustering algorithm to create natural breaks
    var clusters = ss.ckmeans(domainArray, 5);
    //reset domain array to cluster minimums
    domainArray = clusters.map(function (d) {
        return d3.min(d);
    });
    //remove first value from domain array to create class breakpoints
    domainArray.shift();
    colorScale.domain(domainArray);
    
    return colorScale;
};
function changeAttribute(attribute, csvData) {
    if (attribute == "2021") {
        expressed = attribute + "_S1";
    }
    else {
        //change the expressed attribute
        expressed = attribute;
    }

    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
        console.log(domainArray)
}
function changeSlider(value, csvData){
    console.log("hello world");
    // if (attribute == "2021") {
    //     expressed = attribute + "_S1";
    // }
    // else {
    //     //change the expressed attribute
    //     expressed = attribute;
    // }
    expressed = "2021_S"+value;
    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
}
function changeType(year, type, csvData) {
    console.log("click!");
    if (year == "2021") {
        expressed = type+"_"+year + "_S1";
        console.log("expressed: "+expressed);
    }
    else {
        //change the expressed attribute
        expressed = type+"_"+year;
        console.log("expressed: "+expressed);
    }

    //recreate the color scale
    var colorScale = makeColorScale(csvData);
    
    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            console.log(value)
            if (value) {
                return colorScale(d.properties[expressed]);
            } else {
                return "#ccc";
            }
        });
}
createMap();

var year;
function clickYearButton(csvData) {
    var buttons = $('.btn-year');
    buttons.click(function () {
        year = this.id;
        if(year == "2021"){
             createSequenceControls(csvData);
             console.log("index: "+document.querySelector('.range-slider').value)
        }
        else{
            d3.select(".range-slider")
            .remove();
            d3.selectAll(".step")
            .remove();
        }
        buttons.css('background-color', '#6495ED');
        buttons.css('color', 'black');
        $(this).css('background-color', '#4169E1');
        $(this).css('color', 'white');
        changeAttribute(this.id, csvData);
        //egend.update();
        var typebuttons = $('.btn-type');
        typebuttons.click(function () {
            typebuttons.css('background-color', '#6495ED');
            typebuttons.css('color', 'black');
            $(this).css('background-color', '#4169E1');
            $(this).css('color', 'white');
            changeType(year, this.id, csvData);
        })
        
    });
}

// create the information label
var info = L.control();
info.onAdd = function (map) {
    this._div = L.DomUtil.create('div', 'info'); // create a div with a class "info"
    this.update();
    return this._div;
};

// method that we will use to update the control based on feature properties passed
info.update = function (props) {
    this._div.innerHTML = (props ? '<h4>Precinct: ' +  
        props["Precinct_1"] + '<br>Borough: '+ 
        props["Borough"]+'<br>'+parseFloat(props[expressed]).toFixed(3)+" crimes per 1000 people"+"</h4>"
        : '<h4>Hover over a precinct<h4>');
};
info.addTo(map);


var legend = L.control({position: 'bottomright'});

legend.onAdd = function (map) {
    var div = L.DomUtil.create('div', 'info legend')
    console.log("this is: "+domainArray)
    div.innerHTML+="hello"+domainArray[0];
    //     grades = [0, 10, 20, 50, 100, 200, 500, 1000],
    //     labels = [];

    // // loop through our density intervals and generate a label with a colored square for each interval
    // for (var i = 0; i < grades.length; i++) {
    //     div.innerHTML +=
    //         '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
    //         grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+');
    // }

    return div;
};

legend.addTo(map);

//Create new sequence controls
function createSequenceControls(csvData){   
    var SequenceControl = L.Control.extend({
        options: {
            position: 'topleft'
        },

        onAdd: function () {
            // create the control container div with a particular class name
            var container = L.DomUtil.create('div', 'sequence-control-container');

            //create range input element (slider)
            container.insertAdjacentHTML('beforeend', '<button class="step" id="reverse" title="Reverse">S1</button>'); 
            container.insertAdjacentHTML('beforeend', '<input class="range-slider" type="range">')
            container.insertAdjacentHTML('beforeend', '<button class="step" id="forward" title="Forward">S4</button>');
            //set slider attributes
            d3.select(".range-slider")
            .attr("max", 4)
            .attr("min", 0)
            .attr("value", 0)
            .attr("step", 1)
            
            L.DomEvent.disableClickPropagation(container);
            return container;
        }
    });
    map.addControl(new SequenceControl());    // add listeners after adding control}
    document.querySelector(".range-slider").max = 4;
    document.querySelector(".range-slider").min = 1;
    document.querySelector(".range-slider").value = 1;
    document.querySelector(".range-slider").step = 1;
        //Step 5: click listener for buttons
        document.querySelectorAll('.step').forEach(function(step){
            step.addEventListener("click", function(){
                var index = document.querySelector('.range-slider').value;
    
                //Step 6: increment or decrement depending on button clicked
                if (step.id == 'forward'){
                    index++;
                    //Step 7: if past the last attribute, wrap around to first attribute
                    index = index > 4 ? 1 : index;
                } else if (step.id == 'reverse'){
                    index--;
                    //Step 7: if past the first attribute, wrap around to last attribute
                    index = index < 1 ? 4 : index;
                };
    
                //Step 8: update slider
                document.querySelector('.range-slider').value = index;
                changeSlider(document.querySelector('.range-slider').value, csvData);
                
                
            })
            
        })
        
        //Step 5: input listener for slider
        document.querySelector('.range-slider').addEventListener('input', function(){            
            //Step 6: get the new index value
            var index = this.value;
            changeSlider(index, csvData);
            
        });
}

