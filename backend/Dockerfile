FROM python:3.11-slim

# Install system curl for healthcheck
RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Pinned dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Non-root user setup
RUN useradd -m -u 1000 appuser

# Copy application code and data snapshots
COPY backend ./backend
COPY pyproject.toml .

RUN chown -R appuser:appuser /app
USER appuser

ENV PYTHONPATH=/app
ENV PORT=8000

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
