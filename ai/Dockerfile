FROM python:3.10-slim

WORKDIR /app

# Install system utilities for OpenCV
RUN apt-get update && apt-get install -y \
    ffmpeg \
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY . /app/ai

ENV PYTHONPATH=/app

EXPOSE 8001

CMD ["python", "-m", "ai.processor"]
