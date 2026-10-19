# Frontend de Kinet: compila Angular y lo sirve con nginx. Habla con el backend v2 en el puerto 8080 del mismo equipo
# (ver src/environments/environment.ts). Para levantar todo junto: docker compose up --build en la raíz del proyecto.
FROM node:24-alpine AS compilar
WORKDIR /app
COPY package.json package-lock.json ./
# npm install y no npm ci: el package-lock.json del repositorio está desincronizado (falta @emnapi/runtime)
RUN npm install --no-audit --no-fund
COPY . .
# Configuración "development": usa src/environments/environment.ts (API en http://<host>:8080/api)
RUN npx ng build --configuration development

FROM nginx:alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=compilar /app/www /usr/share/nginx/html
EXPOSE 80
