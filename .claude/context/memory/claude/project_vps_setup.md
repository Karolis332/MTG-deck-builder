---
name: VPS setup and service priority
description: VPS at 187.77.110.100 runs geo-scraper (PRIORITY) and CF API. Geo-scraper must never be disrupted.
type: project
---

VPS deployed at 187.77.110.100 (Hostinger KVM 2: 2 vCPU, 8GB RAM, 100GB NVMe, Ubuntu 24.04)
SSH: `ssh -i ~/.ssh/id_ed25519_geo_vps root@187.77.110.100`

**PRIORITY SERVICE: Geo-scraper (rekvizitai.ai)**
- Runs as systemd service `geo-scraper.service` on port 3000
- Domain: `rekvizitai.ai` (note the 'i' — NOT rekvizita.ai)
- Nginx: `/etc/nginx/sites-available/rekvizita.ai` with `default_server`
- MUST run without compromise — any VPS changes must not disrupt this service

**Secondary: Grimoire CF API**
- Docker Compose at `/opt/grimoire-cf-api/` (docker-compose.prod.yml)
- Services: api (port 8000), postgres, redis — all bind 127.0.0.1 only
- Postgres password: `grimoire` (was `Gr1m0ir3_CF_2026!xK9`, changed 2026-03-21)
- Docker memory limits: API 2GB, Postgres 1GB, Redis 256MB, Worker 3GB
- 2GB swap configured (swappiness=10)
- Nginx: `/etc/nginx/sites-enabled/grimoire-cf-api` at path `/cf-api/`
- API Key: 97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1
- Nightly cron at 3 AM UTC: `/opt/grimoire-cf-api/run-pipeline.sh`
- Main app cf-api-client.ts default URL changed to `http://187.77.110.100/cf-api`
- Data sources: Moxfield + Archidekt + EDHREC (added 2026-03-21 to nightly pipeline)
- Batch scrape script: `app/workers/batch_scrape.py` — multi-strategy scraper for rapid corpus building
- Target: 100k+ decks (was 36k as of 2026-03-21)

**Why:** User explicitly stated geo-scraper is the priority product and must run without compromise.
**How to apply:** Never modify geo-scraper nginx config, systemd service, or port 3000 allocation. Always verify geo-scraper is running after any VPS changes. CF API containers have memory limits to prevent resource starvation.
