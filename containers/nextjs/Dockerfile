FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG NEXT_PUBLIC_SQL_HOST=localhost
ENV NEXT_PUBLIC_SQL_HOST=$NEXT_PUBLIC_SQL_HOST
RUN npm run build

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
