# ---------- Compilación ----------
FROM node:22-alpine AS compilacion
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build -- --configuration production

# ---------- Servidor web ----------
# angular.json genera los archivos directamente en www/ (sin subcarpeta browser)
FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilacion /app/www /usr/share/nginx/html
EXPOSE 80
