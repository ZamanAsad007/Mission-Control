# Mission Control: NASA Space & Earth Events Dashboard

A real-time dashboard pulling data from NASA open APIs showing space weather, near-Earth asteroids, and natural Earth events.

## Architecture & Monorepo Structure

```text
mission-control/
├── docker-compose.yml
├── .env.example
├── packages/
│   ├── db/                 # Database migrations, client, and queries
│   └── nasa-client/        # Typed NASA API client wrappers with Zod validation
└── services/
    ├── ingestion-service/  # BullMQ scheduler for APOD, NeoWs, DONKI, EONET
    ├── api-service/        # Read API, caching, SSE stream, auth
    └── alert-service/      # Rule matching & Telegram/Discord/Email notifications
```

## Setup & Running Locally

1. Copy `.env.example` to `.env` and provide your NASA API Key.
2. Start infrastructure with `docker compose up -d`.
3. Install dependencies: `npm install`.
4. Run tests: `npm test`.

## License
MIT
