import os

# JWT Secret Configuration
SECRET_KEY = os.getenv("SECRET_KEY", "09d25e094faa6ca2556c818166b7a9563b93f7099f6f0f4caa6cf63b88e8d3e7")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 1 day

# Database Configuration
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./trafficeye.db")

# Kafka Configuration
KAFKA_BOOTSTRAP_SERVERS = os.getenv("KAFKA_BOOTSTRAP_SERVERS", "localhost:9092")
ENABLE_KAFKA = os.getenv("ENABLE_KAFKA", "False").lower() in ("true", "1", "yes")

# Redis Configuration (For caching if needed, default local mock)
REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
ENABLE_REDIS = os.getenv("ENABLE_REDIS", "False").lower() in ("true", "1", "yes")
