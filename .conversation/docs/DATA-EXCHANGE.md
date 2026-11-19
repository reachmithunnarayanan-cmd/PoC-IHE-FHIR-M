# Data Exchange, Mapping and Provenance

## 1. Exchange principle

The exchange unit is structured data. The PoC uses an ABDM-compatible FHIR representation at the i-Dhanwantri boundary, then maps the subset required by the ADN workflow into an ADN-specific internal model.

Do not require Dhanwantri 3.0 ADN to become a FHIR-native clinical repository. The exchange workstation is the adapter/mapping point.

## 2. Inbound flow (internet side to ADN)

1. i-Dhanwantri saves the clinical record in structured form.
2. The export adapter creates a FHIR Bundle appropriate to the agreed exchange profile and use case.
3. Operator imports the package into the Secure Data Exchange Workstation.
4. Workstation validates basic structure, profile/version and required fields.
5. Workstation resolves/maps the synthetic identity using its local demo mapping.
6. Workstation adds the required military identifiers and administrative fields.
7. Workstation maps relevant clinical/admin content to the ADN-ingest schema.
8. Operator exports the resulting package.
9. Operator imports it in Dhanwantri 3.0 ADN.
10. ADN stores its own internal representation and displays the provenance of imported/enriched fields.

## 3. Outbound flow (ADN to internet side)

1. Select an ADN-side record/package for release.
2. Workstation identifies fields classified for removal or pseudonymisation in the PoC ruleset.
3. Apply the explicit Strip MII/PII operation to structured data.
4. Produce a transformation report and outbound package.
5. Operator manually imports the package into the internet-side demo.

This is a demonstration of a transformation workflow only. The rules are not an approved classification guide or production sanitisation policy.

## 4. Bundle and document terminology

- Use **FHIR Bundle** for the FHIR exchange package.
- Use **CDA/CCD** only for a CDA-based Continuity of Care Document.
- Do not call a FHIR Bundle a CCD.
- PDFs are rendered presentation/formal artefacts. They are not the source for data exchange and must not be parsed back into the canonical clinical record.

The exact FHIR resource set and profile versions must be finalised against the selected ABDM implementation guide before claiming formal conformance. For the PoC, document the chosen profile/version in the export metadata and validation screen.

## 5. Mapping contract

Maintain an explicit mapping specification with:
- Source resource and element/path.
- Source profile/version.
- Destination ADN field.
- Transformation rule (copy, code translation, formatting, controlled enrichment, omit).
- Required/optional status.
- Provenance label.
- Validation rule and missing-data behaviour.

Map only what the ADN form/workflow needs. Do not dump the entire FHIR Bundle into the ADN model.

## 6. Missing and conflicting data

- Missing values stay empty; do not fabricate or silently default.
- If a required ADN field is not available from the incoming package, mark it as requiring authorised workstation/operator input or ADN-side completion.
- Conflicting identity matches must be surfaced for manual resolution in the demo; never silently merge identities.
- Preserve source references to support traceability.

## 7. Provenance and audit envelope

For each transfer/transformation, show or retain where practical:
- Transaction ID.
- Source system and destination system.
- Source record/document reference.
- Patient reference (synthetic/pseudonymous as appropriate).
- Operator identity/role.
- Timestamp.
- Input and output package hashes.
- Transformation actions and validation outcome.
- FHIR/profile/schema version and mapping version.
- PDF template version where a PDF is generated.

Field provenance in ADN should distinguish imported, workstation-enriched, and ADN-entered/amended values. Preserve the originating transaction/reference when a field is amended.

## 8. PoC identity handling

Use synthetic identifiers only. A local mapping table can associate the internet-side demo patient with a synthetic ADN-side identifier. This is a controlled demonstration mapping, not a production enterprise identity service or assurance mechanism.
