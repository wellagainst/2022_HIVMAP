var map;
// specify the attributes of the asian hate crime data
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
    "MISDEMEANDOR_2011", "MISDEMEANDOR_2010", "VIOLATION_2020", "VIOLATION_2019",
    "VIOLATION_2018", "VIOLATION_2017", "VIOLATION_2016", "VIOLATION_2015", "VIOLATION_2014",
    "VIOLATION_2013", "VIOLATION_2012", "VIOLATION_2011", "VIOLATION_2010"];

// specify the years we want to implement on the left side panel
var timeAttrArray = ["2020", "2019", "2018", "2017", "2016", "2015", "2014", "2013", "2012", "2011", "2010"];
var expressed = attrArray[2];
// define the color scheme of the choropleth map as well as the legend
var colorClasses = [
    "#fff5f0",
    "#fee0d2",
    "#fcbba1",
    "#fc9272",
    "#fb6a4a",
    "#ef3b2c",
    "#cb181d",
    "#99000d"]
var domainArray = [];
var sliderValue = 1;
var crimeType = "";
var chartWidth = window.innerWidth * 0.7;
var chartHeight = 155;
var xScale;
// functions for basic buttons
$(window).on('load', function () {
    $('#myModal').modal('show');
});
$("#aboutButton").on('click', function () {
    $('#myModal').modal('show');
});


//define the function to create the basemap
function createMap() {
    //create the map
    map = L.map('map', {
        center: [40.68130531920554, -74.01790189286542],
        zoom: 10
    });
    //select a layer that is suitable for our map theme
    L.tileLayer('https://{s}.tile.jawg.io/jawg-dark/{z}/{x}/{y}{r}.png?access-token={accessToken}', {
        attribution: '<a href="http://jawg.io" title="Tiles Courtesy of Jawg Maps" target="_blank">&copy; <b>Jawg</b>Maps</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        minZoom: 0,
        maxZoom: 22,
        subdomains: 'abcd',
        accessToken: 'gwIiZPEQplmK2l7l4pwuEAVeZR4VuHCCnf3NcC3X7vchYsSelzzDihxtA592jh3b'
    }).addTo(map);
    //use Promise.all to parallelize asynchronous data loading
    var promises = [];
    promises.push(d3.csv("data/finalcrimedata.csv")); //load attributes from csv  
    promises.push(d3.json("data/PolicePrecincts.geojson")); //load background spatial data   
    promises.push(d3.json("data/crimeNews.geojson")); //load crime news data into the map
    Promise.all(promises).then(callback);

    //call the functions we defined below
    function callback(data) {
        var csvData = data[0];
        var precincts = data[1];
        var news = data[2];
        precincts = joinData(precincts, csvData);
        //var colorScale = makeColorScale(csvData);
        addPrecincts(precincts);
        clickYearButton(csvData);
        clickNewsButton(news);
        createChart(csvData);
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
function addPrecincts(precinctData) {
    var value = 0
    //initialize svg to add to map
    L.svg({ clickable: true }).addTo(map) // we have to make the svg layer clickable 
    //Create selection using D3
    const overlay = d3.select(map.getPanes().overlayPane)
    const svg = overlay.select('svg').attr("pointer-events", "auto").attr("class", "overlay")
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
    // add precincts on the basemap, style them based on the crime data
    const areaPaths = g.selectAll('path')
        .data(precinctData.features)
        .join('path')
        .attr("class", function (d) {
            return "precincts";
        })
        .attr('fill-opacity', 0.3)
        .attr('stroke', '#00008B')
        .attr("z-index", 3000)
        .attr('stroke-width', 2.5)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            var color = setColorScale(value);
            return color;
        })
        // add hover function and show the information about the precinct
        .on('mouseover', function (event, d) {
            d3.select(this).transition()
                .duration('150')
                .attr('stroke-width', 4)
                .attr('stroke', 'yellow')
            info.update(d.properties);

        })
        .on('mouseout', function (event) {
            d3.select(this).transition()
                .duration('150')
                .attr('stroke', '#00008B')
                
        })
        // add click function on the precinct to show crime news
        .on('click', function (event, d) {
            addLine(d)
        })

    // Function to place svg based on zoom
    const onZoom = () => areaPaths.attr('d', pathCreator)
    // initialize positioning
    onZoom()
    // reset whenever map is moved
    map.on('zoomend', onZoom)
}


