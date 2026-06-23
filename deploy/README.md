# PoC deploy — single t4g.small box

Cheap proof-of-concept: build images locally (or in CI), push to GHCR, pull and
run them on one t4g.small with `docker-compose.prod.yml`. Postgres runs in a
container on an EBS-backed named volume. Host **nginx** terminates TLS for
`app.vinuelax.cl` and proxies to the two containers. OCR stays in mock mode, so
no Lambda / Textract / S3 is involved.

```
browser ──HTTPS──> host nginx (TLS) ──┬─ /api/ ─> 127.0.0.1:8000  api (uvicorn)
                                      └─ /     ─> 127.0.0.1:3000  web (static nginx)
                                                  postgres (container + volume)
```

Images: `ghcr.io/vinuelax/personal-finance-app-api` and `…-web`.

## 1. Build & push (from a dev machine or CI)

```bash
echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin
IMAGE_TAG=v1 NEXT_PUBLIC_API_BASE_URL=https://app.vinuelax.cl/api/v1 \
  ./scripts/build_push_images.sh
```

`NEXT_PUBLIC_API_BASE_URL` is baked into the web image at build time — rebuild
the web image if the API URL changes.

> Build host arch should match the box (t4g = arm64). Build on an arm64 machine,
> or use `docker buildx build --platform linux/arm64 … --push`.

## 2. One-time box setup

```bash
# Docker engine + compose plugin
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker "$USER"   # re-login afterwards

# App dir with just the compose file + env
mkdir -p ~/pfa && cd ~/pfa
# copy docker-compose.prod.yml and .env.prod.example here, then:
cp .env.prod.example .env.prod && edit .env.prod   # fill in secrets

# Host nginx + TLS
sudo apt-get install -y nginx
sudo cp nginx.app.conf.example /etc/nginx/sites-available/pfa
sudo ln -s /etc/nginx/sites-available/pfa /etc/nginx/sites-enabled/pfa
sudo certbot --nginx -d app.vinuelax.cl
sudo nginx -t && sudo systemctl reload nginx
```

Point the `app.vinuelax.cl` A-record at the instance's Elastic IP, and open
ports 80/443 in the security group (22 from your IP only).

## 3. Deploy / update

```bash
cd ~/pfa
echo "$GHCR_PAT" | docker login ghcr.io -u <github-user> --password-stdin   # if images are private
docker compose --env-file .env.prod -f docker-compose.prod.yml pull
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

`migrate` runs first and applies pending SQL migrations; `api` only starts once
it succeeds (the app refuses to boot with migrations pending).

To roll a new version: push a new `IMAGE_TAG`, set it in `.env.prod`, re-run the
pull + up. Logs: `docker compose -f docker-compose.prod.yml logs -f api`.

## Backups

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U postgres pfa | gzip > pfa-$(date +%F).sql.gz
```

## Notes / limits

- `output: "export"` means the frontend is static; there is no Node server.
- For lower cost you can drop the web container and have host nginx serve the
  exported files directly from disk — but the image flow keeps deploys uniform.
- This stack is intentionally not HA: a box restart cycles all services
  (`restart: unless-stopped`), and Postgres durability is the single EBS volume.
