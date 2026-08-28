FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --production --no-audit
COPY server.js ./
# node_modules are installed during build; the docker-compose volume mount
# must NOT overwrite /app/node_modules — ensure a node_modules anonymous
# volume is declared in docker-compose.yml for the backend service.
EXPOSE 3000
CMD ["node", "server.js"]
