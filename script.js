let sceneNum = 0;
let selectedPark = null;
let selectedColor = null;
let selectedActivity = null;
let squirrelData = [];
d3.csv("squirrel_cleaned.csv").then(squirrel => {
  squirrelData = squirrel;
  updateScene();
});

// Scene management functions
function updateBreadcrumb() {
  const breadcrumb = d3.select("#breadcrumb");
  let text = "";
  
  switch(sceneNum) {
    case 0:
      text = "Scene 0: Park Overview - Click on a park to explore";
      break;
    case 1:
      text = `Scene 1: ${selectedPark} - Squirrel Colors - Click on a color to continue`;
      break;
    case 2:
      text = `Scene 2: ${selectedPark} → ${selectedColor} Squirrels - Activities - Click on an activity bar`;
      break;
    case 3:
      text = `Scene 3: ${selectedPark} → ${selectedColor} → ${selectedActivity} - Interactions`;
      break;
  }
  
  breadcrumb.text(text);
  
  // Update button states
  d3.select("#prevBtn").property("disabled", sceneNum === 0);
  d3.select("#nextBtn").property("disabled", sceneNum === 3);
  d3.select("#homeBtn").property("disabled", sceneNum === 0);
}

function goHome() {
  sceneNum = 0;
  selectedPark = null;
  selectedColor = null;
  selectedActivity = null;
  updateScene();
}

function nextScene() {
  if (sceneNum < 3) {
    sceneNum++;
    updateScene();
  }
}

function prevScene() {
  if (sceneNum > 0) {
    sceneNum--;
    updateScene();
  }
}

function updateScene() {
  d3.select("#vis").html("");
  d3.selectAll(".tooltip").remove();
  updateBreadcrumb();
  
  switch(sceneNum) {
    case 0:
      drawParkMap();
      break;
    case 1:
      drawSquirrelColors(selectedPark);
      break;
    case 2:
      drawSquirrelActivities(selectedPark, selectedColor);
      break;
    case 3:
      drawSquirrelInteractions(selectedPark, selectedColor, selectedActivity);
      break;
  }
}

// Trigger functions (event handlers)
function onParkClick(parkName) {
  selectedPark = parkName;
  sceneNum = 1;
  updateScene();
}

function onColorClick(color) {
  selectedColor = color;
  sceneNum = 2;
  updateScene();
}

function onActivityClick(activity) {
  selectedActivity = activity;
  sceneNum = 3;
  updateScene();
}

// Scene 0: Park Map
function drawParkMap() {
  const width = 800;
  const height = 600;
  const margin = {top: 60, right: 40, bottom: 40, left: 40};

  const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  d3.select("#annotation-panel").html(`
  <strong>Welcome to NYC's Squirrel Society!</strong><br/>
  Each circle represents a park with squirrel sightings. 
  Larger circles indicate more squirrel activity. 
  <em>Click on any park to begin your exploration journey.</em>`);

  // Create projection for NYC
  const projection = d3.geoMercator()
    .center([-73.94, 40.78])
    .scale(70000)
    .translate([width / 2, height / 2]);

  const path = d3.geoPath().projection(projection);

  // Draw background map
  svg.append("g")
    .selectAll("path")
    .data(neighborhoodData.features)
    .enter()
    .append("path")
    .attr("d", path)
    .attr("fill", "#ecf0f1")
    .attr("stroke", "#bdc3c7")
    .attr("stroke-width", 1)
    .attr("opacity", 0.6);

  // Process park data
  const parkData = d3.rollups(
    squirrelData,
    v => ({
      count: v.length,
      latitude: d3.mean(v, d => +d.latitude),
      longitude: d3.mean(v, d => +d.longitude),
      colors: [...new Set(v.map(d => d.fur_color).filter(c => c))]
    }),
    d => d.park_name
  ).map(([name, stats]) => ({
    park_name: name,
    ...stats
  }));

  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(parkData, d => d.count)])
    .range([8, 25]);

  const colorScale = d3.scaleOrdinal()
    .domain(parkData.map(d => d.park_name))
    .range(d3.schemeSet3);

  // Add tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Draw park circles
  svg.selectAll("circle")
    .data(parkData)
    .enter()
    .append("circle")
    .attr("class", "clickable")
    .attr("cx", d => projection([d.longitude, d.latitude])[0])
    .attr("cy", d => projection([d.longitude, d.latitude])[1])
    .attr("r", d => radiusScale(d.count))
    .attr("fill", d => colorScale(d.park_name))
    .attr("opacity", 0.8)
    .attr("stroke", "#2c3e50")
    .attr("stroke-width", 2)
    .on("mouseover", function (event, d) {
      d3.select(this).attr("stroke-width", 4);
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`<strong>${d.park_name}</strong><br/>
                   ${d.count} squirrel sightings<br/>
                   Colors: ${d.colors.join(', ')}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      d3.select(this).attr("stroke-width", 2);
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      onParkClick(d.park_name);
    });

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 30)
    .attr("text-anchor", "middle")
    .style("font-size", "20px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text("NYC Parks with Squirrel Activity");
}

// Scene 1: Squirrel Colors
function drawSquirrelColors(park) {
  const width = 700;
  const height = 500;
  const margin = { top: 80, right: 60, bottom: 80, left: 80 };

  const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Add story annotation
  d3.select("#annotation-panel")
    .html(`<strong>Squirrel Diversity in ${park}</strong><br/>
           Different fur colors indicate genetic variations. 
           <em>Click on any color bar to explore their activities!</em>`);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = squirrelData.filter(d => d.park_name === park && d.fur_color);

  const colorCounts = d3.rollups(
    filtered,
    v => v.length,
    d => d.fur_color
  ).map(([color, count]) => ({ color, count }));

  if (colorCounts.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text("No fur color data available for this park.");
    return;
  }

  const x = d3.scaleBand()
    .domain(colorCounts.map(d => d.color))
    .range([0, width - margin.left - margin.right])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(colorCounts, d => d.count)])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  const colorMap = {
    'Gray': '#808080',
    'Black': '#2c2c2c',
    'Cinnamon': '#D2691E',
    'White': '#f8f8f8'
  };

  // Add axes
  chart.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "14px")
    .style("font-weight", "bold");

  chart.append("g")
    .call(d3.axisLeft(y))
    .selectAll("text")
    .style("font-size", "12px");

  // Add tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Add bars
  chart.selectAll(".bar")
    .data(colorCounts)
    .enter()
    .append("rect")
    .attr("class", "bar clickable")
    .attr("x", d => x(d.color))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .attr("fill", d => colorMap[d.color] || '#3498db')
    .attr("stroke", "#2c3e50")
    .attr("stroke-width", 2)
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`<strong>${d.color} Squirrels</strong><br/>Count: ${d.count}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      onColorClick(d.color);
    });

  // Add value labels on bars
  chart.selectAll(".bar-label")
    .data(colorCounts)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.color) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(d => d.count);

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(`Primary Fur Colors in ${park}`);

  // Add y-axis label
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 25)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .text("Number of Squirrels");
}

