// Initialize map
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
    document.getElementById("polygon").value = "";
    points = [];
    polygon.setLatLngs([]);
});

document.getElementById("polygon").addEventListener("input", function() {
    try {
        const text = this.value.trim();
        if (!text) return;

        // Parse string like [(lat, lng), (lat, lng)]
        const matches = text.match(/\((-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)\)/g);
        if (!matches) return;

        // Clear old points
        points.forEach(m => m.remove());
        points = [];

        const coords = matches.map(m => {
            const nums = m.replace(/[()]/g, "").split(",");
            return [parseFloat(nums[0]), parseFloat(nums[1])];
        });

        // Add markers back
        coords.forEach(c => {
            let marker = L.marker(c, {draggable: true}).addTo(map);
            marker.on("move", updatePoints);
            marker.on("click", function() {
                const idx = points.indexOf(marker);
                if (idx > -1) points.splice(idx, 1);
                marker.remove();
                updatePoints();
            });
            points.push(marker);
        });

        // Update polygon
        polygon.setLatLngs(coords);

        if (points.length > 0) {
            const latlngs = points.map(p => p.getLatLng());
            map.fitBounds(L.latLngBounds(latlngs), { padding: [30, 30] });
        }
    } catch (e) {
        console.warn("Invalid polygon input:", e);
    }
});


function updatePoints() {
    polygon.setLatLngs(points.map(p => p.getLatLng()));

    const coords = points.map(p => {
        const ll = p.getLatLng();
        return `(${ll.lat.toFixed(6)}, ${ll.lng.toFixed(6)})`;
    });

    document.getElementById("polygon").value = `[${coords.join(", ")}]`;
}


document.getElementById("reset-polygon").addEventListener("click", function() {
    points.forEach(marker => marker.remove());
    points = [];
    polygon.setLatLngs([]);
    document.getElementById("polygon").value = "";
});

map.on('click', function(e) {
    var marker = L.marker(e.latlng, {draggable: true}).addTo(map);

    marker.on('move', updatePoints);

    marker.on('click', function() {
        const point_index = points.indexOf(marker);
        points.splice(point_index, 1);
        marker.remove();
        updatePoints();
    });

    points.push(marker);
    updatePoints();
});

map.on('mouseup', function() {
    map.removeEventListener('mousemove');
});

document.querySelectorAll(".submit-button").forEach(button => {
    button.addEventListener("click", function(event) {
        const spinner = this.querySelector(".spinner-border");
        spinner.classList.remove("d-none");
        this.disabled = true;

        document.getElementById("result_area").hidden = true;
        document.getElementById("download-results").hidden = true;

        axios.get("/run-orm-converter", {
            params: {
                polygon: document.getElementById("polygon").value.replace(/\s+/g, ""),
                mode: this.value,
                railway_option_types: Array.from(
                    document.querySelectorAll('input[name=railway_type_options]:checked')
                ).map(x => x.value)
            }
        })
        .then(response => {
            let resultText = (typeof response.data === "string")
                ? response.data
                : JSON.stringify(response.data, null, 4);

            const resultArea = document.getElementById("result_area");
            resultArea.value = resultText;
            resultArea.hidden = false;

            const downloadBtn = document.getElementById("download-results");
            let url = URL.createObjectURL(new Blob([resultText], {type: "text/plain"}));
            downloadBtn.href = url;
            downloadBtn.hidden = false;
        })
        .catch(error => {
            document.getElementById("error_message").textContent = error.message;
            new bootstrap.Modal(document.getElementById("error_modal")).show();
        })
        .finally(() => {
            spinner.classList.add("d-none");
            this.disabled = false;
        });
    });
});
