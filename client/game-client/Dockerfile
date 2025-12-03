FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build-time environment variables
ARG VITE_PROFILE_SERVER_URL=http://localhost:3000
ENV VITE_PROFILE_SERVER_URL=$VITE_PROFILE_SERVER_URL

# Build the app
RUN npm run build

# Production image
FROM nginx:alpine

# Copy built files to nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx config
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 5173

CMD ["nginx", "-g", "daemon off;"]

