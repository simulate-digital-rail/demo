
import ast
from flask import Flask, request, render_template, url_for, jsonify
from orm_importer.importer import ORMImporter
from planproexporter import Generator
from railwayroutegenerator.routegenerator import RouteGenerator

app = Flask(__name__)


@app.route("/")
def orm_converter():
    railway_option_types = [
        "rail", "abandoned", "construction", "disused",
        "funicular", "light_rail", "miniature", "monorail",
        "narrow_gauge", "subway", "tram"
    ]

    return render_template(
        'orm_converter.html',
        custom_css_file=url_for('static', filename='css/custom.css'),
        axios_file=url_for('static', filename='js/axios.min.js'),
        railway_option_types=railway_option_types
    )

@app.route("/schematic-converter")
def schematic_converter():
    railway_option_types = [
        "rail", "abandoned", "construction", "disused",
        "funicular", "light_rail", "miniature", "monorail",
        "narrow_gauge", "subway", "tram"
    ]

    return render_template(
        'orm_converter.html',
        custom_css_file=url_for('static', filename='css/custom.css'),
        axios_file=url_for('static', filename='js/axios.min.js'),
        modal_file=url_for('static', filename='js/modal.js'),
        railway_option_types=railway_option_types
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


@app.route("/run-schematic-converter")
def run_schematic_converter():
    ...


if __name__ == "__main__":
    app.run(debug=True, port=8000)
