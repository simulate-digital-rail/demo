from flask import Flask, request, render_template, url_for
from orm_importer.importer import ORMImporter
from planprogenerator import Generator, Config

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
    planpro = Generator().generate(topology.nodes.values(), topology.edges.values(), topology.signals.values(), Config(author_name="b", coord_representation="wgs84", organisation="b"))
    return planpro, 200


if __name__ == "__main__":
    app.run(debug=True)