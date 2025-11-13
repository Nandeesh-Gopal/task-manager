FROM node:20
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
Expose 5000
cmd ["node","server.js"]