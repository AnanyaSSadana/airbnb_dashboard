document.addEventListener('DOMContentLoaded', function () {
    Promise.all([
        fetch('/chloropleth').then(response => response.json()),
        fetch('/properties').then(response => response.json())
    ])
    .then(([chloroplethData, propertyData]) => {
        drawChloropleth(chloroplethData, propertyData);
    })
    .catch(error => {
        console.error('Error fetching data:', error);
    });
});


function drawChloropleth(geodata, propertyData) {
    const map = L.map('chloroplethPlot').setView([40.70, -73.94], 9);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
    }).addTo(map);

    // Define color scale
    const colorScale = d3.scaleSequential()
        .domain([0, d3.max(geodata.features, d => d.properties.average_price)])
        .interpolator(d3.interpolateReds);

    // Initialize the SVG layer for D3
    L.svg().addTo(map);

    // Pick up the SVG from the map object
    var svg = d3.select("#chloroplethPlot").select("svg");
    var g = svg.select("g").attr("class", "leaflet-zoom-hide");

    // Add the boroughs as paths
    var boroughs = g.selectAll("path")
        .data(geodata.features)
        .enter().append("path")
        .style("fill", d => colorScale(d.properties.average_price))
        .style("fill-opacity", 0.65)
        .attr("d", d3.geoPath().projection(getD3Projection(map)));

    // Define function to update the boroughs position
    function updateBoroughs() {
        boroughs.attr("d", d3.geoPath().projection(getD3Projection(map)));
    }

    // Add the Airbnb properties as circles
    var propertyCircles = g.selectAll("circle")
        .data(propertyData)
        .enter().append("circle")
        .attr("class", "property")
        .attr("r", 0.25)
        .attr("cx", function(d) { return map.latLngToLayerPoint(new L.LatLng(d.latitude, d.longitude)).x })
        .attr("cy", function(d) { return map.latLngToLayerPoint(new L.LatLng(d.latitude, d.longitude)).y })
        .style("fill", "pink")
        .style("fill-opacity", 0.3);

    // Update property circles position on zoom
    function updatePropertyCircles() {
        propertyCircles
            .attr("cx", function(d) { return map.latLngToLayerPoint(new L.LatLng(d.latitude, d.longitude)).x })
            .attr("cy", function(d) { return map.latLngToLayerPoint(new L.LatLng(d.latitude, d.longitude)).y });
    }

    // Function to project D3 geoPath to Leaflet's layer point system
    function getD3Projection(map) {
        return d3.geoTransform({
            point: function(lat, lng) {
                var point = map.latLngToLayerPoint(new L.LatLng(lng, lat));
                this.stream.point(point.x, point.y);
            }
        });
    }

    // Create a legend for the color scale
    const legendWidth = 200, legendHeight = 10, legendMargin = 265;
    const legendSvg = svg.append("g")
        .attr("class", "legend")
        .attr("transform", `translate(${legendMargin},${legendMargin})`);

    const legendDomain = colorScale.domain();
    const legendThresholds = colorScale.ticks(6); // Adjust the number of ticks based on your scale
    const legendColorWidth = legendWidth / legendThresholds.length;

    legendThresholds.forEach((threshold, index) => {
        legendSvg.append("rect")
        .attr("x", index * legendColorWidth)
        .attr("y", 0)
        .attr("width", legendColorWidth)
        .attr("height", legendHeight)
        .style("fill", colorScale(threshold))
        .style("fill-opacity", 0.65); // Translucent color

    // Correcting the y position to be just below the color rectangles
    legendSvg.append("text")
        .attr("x", (index + 0.5) * legendColorWidth)
        .attr("y", legendHeight + 15) // small fixed offset below the color rectangles
        .attr("text-anchor", "middle")
        .text(`${threshold}`);
});


    // Reposition the SVG and update paths/circles on zoom
    function resetView() {
        updateBoroughs();
        updatePropertyCircles();
    }

    // Listen for map events to update D3 visualizations
    map.on("zoomend", resetView);
    map.on("moveend", resetView);

    // Initial update for correct positions
    resetView();
}