//////////////////////////////////////////////////////////////////////
//create the coordinated line chart 
function createChart(csvData) {
    var attribute = ["2010", "2011", "2012", "2013", "2014", "2015", "2016", "2017", "2018", "2019", "2020", "2021 S1", "2021 S2", "2021 S3", "2021 S4"]
    //add line chart title
    var title = d3.select("#collapseChart")
        .append("div")
        .attr("id", "chartTitle")
        .html("Number of crimes per 1000 Asians from 2010 to 2021")
        .style("text-align", "center")
        .style("height", "20%")
    //add the line chart object
    var svg = d3.select("#collapseChart")
        .append("svg")
        .attr("id", "mainChart")
        .attr("class", "linePlot")
        .attr("height", "80%")
        .attr("width", "100%");
    // specify the x axis, y axis, and their respective scale
    var xScale = d3
        .scalePoint()
        .domain([...attribute])
        .range([0, chartWidth])

     var x_axis = d3.axisBottom(xScale)
        .tickValues(attribute);

    const xg = svg
        .append("g")
        .attr("transform", "translate(25,160)")
        .call(x_axis)


    var yScale = d3
        .scaleLinear()
        .domain([0, 60])
        .range([chartHeight, 0]);
    const yg = svg
        .append("g")
        .attr("id", "yaxis")
        .attr("height", "100%")
        .attr("transform", "translate(25,5)")
        .call(d3.axisLeft(yScale));
}

//////////////////////////////////////////////////////////////////////
// add lines in the line chart according to the number of asian hate crime cases
function addLine(props) {
    d3.selectAll(".line")
        .remove()
    d3.selectAll(".dot")
        .remove()
    var data = []
    //if user only selects the year, then the general crime cases will be shown
    if(crimeType==""){
        console.log("just year")
    var dataset = [
        [2010, parseFloat(props.properties["2010"])], [2011,parseFloat(props.properties["2011"])], [2012, parseFloat(props.properties["2012"])],
        [2013, parseFloat(props.properties["2013"])], [2014, parseFloat(props.properties["2014"])], [2015, parseFloat(props.properties["2015"])],
        [2016, parseFloat(props.properties["2016"])], [2017, parseFloat(props.properties["2017"])], [2018, parseFloat(props.properties["2018"])],
        [2019, parseFloat(props.properties["2019"])],[2020, parseFloat(props.properties["2020"])],[2021, parseFloat(props.properties["2021_S1"])],
        [2022, parseFloat(props.properties["2021_S2"])],[2023, parseFloat(props.properties["2021_S3"])],[2024, parseFloat(props.properties["2021_S4"])]
    ]}
    //if user also specify the crime type, then show the "filtered" result
    else{
        var dataset = [
            [2010, parseFloat(props.properties[crimeType+"_2010"])], [2011,parseFloat(props.properties[crimeType+"_2011"])], [2012, parseFloat(props.properties[crimeType+"_2012"])],
            [2013, parseFloat(props.properties[crimeType+"_2013"])], [2014, parseFloat(props.properties[crimeType+"_2014"])], [2015, parseFloat(props.properties[crimeType+"_2015"])],
            [2016, parseFloat(props.properties[crimeType+"_2016"])], [2017, parseFloat(props.properties[crimeType+"_2017"])], [2018, parseFloat(props.properties[crimeType+"_2018"])],
            [2019, parseFloat(props.properties[crimeType+"_2019"])],[2020, parseFloat(props.properties[crimeType+"_2020"])],[2021, parseFloat(props.properties[crimeType+"_2021_S1"])],
            [2022, parseFloat(props.properties[crimeType+"_2021_S2"])],[2023, parseFloat(props.properties[crimeType+"_2021_S3"])],[2024, parseFloat(props.properties[crimeType+"_2021_S4"])]
        ]
    }
    //use a for loop to iterate through all years and get the larget integer number of the crime cases
    for(let i = 0; i<dataset.length; i++){
        data.push(dataset[i][1])
    }
    var max = Math.ceil(Math.max(...data));
    
    //equally arrange the x scale according to the chart width
    var xScale = d3
        .scaleLinear()
        .domain([2010, 2024])
        .range([0, chartWidth])
    //equally arrange the y scale according to the chart height
    var yScale = d3
        .scaleLinear()
        .domain([0, max])
        .range([chartHeight, 0]);
    // updata y-axis
    d3.select("#yaxis")
    .call(d3.axisLeft(yScale))
    .transition()
    .duration(3000);
    var svg = d3.select(".linePlot")
    var line = d3.line()
    .x(function(d) { return xScale(d[0]); }) 
    .y(function(d) { return yScale(d[1]); }) 
    .curve(d3.curveMonotoneX)
    //add data to the line graph and visualize them in line, style the line
    svg.append("path")
    .datum(dataset) 
    .attr("class", "line") 
    .attr("id", "polyline")
    .attr("transform", "translate(25,5)")
    .attr("d", line)
    .style("fill", "none")
    .style("stroke", "#00008B")
    .style("stroke-width", "4")
    .transition()
    .duration(5000)
    ;
    var dots = svg.selectAll(".dot")
        .data(dataset)
        .join('circle')
        .attr("class", "dot")
        .attr("cx", function (d) { return xScale(d[0])})
        .attr("cy", function (d) { return yScale(d[1])})
        .attr("r", 4)
        .attr("transform", "translate(25,5)")
        .style("fill", "yellow")
        .transition()
        .duration(5000);
        
    

}
//////////////////////////////////////////////////////////////////////
//function to implement the news button
function clickNewsButton(news) {
    //add the button and make it clickable
    var newsButton = document.getElementById('newsButton');
    newsButton.addEventListener('click', function handleClick() {
        //when user click the button, map shows circles; when user click it again, the map hides all circles
        if (newsButton.textContent == "Hide Crime News Map") {
            newsButton.textContent = "Show Crime News Map";
            d3.selectAll("#newsCircle")
                .remove()
            d3.selectAll(".frame")
                .remove()
        }
        else {
            newsButton.textContent = "Hide Crime News Map";
            addNews(news);
        }
    });
}

