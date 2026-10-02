# MediChain-AI Deployment Guide

## Docker Compose (Recommended)
The repository includes a `docker-compose.yml` defining the MongoDB database, Backend API, and Frontend Web Client. 

### Secrets configuration
Before deployment, provide the runtime secrets via `.env`.

Required Variables:
- `JWT_SECRET` (e.g. `openssl rand -hex 48`)
- `ENCRYPTION_KEY` (must be 64 hex characters: `openssl rand -hex 32`)

Optional Variables:
- `CORS_ORIGIN`
- `SUI_NETWORK`, `SUI_PACKAGE_ID`, `SUI_REGISTRY_ID`, `SUI_ENV_MNEMONIC` (if missing, blockchain anchors run in `SIMULATED` mode)
- `OPENAI_API_KEY`, `OPENAI_MODEL` (if missing, AI assistant gracefully degrades to `503`)
- `MONGODB_URI` (if pointing to external Atlas instead of docker service)

### Build and Run
```bash
docker compose build
docker compose up -d
```

## Known Limitations
- The current setup does not natively expose HTTPS. Place the cluster behind a reverse proxy (e.g., Nginx, Traefik, or an AWS ALB) equipped with a TLS certificate.
- The `VITE_API_URL` must be passed at frontend build time. By default, it uses `/api/v1` which assumes the frontend and backend share the same public domain via a reverse proxy.
