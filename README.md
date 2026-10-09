# DentEra

DentEra is a dental-practice demo for doctors, with appointment management, patient charts, treatment plans, billing, and the Era assistant.

## Run locally

Requirements: Node.js 20 or newer.

```sh
npm ci
npm run build
npm start
```

Open `http://localhost:8100`. To use Era's hosted voice service, set `NVIDIA_API_KEY` in a local `.env` file; text assistance and browser voice remain available without it.

## Deploy to Render

This repository includes a Render Blueprint in `render.yaml`. Create a Blueprint from the repository and deploy the `dentera` web service. Render generates `JWT_SECRET` automatically.

The free service uses temporary local SQLite storage. Treat this deployment as a demo only: records can be lost when the service restarts or is redeployed. Do not enter real patient or other sensitive health information. Persistent clinic use needs durable database storage and appropriate privacy/security controls.