// add news message to each circle
function addNews(news) {
    var value = 0;
    const overlay = d3.select(".leaflet-zoom-hide")
    const newsCircle = overlay.selectAll('circle')
        .data(news.features)
        .join("circle")
        .attr("id", "newsCircle")
        .attr("class", "btn")
        .attr("type", "button")
        //add x y coordinates information on each circle
        .attr("cx", function (d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).x })
        .attr("cy", function (d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).y })
        .attr("r", 5)
        .style("fill", "red")
        .attr("stroke", "red")
        .attr("stroke-width", 3)
        .attr("fill-opacity", .4)
        .on('click', function (event, d) {
            if (value == 1) {
                value = 0;
                d3.selectAll(".frame")
                    .remove()
            }
            else {
                //make sure the crime news window is within the frame of the basemap
                value = 1;
                var latitude = d.geometry.coordinates[1]
                var longitude = d.geometry.coordinates[0]
                var left = this.getAttribute('cx') + "px";
                var top = this.getAttribute('cy') - 10 + "px";
                var labelAttribute = d.properties.Intro;
                var strArr = labelAttribute.match(/.{1,38}/g);
                ///////////////////////////////////////////////////////////////
                const popup = d3.select('.leaflet-zoom-hide')
                    .append("svg")
                    .attr("class", "frame")
                    .attr("x", function () { return map.latLngToLayerPoint([latitude, longitude]).x })
                    .attr("y", function () { return map.latLngToLayerPoint([latitude, longitude]).y })
                    .append("rect")
                    .attr("id", "popup")
                    .attr("z-index", 4000)
                    .style("color", "white")
                    .style("border", "solid")
                    .style("border-width", "2px")
                    .style("border-radius", "5px")
                    .style("height", strArr.length * 20 + 10 + "px")
                    .style("padding", "5px")
                    .attr("x", "0px")
                    .attr("y", "0px")
                    .attr("rx", "20px")
                    .attr("ry", "20px")


                for (let i = 0; i < strArr.length; i++) {
                    d3.selectAll(".frame")
                        .append("text")
                        .style("color", "black")
                        .style("font-size", "15px")
                        .attr("id", "newscontent")
                        .attr("x", "10px")
                        .attr("y", 20 + i * 20 + "px")

                        .text(strArr[i])
                }

                function rectUpdate() {
                    d3.selectAll(".frame")
                        .attr("x", function (d) { return map.latLngToLayerPoint([latitude, longitude]).x })
                        .attr("y", function (d) { return map.latLngToLayerPoint([latitude, longitude]).y })
                }
                map.on("moveend", rectUpdate)
                //Function that update circle position if something change
            }
            
        })
        function update() {
            d3.selectAll("#newsCircle")
            .attr("cx", function (d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).x })
            .attr("cy", function (d) { return map.latLngToLayerPoint([d.geometry.coordinates[1], d.geometry.coordinates[0]]).y })
        }
        // If the user change the map (zoom or drag), I update circle position:
        map.on("moveend", update)
    

}

function changeAttribute(attribute, csvData) {
    if (attribute == "2021") {
        expressed = attribute + "_S1";
    }
    else {
        //change the expressed attribute
        expressed = attribute;
    }

    //recreate the color scale
    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            var color = setColorScale(value);
            return color;
        });

}

