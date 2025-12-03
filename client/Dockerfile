FROM node:20-alpine

# Install build tools for native modules
RUN apk add --no-cache python3 make g++ sqlite sqlite-dev

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies (builds native modules for Linux)
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create db directory and set permissions
RUN mkdir -p /app/db

EXPOSE 3000

CMD ["sh", "-c", "node ./db/dbs.js && node profileServer.js"]

