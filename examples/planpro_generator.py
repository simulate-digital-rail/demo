
from planproexporter import Generator

from cli_importer.cli import CLI

if __name__ == '__main__':
    _cli = CLI()
    _cli.run()
    generator = Generator()
    generator.generate(_cli.topology,
        author_name="Your Name",
        organisation="Your Organization", filename="Export")
    print("Generation completed")
    print("Generator terminates.")
