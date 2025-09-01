export class GraphElement {
    constructor(node) {
        Object.assign(this, node);
    }
}

export class OverviewRenderer {
    /** -------------------- Constants -------------------- */
    static TRACK_TYPE_COLORS = {
        default: "black",
        1: "#8DB591",
        2: "#7AAFD1",
        3: "#D9A066",
        4: "#AA8CB7",
        5: "#D38C8C"
    };

    /** -------------------- Initialization -------------------- */
    constructor(containerId, data) {
        this.container = document.getElementById(containerId);
        const { width, height } = this.container.getBoundingClientRect();

        this.data = data;
        this.width = width;
        this.height = height;

        // Layout constants
        this.offset = 50;
        this.scaleX = this.width - this.offset * 2;
        this.labelOffset = 17;
        this.verticalSignalOffset = 5;
        this.diagonalSignalOffset = Math.sqrt(12.5);

        // SVG & simulation state
        this.svg = null;
        this.zoomGroup = null;
        this.zoom = null;
        this.simulation = null;

        // Data holders
        this.nodes = [];
        this.links = [];

        // Selections
        this.link = null;
        this.linkLabels = null;
        this.node = null;

        this.zoomSet = false;
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

    /** -------------------- Data Processing -------------------- */
    processNodes(nodes) {
        nodes.forEach(node => {
            node.fx = node.x * this.scaleX + this.offset;
            node.fy = node.y * this.scaleX + this.offset;
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
            .attr("fill", "white");

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
            .attr("x", d => this.getSignalLabelOffset(d.angle, d.direction)[0])
            .attr("y", d => this.getSignalLabelOffset(d.angle, d.direction)[1])
            .attr("text-anchor", "middle")
            .style("font-weight", 700)
            .style("visibility", "hidden")
            .text(d => d.name);
    }

    /** -------------------- Signal Helpers -------------------- */
    buildSignalNode(d, node, svgElement) {
        const importedNode = document.importNode(svgElement, true);
        d3.select(node)
            .attr("class", "signal")
            .attr("id", `signal-${d.uuid}`)
            .append("g")
            .datum(d)
            .attr("transform", () => {
                const [x, y] = this.getSignalTranslate(d.angle, d.direction);
                return `translate(${x}, ${y}) scale(0.045) rotate(${d.angle})`;
            })
            .attr("fill", "black")
            .node().appendChild(importedNode);
    }

    getSignalTranslate(angle, direction) {
        if (angle % 90 === 0) {
            return direction === "in"
                ? [0, this.verticalSignalOffset]
                : [0, -this.verticalSignalOffset];
        }
        if ((angle + 45) % 180 === 0) {
            return direction === "in"
                ? [-this.diagonalSignalOffset, this.diagonalSignalOffset]
                : [this.diagonalSignalOffset, -this.diagonalSignalOffset];
        }
        if ((angle - 45) % 180 === 0) {
            return direction === "in"
                ? [this.diagonalSignalOffset, this.diagonalSignalOffset]
                : [-this.diagonalSignalOffset, -this.diagonalSignalOffset];
        }
        return [0, 0];
    }

    getSignalLabelOffset(angle, direction) {
        let x = 0;
        if (angle % 90 === 0) {
            x = direction === "in" ? -this.labelOffset : this.labelOffset;
        } else if ((angle + 45) % 180 === 0) {
            x = direction === "in" ? -60 : 60;
        } else if ((angle - 45) % 180 === 0) {
            x = direction === "in" ? 60 : -60;
        }

        let y = 0;
        if (angle % 90 === 0) {
            y = direction === "in" ? this.labelOffset + 20 : -this.labelOffset - 8;
        }
        return [x, y];
    }

    /** -------------------- Label Helpers -------------------- */
    getNodeLabelTranslateY(node) {
        for (const link of this.links) {
            const isSource = link.source.uuid === node.uuid;
            const isTarget = link.target.uuid === node.uuid;
            if (!isSource && !isTarget) continue;
            if (link.source.y === link.target.y) continue;

            const above = link.source.y < link.target.y;
            if (isSource === above) return -this.labelOffset;
        }
        return this.labelOffset + 10;
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
                if (d.source.y > d.target.y) return `rotate(-45, ${x-5}, ${y+5})`;
                if (d.source.y < d.target.y) return `rotate(45, ${x+5}, ${y+5})`;
                return null;
            })
            .attr("dy", d => d.source.y === d.target.y ? this.labelOffset : 0);

        this.node.attr("transform", d => `translate(${d.x},${d.y})`);

        this.node.select("text")
            .filter(d => d.type === "NodeType.Point")
            .style("font-weight", 700)
            .attr("y", d => this.getNodeLabelTranslateY(d));
    }

    /** -------------------- Main Render -------------------- */
    async render() {
        this.nodes = this.data.nodes.map(node => new GraphElement(node));
        this.links = this.data.edges;

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

        this.simulation.on("tick", () => {
            this.ticked();
            if (!this.zoomSet) this.applyInitialZoom();
        });
    }

    applyInitialZoom() {
        const scaleFactor = 1 / Math.max(this.data.properties.max_x, this.data.properties.max_y);
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
function toggleLabels(selector, visible) {
    d3.selectAll(selector).style("visibility", visible ? "visible" : "hidden");
}

function resetEdgeLabels() {
    const edgeCheckBox = document.getElementById("toggle-edge-labels");
    edgeCheckBox.checked = false;
    edgeCheckBox.dispatchEvent(new Event("change"));
}

document.getElementById("toggle-point-labels").addEventListener("change", function () {
    toggleLabels(".point-label", this.checked);
    resetEdgeLabels();
});

document.getElementById("toggle-signal-labels").addEventListener("change", function () {
    toggleLabels(".signal-label", this.checked);
    resetEdgeLabels();
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
    const useColors = this.checked;
    d3.selectAll(".edge")
        .style("stroke", d => useColors ? (OverviewRenderer.TRACK_TYPE_COLORS[d.type] || "black") : "black")
        .style("stroke-dasharray", d => {
            if (!useColors) return "none";
            return OverviewRenderer.TRACK_TYPE_COLORS[d.type] ? "none" : "5,5";
        });
});
