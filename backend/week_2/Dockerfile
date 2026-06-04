# 1. Start with an official Python image
FROM python:3.11-slim

# 2. Install 'uv' (since your project uses it for package management)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# 3. Set the working directory inside the container
WORKDIR /app

# 4. Copy package management files first to cache dependencies
COPY pyproject.toml uv.lock ./

# 5. Install the dependencies
RUN uv sync --frozen

# 6. Copy the rest of your backend code
COPY . .

# 7. Expose the port your backend runs on (usually 8000 for FastAPI/Flask)
EXPOSE 8000

# 8. Command to run your application
CMD ["uv", "run", "python", "main.py"]