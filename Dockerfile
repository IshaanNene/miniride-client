FROM node:22-alpine AS build
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ARG VITE_GATEWAY_URL=http://localhost:4000
ARG VITE_UNLEASH_URL=http://localhost:4242/api/frontend
ARG VITE_UNLEASH_CLIENT_KEY=default:development.unleash-insecure-frontend-api-token
ARG VITE_OTLP_TRACES_URL=http://localhost:4318/v1/traces
ARG VITE_VITALS_URL=http://localhost:8100
ARG VITE_BUGDROP_URL=http://localhost:8200
ARG VITE_ALLOW_FLAG_OVERRIDES=false
RUN pnpm build

FROM nginx:1.29-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 8080
