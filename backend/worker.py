"""Cloudflare Python Workers entrypoint — no Docker, Uvicorn or Containers.

FastAPI serves through the ASGI adapter bundled with workers-py. Business
permissions and data remain in app/; no demo data is loaded here.
"""
from workers import asgi
from app.main import app

Default = asgi.entrypoint(app)