// Scene 2: Squirrel Activities
function drawSquirrelActivities(park, color) {
  const width = 700;
  const height = 500;
  const margin = { top: 80, right: 60, bottom: 100, left: 80 };

  const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  // Add story annotation
  d3.select("#annotation-panel")
    .html(`<strong>${color} Squirrel Behaviors</strong><br/>
           Each activity shows different aspects of squirrel life. 
           <em>Click on any activity to see interaction patterns!</em>`);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = squirrelData.filter(d => 
    d.park_name === park && 
    d.fur_color === color
  );

  const activityCounts = {};
  filtered.forEach(d => {
    let acts = [];
    if (d.activities && d.activities.includes("[")) {
      try {
        acts = JSON.parse(d.activities.replace(/'/g, '"'));
      } catch {
        acts = [];
      }
    }
    acts.forEach(a => {
      if (a && a.trim()) {
        const activity = a.trim();
        activityCounts[activity] = (activityCounts[activity] || 0) + 1;
      }
    });
  });

  const data = Object.entries(activityCounts)
    .map(([activity, count]) => ({ activity, count }))
    .sort((a, b) => b.count - a.count);

  if (data.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`No activity data for ${color} squirrels in ${park}.`);
    return;
  }

  const x = d3.scaleBand()
    .domain(data.map(d => d.activity))
    .range([0, width - margin.left - margin.right])
    .padding(0.2);

  const y = d3.scaleLinear()
    .domain([0, d3.max(data, d => d.count)])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  // Add axes
  chart.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .attr("transform", "rotate(-45)")
    .style("text-anchor", "end")
    .style("font-size", "12px");

  chart.append("g")
    .call(d3.axisLeft(y));

  // Add tooltip
  const tooltip = d3.select("body").append("div")
    .attr("class", "tooltip")
    .style("opacity", 0);

  // Add bars
  chart.selectAll(".bar")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", "bar clickable")
    .attr("x", d => x(d.activity))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .attr("fill", "#e67e22")
    .attr("stroke", "#2c3e50")
    .attr("stroke-width", 2)
    .on("mouseover", function (event, d) {
      tooltip.transition().duration(200).style("opacity", .9);
      tooltip.html(`<strong>${d.activity}</strong><br/>Observations: ${d.count}`)
        .style("left", (event.pageX + 10) + "px")
        .style("top", (event.pageY - 28) + "px");
    })
    .on("mouseout", function () {
      tooltip.transition().duration(500).style("opacity", 0);
    })
    .on("click", function (event, d) {
      onActivityClick(d.activity);
    });

  // Add value labels
  chart.selectAll(".bar-label")
    .data(data)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.activity) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "12px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(d => d.count);

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(`${color} Squirrel Activities in ${park}`);

  // Add axis labels
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 25)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .text("Number of Observations");
}

