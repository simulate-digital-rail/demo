# Simulate Digital Rail demonstration
This repository provides examples for the Simulate Digital Rail projects and what you can do with [yaramo](https://github.com/simulate-digital-rail/yaramo).
You can explore the possibilities by installing this repository with `pip install git+https://github.com/simulate-digital-rail/demo` or by cloning this repository and installing the requirements with `poetry install`. 
Afterwards, you can start the web application with `poetry run python app.py` and open the web application in your browser at `http://localhost:8000`.

Further code examples can be found in the examples directory.

You can also run it in a Docker container by building and running the container:
```bash
docker build -t sdr-demo .
docker run -p 8000:8000 sdr-demo
```
