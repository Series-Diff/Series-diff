# Build stage - with compilers for building Python packages with C extensions
FROM python:3.11-slim AS builder

WORKDIR /app

# Setup environment
ENV POETRY_VERSION=2.2.1
ENV PIP_BREAK_SYSTEM_PACKAGES=1
ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Install build dependencies (gcc/g++ needed for orjson, numpy, scipy, etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Poetry
RUN pip install poetry==$POETRY_VERSION

# Configure Poetry to create virtualenv in project
RUN poetry config virtualenvs.in-project true

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies (Poetry 2.x syntax)
RUN poetry install --no-root --without dev

# Runtime stage - minimal image without build tools
FROM python:3.11-slim

WORKDIR /app

ENV PYTHONUNBUFFERED=1
ENV PYTHONDONTWRITEBYTECODE=1

# Copy virtual environment from builder
COPY --from=builder /app/.venv /app/.venv

# Copy application code
COPY . .

# Use the virtual environment
ENV PATH="/app/.venv/bin:$PATH"

# Run gunicorn directly (no need for poetry run since we have .venv in PATH)
CMD ["gunicorn", "-c", "gunicorn_config.py", "main:app"]
