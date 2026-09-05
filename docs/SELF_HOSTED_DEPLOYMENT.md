# Pulse CRM — Self‑Hosted Deployment Guide (for selling to enterprises)

This document describes how to run Pulse CRM (React + FastAPI + MongoDB + self‑hosted IVR engine)
on a customer's own infrastructure. Pair it with `TELEPHONY_SETUP.md` for carrier onboarding.

---

## 1. Architecture

```
                    ┌────────────────────────────────────────────┐
  Browser ──HTTPS──►│  Reverse proxy (Caddy / Nginx / ALB)       │
                    │   /api/*  ──► backend  (FastAPI :8001)     │
                    │   /*      ──► frontend (static build)      │
                    └───────────────┬────────────────────────────┘
                                    │
  Carrier webhooks ─────────────────┘  (Twilio / Telnyx / Plivo → /api/webhooks/voice/…)
                                    │
                             MongoDB (replica set, TLS)
```

* **Stateless backend** — scale horizontally; all state is in MongoDB.
* **Secrets** — carrier credentials are encrypted with `INTEGRATIONS_KEY` (Fernet) before they touch the database.
* **Telephony** — no media servers required; audio is carried by the carrier. Only HTTPS webhooks reach the backend.

Minimum production footprint: 2 vCPU / 4 GB RAM VM (or 2 small containers) + managed MongoDB.

---

## 2. Docker Compose (single VM)

`docker-compose.yml`

```yaml
services:
  mongo:
    image: mongo:7
    restart: unless-stopped
    volumes: ["mongo-data:/data/db"]
    command: ["--bind_ip", "127.0.0.1,mongo"]

  backend:
    build: ./backend
    restart: unless-stopped
    env_file: ./backend/.env
    depends_on: [mongo]
    expose: ["8001"]

  frontend:
    build:
      context: ./frontend
      args:
        REACT_APP_BACKEND_URL: https://crm.example.com
    restart: unless-stopped
    expose: ["80"]

  caddy:
    image: caddy:2
    restart: unless-stopped
    ports: ["80:80", "443:443"]
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile
      - caddy-data:/data
    depends_on: [backend, frontend]

volumes:
  mongo-data: {}
  caddy-data: {}
```

