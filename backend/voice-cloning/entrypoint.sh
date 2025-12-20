#!/bin/sh
# Increase timeout for model loading and reduce workers to save memory
exec gunicorn --bind 0.0.0.0:${PORT:-8080} --workers 1 --timeout 300 --worker-class sync --preload server:app