// Scene 3: Squirrel Interactions
function drawSquirrelInteractions(park, color, activity) {
  const width = 700;
  const height = 500;
  const margin = { top: 80, right: 60, bottom: 80, left: 80 };

  const svg = d3.select("#vis")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

    d3.select("#annotation-panel")
    .html(`<strong>Human-Squirrel Interactions</strong><br/>
           How do ${color.toLowerCase()} squirrels engaged in ${activity.toLowerCase()} 
           react to humans? This shows the fascinating relationship between 
           urban wildlife and city dwellers.`);

  const chart = svg.append("g")
    .attr("transform", `translate(${margin.left},${margin.top})`);

  const filtered = squirrelData.filter(d => {
    if (d.park_name !== park || d.fur_color !== color) return false;
    
    let acts = [];
    if (d.activities && d.activities.includes("[")) {
      try {
        acts = JSON.parse(d.activities.replace(/'/g, '"'));
      } catch {
        acts = [];
      }
    }
    return acts.some(a => a && a.trim() === activity);
  });

  const interactionCounts = d3.rollups(
    filtered,
    v => v.length,
    d => d.interaction || 'Unknown'
  ).map(([interaction, count]) => ({ interaction, count }))
   .sort((a, b) => b.count - a.count);

  if (interactionCounts.length === 0) {
    svg.append("text")
      .attr("x", width / 2)
      .attr("y", height / 2)
      .attr("text-anchor", "middle")
      .style("font-size", "16px")
      .text(`No interaction data for ${color} squirrels doing ${activity} in ${park}.`);
    return;
  }

  const x = d3.scaleBand()
    .domain(interactionCounts.map(d => d.interaction))
    .range([0, width - margin.left - margin.right])
    .padding(0.3);

  const y = d3.scaleLinear()
    .domain([0, d3.max(interactionCounts, d => d.count)])
    .nice()
    .range([height - margin.top - margin.bottom, 0]);

  const interactionColors = {
    'Approaches': '#27ae60',
    'Indifferent': '#f39c12',
    'Runs From': '#e74c3c',
    'Unknown': '#95a5a6',
    'Friendly': '#2ecc71',
    'Defensive': '#c0392b'
  };

  // Add axes
  chart.append("g")
    .attr("transform", `translate(0, ${height - margin.top - margin.bottom})`)
    .call(d3.axisBottom(x))
    .selectAll("text")
    .style("font-size", "12px")
    .style("font-weight", "bold");

  chart.append("g")
    .call(d3.axisLeft(y));

  // Add bars
  chart.selectAll(".bar")
    .data(interactionCounts)
    .enter()
    .append("rect")
    .attr("class", "bar")
    .attr("x", d => x(d.interaction))
    .attr("y", d => y(d.count))
    .attr("width", x.bandwidth())
    .attr("height", d => y(0) - y(d.count))
    .attr("fill", d => interactionColors[d.interaction] || '#3498db')
    .attr("stroke", "#2c3e50")
    .attr("stroke-width", 2);

  // Add value labels
  chart.selectAll(".bar-label")
    .data(interactionCounts)
    .enter()
    .append("text")
    .attr("class", "bar-label")
    .attr("x", d => x(d.interaction) + x.bandwidth() / 2)
    .attr("y", d => y(d.count) - 5)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(d => d.count);

  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 35)
    .attr("text-anchor", "middle")
    .style("font-size", "18px")
    .style("font-weight", "bold")
    .style("fill", "#2c3e50")
    .text(`${color} Squirrels: ${activity} → Human Interactions`);

  // Add axis labels
  svg.append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 25)
    .attr("x", -height / 2)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .text("Number of Observations");

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 10)
    .attr("text-anchor", "middle")
    .style("font-size", "14px")
    .style("fill", "#7f8c8d")
    .text("Interaction Type");

  // Add summary statistics
  const totalObservations = interactionCounts.reduce((sum, d) => sum + d.count, 0);
  const friendlyCount = interactionCounts.find(d => d.interaction === 'Approaches')?.count || 0;
  const friendlyPercent = Math.round((friendlyCount / totalObservations) * 100);

  svg.append("foreignObject")
    .attr("x", width - 200)
    .attr("y", height - 120)
    .attr("width", 180)
    .attr("height", 100)
    .append("xhtml:div")
    .style("background", "rgba(255, 255, 255, 0.9)")
    .style("padding", "10px")
    .style("border-radius", "8px")
    .style("font-size", "12px")
    .style("border", "2px solid #3498db")
    .html(`<strong>Summary:</strong><br/>
           Total observations: ${totalObservations}<br/>
           Friendly approaches: ${friendlyCount} (${friendlyPercent}%)<br/>
           <em>This completes our exploration!</em>`);
}

// Initialize the visualization
updateScene();
