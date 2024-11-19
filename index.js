d3.json("data.json").then((data) => {

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

  const linkWidthScale = d3
    .scaleLinear()
    .domain([0, d3.max(data.links.map(link => link.weight))])
    .range([0.5, 1.5]);

  const linkDashScale = d3
    .scaleOrdinal()
    .domain([0, 2, 3])
    .range(["4 2", "2 2", null]);
    
  const nodeScale = d3.scaleLinear()
    .domain([0, d3.max(data.nodes.map(node => node.influence))]) // Scaling node size: from 0 to maximum influence; based on influence function Part 1 (see below in const node)
    .range([20, 50]);

  const fontSizeScale = d3.scaleLinear()  // fonts need a container below, that I called textContainer
    .domain([0, d3.max(data.nodes.map(node => node.influence))])
    .range([7, 12]) //Minimum and maximum font sizes

  
  const colorScale = d3.scaleOrdinal(d3.schemeCategory10); // D3 has a method for pre-built color schemes https://d3js.org/d3-scale-chromatic/categorical
  // const colorScale = d3.scaleOrdinal(d3.schemeBlues[5]); // D3 has a method for pre-built color schemes https://d3js.org/d3-scale-chromatic/categorical

  // Old Center positioning
  // const simulation = d3.forceSimulation(data.nodes)
  //   .force("charge", d3.forceManyBody().strength(-400))
  //   .force("link", d3.forceLink(data.links)
  //     .id(d => d.id)
  //     .distance(75))
  //   .force("center", d3.forceCenter(1200, 550))
  //   .force("gravity", d3.forceManyBody().strength(75))
  //   .force("collision", d3.forceCollide().radius(d => nodeScale(d.influence) + 5));
 
  // New Center positioning
  const width = window.innerWidth * 0.8;
  const height = window.innerHeight * 0.8;

  const simulation = d3.forceSimulation(data.nodes)
    .force("charge", d3.forceManyBody().strength(-400))
    .force("link", d3.forceLink(data.links)
      .id(d => d.id)

      // Specify a link's distance vs. all others e.g. Center node (aka if ""=== 0") vs. others (aka else)
      .distance((d, i) => {
        if (d.source.id === 0 || d.target === 0){
          return 75;
        } else {
          return 50;
        }

      })
      .strength((d)=> {
        if (d.source.id ===1 || d.target.id === 1){
          return 1.15;
        } else {
          return 0.25;
        }
      })
    
    )
    .force("center", d3.forceCenter(width / 2, height / 2)) // Center dynamically
    .force("collision", d3.forceCollide().radius(d => nodeScale(d.influence) + 5));

  window.addEventListener("resize", () => {
    const newWidth = window.innerWidth * 0.8;
    const newHeight = window.innerHeight * 0.8;
    svg.attr("width", newWidth).attr("height", newHeight);
    simulation.force("center", d3.forceCenter(newWidth / 2, newHeight / 2));
    simulation.alpha(0.5).restart();
  });  

  const svg = d3.select("#Target");

    const link = svg
    .selectAll("path.link")
    .data(data.links)
    .enter()
    .append("path")
    // .attr("stroke", "orange")
    .attr("stroke", "#ccc")
    .attr("stroke-width", (d) => linkWidthScale(d.weight))
    .attr("stroke-dasharray", (d) => linkWidthScale(d.weight))
    .attr("fill", "none")
    .attr("marker-mid", (d) =>{

      switch (d.type){

        case "SUPERVISORY":
          return "url(#markerArrow)";

        default: 
          return "none";

      }

      });


  const node = svg
    .selectAll("circle")
    .data(data.nodes)
    .enter() // applies context to the stuff below
    .append("circle")
    .attr("r", (d) => nodeScale(d.influence)) // Scaling node size, based on influence Part 2 (see above const nodeScale)
    .attr("stroke", "#ccc")
    .attr("stroke-width", 0.5)
    // .attr("fill", "dodgerblue");
    .attr("fill", (d) => colorScale(d.zone)) // Uses color scale defined in const colorScale above
    .attr("filter", "drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))");

  node.call(drag(simulation));


  const imageContainer = svg // create a "g" image class container for each piece of data
      .selectAll("g.imageContainer") // the "g" is to say it applies to the g of svg
      .data(data.nodes)
      .enter() // applies context to the stuff below
      .append("g")
      .attr("class", "imageContainer")
      .call(drag(simulation)); // Attach drag behavior to the entire group;

  const image = imageContainer // this corresponds to the imageContainer that is drawn in the simulation.on("tick", ...)
      .append("image")
      .attr('height', (d => nodeScale(d.influence)))
      .attr('width',(d => nodeScale(d.influence)))
      .attr('transform', (d => `translate(${-nodeScale(d.influence) /2}, ${-nodeScale(d.influence) / 2})`)) // image in center of node
      .attr('href', (d, i) => `image/img-${i}.png`); // cycle through image img-0.png, img-1.png, img-2.png, etc

  const textContainer = svg
      .selectAll("g.label") // use g.label so it doesn't overwrite the imageContainer images
      .data(data.nodes)
      .enter()
      .append("g");

  textContainer
      .append("text")
      .text((d) => d.name) // uses the "name" value pair in the data.json
      .attr("font-size", (d) => fontSizeScale(d.influence))
      .attr("font-family", "Roboto")
      .attr('transform', (d =>{

        const scale = nodeScale(d.influence);
        const x = scale + 2;  // x is the radius of the circle based on the influence value, plus 2
        const y = scale + 4; // y is also the radius of the circle based on influence value, plus 4 so it is a little bit more below the node
        return `translate(${x},${y})`

      }));

  const card = svg
      .append("g")
      .attr('pointer-events', "none") // user can't click on the card itself; only interact with node
      .attr('display', "none" ); // card doesn't display until hover
      

  const cardBackground = card.append("rect")
      .attr('width',150)
      .attr('height', 45)
      .attr('fill', "#fff")
      .attr('stroke', "#333")
      .attr('rx', 4)
      .attr("filter", "drop-shadow(3px 5px 2px rgb(0 0 0 / 0.4))");


  const cardTextName = card
      .append("text")
      .attr('transform', 'translate(8, 20)')
      .attr('font-family', "Roboto" )
      .attr('font-weight', "bold" )
      .text("Default name");

  const cardTextRole = card
      .append("text")
      .attr('font-size', 12)
      .attr('font-family', "Roboto" )
      .attr('transform', 'translate(8, 35)')
      .text("Default role");

  let currentTarget;

  node.on("mouseover", (event, d) => {
    
    card.attr("display", "block");
    
    currentTarget = event.target;

    cardTextName.text(d.name);
    cardTextRole.text(d.role);

    const nameWidth = cardTextName.node().getBBox().width;
    const positionWidth = cardTextRole.node().getBBox().width;
    constCardWidth = Math.max(nameWidth, positionWidth);

    cardBackground.attr("width", constCardWidth + 16);
    

    simulation.alphaTarget(0).restart();

  });

  node.on("mouseout", () => {
    currentTarget = null;
    card.attr("display", "none");
  });

  const lineGenerator = d3.line()
      .curve(d3.curveCardinal);

  simulation.on("tick", () =>{  // this is for the rendering of every frame of animation

    // Boundary constraints for nodes to stay within the container
    data.nodes.forEach((d) => {
      d.x = Math.max(nodeScale(d.influence), Math.min(width - nodeScale(d.influence), d.x));
      d.y = Math.max(nodeScale(d.influence), Math.min(height - nodeScale(d.influence), d.y));
    });



    imageContainer
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`); // draw the images in the center of the nodes

    textContainer
      .attr('transform', (d) => `translate(${d.x}, ${d.y})`); // draw the labels
    
    node
      .attr("cx", (d) => d.x)
      .attr("cy", (d) => d.y);

    link.attr("d", (d) =>{

      const mid = [
        (d.source.x + d.target.x) / 2,
          (d.source.y + d.target.y) /2

      ];

      if (d.overlap > 0) {
        const distance = Math.sqrt(
          Math.pow(d.target.x - d.source.x, 2) + 
          Math.pow(d.target.y - d.source.y, 2)
        )

        const slopeX = (d.target.x - d.source.x) / distance;
        const slopeY = (d.target.y - d.source.y) / distance;

        const curveSharpness = 7;
        mid[0] += slopeY * curveSharpness;
        mid[1] -= slopeX * curveSharpness;

      }

      return lineGenerator([
        [d.source.x, d.source.y],
        mid,
        [d.target.x, d.target.y]
        
      ])
    });

    if (currentTarget) {

      const radius = currentTarget.r.baseVal.value;

      const xPos = currentTarget.cx.baseVal.value + radius + 3;
      const yPos = currentTarget.cy.baseVal.value + radius + 3;

      card.attr("transform", `translate(${xPos}, ${yPos})`);
    }
  });
});

