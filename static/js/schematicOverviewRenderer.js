export class GraphElement {
    constructor(node) {
        Object.assign(this, node);
    }
}

export class OverviewRenderer {
    static TRACK_TYPE_COLORS = {
        "default": "black",
        1: "#8DB591",
        2: "#7AAFD1",
        3: "#D9A066",
        4: "#AA8CB7",
        5: "#D38C8C"
    };

    constructor(containerId, computerConfigurator) {
        this.container = document.getElementById(containerId);
        this.computerConfigurator = computerConfigurator;

        const { width, height } = this.container.getBoundingClientRect();
        this.width = width;
        this.height = height;

        this.offset = 50;
        this.scaleX = this.width - this.offset * 2;
        this.scaleY = this.height - this.offset * 2;

        this.svg = null;
        this.zoomGroup = null;
        this.zoom = null;

        this.nodes = [];
        this.links = [];
        this.simulation = null;

        this.link = null;
        this.node = null;
        this.zoomSet = false;
    }

    /** -------------------- Data -------------------- */
    async loadData() {
        const url = `/planprofiles/estw/generate/${this.container.dataset.project}`;
        return new Promise((resolve, reject) => {
            $.getJSON(url, data => resolve(data)).fail((_, __, err) => reject(err));
        });
    }

    async loadSignalSVG() {
        return d3.xml("/static/img/signal.svg");
    }

    /** -------------------- Setup -------------------- */
    setupSVG() {
        this.svg = d3.select(this.container).select("svg");
        if (this.svg.empty()) {
            this.svg = d3.select(this.container).append("svg")
                .attr("width", this.width)
                .attr("height", this.height);
        }
        this.svg.selectAll("*").remove();
        this.zoomGroup = this.svg.append("g");
    }

    setupZoom() {
        this.zoom = d3.zoom()
            .scaleExtent([0.1, 20])
            .on("zoom", (event) => this.zoomGroup.attr("transform", event.transform));
        this.svg.call(this.zoom);
    }

    /** -------------------- Processing -------------------- */
    processNodes(nodes) {
        nodes.forEach(node => {
            node.fx = node.x * this.scaleX + this.offset;
            node.fy = node.y * this.scaleY + this.offset;

            const theta = node.angle * Math.PI / 180;
            const scaledX = Math.cos(theta) / this.scaleX;
            const scaledY = Math.sin(theta) / this.scaleY;
            node.angle = Math.atan2(scaledY, scaledX) * 180 / Math.PI;

            node.active = false;
        });
    }

    /** -------------------- Rendering -------------------- */
    renderLinks() {
        this.link = this.zoomGroup.append("g")
            .selectAll("line")
            .data(this.links)
            .join("line")
            .attr("class", "edge")
            .style("opacity", 0)
            .style("stroke", "black");

        this.linkLabels = this.zoomGroup.append("g")
            .selectAll("text")
            .data(this.links)
            .join("text")
            .attr("class", "edge-label")
            .attr("text-anchor", "middle")
            .style("font-weight", 600)
            .style("pointer-events", "none")
            .style("visibility", "hidden")
            .text(d => (d.uuid ? d.uuid.slice(-5) : ""));
    }

    renderPoints(nodeSelection) {
        const points = nodeSelection.filter(d => d.type === "NodeType.Point");

        points.append("circle")
            .attr("id", d => `point-${d.uuid}`)
            .attr("r", 10)
            .attr("fill", "white")
            .attr("cursor", "pointer")

        points.append("text")
            .attr("id", d => `point-label-${d.uuid}`)
            .attr("class", "point-label")
            .attr("text-anchor", "middle")
            .style("font-weight", 600)
            .style("visibility", "hidden")
            .text(d => d.name);
    }

    renderEndPoints(nodeSelection) {
        nodeSelection.filter(d => d.type === "NodeType.Endpoint")
            .append("circle")
            .attr("id", d => `endPoint-${d.uuid}`)
            .attr("r", 6)
            .attr("fill", "black");
    }

    async renderSignals(nodeSelection) {
        const data = await this.loadSignalSVG();
        const svgElement = data.documentElement;

        const signals = nodeSelection.filter(d => d.type === "NodeType.Signal");
        signals.each((d, i, nodes) => this.buildSignalNode(d, nodes[i], svgElement));

        signals.append("text")
            .attr("id", d => `signal-label-${d.uuid}`)
            .attr("class", "signal-label")
            .attr("x", d => (d.direction === "in" ? -17 : 17))
            .attr("y", d => (d.direction === "in" ? 37 : -25))
            .attr("text-anchor", "middle")
            .style("font-weight", 600)
            .style("visibility", "hidden")
            .text(d => d.name);
    }

