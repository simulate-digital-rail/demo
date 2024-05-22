import json

from flask import Flask, request, render_template, url_for
from orm_importer.importer import ORMImporter
from planproexporter import Generator
from railwayroutegenerator.routegenerator import RouteGenerator

app = Flask(__name__)


@app.route("/")
def homepage():
    railway_option_types = ["rail", "abandoned", "construction", "disused", "funicular", "light_rail", "miniature",
                            "monorail", "narrow_gauge", "subway", "tram"]
    return render_template('index.html',
                           css_file=url_for('static', filename='pico.min.css'),
                           custom_css_file=url_for('static', filename='custom.css'),
                           axios_file=url_for('static', filename='axios.min.js'),
                           modal_file=url_for('static', filename='modal.js'),
                           railway_option_types=railway_option_types)


@app.route("/run")
def run_converter():
    polygon = request.args.get('polygon')
    if not polygon:
        return 'No location specified', 400
    railway_option_types = request.args.getlist("railway_option_types[]")
    if not railway_option_types:
        return 'No option types specified', 400
    topology = ORMImporter().run(polygon, railway_option_types)
    match request.args.get("mode"):
        case "planpro":
            return Generator().generate(topology), 200
        case "routes":
            RouteGenerator(topology).generate_routes()
            return json.dumps(topology.to_serializable()[0]["routes"]), 200
        case _:
            return 'No mode specified', 400


if __name__ == "__main__":
    app.run(debug=True, port=8000)
