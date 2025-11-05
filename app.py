import ast
import os
import tempfile

from flask import Flask, render_template, request, jsonify, send_from_directory
from werkzeug.utils import secure_filename

from orm_importer.importer import ORMImporter
from planproexporter import Generator
from planpro_importer import PlanProVersion, import_planpro
from railwayroutegenerator.routegenerator import RouteGenerator
from schematicoverview import SchematicOverview
from yaramo.topology import Topology


app = Flask(__name__)

temp_dir = tempfile.TemporaryDirectory(prefix="planpro_uploads_")
app.config['UPLOAD_FOLDER'] = temp_dir.name

chached_topology: Topology = None


@app.route("/")
def orm_converter():
    railway_option_types = [
        "rail", "abandoned", "construction", "disused",
        "funicular", "light_rail", "miniature", "monorail",
        "narrow_gauge", "subway", "tram"
    ]

    return render_template(
        'orm_converter.html',
        railway_option_types=railway_option_types
    )

@app.route("/schematic-converter", methods=['GET', 'POST'])
def schematic_converter():
    return render_template(
        'schematic_converter.html',
    )

@app.route("/run-orm-converter")
def run_orm_converter():
    polygon = ast.literal_eval(request.args.get('polygon'))
    polygon = " ".join(str(x) for tup in polygon for x in tup)
    mode = request.args.get("mode")
    railway_option_types = request.args.getlist("railway_option_types[]")

    if not polygon:
        return 'No location specified', 400
    if mode not in ("planpro", "routes"):
        return 'No mode specified', 400
    if not railway_option_types:
        return 'No option types specified', 400

    topology = ORMImporter().run(polygon, railway_option_types)

    if mode == "planpro":
        return Generator().generate(topology), 200
    if mode == "routes":
        RouteGenerator(topology).generate_routes()
        return jsonify(topology.to_serializable()[0]["routes"]), 200


@app.route("/run-schematic-converter", methods=["POST"])
def run_schematic_converter():
    if 'file' not in request.files:
        return jsonify({"status": "error", "message": "No file uploaded."})
    file = request.files['file']
    if file.filename == '':
        return jsonify({"status": "error", "message": "No filename provided."})
    if not file.filename.endswith('.ppxml'):
        return jsonify({"status": "error", "message": "Invalid file provided."})
    if request.form["pp_version"] not in ("1.9", "1.10"):
        return jsonify({"status": "error", "message": "Invalid PlanProVersion provided."})
    
    filename = secure_filename(file.filename)
    file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    file.save(file_path)
    remove_non_ks_systems = request.form['signal_types'] == "ks"
    pp_version = PlanProVersion.PlanPro110 if request.form["pp_version"] == "1.10" else PlanProVersion.PlanPro19

    try:
        global chached_topology
        chached_topology = import_planpro(os.path.join(app.config['UPLOAD_FOLDER'], filename), pp_version)
        schematic_overview = SchematicOverview(
            topology=chached_topology,
            remove_non_ks_signals=remove_non_ks_systems,
            scale_factor=11
        )
    except:
        return jsonify({"status": "error", "message": "Conversion failed."})

    return jsonify({
        "status": "success",
        "filename": file_path,
        "graph": schematic_overview.d3_graph
    })


@app.route("/schematic-converter/download-schematic", methods=["POST"])
def download_schematic_pp():
    global chached_topology
    filename = "schematic.ppxml"

    Generator().generate(
        topology=chached_topology,
        filename=os.path.join(app.config['UPLOAD_FOLDER'], "schematic")
    )

    return send_from_directory(
        app.config['UPLOAD_FOLDER'],
        filename,
        as_attachment=True
    )


if __name__ == "__main__":
    app.run(host="0.0.0.0", debug=True, port=8000)
