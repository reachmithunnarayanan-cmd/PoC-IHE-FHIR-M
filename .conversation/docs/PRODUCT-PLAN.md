# Product Plan and Screen Inventory

## Product identity

**PoC title:** i-Dhanwantri / Dhanwantri 3.0 ADN — Interoperable Military Health Information Exchange  
**Tagline:** Capture Once. Exchange Securely. Reuse Everywhere.

Three distinct visual identities make the systems recognisable while a shared patient journey connects them.

## 1. i-Dhanwantri (internet side)

Visual direction: clean clinical interface; white surfaces, clinical blue and teal, generous spacing, accessible forms.

### Screens
1. **Login / role selection** — Patient or HCP.
2. **Patient registration** — concise demographics and contact details; synthetic demo identity.
3. **HCP dashboard** — registered patients waiting for attention.
4. **Patient clinical workspace** — patient summary and encounter capture.
5. **Clinical record editor** — structured fields aligned to selected ABDM-compatible FHIR profile guidance.
6. **Save/record summary** — show saved structured data and record reference.
7. **Export centre** — Generate CDA/CCD where required; Export for ADN ingest; Export for insurer; Export for offline hospital. Keep each output clearly labelled by format and purpose.
8. **Generated artefact view** — preview/download the selected PDF or structured package and show transaction/reference metadata.

### Interaction expectations
- Patient registration makes the patient visible in the HCP waiting list.
- HCP can open a patient and save a structured clinical record.
- Export actions produce tangible demo artefacts, not inert buttons.
- A single synthetic patient and encounter are reused throughout the end-to-end story.

## 2. Secure Data Exchange Workstation

Visual direction: operational workstation; charcoal/slate surfaces, amber status accents, restrained green for successful validation. It should feel like a controlled transfer console, not a third HIS.

### Screens
1. **Workstation landing / operator login** — clear source and destination context.
2. **Inbound package** — select/import an i-Dhanwantri export; show package name, type, transaction ID and validation state.
3. **Validation and mapping** — show source fields, mapped ADN fields, unmapped/ignored fields, and missing values.
4. **Add MII/PII operation** — enrich the inbound record with the military identifiers/administrative data required for the ADN workflow.
5. **Strip MII/PII operation** — outbound sanitisation/pseudonymisation for public-side release.
6. **Transformation report** — source, destination, operator, timestamp, transaction ID, profile/version, patient reference, hash, actions, warnings and result.
7. **Export package** — create a downloadable ADN-ingest package for manual import into Dhanwantri 3.0 ADN.

### Interaction expectations
- Both Add and Strip are visible as separate, explicit operations.
- The demo must show structured-data transformation, not only PDF redaction.
- Do not silently invent missing values; surface them as missing or requiring operator input.
- Package transfer is a simulated manual export/import step, not a live cross-domain connection.

## 3. Dhanwantri 3.0 ADN

Visual direction: formal military medical administration; deep navy, olive and muted gold, disciplined hierarchy, familiar form-led patterns.

### Screens
1. **ADN login** — distinct identity from i-Dhanwantri.
2. **ADN dashboard** — military patient list/search and recent imports.
3. **Import centre** — accept the ADN-ingest package produced by the workstation.
4. **Patient record** — display imported information and provenance.
5. **AME workspace** — AFMSF 3B.
6. **PME workspace** — AFMSF 3A.
7. **Review/approval** — review structured examination record and confirm generation.
8. **PDF output** — prefilled formal form generated from the structured ADN record.

### Provenance presentation
At field or section level, distinguish:
- Imported from i-Dhanwantri package.
- Added/enriched by Secure Data Exchange Workstation.
- Entered or amended by ADN medical officer.

Imported values should be reused rather than re-entered. Fields absent from the incoming package remain blank until an authorised user supplies them.

## 4. Shared demo shell

Use a small persistent environment indicator such as **DEMO • SYNTHETIC DATA**. Each portal has its own branding, login, navigation and colour system. Provide a clear route back to a demo start page/reset scenario so the presentation can be replayed reliably.

## 5. Demo narrative

A single synthetic patient is registered, examined, exported, transformed, imported into ADN, and used to prefill an AME or PME form. The committee should be able to see the same information persist across screens and the final PDF, without repeated clinical data entry.
