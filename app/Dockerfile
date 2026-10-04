FROM python:3.11-slim

# Create the non-root user earlier to avoid permissions issues later
RUN adduser --disabled-password --gecos '' shuttle_user

WORKDIR /app

# Install system dependencies if required for psycopg2 or others
RUN apt-get update && apt-get install -y \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

# Set permissions for the vault directory
RUN mkdir -p /app/shuttle_vault && \
    chown -R shuttle_user:shuttle_user /app

# Switch to the non-root user
USER shuttle_user

EXPOSE 5000

CMD ["python", "app.py"]
