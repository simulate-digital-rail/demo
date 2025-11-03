var map = L.map('map').setView([52.3942847, 13.1282920], 16);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap'
}).addTo(map);

L.tileLayer('https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenRailwayMap'
}).addTo(map);

var points = [];
var polygon = L.polygon([]).addTo(map);

window.addEventListener("DOMContentLoaded", () => {
    resetPolygon();
});

document.getElementById("polygon").addEventListener("input", function() {
    try {
        const text = this.value.trim();
        if (!text) return;

        const matches = text.match(/\((-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)\)/g);
        if (!matches) return;

        points.forEach(m => m.remove());
        points = [];

        const coords = matches.map(m => {
            const nums = m.replace(/[()]/g, "").split(",");
            return [parseFloat(nums[0]), parseFloat(nums[1])];
        });

        coords.forEach(c => {
            const marker = createMarker(c);
            points.push(marker);
        });

        polygon.setLatLngs(coords);

        if (points.length > 0) {
            const latlngs = points.map(p => p.getLatLng());
            map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
        }
    } catch (e) {
        showErrorModal("Invalid polygon input", e.message || e);
    }
});

function createMarker(latlng) {
    const marker = L.marker(latlng, { draggable: true }).addTo(map);
    marker.on("move", updatePoints);
    marker.on("click", () => {
        const idx = points.indexOf(marker);
        if (idx > -1) points.splice(idx, 1);
        marker.remove();
        updatePoints();
    });
    return marker;
}

function updatePoints() {
    polygon.setLatLngs(points.map(p => p.getLatLng()));
    const coords = points.map(p => {
        const ll = p.getLatLng();
        return `(${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)})`;
    });
    document.getElementById("polygon").value = `[${coords.join(", ")}]`;
}

function resetPolygon() {
    points.forEach(marker => marker.remove());
    points = [];
    polygon.setLatLngs([]);
    document.getElementById("polygon").value = "";
}

document.getElementById("reset-polygon").addEventListener("click", resetPolygon);

map.on('click', function(e) {
    const marker = createMarker(e.latlng);
    points.push(marker);
    updatePoints();
});

map.on('mouseup', function() {
    map.removeEventListener('mousemove');
});

document.querySelectorAll(".submit-button").forEach(button => {
    button.addEventListener("click", async function(event) {
        const spinner = this.querySelector(".spinner-border");
        spinner.classList.remove("d-none");
        this.disabled = true;

        document.getElementById("result_area").hidden = true;
        document.getElementById("download-results").hidden = true;

        try {
            const response = await axios.get("/run-orm-converter", {
                params: {
                    polygon: document.getElementById("polygon").value.replace(/\s+/g, ""),
                    mode: this.value,
                    railway_option_types: Array.from(
                        document.querySelectorAll('input[name=railway_type_options]:checked')
                    ).map(x => x.value)
                }
            });

            const resultText = (typeof response.data === "string")
                ? response.data
                : JSON.stringify(response.data, null, 4);

            const resultArea = document.getElementById("result_area");
            resultArea.value = resultText;
            resultArea.hidden = false;

            const downloadBtn = document.getElementById("download-results");
            const url = URL.createObjectURL(new Blob([resultText], { type: "text/plain" }));
            downloadBtn.href = url;
            downloadBtn.hidden = false;

        } catch (error) {
            showErrorModal("Request Failed", error.message || error);
        } finally {
            spinner.classList.add("d-none");
            this.disabled = false;
        }
    });
});

function showErrorModal(title, message) {
    document.querySelector("#errorModal .modal-title").textContent = title || "Error";
    document.getElementById("errorModalBody").textContent = message || "An unknown error occurred.";
    new bootstrap.Modal(document.getElementById("errorModal")).show();
}
