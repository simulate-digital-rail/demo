from flask import Flask, request, render_template, url_for
from orm_importer.importer import ORMImporter
from planproexporter import Generator
from railwayroutegenerator.generator import generate_from_topology

app = Flask(__name__)


@app.route("/")
def homepage():
    return render_template('index.html', css_file=url_for('static', filename='pico.min.css'), axios_file=url_for('static', filename='axios.min.js'), modal_file=url_for('static', filename='modal.js'))


@app.route("/run")
def run_converter():
    polygon = request.args.get('polygon')
    if not polygon:
        return 'No location specified', 400
    topology = ORMImporter().run(polygon)
    match request.args.get("mode"):
        case "planpro":
            return Generator().generate(topology), 200
        case "routes":
            return generate_from_topology(topology), 200
        case _:
            return 'No mode specified', 400


if __name__ == "__main__":
    app.run(debug=True)
