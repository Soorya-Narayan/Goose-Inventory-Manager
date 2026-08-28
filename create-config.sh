#!/bin/sh
set -e

cat > /usr/share/nginx/html/config.js << 'EOF'
window.RUNTIME_ENV = {
  API_BASE_URL: '${API_BASE_URL}'
};
EOF

echo "Created config.js with API_BASE_URL: ${API_BASE_URL}"