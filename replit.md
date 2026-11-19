# Dhanwantri Interoperability PoC

An interactive, synthetic-data demonstration of clinical information moving from i-Dhanwantri through a controlled exchange workstation into Dhanwantri 3.0 ADN.

## Run & Operate

- Preview the `Dhanwantri Interoperability Demo` artifact for the web app
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- The current demo uses browser `localStorage`; it does not require a database or secrets.

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React + Vite
- Demo state: browser `localStorage`; package exchange: downloadable/importable JSON
- The shared Express/PostgreSQL packages are scaffolded but not used by the demo.

## Where things live

- `artifacts/dhanwantri-demo/` — runnable web demonstration
- `docs/` — source product, architecture, field mapping, and acceptance plans
- `prototypes/secure-data-exchange-workstation/` — original workstation prototype
- `schemas/` — canonical field and sanitisation profile examples
- `deployment/hostinger-bigrock/` — original shared-hosting deployment notes and static prototype

## Architecture decisions

- The first demo is browser-local and uses synthetic data only; it does not connect to a real HIS, ADN network, or database.
- Domain transfer is an explicit package export/import step, not a claim of network or security segregation.
- FHIR-inspired output is representational only and is not claimed to conform to FHIR or ABDM profiles.
- Missing source values stay blank; transformation rules only affect the outgoing package.

## Product

Capture one synthetic patient encounter, export it for a controlled exchange, review validation and transformations, then import the result into the ADN-side examination workflow with field provenance. The demonstration should be easy to reset and replay.

## User preferences

Use synthetic information only. Keep the three product surfaces distinct and make the end-to-end journey easy to replay.

## Gotchas

- Do not present the PoC as production-ready, clinically validated, FHIR/ABDM-conformant, or connected to a classified network.
- Keep the persistent `DEMO / SYNTHETIC DATA` indicator visible throughout the application.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
