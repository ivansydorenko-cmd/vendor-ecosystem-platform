FROM node:18-alpine

WORKDIR /app

# Install build dependencies for native modules
RUN apk add --no-cache python3 make g++

COPY package*.json ./

# Install dependencies and rebuild native modules
RUN npm ci && npm rebuild bcrypt --build-from-source

COPY . .

EXPOSE 3000

CMD ["npm", "run", "dev"]
