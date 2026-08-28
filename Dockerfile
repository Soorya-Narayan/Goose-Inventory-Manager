# --- Stage 1: Build React App ---
FROM --platform=linux/amd64 node:20-alpine AS build

WORKDIR /app

COPY package.json ./
RUN npm install --legacy-peer-deps --no-audit

COPY . .
ENV NODE_OPTIONS="--max-old-space-size=8192"
ENV GENERATE_SOURCEMAP=false
RUN npm run build


# --- Stage 2: Serve with Nginx ---
FROM --platform=linux/amd64 nginx:1.25-alpine

# Copy built files
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy entrypoint script
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default runtime environment (overridable at docker run / compose)
ENV API_BASE_URL=/api
ENV IIH_BASE_URL=/iih

EXPOSE 8888

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["nginx", "-g", "daemon off;"]
