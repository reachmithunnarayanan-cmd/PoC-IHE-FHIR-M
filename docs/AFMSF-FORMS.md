# AFMSF Form Workflows

## Scope

The ADN interface demonstrates two form-led examination workflows:

- **AME — AFMSF 3B (Ver 2002), Annual Medical Examination.**
- **PME — AFMSF 3A (Ver 2002), Periodic / Special Medical Examination.**

The uploaded source forms are the authority for exact labels, order, grouping, and layout. Preserve their terminology when implementing the form screens and generated PDFs. Do not infer fields that are not present in the source form.

## AME — AFMSF 3B

The source form includes:
- Examination header: location, date and authority.
- Personal/service details: number, rank, name, unit/ship, service, arms/corps, branch/trade, DOB, age, sex, commission type/date, total service, past medical history, present medical category/effective date, previous AME/PME details, and officer signature/date.
- Dental examination.
- Investigations: blood, urine, fasting and post-prandial blood sugar, lipid profile, chest X-ray and ECG.
- Physical capacity measurements.
- Cardiovascular, respiratory, gastrointestinal, CNS and locomotor examination.
- Vision, hearing, ENT and gynaecological details.
- Immunisation details.
- Final observations, medical category and examining/approving authority details.

The exact labels and layout should be taken from the uploaded AFMSF 3B source PDF when building the UI and PDF template.

## PME — AFMSF 3A

Use the uploaded AFMSF 3A source PDF as the field-level authority. Its scan/text extraction may be less searchable than 3B; inspect the actual page image before implementing. Do not substitute an assumed generic PME form or copy the 3B field list into 3A.

## Data reuse

- Prefill only fields supported by the incoming ADN-ingest package and the documented mapping.
- Show whether a value was imported, workstation-enriched, or entered/amended in ADN.
- Keep unsupported or absent fields blank.
- The medical officer enters examination-specific findings and any other missing data required by the form.
- Saving the structured examination record is the authoritative action; generate the PDF from that record.

## PDF generation

- Generate the formal PDF from the structured ADN examination record.
- Keep the form background/template replaceable independently of clinical data.
- Version the template and coordinate mapping used to place values.
- Retain the generated document reference, creation time, source examination record reference and template version.
- Do not claim digital signing unless an actual signing workflow is implemented and verified.
