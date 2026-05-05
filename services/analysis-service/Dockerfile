FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
RUN mkdir -p uploads
EXPOSE 3002
HEALTHCHECK --interval=30s --timeout=3s CMD wget -qO- http://localhost:3002/health || exit 1
CMD ["node", "server.js"]
