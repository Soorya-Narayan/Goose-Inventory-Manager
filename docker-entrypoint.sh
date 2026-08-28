#!/bin/sh
set -e

# Create config.js with runtime environment
cat > /usr/share/nginx/html/config.js <<EOF
window.RUNTIME_ENV = {
  API_BASE_URL: '${API_BASE_URL:-/api}',
  IIH_BASE_URL: '${IIH_BASE_URL:-/iih}'
};
EOF

echo "✅ Created config.js with API_BASE_URL: ${API_BASE_URL:-/api}"

# Start nginx
exec "$@"
