"""Gunicorn configuration for optimal performance"""

import multiprocessing
import os

# Bind to all interfaces
bind = "0.0.0.0:5000"

# Worker configuration
# Use more workers for better parallelism with Elasticache
workers = int(os.environ.get("GUNICORN_WORKERS", multiprocessing.cpu_count() * 2 + 1))
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", 4))

# Keepalive - important for persistent connections to Elasticache
keepalive = 5

# Timeout configuration
timeout = 120
graceful_timeout = 30

# Worker recycling to prevent memory leaks
max_requests = 1000
max_requests_jitter = 100

# Logging
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")
accesslog = None  # Disable access logs
errorlog = "-"  # stderr
capture_output = True  # Capture stdout/stderr from workers

# Preload app for better performance (production only)
# Disabled for local development to see real-time logs
preload_app = os.environ.get("GUNICORN_PRELOAD", "false").lower() == "true"

# Server mechanics
daemon = False
pidfile = None
umask = 0
user = None
group = None
tmp_upload_dir = None

# Connection settings optimized for Elasticache
worker_connections = 1000
backlog = 2048


def post_fork(server, worker):
    """Called after a worker has been forked."""
    server.log.info(f"Worker spawned (pid: {worker.pid})")


def pre_fork(server, worker):
    """Called before a worker is forked."""
    pass


def pre_exec(server):
    """Called before a new master process is forked."""
    server.log.info("Forked child, re-executing.")


def when_ready(server):
    """Called when the server is ready."""
    server.log.info("Server is ready. Spawning workers")


def worker_int(worker):
    """Called when a worker receives the SIGINT or SIGQUIT signal."""
    worker.log.info("Worker received INT or QUIT signal")


def worker_abort(worker):
    """Called when a worker receives the SIGABRT signal."""
    worker.log.info("Worker received SIGABRT signal")
