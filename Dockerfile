FROM python:3.9-slim

# Set working directory
WORKDIR /code

# Install system dependencies for OpenCV and other libraries (using libgl1 instead of legacy libgl1-mesa-glx)
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements and install python packages
COPY ./requirements.txt /code/requirements.txt
RUN pip install --no-cache-dir -r /code/requirements.txt

# Copy all project files
COPY . .

# Expose port (7860 is default for Hugging Face Spaces, Render will override this with $PORT)
EXPOSE 7860

# Command to run FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "7860"]
