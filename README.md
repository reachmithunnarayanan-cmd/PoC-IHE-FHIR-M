# i-Dhanwantri / Dhanwantri 3.0 ADN — Interoperability PoC

**Tagline:** Capture Once. Exchange Securely. Reuse Everywhere.

A visual, end-to-end proof of concept demonstrating structured clinical data exchange between an internet-side HIS and a simulated ADN-side military health system, through an explicit sanitisation and transformation workstation.

## Product surfaces

1. **i-Dhanwantri** — internet-side HIS: patient registration, HCP clinical encounter capture, structured clinical record, and purpose-specific exports.
2. **Secure Data Exchange Workstation** — controlled import, validation, identity mapping, military metadata enrichment, configurable field selection, sanitisation, transformation reporting, and export/import package simulation.
3. **Dhanwantri 3.0 ADN** — ADN-side military health interface: ingest-ready package import, military patient dashboard, AFMSF examination workflows, and generated formal PDFs.

## Demonstration story

Use one synthetic patient throughout:
1. Register the patient in i-Dhanwantri.
2. An HCP opens the waiting patient and captures clinical information once.
3. Save the structured record and create a structured exchange package.
4. On the workstation, import and validate the package, select the transfer direction, configure field inclusion/exclusion, review the outgoing field preview and transformation report, then export the receiving-domain package.
5. In Dhanwantri 3.0 ADN, import the package and show mapped fields with provenance.
6. Complete a PME (AFMSF 3A), generate an AME (AFMSF 3B) from overlapping structured fields, and flag AME-specific gaps for completion.
7. Demonstrate ADN-to-public sanitisation and export as FHIR-inspired XML, then show the structured clinical fields and transformation report.
8. Show the transaction/audit trail and generated documentary artefacts.

## Guiding principles

- Capture clinical information once; reuse it across downstream workflows.
- The canonical field superset is the union of AFMSF 3A and 3B plus exchange/provenance fields; it is a vocabulary and mapping catalogue, not a shared database schema or transfer payload.
- Structured data is the source of truth. PDFs are rendered documentary artefacts, not the interchange master.
- The PoC public-side package is human-readable, structured, FHIR-inspired XML. It is representational and is not claimed to validate against FHIR or an ABDM profile.
- Formal ABDM profile/version selection, schema validation and conformance are deferred to Alpha/Beta.
- The workstation has independent, direction-specific field-selection panels. Selected fields are eligible for transfer; deselected fields are omitted from that package only. Locked exclusions and required exchange-envelope metadata are enforced.
- The workstation applies direction-specific pass, transform, add/enrich, remove and hold rules. Removing a field from an outgoing package never deletes it from the source record.
- Each transaction snapshots the effective configuration and mapping version and reports field-level actions.
- Keep the three product surfaces visually distinct but make the end-to-end flow obvious.
- Preserve field-level provenance, source references, transaction IDs, timestamps, hashes and mapping/schema versions where practical.
- Missing source values remain blank; never fabricate or silently default clinical values.
- Use synthetic data only. This PoC does not connect to, certify, or emulate a real classified network.
- Demonstrate domain transfer as explicit package export/import. Shared hosting and separate visual portals do not constitute security segregation.

## Documentation

- [Architecture](docs/ARCHITECTURE.md)
- [Product plan and screen inventory](docs/PRODUCT-PLAN.md)
- [Data exchange and provenance](docs/DATA-EXCHANGE.md)
- [AFMSF form requirements](docs/AFMSF-FORMS.md)
- [Canonical field dictionary and projection rules](docs/CANONICAL-FIELD-DICTIONARY.md)
- [Configurable field-mapping matrix and workstation panel](docs/CONFIGURABLE-FIELD-MAPPING-MATRIX.md)
- [Illustrative canonical field schema](schemas/canonical-field-superset.schema.json)
- [Sanitisation profile schema](schemas/sanitisation-profile.schema.json)
- [Synthetic ADN-to-public profile example](schemas/demo-adn-to-public-profile.example.json)
- [Build plan and acceptance criteria](docs/BUILD-PLAN.md)
- [Architecture decisions](docs/DECISIONS.md)

## Status

Planning baseline. Implementation should prioritise a polished, reliable, replayable demonstration over production infrastructure or exhaustive clinical functionality.