    /** -------------------- Utilities -------------------- */
    buildSignalNode(d, node, svgElement) {
        const importedNode = document.importNode(svgElement, true);
        const iconGroup = d3.select(node)
            .attr("class", "signal")
            .attr("id", `signal-${d.uuid}`)
            .append("g")
            .datum(d)
            .attr("transform", () => {
                const baseTranslate = d.direction === "in" ? "translate(0, 5)" : "translate(0, -5)";
                const extraTranslate = (d.angle % 90 !== 0) ? " translate(0, 22)" : "";
                return `${baseTranslate}${extraTranslate} scale(0.04) rotate(${d.angle})`;
            })
            .attr("fill", "black")
            .style("cursor", "pointer");

        iconGroup.node().appendChild(importedNode);
        const bbox = importedNode.getBBox();
        iconGroup.append("rect")
            .attr("x", bbox.x)
            .attr("y", bbox.y)
            .attr("width", bbox.width)
            .attr("height", bbox.height)
            .attr("fill", "transparent")
            .style("pointer-events", "all");
    }

    /** -------------------- Simulation -------------------- */
    ticked() {
        this.link
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        this.linkLabels
            .attr("x", d => (d.source.x + d.target.x) / 2)
            .attr("y", d => (d.source.y + d.target.y) / 2)
            .attr("transform", d => {
                const x = (d.source.x + d.target.x) / 2;
                const y = (d.source.y + d.target.y) / 2;
                if (d.source.y > d.target.y) return `rotate(-48, ${x-8}, ${y})`;
                if (d.source.y < d.target.y) return `rotate(48, ${x+5}, ${y+5})`;
                return null;
            })
            .attr("dy", d => d.source.y === d.target.y ? 18 : 0);

        this.node.attr("transform", d => `translate(${d.x},${d.y})`);

        this.node.select("text")
            .filter(d => d.type === "NodeType.Point")
            .attr("y", d => this.calculatePointLabelY(d));
    }

    calculatePointLabelY(d) {
        for (const link of this.links) {
            const isSource = link.source.uuid === d.uuid;
            const isTarget = link.target.uuid === d.uuid;
            if (!isSource && !isTarget) continue;

            if (link.source.y === link.target.y) continue;
            const above = link.source.y < link.target.y;
            return (isSource === above) ? -17 : 28;
        }
        return 28;
    }

    /** -------------------- Main Render -------------------- */
    async render() {
        const data = await this.loadData();
        this.nodes = data.nodes.map(node => new GraphElement(node));
        this.links = data.edges;

        this.processNodes(this.nodes);
        this.setupSVG();
        this.setupZoom();
        this.renderLinks();

        this.node = this.zoomGroup.append("g")
            .selectAll("g")
            .data(this.nodes)
            .join("g")
            .style("opacity", 0);

        this.renderPoints(this.node);
        this.renderEndPoints(this.node);
        await this.renderSignals(this.node);

        this.simulation = d3.forceSimulation(this.nodes)
            .force("link", d3.forceLink(this.links).id(d => d.uuid))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .on("tick", () => this.ticked());

        this.zoomSet = false;
        this.simulation.on("tick", () => {
            this.ticked();
            if (!this.zoomSet) this.applyInitialZoom(data);
        });
    }

    applyInitialZoom(data) {
        const scaleFactor = 1 / Math.max(data.properties.max_x, data.properties.max_y);
        const bbox = this.zoomGroup.node().getBBox();
        const translateX = (this.width - bbox.width * scaleFactor) / 2 - bbox.x * scaleFactor;
        const translateY = (this.height - bbox.height * scaleFactor) / 2 - bbox.y * scaleFactor;
        const initialTransform = d3.zoomIdentity.translate(translateX, translateY).scale(scaleFactor);

        this.svg.call(this.zoom.transform, initialTransform);
        this.node.style("opacity", 1);
        this.link.style("opacity", 1);
        this.zoomSet = true;
    }
}

/** -------------------- UI Controls -------------------- */
function toggleLabels(selector, show) {
    d3.selectAll(selector).style("visibility", show ? "visible" : "hidden");
}

document.getElementById("toggle-point-labels").addEventListener("change", function () {
    toggleLabels(".point-label", this.checked);
    const edgeCheckBox = document.getElementById("toggle-edge-labels");
    edgeCheckBox.checked = false;
    edgeCheckBox.dispatchEvent(new Event("change"));
});

document.getElementById("toggle-signal-labels").addEventListener("change", function () {
    toggleLabels(".signal-label", this.checked);
    const edgeCheckBox = document.getElementById("toggle-edge-labels");
    edgeCheckBox.checked = false;
    edgeCheckBox.dispatchEvent(new Event("change"));
});

document.getElementById("toggle-edge-labels").addEventListener("change", function () {
    const show = this.checked;
    if (show) {
        document.getElementById("toggle-point-labels").checked = false;
        document.getElementById("toggle-signal-labels").checked = false;
        toggleLabels(".signal-label", false);
        toggleLabels(".point-label", false);
    }
    toggleLabels(".edge-label", show);
    d3.selectAll(".signal").style("visibility", show ? "hidden" : "visible");
});

document.getElementById("toggle-track-colors").addEventListener("change", function () {
    d3.selectAll(".edge")
        .style("stroke", d => {
            if (!this.checked) return "black";
            return GraphRenderer.TRACK_TYPE_COLORS[d.type] || "black";
        })
        .style("stroke-dasharray", d => {
            if (!this.checked) return "none";
            return GraphRenderer.TRACK_TYPE_COLORS[d.type] ? "none" : "5,5";
        });
});
