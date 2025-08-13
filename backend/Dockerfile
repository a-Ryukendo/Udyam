FROM node:20-bookworm
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
COPY assets ./assets
RUN npx prisma generate && npm run build
EXPOSE 4000
CMD ["node", "dist/index.js"]
