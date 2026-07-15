#!/bin/sh
# Railway injects PORT as an environment variable.
# Nginx must listen on that port, not hardcoded 80.
# This script substitutes $PORT into the nginx config before starting.

PORT="${PORT:-80}"

sed "s/\${PORT}/${PORT}/g" /nginx.conf.template \
  > /etc/nginx/conf.d/default.conf

exec "$@"
