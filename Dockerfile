FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for postgres/psycopg2)
RUN apt-get update && apt-get install -y \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install PyTorch for CPU first to keep the image lightweight
RUN pip install torch --index-url https://download.pytorch.org/whl/cpu

# Copy requirements and install them
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Run the setup script to pre-download AI models (spaCy, SBERT) during the build phase
RUN python backend/setup_models.py

# Expose default port (Cloud Run will override via $PORT)
EXPOSE 8080

# Command to run the application (uses PORT env var if available, defaults to 8080)
CMD uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT:-8080}
