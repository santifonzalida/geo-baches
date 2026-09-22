# Nixpacks (el builder automático de Railway) detecta esto como app Angular y falla al
# copiar "/app/browser": su plantilla para Angular no matchea la salida real del build
# (dist/geo-baches-app/browser). Con un Dockerfile propio, Railway lo usa directo y no
# hay detección automática de por medio.

FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist/geo-baches-app/browser ./dist/geo-baches-app/browser
EXPOSE 3000
# -s = modo SPA: cualquier ruta no encontrada cae a index.html (hace falta para /admin/pendientes).
CMD ["sh", "-c", "npx serve -s dist/geo-baches-app/browser -l tcp://0.0.0.0:${PORT:-3000}"]
