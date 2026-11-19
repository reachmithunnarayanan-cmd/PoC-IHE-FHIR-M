# i-Dhanwantri / Dhanwantri 3.0 ADN — Interoperability PoC

**Tagline:** Capture Once. Exchange Securely. Reuse Everywhere.

A visual, end-to-end proof of concept demonstrating structured clinical data exchange between an internet-side HIS and a simulated ADN-side military health system, through an explicit sanitisation and transformation workstation.

## Product surfaces

1. **i-Dhanwantri** — internet-side HIS: patient registration, HCP clinical encounter capture, structured clinical record, and purpose-specific exports.
2. **Secure Data Exchange Workstation** — controlled import, validation, identity mapping, military metadata enrichment, sanitisation, transformation reporting, and export/import package simulation.
3. **Dhanwantri 3.0 ADN** — ADN-side military health interface: ingest-ready package import, military patient dashboard, AFMSF examination workflows, and generated formal PDFs.

## Demonstration story

Use one synthetic patient throughout:
1. Register the patient in i-Dhanwantri.
2. An HCP opens the waiting patient and captures clinical information once.
3. Save the structured record and create an exchange package (FHIR Bundle at the exchange boundary).
4. On the workstation, import and validate the package, map identity, add the required military administrative fields, and export an ADN-ingest package.
5. In Dhanwantri 3.0 ADN, import the package and show mapped fields with provenance.
6. Open AME (AFMSF 3B) or PME (AFMSF 3A), complete only examination-specific fields, approve, and generate the corresponding PDF.
7. Show the transaction/audit trail and the generated artefact.

## Guiding principles

- Capture clinical information once; reuse it across downstream workflows.
- Structured data is the source of truth. PDFs are rendered documentary artefacts, not the interchange master.
- Use FHIR/ABDM-compatible profiles at the internet-side exchange boundary; map only relevant fields into the ADN's AFMSF-oriented internal model.
- Keep the three product surfaces visually distinct but make the end-to-end flow obvious.
- Preserve field-level provenance, source references, transaction IDs, timestamps, hashes, and template/profile versions where practical.
- Missing source values remain blank; never fabricate or silently default clinical values.
- Use synthetic data only. This PoC does not connect to, certify, or emulate a real classified network.
- Demonstrate domain transfer as explicit package export/import. Shared hosting and separate visual portals do not constitute security segregation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product plan and screen inventory](docs/PRODUCT-PLAN.md)
- [Data exchange and provenance](docs/DATA-EXCHANGE.md)
- [AFMSF form requirements](docs/AFMSF-FORMS.md)
- [Build plan and acceptance criteria](docs/BUILD-PLAN.md)
- [Architecture decisions](docs/DECISIONS.md)

## Status

Planning baseline. Implementation should prioritise a polished, reliable, replayable demonstration over production infrastructure or exhaustive clinical functionality.
