FROM python:3.11-slim-buster AS builder

WORKDIR /app

COPY . .

RUN pip install -r requirements.txt --no-cache-dir

CMD ["python", "main.py"]
