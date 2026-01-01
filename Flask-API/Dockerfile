# Use an official Python runtime as a parent image
FROM python:3.11-slim

# Set the working directory in the container
WORKDIR /app

# App needs Docker to run containers inside
RUN apt-get update && \
    apt-get install -y docker.io && \
    rm -rf /var/lib/apt/lists/*

# Setup environment
ENV POETRY_VERSION=2.2.1
ENV PIP_BREAK_SYSTEM_PACKAGES=1

# Install package manager
RUN pip install poetry==$POETRY_VERSION

# Create .venv
RUN poetry config virtualenvs.in-project true

# Copy the requirements file into the container
COPY pyproject.toml poetry.lock ./

# Install any dependencies
RUN poetry install --no-root

# Copy the current directory contents into the container
COPY . .

# Run app.py when the container launches
CMD ["poetry", "run", "gunicorn", "--workers=1", "--bind=0.0.0.0:5000", "main:app"]
