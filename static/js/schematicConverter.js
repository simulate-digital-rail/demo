import { OverviewRenderer } from './schematicOverviewRenderer.js'

document.getElementById("process-file").addEventListener("click", async function () {
    if (!document.getElementById("input-file").files[0]) {
        showErrorModal("Error", "Please select a file first.");
        return;
    }

    const processButton = this;
    const spinner = processButton.querySelector(".spinner-border");
    spinner.classList.remove("d-none");
    processButton.disabled = true;

    const formData = new FormData();
    formData.append("file", document.getElementById("input-file").files[0]);
    formData.append("pp_version", document.getElementById("planpro-version").value)
    formData.append("signal_types", document.getElementById("ks-signals").value)

    try {
        const response = await axios.post("/run-schematic-converter", formData);
        if (response.data.status === "success") {
            new OverviewRenderer('graph-container', response.data.graph).render();
            document.getElementById("toggle-point-labels").checked = false;
            document.getElementById("toggle-signal-labels").checked = false;
            document.getElementById("toggle-edge-labels").checked = false;
            document.getElementById("toggle-track-colors").checked = false;
            document.getElementById("download-file").classList.remove("disabled");
        } else {
            showErrorModal("Conversion Failed", response.data.message);
        }
    } catch (error) {
        showErrorModal("Request Failed", error.message);
    } finally {
        spinner.classList.add("d-none");
        processButton.disabled = false;
    }
});


document.getElementById("download-file").addEventListener("click", function () {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/schematic-converter/download-schematic";
    document.body.appendChild(form);
    form.submit();
    form.remove();
});


function showErrorModal(title, message) {
    document.querySelector("#errorModal .modal-title").textContent = title || "Error";
    document.getElementById("errorModalBody").textContent = message || "An unknown error occurred.";
    new bootstrap.Modal(document.getElementById("errorModal")).show();
}