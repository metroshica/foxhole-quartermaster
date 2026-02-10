FROM python:3.12-slim

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Copy dependency files
COPY pyproject.toml README.md ./
COPY uv.lock* ./

# Install dependencies only (without building the project itself)
RUN uv sync --frozen --no-dev --no-install-project || uv sync --no-dev --no-install-project

# Copy source code
COPY src/ ./src/

# Set environment variables
ENV PYTHONPATH=/app/src
ENV PYTHONUNBUFFERED=1

# Run the bot
CMD ["uv", "run", "python", "-m", "src.main"]
