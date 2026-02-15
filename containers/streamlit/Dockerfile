# Streamlit Dashboard for SQL Server CDC Demo

FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for ODBC
RUN apt-get update && apt-get install -y \
    unixodbc-dev \
    curl \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Microsoft ODBC Driver 18 for SQL Server
RUN curl https://packages.microsoft.com/keys/microsoft.asc | apt-key add - && \
    curl https://packages.microsoft.com/config/debian/11/prod.list > /etc/apt/sources.list.d/mssql-release.list && \
    apt-get update && \
    ACCEPT_EULA=Y apt-get install -y msodbcsql18 && \
    rm -rf /var/lib/apt/lists/*

# Copy project files
COPY pyproject.toml .
COPY app.py .
COPY pages/ pages/
COPY .streamlit/ .streamlit/

# Install Python dependencies using uv
RUN pip install --no-cache-dir uv && \
    uv sync

# Expose Streamlit port
EXPOSE 8501

# Run Streamlit app
CMD ["uv", "run", "streamlit", "run", "app.py", "--server.port=8501", "--server.address=0.0.0.0"]
