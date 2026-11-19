# Build Plan and Demo Acceptance Criteria

## Delivery strategy

Build for a polished, continuous, repeatable visual demonstration. Avoid production-scale infrastructure, exhaustive clinical workflows, or architecture-review features that do not improve the committee demonstration.

## Phase 1 — Product shell and visual identity
- Establish app navigation and three distinct portal shells.
- Create login/entry screens for i-Dhanwantri, Secure Data Exchange Workstation and Dhanwantri 3.0 ADN.
- Create dashboards for each portal.
- Add persistent DEMO / SYNTHETIC DATA indicator.
- Seed one synthetic patient and a replay/reset path.

## Phase 2 — i-Dhanwantri workflow
- Patient registration.
- HCP waiting list.
- Patient clinical workspace and structured encounter form.
- Save and display structured record.
- Export centre with clearly labelled output types.
- Generate a FHIR Bundle for the ADN exchange path; keep CDA/CCD distinct if implemented.

## Phase 3 — Secure Data Exchange Workstation
- Import package.
- Validate and display package metadata.
- Show source-to-destination field mapping.
- Implement Add MII/PII and Strip MII/PII as separate structured-data transformations.
- Generate transformation report and export package.

## Phase 4 — Dhanwantri 3.0 ADN
- Import ADN-ingest package.
- Populate military patient dashboard and show field provenance.
- Implement AFMSF 3B AME form screen.
- Implement AFMSF 3A PME form screen using the uploaded source form as the authority.
- Save structured examination data.
- Generate prefilled PDFs from replaceable templates.

## Phase 5 — Deployment and rehearsal
- Deploy the same tagged build and synthetic dataset to Hostinger primary and BigRock standby, subject to actual shared-hosting capabilities.
- Test both URLs independently; do not assume standby is ready because files were copied.
- Keep a direct standby URL available for the presentation.
- Rehearse the entire flow and reset it to a known initial state.
- Prepare a short fallback walkthrough using screenshots and pre-generated artefacts if a hosting outage occurs.

## Acceptance criteria

1. Patient registered in i-Dhanwantri appears in the HCP waiting list.
2. HCP can save a structured clinical record.
3. The saved record produces a validly structured demo FHIR Bundle with profile/version metadata.
4. Workstation imports the package and shows validation/mapping results.
5. Add MII/PII and Strip MII/PII are visibly distinct operations on structured data.
6. Workstation produces an ADN-ingest package and transformation report.
7. Dhanwantri 3.0 ADN imports the package and prepopulates supported fields.
8. Each prefilled field exposes its origin: imported, workstation-enriched, or ADN-entered/amended.
9. Unsupported/missing values remain blank.
10. AME (3B) and PME (3A) workflows generate the correct corresponding PDF template.
11. PDF generation is repeatable and shows document/record/template references.
12. The full flow can be replayed with synthetic data on primary and standby deployments.

## Not in scope for this PoC

- Real patient or classified data.
- Real cross-domain connectivity or production sanitisation approval.
- Production identity proofing, enterprise MPI, or automated identity merges.
- Production cybersecurity accreditation or security segregation.
- Full implementation of every ABDM resource or every downstream export adapter unless needed for the demo.
- Digital signatures unless explicitly implemented and tested.
