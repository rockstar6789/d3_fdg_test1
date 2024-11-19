d3.json("data.json").then((data) => {

  // Drag behavior functions to enable node dragging
  const drag = (simulation) => {

    const dragstarted = (event, d) => {
      if (!event.active) {
        simulation.alphaTarget(0.3).restart();
      }
      d.fx = d.x;
      d.fy = d.y;
    };
  
    const dragged = (event, d) => {
      d.fx = event.x;
      d.fy = event.y;
    };
  
    const dragended = (event, d) => {
      if (!event.active) {
        simulation.alphaTarget(0);
      }
      d.fx = null;
      d.fy = null;
    };
  
    return d3.drag()
      .on("start", dragstarted)
      .on("drag", dragged)
      .on("end", dragended);
  };

  // Scales for link width, node size, font size, and color
  const linkWidthScale = d3
    .scaleLinear()
    .domain([0, d3.max(data.links.map(link => link.weight))])
    .range([0.5, 1.5]);

  const nodeScale = d3.scaleLinear()
    .domain([0, d3.max(data.nodes.map(node => node.influence))])
    .range([20, 50]);

  const fontSizeScale = d3.scaleLinear()
    .domain([0, d3.max(data.nodes.map(node => node.influence))])
    .range([7, 12]);

  const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

  // Set up dimensions for SVG container
  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.8;

  // Set up the simulation with forces and dynamic centering
  const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-400))
    .force("link", d3.forceLink(data.links)
      .id(d => d.id)
      .distance(75))
    .force("center", d3.forceCenter(width / 2, height / 2))
    .force("collision", d3.forceCollide().radius(d => nodeScale(d.influence) + 5))
    .force("x", d3.forceX(width / 2).strength(0.05))
    .force("y", d3.forceY(height / 2).strength(0.05));

  // Resize listener to dynamically adjust forces on window resize
  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth * 0.8;
    const newHeight = window.innerHeight * 0.8;
    svg.attr("width", newWidth).attr("height", newHeight);
    simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
    simulation.force("x", d3.forceX(newWidth / 2));
    simulation.force("y", d3.forceY(newHeight / 2));
    simulation.alpha(0.5).restart();
  });  

  // Create the SVG container
  const svg = d3.select("#Target");

  // Define the links
  const link = svg.selectAll("path.link")
    .data(data.links)
    .enter()
    .append("path")
    .attr("stroke", "#ccc")
    .attr("stroke-width", (d) => linkWidthScale(d.weight))
    .attr("fill", "none")
    .attr("marker-mid", (d) => d.type === "SUPERVISORY" ? "url(#markerArrow)" : "none");

  // Define the nodes as circles with drop-shadow effects
  const node = svg.selectAll("circle")
    .data(data.nodes)
    .enter()
    .append("circle")
    .attr("r", (d) => nodeScale(d.influence))
    .attr("stroke", "#ccc")
    .attr("stroke-width", 0.5)
    .attr("fill", (d) => colorScale(d.zone))
    .attr("filter", "drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))");

  // Add drag behavior to nodes
  node.call(drag(simulation));

  // Add image container with drag behavior
  const imageContainer = svg.selectAll("g.imageContainer")
    .data(data.nodes)
    .enter()
    .append("g")
    .attr("class", "imageContainer")
    .call(drag(simulation));

  // Append images within the image container
  imageContainer.append("image")
    .attr('height', d => nodeScale(d.influence))
    .attr('width', d => nodeScale(d.influence))
    .attr('transform', d => `translate(${-nodeScale(d.influence) / 2}, ${-nodeScale(d.influence) / 2})`)
    .attr('href', (d, i) => `image/img-${i}.png`);

  // Separate container for text labels
  const textContainer = svg.selectAll("g.label")
    .data(data.nodes)
    .enter()
    .append("g");

  textContainer.append("text")
    .text((d) => d.name)
    .attr("font-size", (d) => fontSizeScale(d.influence))
    .attr("font-family", "Roboto")
    .attr("x", d => nodeScale(d.influence) + 2)
    .attr("y", d => nodeScale(d.influence) + 4);

  // Tooltip (card) for displaying additional information on hover
  const card = svg.append("g")
    .attr('pointer-events', "none")
    .attr('display', "none");

  const cardBackground = card.append("rect")
    .attr('width', 150)
    .attr('height', 45)
    .attr('fill', "#fff")
    .attr('stroke', "#333")
    .attr('rx', 4)
    .attr("filter", "drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))");

  const cardTextName = card.append("text")
    .attr('transform', 'translate(8, 20)')
    .attr('font-family', "Roboto")
    .attr('font-weight', "bold")
    .text("Default name");

  const cardTextRole = card.append("text")
    .attr('font-size', 12)
    .attr('font-family', "Roboto")
    .attr('transform', 'translate(8, 35)')
    .text("Default role");

  let currentTarget;

  // Mouseover event to display card
  node.on("mouseover", (event, d) => {
    card.attr("display", "block");
    currentTarget = event.target;
    cardTextName.text(d.name);
    cardTextRole.text(d.role);
    const nameWidth = cardTextName.node().getBBox().width;
    const positionWidth = cardTextRole.node().getBBox().width;
    const cardWidth = Math.max(nameWidth, positionWidth);
    cardBackground.attr("width", cardWidth + 16);
    simulation.alphaTarget(0).restart();
  });

  node.on("mouseout", () => {
    currentTarget = null;
    card.attr("display", "none");
  });

  // Define the line generator for links with curves
  const lineGenerator = d3.line().curve(d3.curveCardinal);

  // Tick function for updating node positions
  simulation.on("tick", () => {

    // Boundary constraints for nodes to stay within the container
    data.nodes.forEach((d) => {
      d.x = Math.max(nodeScale(d.influence), Math.min(width - nodeScale(d.influence), d.x));
      d.y = Math.max(nodeScale(d.influence), Math.min(height - nodeScale(d.influence), d.y));
    });

    // Position image container
    imageContainer.attr("transform", (d) => `translate(${d.x}, ${d.y})`);

    // Position text container
    textContainer.attr("x", (d) => d.x)
                 .attr("y", (d) => d.y + nodeScale(d.influence) + 5);

    // Draw links
    link.attr("d", (d) => {
      const mid = [(d.source.x + d.target.x) / 2, (d.source.y + d.target.y) / 2];
      return `M${d.source.x},${d.source.y} Q${mid[0]},${mid[1]} ${d.target.x},${d.target.y}`;
    });

    // Tooltip positioning
    if (currentTarget) {
      const radius = currentTarget.r.baseVal.value;
      const xPos = currentTarget.cx.baseVal.value + radius + 3;
      const yPos = currentTarget.cy.baseVal.value + radius + 3;
      card.attr("transform", `translate(${xPos}, ${yPos})`);
    }
  });
});
