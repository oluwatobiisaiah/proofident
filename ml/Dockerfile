FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Bake trained models into the image so there is no cold-start training on first request.
# This adds ~30s to build time but eliminates a 60s delay on container startup.
RUN python scripts/train_model.py --samples 4000

RUN adduser --disabled-password --gecos "" appuser \
    && chown -R appuser /app
USER appuser

EXPOSE 8001

CMD ["python", "main.py"]
