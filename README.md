# EcoSetu (SIH 26229)

> **EcoSetu – Bringing the Informal Collector into the Formal Recycling Chain**

An Android-first technology platform integrating informal e-waste collectors (kabadiwalas) into a structured, traceable recycling ecosystem.

## Architecture & Structure

- `mobile/`: Native Android application client built with React Native + TypeScript.
- `backend/`: Client-independent Node.js + Express REST API backed by PostgreSQL & Prisma ORM.
- `ai/`: FastAPI microservice running YOLOv8 for e-waste classification.
- `docs/`: Canonical project specifications and architectural documentation.
- `scripts/`: Environment setup and build automation scripts.

Refer to [`docs/00_PROJECT_INDEX.md`](docs/00_PROJECT_INDEX.md) for full project documentation and single source of truth.
