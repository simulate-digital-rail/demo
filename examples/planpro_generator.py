
from planproexporter import Generator

from cli_importer.cli import CLI

if __name__ == '__main__':
    _cli = CLI()
    _cli.run()
    generator = Generator()
    generator.generate(_cli.topology,
        author_name="Arne Boockmeyer",
        organisation="HPI.OSM", filename="Test")
    print("Generation completed")
    print("Generator terminates.")
