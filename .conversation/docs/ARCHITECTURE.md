# Architecture

## 1. System context

The PoC has three independently presented product surfaces:

- **i-Dhanwantri** — internet-side patient and clinical workflow.
- **Secure Data Exchange Workstation** — explicit package handling and transformation boundary.
- **Dhanwantri 3.0 ADN** — simulated ADN-side military health workflow and AFMSF document generation.

The intended demonstration path is:

`i-Dhanwantri → export package → Secure Data Exchange Workstation → ADN-ingest package → Dhanwantri 3.0 ADN`

The return path can demonstrate outbound sanitisation/pseudonymisation before a package is made available to the internet-side system.

## 2. Logical responsibilities

### i-Dhanwantri
- Patient registration and HCP-facing waiting list.
- Clinical encounter capture in a structured model.
- Save a canonical clinical record.
- Generate exchange payloads and purpose-specific presentation documents.
- Provide explicit export choices, such as clinical document, ADN transfer, insurer extract, or offline-hospital package. These are distinct output adapters, not separate sources of truth.

### Secure Data Exchange Workstation
- Import and inspect an incoming package.
- Validate package structure and expected profile/version.
- Map identity using a local military identity mapping for this simulation.
- Enrich with required military identifiers and administrative fields.
- Produce a transformation report and ADN-ingest package.
- Support the reverse operation: remove or pseudonymise applicable identifiers before public-side export.
- Make the operator, time, transaction, source, destination, and transformation visible.

### Dhanwantri 3.0 ADN
- Import the ADN-ingest package.
- Populate its own military-oriented patient/administrative model with mapped fields.
- Retain field-level provenance and source transaction references.
- Provide AME (AFMSF 3B) and PME (AFMSF 3A) workflows.
- Generate the formal PDF from the structured examination record.

## 3. Data ownership and boundaries

- i-Dhanwantri owns the public-side clinical record for this PoC.
- Dhanwantri 3.0 ADN owns its ADN-side military administrative and examination records.
- The exchange workstation owns transformation activity and its audit/report metadata; it is not the clinical system of record.
- The ADN does not need to adopt the ABDM/FHIR clinical schema internally. FHIR is used at the exchange boundary; the workstation maps relevant content to the ADN's AFMSF-oriented model.
- Only fields required by the receiving workflow should cross the boundary.

## 4. Document model

A structured record is authoritative for exchange and downstream reuse. PDFs are rendered views/formal documentary artefacts. Do not parse a generated PDF to recreate the clinical record.

Where a CDA-based Continuity of Care Document is required, identify it as CDA/CCD. A FHIR Bundle is a separate exchange representation and must not be labelled a CCD.

PDF template/background assets should be replaceable without changing the source clinical data. Keep template version and field-placement mapping together. A template change must not silently change the underlying record.

## 5. Hosting and demonstration topology

The planned demonstration may be deployed on shared hosting accounts (Hostinger Premium primary; BigRock standby), subject to the capabilities of the actual plans. Keep the deployment simple and repeatable; do not let the hosting choice drive unnecessary architecture work.

- Use the same release and synthetic demonstration dataset on both hosts.
- Keep a known primary URL and a separately tested standby URL.
- Do not rely on DNS propagation as the live-demo failover mechanism.
- Verify the actual supported runtime/database features before selecting deployment-specific implementation details.
- Hosting two portals or two accounts does not create a classified security boundary.

## 6. Security and scope statement

This is a visual and functional PoC using synthetic data. It does not connect to, certify, or emulate a real classified network; it does not establish production security segregation, accreditation, or operational identity assurance. Domain crossing is represented by explicit export/import of files/packages under operator control.

Do not use real patient, service, or classified information in the repository, test fixtures, screenshots, or demo environment.