`backend/Dockerfile`

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2", "--proxy-headers", "--forwarded-allow-ips", "*"]
```

`frontend/Dockerfile`

```dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json yarn.lock ./
RUN yarn install --frozen-lockfile
COPY . .
ARG REACT_APP_BACKEND_URL
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
RUN yarn build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
RUN printf 'server { listen 80; root /usr/share/nginx/html; location / { try_files $uri /index.html; } }' > /etc/nginx/conf.d/default.conf
```

`Caddyfile` (automatic HTTPS via Let's Encrypt)

```
crm.example.com {
    encode gzip
    handle /api/* {
        reverse_proxy backend:8001
    }
    handle {
        reverse_proxy frontend:80
    }
}
```

`backend/.env`

```
MONGO_URL=mongodb://mongo:27017
DB_NAME=pulse_crm
JWT_SECRET=<openssl rand -hex 32>
INTEGRATIONS_KEY=<python -c "from cryptography.fernet import Fernet;print(Fernet.generate_key().decode())">
PUBLIC_BASE_URL=https://crm.example.com
CORS_ORIGINS=https://crm.example.com
USE_MOCK_DB=false
```

Bring it up:

```bash
docker compose up -d --build
docker compose logs -f backend      # wait for "Application startup complete"
```

Open `https://crm.example.com`, register the first user (becomes admin), then follow `TELEPHONY_SETUP.md`.

---

## 3. Bare VM (Ubuntu 22.04, systemd)

```bash
sudo apt update && sudo apt install -y python3.11 python3.11-venv nodejs npm nginx certbot python3-certbot-nginx
sudo npm i -g yarn

# backend
cd /opt/pulse/backend && python3.11 -m venv .venv && . .venv/bin/activate && pip install -r requirements.txt
sudo tee /etc/systemd/system/pulse-backend.service >/dev/null <<'EOF'
[Unit]
Description=Pulse CRM backend
After=network.target
[Service]
WorkingDirectory=/opt/pulse/backend
EnvironmentFile=/opt/pulse/backend/.env
ExecStart=/opt/pulse/backend/.venv/bin/uvicorn server:app --host 127.0.0.1 --port 8001 --workers 2 --proxy-headers --forwarded-allow-ips 127.0.0.1
Restart=always
[Install]
WantedBy=multi-user.target
EOF
sudo systemctl enable --now pulse-backend

# frontend
cd /opt/pulse/frontend && yarn install && REACT_APP_BACKEND_URL=https://crm.example.com yarn build
sudo rsync -a build/ /var/www/pulse/

# nginx
sudo tee /etc/nginx/sites-available/pulse >/dev/null <<'EOF'
server {
  server_name crm.example.com;
  root /var/www/pulse;
  location /api/ { proxy_pass http://127.0.0.1:8001; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto https; proxy_read_timeout 60s; }
  location / { try_files $uri /index.html; }
}
EOF
sudo ln -sf /etc/nginx/sites-available/pulse /etc/nginx/sites-enabled/pulse && sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d crm.example.com
```

Use MongoDB Atlas (`mongodb+srv://…`) or a local replica set with authentication enabled.

---

## 4. Kubernetes / PaaS notes

* Expose the backend under the **same host** as the frontend with a path rule for `/api` (ingress or platform routing) — this keeps CORS trivial and makes webhook URLs stable.
* Set `PUBLIC_BASE_URL` to the ingress host. Behind a TLS‑terminating proxy the app still builds `https://` webhook URLs from this variable, so signature validation stays correct.
* Liveness: `GET /api/health` (returns 200 once MongoDB is reachable).
* Render / Railway / Fly: existing `render.yaml` and `Procfile` in the repo work unchanged; add the env vars in section 2.

---

## 5. Security hardening

| Area | Recommendation |
|---|---|
| Secrets | Store `JWT_SECRET`, `INTEGRATIONS_KEY`, `MONGO_URL` in a secret manager; never commit `.env` |
| Webhooks | Keep *Verify webhook signatures* on. Restrict `/api/webhooks/*` at the proxy to carrier IP ranges if desired |
| Database | Enable auth + TLS; daily snapshots; index `voice_calls.provider_call_id`, `voice_events.event_id` (created automatically on first write) |
| Recordings | Recordings stay with the carrier; access requires carrier credentials. For long retention, schedule a job to download and archive to your object storage |
| Compliance | Add consent wording to greetings; configure carrier regional data residency where offered (Twilio Regions, Telnyx EU) |
| Accounts | First registered user is admin — register it immediately after deploy, then invite the team via Settings → Team |

---

## 6. Operations

* **Logs** — backend logs every webhook decision (`telephony` logger). Increase to DEBUG with `LOG_LEVEL=DEBUG`.
* **Backups** — `mongodump --uri "$MONGO_URL" --db pulse_crm --out /backups/$(date +%F)`.
* **Upgrades** — `git pull && docker compose up -d --build`; the backend is schema‑less and forward‑compatible.
* **Scaling** — increase uvicorn `--workers` or add backend replicas; webhooks are idempotent (deduplicated by carrier event/call IDs) so multiple replicas are safe.
* **Monitoring** — alert on 5xx from `/api/webhooks/voice/*` (a carrier will play an error to callers) and on `provider_error` dispositions in `voice_calls`.

---

## 7. Multi‑tenant SaaS mode

Each workspace (`owner_id`) has its own encrypted carrier credentials and webhook URLs, so a single
deployment can serve many customers. To sell as SaaS:

1. Put the platform behind your domain, enable sign‑up.
2. Each customer connects **their own** carrier account in Calls & IVR → Telephony (they pay the carrier directly), or
3. You provision numbers in your master carrier account (Twilio sub‑accounts / Telnyx managed accounts) and paste those credentials per workspace, billing minutes back to the customer.
