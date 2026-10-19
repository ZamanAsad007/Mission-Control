# 🚀 Mission Control: NASA Space & Earth Events Dashboard

[![CI](https://github.com/ZamanAsad007/Mission-Control/actions/workflows/ci.yml/badge.svg)](https://github.com/ZamanAsad007/Mission-Control/actions/workflows/ci.yml)
![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue?logo=typescript)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker)
![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16%20PostGIS-336791?logo=postgresql)
![Redis](https://img.shields.io/badge/Redis-7%20Valkey-DC382D?logo=redis)
![NASA APIs](https://img.shields.io/badge/NASA-Open%20APIs-0B3D91?logo=nasa)

A production-grade, distributed mission control dashboard consolidating real-time telemetry from NASA Open APIs. Monitors near-Earth asteroids, space weather disruptions (solar flares and coronal mass ejections), Earth natural hazard events with PostGIS spatial tracking, and delivers automated multi-channel emergency alerts (Telegram, Discord, Email).

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph External["External NASA Open APIs"]
        APOD["APOD API<br/>(Astronomy Picture of Day)"]
        NEOWS["NeoWs API<br/>(Near-Earth Asteroids)"]
        DONKI["DONKI API<br/>(Space Weather & CMEs)"]
        EONET["EONET API<br/>(Natural Earth Hazards)"]
    end

    subgraph Ingestion["Ingestion Layer"]
        INGEST["Ingestion Service<br/>(Node.js / BullMQ)"]
        FALLBACK["DONKI Resilient Fallback<br/>(Active during Goddard 503s)"]
        SCHED["Cron Jobs & Schedulers"]
    end

    subgraph Data["Persistence & Event Bus"]
        PG[("PostgreSQL 16 + PostGIS<br/>- Spatial events ST_DWithin<br/>- Asteroid close-approaches<br/>- Users & JWT Auth<br/>- Alert Rules & Deliveries")]
        REDIS[("Redis 7 / Valkey<br/>- BullMQ Job Queues<br/>- Pub/Sub Channel: nasa:events<br/>- Response Cache (TTL 5m-1h)")]
    end

    subgraph Alerting["Alert Pipeline"]
        ALERTE["Alert Service Engine<br/>- Threshold Matcher<br/>- Cooldown Suppression<br/>- Deduplication"]
        TELEGRAM["Telegram Bot API"]
        DISCORD["Discord Webhooks"]
        MAILPIT["Mailpit / SMTP"]
    end

    subgraph Backend["Core API Layer"]
        API["API Service (Express.js)<br/>- OpenAPI / Swagger Docs<br/>- JWT Authentication & RBAC<br/>- Redis Rate Limiter & Cache<br/>- SSE Streaming Server"]
    end

    subgraph Ingress["Reverse Proxy & Gateway"]
        GATEWAY["Nginx Gateway<br/>(Port 80)"]
    end

    subgraph UI["Frontend User Experience"]
        SPA["Mission Control SPA<br/>(React 18 + Vite + Tailwind CSS)<br/>- APOD Hero<br/>- Leaflet PostGIS Map<br/>- Three.js 3D Asteroid Radar<br/>- Recharts Space Weather<br/>- Live Alert Configuration"]
    end

    APOD --> INGEST
    NEOWS --> INGEST
    DONKI --> INGEST
    EONET --> INGEST
    FALLBACK -.-> INGEST
    SCHED --> INGEST

    INGEST -->|Upsert normalized telemetry| PG
    INGEST -->|Publish new events| REDIS

    REDIS -->|Subscribe nasa:events| ALERTE
    PG <-->|Rules & Delivery history| ALERTE
    ALERTE --> TELEGRAM
    ALERTE --> DISCORD
    ALERTE --> MAILPIT

    REDIS -->|Subscribe & Cache| API
    PG <-->|Query telemetry & auth| API

    GATEWAY -->|/api/*| API
    GATEWAY -->|/*| SPA
    API -->|SSE Event Stream| SPA
```

---

## ⚡ Service Catalog & Port Allocation

| Component | Container Port | Host Port | Description |
|---|---|---|---|
| **Gateway Proxy** | `80` | `80` / `8080` | Single entry point routing traffic to UI and API |
| **Frontend SPA** | `80` | `5173` | React 18 / Tailwind mission control interface |
| **API Service** | `3000` | `3000` | Express REST API, Swagger UI, SSE Stream |
| **Ingestion Service** | `3001` | `3001` | BullMQ workers polling NASA APIs on schedule |
| **Alert Service** | `3002` | `3002` | Real-time Redis subscriber & notification engine |
| **PostgreSQL 16 + PostGIS** | `5432` | `5433` | Primary transactional and geospatial store |
| **Redis 7** | `6379` | `6380` | BullMQ queue, caching layer, and Pub/Sub bus |
| **Mailpit Web UI** | `8025` | `8025` | Local SMTP inspection inbox for email alerts |

---

## 🛰️ Key Features

### 🌌 1. APOD Mission Hero
- Displays NASA's Astronomy Picture of the Day with full metadata, copyright attribution, HD viewing modal, and previous day history browsing.
- Automatic fallback imagery ensures dashboard uptime even during upstream NASA APOD maintenance.

### 🌍 2. Earth Hazards Map (Leaflet + PostGIS)
- Geospatial mapping of global natural hazard events from NASA EONET (Wildfires, Severe Storms, Volcanoes, Sea Ice).
- PostGIS spatial filtering using `ST_DWithin` radius queries.
- Interactive category filtering, event severity indicators, and geographic bounding box queries.

### ☄️ 3. 3D Near-Earth Asteroid Radar (Three.js)
- Real-time 3D orbital visualization of approaching Near-Earth Objects (NEOs).
- Accurate relative distance scales, velocity vectors, and hazardous object highlighting (electric red vs cyan).
- Interactive orbit controls, zoom, approach date timeline, and diameter estimates.

### ☀️ 4. Space Weather Telemetry (Recharts)
- Solar flare histograms categorized by X, M, C class intensities.
- Coronal Mass Ejection (CME) tracking with interplanetary shock prediction.
- Resilient simulated telemetry fallback when NASA Goddard CCMC DONKI servers return HTTP 503.

### 🔔 5. Real-Time Alert Engine & Multi-Channel Dispatch
- Event-driven rule matching listening on Redis `nasa:events` channels.
- Configurable rules:
  - Solar flare class thresholds (e.g. alert on `minClass >= M5.0` or `X1.0`)
  - Hazardous asteroid proximity alerts
  - Natural event radius alerts
- Multi-channel delivery: **Telegram**, **Discord**, and **Email (SMTP)**.
- Robust deduplication preventing duplicate alerts for identical source events.
- Configurable cooldown suppression windows preventing notification storms.

### 📡 6. Real-Time Server-Sent Events (SSE)
- Live ticker in the navigation header streaming newly detected events to all connected clients without polling.

---

## 🏁 Quick Start

### Prerequisites
- [Docker](https://docs.docker.com/get-docker/) & [Docker Compose](https://docs.docker.com/compose/)
- [Node.js](https://nodejs.org/) v20+ and `npm` v10+ (for local host development)
- [Make](https://www.gnu.org/software/make/) (optional, standard utility)

### 1. Clone & Configure Environment

```bash
git clone https://github.com/ZamanAsad007/Mission-Control.git
cd Mission-Control
cp .env.example .env
```

> **Note on NASA API Key:** The system includes a default `DEMO_KEY` in `.env.example`. For high-volume production use, register a free key at [api.nasa.gov](https://api.nasa.gov/) and set `NASA_API_KEY=your_key_here`.

### 2. Start Full Stack with Docker

```bash
make up
# or: docker compose up -d
```

Verify that all 8 containers are healthy:
```bash
docker compose ps
```

### 3. Backfill Historical NASA Data

Populate the database with the last 30 days of NASA events, asteroids, and APOD records:

```bash
make backfill
```

### 4. Open Mission Control in Your Browser

- **Dashboard UI:** [http://localhost](http://localhost) (or [http://localhost:5173](http://localhost:5173))
- **Swagger API Docs:** [http://localhost:3000/api/docs](http://localhost:3000/api/docs)
- **Mailpit Email Inbox:** [http://localhost:8025](http://localhost:8025)

---

## 🛠️ Make & Command Reference

| Command | Action |
|---|---|
| `make up` | Build and start all services in Docker in detached mode |
| `make down` | Stop and remove all containers and network bridges |
| `make build` | Build all Docker container images from source |
| `make backfill` | Run historical backfill ingestion job inside the running stack |
| `make test` | Execute unit, contract, and integration test suites across all workspaces |
| `make dev` | Start frontend Vite development server on host machine |

---

## 🔌 API Endpoints Reference

Explore interactive OpenAPI documentation directly at `/api/docs`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/health` | None | System health check (Postgres, Redis connectivity) |
| `POST` | `/api/auth/register` | None | Register a new user |
| `POST` | `/api/auth/login` | None | Authenticate user & receive JWT token |
| `GET` | `/api/apod` | None | Get APOD for today (or query by `?date=YYYY-MM-DD`) |
| `GET` | `/api/asteroids` | None | List approaching asteroids with hazardous filter |
| `GET` | `/api/events` | None | Query Earth natural events with category & PostGIS radius |
| `GET` | `/api/stats` | None | Aggregate counts of events, asteroids, and flares |
| `GET` | `/api/stream/events` | None | Server-Sent Events (SSE) real-time stream |
| `GET` | `/api/alerts` | JWT | Get user's configured alert rules |
| `POST` | `/api/alerts` | JWT | Create a new alert rule |
| `PUT` | `/api/alerts/:id` | JWT | Update existing alert rule (activate/pause/channels) |
| `DELETE` | `/api/alerts/:id` | JWT | Remove an alert rule |
| `GET` | `/api/alerts/history` | JWT | View user notification delivery logs |

---

## 🧪 Testing Suite

The codebase enforces strict test coverage spanning unit, contract, and end-to-end integration tests:

```bash
# Run all workspace test suites
npm test

# Run contract tests against NASA API schemas
npm test --workspace=@mission-control/nasa-client

# Run End-to-End alert pipeline tests (matching -> dedupe -> cooldown)
npm test --workspace=@mission-control/alert-service
```

- **Contract Tests:** `packages/nasa-client/tests/contract.test.ts` validates APOD, NeoWs, DONKI, and EONET against stored fixture payloads, detecting upstream schema drift.
- **E2E Alert Pipeline:** `services/alert-service/tests/e2e-alert-flow.test.ts` asserts the complete event lifecycle: event matching, multi-channel dispatch, database recording, deduplication, and cooldown suppression.

---

## ⚖️ Design Decisions & Trade-offs

1. **Monorepo with NPM Workspaces:**
   - *Rationale:* Shared TypeScript interfaces (`@mission-control/db`, `@mission-control/nasa-client`) eliminate duplication and prevent schema drift between services.
2. **PostgreSQL 16 with PostGIS:**
   - *Rationale:* Rather than computing distance formulas in application memory, PostGIS enables spatial indexing and native spherical queries (`ST_DWithin`, `ST_MakePoint`) for radius-based alert matching.
3. **Decoupled Microservice Architecture:**
   - *Rationale:* Ingestion failures or NASA API rate limits never degrade read API responsiveness or alert delivery performance.
4. **DONKI Outage Fallback Mechanism:**
   - *Rationale:* NASA Goddard's CCMC DONKI server frequently experiences maintenance returning HTTP 503. The ingestion worker detects 503 responses and provides deterministic fallback space weather telemetry, ensuring charts and alert tests remain functional.
5. **Redis Pub/Sub + SSE vs WebSockets:**
   - *Rationale:* The dashboard is predominantly a server-to-client telemetry broadcast. Server-Sent Events (SSE) run seamlessly over HTTP/1.1 and HTTP/2 without requiring WebSocket handshake overhead or connection upgrade handling in reverse proxies.

---

## 🔭 What I'd Improve (Roadmap)

- [ ] **Cosmic Birthday Explorer (`/birthday`):** Query historical APOD and EPIC Earth images corresponding to any input date.
- [ ] **Observability:** Prometheus metrics scraping endpoint with preconfigured Grafana dashboards for API latency and ingestion success rates.
- [ ] **NASA Exoplanet Archive Integration:** Interactive 3D visualization of confirmed exoplanetary systems.
- [ ] **Progressive Web App (PWA):** Offline cache manifests and Web Push notifications for critical space weather alerts.

---

## 📜 Data Attribution & Disclaimer

Space weather, asteroid trajectories, natural hazard events, and imagery are provided courtesy of **NASA Open APIs** and the **NASA Earth Science Division**:
- [NASA Open APIs](https://api.nasa.gov/) (APOD, NeoWs, DONKI)
- [NASA Earth Observatory Natural Event Tracker (EONET)](https://eonet.gsfc.nasa.gov/)

This project is an open-source educational dashboard and is not officially affiliated with or endorsed by the National Aeronautics and Space Administration (NASA).

---

## 📄 License

MIT © [Zaman Asad](https://github.com/ZamanAsad007)
