# Architecture and Product Decisions

This log records the current agreed baseline. Revisit a decision only when new evidence or a concrete implementation constraint requires it.

| ID | Decision | Rationale / constraint |
|---|---|---|
| D-001 | Internet-side product is named **i-Dhanwantri**. | Product naming agreed. |
| D-002 | ADN-side product is named **Dhanwantri 3.0 ADN**. | Product naming agreed. |
| D-003 | Middle component is named **Secure Data Exchange Workstation**. | Makes the controlled transformation boundary explicit. |
| D-004 | Build a visual, functional PoC, not a production architecture review. | Optimise for committee comprehension, continuity and reliability. |
| D-005 | Use one synthetic patient journey end to end. | Makes data reuse and interoperability visible. |
| D-006 | Structured data is authoritative; PDFs are generated documentary outputs. | Avoid PDF-centric exchange and reverse extraction. |
| D-007 | ADN retains an AFMSF-oriented internal model; the PoC public-side exchange uses FHIR-inspired structured XML. | Standards-oriented representation without making formal conformance a PoC dependency. |
| D-008 | The exchange workstation performs direction-specific pass, transform, add/enrich, remove and hold actions on structured fields. | Demonstrates controlled transformation, not merely PDF redaction. |
| D-009 | Missing data remains blank and provenance is visible. | Avoid fabricated values and preserve trust in reused data. |
| D-010 | AME is AFMSF 3B; PME is AFMSF 3A. | Uploaded forms are the field/layout authority. |
| D-011 | Use the union of AFMSF 3A and 3B fields as a canonical field superset with explicit form and domain mappings. | Common vocabulary supports both form workflows and cross-domain projections. |
| D-012 | A completed PME record must be capable of generating an AME projection. | Reuse overlapping fields; identify AME-only/missing fields for completion; never invent values. |
| D-013 | ADN-to-public exchange strips military-only and otherwise excluded fields before producing the XML package. | The outgoing package is a direction-specific subset; removal does not alter the source. |
| D-014 | Public-to-ADN exchange maps only permitted incoming fields and must not silently overwrite authoritative ADN identity, service or examination decisions. | Preserve domain ownership and source provenance. |
| D-015 | The PoC XML is FHIR-inspired and representational, not required to validate as FHIR or an ABDM profile. | Formal ABDM profile/version selection, schema validation and conformance are deferred to Alpha/Beta. |
| D-016 | The PoC uses explicit package export/import to represent transfer. | Do not imply real classified connectivity or security segregation. |
| D-017 | Use synthetic data only. | No real patient or operational military data in the demonstration. |
| D-018 | Hostinger Premium is the intended primary and BigRock the standby deployment. | Keep deployment practical; verify runtime constraints before implementation. |
| D-019 | The Secure Data Exchange Workstation has a field-selection configuration panel with independent selection/deselection for each transfer direction. | The effective outgoing payload is the direction-specific allowlist plus required generated exchange metadata; locked exclusions remain enforced and deselection never alters source data. |
| D-020 | Every transfer snapshots the effective sanitisation profile and mapping version. | Makes transformations reproducible and auditable. |

## Open implementation choices

- Final framework/runtime and deployment adapter, selected for actual shared-hosting capabilities.
- Alpha/Beta selection of formal ABDM implementation guide/profile versions, FHIR version, resource set, terminology bindings and validation approach.
- Detailed mapping implementation and completion rules for every AME/PME field.
- Final PDF template rendering approach and coordinate mapping.
- Final synthetic identity and military-field fixture values.
