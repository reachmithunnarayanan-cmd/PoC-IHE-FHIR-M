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
| D-007 | FHIR/ABDM-compatible profiles are used at the internet-side exchange boundary. | Enables standards-oriented exchange without forcing FHIR as ADN's internal model. |
| D-008 | ADN retains an AFMSF-oriented internal model. | Map only the fields needed for military patient/examination workflows. |
| D-009 | The exchange workstation performs explicit Add MII/PII and Strip MII/PII transformations on structured data. | Demonstrates controlled transformation, not merely PDF redaction. |
| D-010 | Missing data remains blank and provenance is visible. | Avoid fabricated values and preserve trust in reused data. |
| D-011 | AME is AFMSF 3B; PME is AFMSF 3A. | Use the uploaded forms as field/layout authority. |
| D-012 | The PoC uses explicit package export/import to represent transfer. | Do not imply real classified connectivity or security segregation. |
| D-013 | Hostinger Premium is the intended primary and BigRock the standby deployment. | Keep deployment practical; verify runtime constraints before implementation. |

## Open implementation choices

- Final framework/runtime and deployment adapter, selected for the actual shared-hosting capabilities.
- Exact ABDM implementation guide/profile versions and resource set for the demo Bundle.
- Exact field-level 3A mapping after visual inspection of the uploaded source PDF.
- Final PDF template rendering approach and coordinate mapping.
- Final synthetic identity and military-field fixture values.
