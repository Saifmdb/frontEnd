FROM node:20-alpine AS frontend

LABEL maintainer="saifmed"
LABEL description="Frontend Vite pour Honoris Chatbot"
LABEL version="1.0"

WORKDIR /app

COPY package*.json ./
RUN npm install --no-audit --no-fund

COPY . .

# Vite bakes every import.meta.env.VITE_* reference into the built JS at this
# `npm run build` step — they are NOT readable/overridable from the running
# container later (unlike a normal server env var). Defaults below are
# relative paths, matching nginx.conf's reverse proxy to the backend on the
# same origin, so the built image works on whatever domain it's served from
# without a rebuild. VITE_MSAL_CLIENT_ID/VITE_MSAL_AUTHORITY are the actual
# exception — they're tenant-specific, not domain-specific, and must be
# passed as --build-arg (see .github/workflows/ci-cd.yml) for Microsoft login
# to work at all.
ARG VITE_API_BASE_URL=/api
ARG VITE_API_URL=/api
ARG VITE_API_FILE_URL=
ARG VITE_BACKEND_URL=
ARG VITE_WS_BASE_URL=
ARG VITE_MSAL_CLIENT_ID=
ARG VITE_MSAL_AUTHORITY=
ARG VITE_MSAL_REDIRECT_URI=
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_API_URL=$VITE_API_URL \
    VITE_API_FILE_URL=$VITE_API_FILE_URL \
    VITE_BACKEND_URL=$VITE_BACKEND_URL \
    VITE_WS_BASE_URL=$VITE_WS_BASE_URL \
    VITE_MSAL_CLIENT_ID=$VITE_MSAL_CLIENT_ID \
    VITE_MSAL_AUTHORITY=$VITE_MSAL_AUTHORITY \
    VITE_MSAL_REDIRECT_URI=$VITE_MSAL_REDIRECT_URI

RUN npm run build

FROM nginx:1.27-alpine AS production

COPY --from=frontend /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
