# 1. Start with an official Node.js image
FROM node:20-slim

# 2. Set the working directory inside the container
WORKDIR /app

# 3. Copy package files first to optimize installation caching
COPY package.json package-lock.json ./

# 4. Install frontend dependencies
RUN npm install

# 5. Copy the rest of your frontend code
COPY . .

# 6. Expose Vite's default development port
EXPOSE 5173

# 7. Command to start the Vite development server
CMD ["npm", "run", "dev", "--", "--host"]