// set the classes break for the choropleth map
function setColorScale(value) {
    if (value <= 0.5) {
        return colorClasses[0];
    }
    else if (value <= 1) {
        return colorClasses[1];
    }
    else if (value <= 2) {
        return colorClasses[2];
    }
    else if (value <= 4) {
        return colorClasses[3];
    }
    else if (value <= 7) {
        return colorClasses[4];
    }
    else if (value <= 15) {
        return colorClasses[5];
    }
    else if (value <= 30) {
        return colorClasses[6];
    }
    else {
        return colorClasses[7];
    }
}

//make the slider for 4 seasons in 2021; retrieve the crime cases according to the csv data
function changeSlider(value, csvData) {
    expressed = "2021_S" + value;
    //recreate the color scale
    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            var color = setColorScale(value);
            return color;
        });
}

//retrieve the crime cases based on the year (2021 or other years) and crime type
function changeType(year, type, csvData) {

    if (year == "2021") {
        expressed = type + "_" + year + "_S" + sliderValue;
    }
    else {
        //change the expressed attribute
        expressed = type + "_" + year;
    }

    //recolor enumeration units
    var regions = d3.selectAll(".precincts")
        .transition()
        .duration(1000)
        .style("fill", function (d) {
            var value = d.properties[expressed];
            var color = setColorScale(value);
            return color;
        });
}
createMap();

//create different year buttons, specify the color when click/un-click them.
var year;
function clickYearButton(csvData) {
    var buttons = $('.btn-year');
    buttons.click(function () {
        year = this.id;
        buttons.css('background-color', '#a3c1f5');
        buttons.css('color', 'black');
        $(this).css('background-color', '#6495ED');
        $(this).css('color', 'white');
        //specify how the map  should react (for example, show the slider or not) when the user click 2021 or other years
        if (year == "2021") {
            d3.select(".range-slider")
                .remove();
            d3.selectAll(".step")
                .remove();
            changeAttribute(year, csvData)
            createSequenceControls(csvData);
        }
        else {
            changeAttribute(this.id, csvData);
            d3.select(".range-slider")
                .remove();
            d3.selectAll(".step")
                .remove();

        }
        //create crime type buttons and specify the button style
        var typebuttons = $('.btn-type');
        typebuttons.click(function () {
            typebuttons.css('background-color', '#a3c1f5');
            typebuttons.css('color', 'black');
            $(this).css('background-color', '#6495ED');
            $(this).css('color', 'white');
            crimeType = this.id;
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
        props["Precinct_1"] + '<br>Borough: ' +
        props["Borough"] + '<br>' + parseFloat(props[expressed]).toFixed(3) + " crimes (1000 Asians)" + "</h4>"
        : '<h4>Hover over a precinct<h4>');
};
info.addTo(map);

//create the legend
var legend = L.control({ position: 'bottomleft' });

//add legend inside the basemap
legend.onAdd = function (map) {

    var div = L.DomUtil.create('div', 'info legend'),
        //specify the classes of values
        grades = [0, 0.5, 1, 2, 4, 7, 15, 30];
    //clarify what these classes of values represent
    div.innerHTML = "<h5>Number of crimes <br>per 1000 Asians</h5>"

    // loop through our density intervals and generate a label with a colored square for each interval
    for (var i = grades.length - 1; i >= 0; i--) {
        div.innerHTML +=
            '<i style="background:' + colorClasses[i] + '"></i> ' +
            grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + '<br>' : '+<br>');
    }

    return div;
};

legend.addTo(map);

//Create new sequence controls
function createSequenceControls(csvData) {
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
    document.querySelectorAll('.step').forEach(function (step) {
        step.addEventListener("click", function () {
            var index = document.querySelector('.range-slider').value;

            //Step 6: increment or decrement depending on button clicked
            if (step.id == 'forward') {
                index++;
                //Step 7: if past the last attribute, wrap around to first attribute
                index = index > 4 ? 1 : index;
            } else if (step.id == 'reverse') {
                index--;
                //Step 7: if past the first attribute, wrap around to last attribute
                index = index < 1 ? 4 : index;
            };
            sliderValue = index;
            //Step 8: update slider
            document.querySelector('.range-slider').value = index;
            if (crimeType == "") {
                changeSlider(document.querySelector('.range-slider').value, csvData);
            }
            else {
                changeType("2021", crimeType, csvData)
            }

        })

    })

    //Step 5: input listener for slider
    document.querySelector('.range-slider').addEventListener('input', function () {
        //Step 6: get the new index value
        var index = this.value;
        sliderValue = index;
        if (crimeType == "") {
            changeSlider(document.querySelector('.range-slider').value, csvData);
        }
        else {
            changeType("2021", crimeType, csvData)
        }

    });
}

