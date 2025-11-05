# syntax=docker/dockerfile:1

# ---- Base stage ----
FROM python:3.11-slim AS base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    POETRY_NO_INTERACTION=1 \
    POETRY_VIRTUALENVS_CREATE=false

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN curl -sSL https://install.python-poetry.org | python3 -

ENV PATH="/root/.local/bin:$PATH"

# ---- Dependencies stage ----
FROM base AS deps

WORKDIR /app

# Copy only dependency files to leverage Docker caching
COPY pyproject.toml poetry.lock ./

RUN poetry install --no-root --only main

# ---- Runtime stage ----
FROM base AS runtime

WORKDIR /app

# Copy installed dependencies from deps image
COPY --from=deps /usr/local/lib/python3.11 /usr/local/lib/python3.11

# Copy the application code
COPY . .

EXPOSE 8000

CMD ["poetry", "run", "python", "app.py"]
