# Canonical Field Superset and Projection Rules

## Purpose

The canonical field superset is the union of the fields required by AFMSF 3A (Ver-2002) Periodic/Special Medical Examination (PME) and AFMSF 3B (Ver 2002) Annual Medical Examination (AME), together with identity, clinical, exchange and provenance fields needed by the PoC.

It is a shared vocabulary and mapping catalogue, not a single database schema and not a transfer payload. i-Dhanwantri, Dhanwantri 3.0 ADN and the Secure Data Exchange Workstation may maintain different domain-specific representations.

The workstation applies direction-specific rules: pass, transform, add/enrich, remove from the outgoing copy, or hold for review. Removal never deletes data from the source record. Missing values remain missing. Technical mappability does not imply permission to transfer. These PoC rules are not an approved operational sanitisation policy.

## Three projections

1. PME to AME: A completed structured PME should generate an AME by deterministic projection of overlapping fields. PME-only detail remains in the source. AME-only or unavailable fields are flagged for completion. No values are invented.
2. ADN to public side: Strip military-only and otherwise excluded fields, then map eligible clinical/demographic content into a FHIR-inspired structured XML representation.
3. Public side to ADN: Validate and map permitted incoming clinical/demographic content into the ADN model. Do not silently overwrite authoritative ADN identity, service or examination decisions.

The superset is the common vocabulary. The three projections have separate mapping and eligibility rules.

## Canonical field catalogue

IDs are stable PoC identifiers. Repeating findings, investigations, reports and practitioners should be represented as repeatable records, not flattened strings.

### Person and service identity

| Canonical ID | Field / elements | Form applicability / notes |
|---|---|---|
| person.source_patient_id | Source-system patient identifier | Exchange identity |
| person.adn_personnel_number | Number / service number | AME, PME; military-only |
| person.name | Name | AME, PME |
| person.rank | Rank | AME, PME; military-only |
| person.unit_ship | Unit/Ship | AME, PME; military-only |
| person.service | Army / Navy / Air Force | AME, PME |
| person.arms_corps | Arms/Corps/Arm | AME, PME; military-only |
| person.branch_trade | Branch/Trade | AME, PME; military-only |
| person.date_of_birth | Date of Birth | AME, PME |
| person.age_at_exam | Age in years; PME also records months | AME, PME; derive only with declared rule |
| person.sex | Sex | AME, PME |
| person.commission_type | PC / SSC | AME, PME; military-only |
| person.commission_date | Date of Commission | AME, PME; military-only |
| person.total_service | Total Service | AME, PME; military-only |
| person.contact | Address, phone, email | Optional extension if captured and approved |
| person.identity_link | Cross-domain synthetic identity link | Workstation-generated; demo only |

### Examination and encounter context

| Canonical ID | Field / elements | Form applicability / notes |
|---|---|---|
| exam.id | Examination identifier | Both |
| exam.type | AME / PME / special examination | Both |
| exam.date | Examination date | Both |
| exam.place | Medical examination held at / carried out at | Both |
| exam.authority | Examination authority | Both |
| exam.previous_ame_place | Last AME carried out at | PME |
| exam.previous_ame_date | Last AME date | Where present |
| exam.previous_pme_place | Last PME carried out at | AME previous AME/PME field |
| exam.previous_pme_date | Last PME date | Where present |
| exam.previous_report_ref | Previous AME/PME report attachment/reference | AME |
| exam.status | Draft / in progress / completed / reviewed / approved | Workflow |
| exam.officer_acknowledgement | Officer signature reference and date | Both |
| exam.board_place_date | Board place and date | PME |
| exam.board_member_1 | Member-1 | PME |
| exam.board_member_2 | Member-2 | PME |
| exam.board_president | President Medical Board | PME |

### History, observations and physical capacity

| Canonical ID | Field / elements | Unit / form applicability |
|---|---|---|
| clinical.past_medical_history | Past Medical History | AME, PME |
| clinical.present_complaints | Present complaints, if recorded | Optional extension |
| clinical.general_observations | General examination observations | Optional extension |
| clinical.final_observations | Final observations | AME, PME |
| obs.height | Height | cm; AME, PME |
| obs.weight_actual | Actual weight | kg; AME, PME |
| obs.weight_ideal | Ideal weight | kg; AME, PME |
| obs.overweight_percent | Overweight | %; AME, PME |
| obs.waist | Waist | cm; AME, PME |
| obs.chest_full_expiration | Chest full expiration | cm; AME, PME |
| obs.chest_expansion | Range of expansion | cm; AME, PME |
| obs.pulse | Pulse | per minute; AME, PME |
| obs.blood_pressure | Blood pressure | mmHg; AME, PME |
| obs.peripheral_pulsations | Peripheral pulsations; NAD/findings | AME, PME |
| obs.heart_size | Heart size; NAD/findings | AME, PME |
| obs.heart_sounds | Heart sounds; NAD/findings | AME, PME |
| obs.heart_rhythm | Rhythm; NAD/findings | AME, PME |
| obs.liver_palpable | Liver palpable Y/N and measurement | cm where recorded; AME, PME |
| obs.spleen_palpable | Spleen palpable Y/N and measurement | cm where recorded; AME, PME |
| obs.hmf | Higher mental function | AME, PME |
| obs.speech | Speech | AME, PME |
| obs.reflexes | Reflexes | AME, PME |
| obs.tremors | Nil / Fine / Coarse | AME, PME |
| obs.self_balancing | Fairly Steady / Unsteady | AME, PME |

### Laboratory investigations

Use repeatable results with analyte, value, unit, date/time, source, reference range if available, interpretation and report reference.

| Canonical ID | Test | Unit / form applicability |
|---|---|---|
| lab.hb | Haemoglobin | Gm% as printed; AME, PME |
| lab.tlc | Total leucocyte count | mm3; AME, PME |
| lab.dlc_p | DLC P | AME, PME |
| lab.dlc_l | DLC L | AME, PME |
| lab.dlc_m | DLC M | AME, PME |
| lab.dlc_e | DLC E | AME, PME |
| lab.dlc_b | DLC B | AME, PME |
| lab.esr | ESR | mm fall in 1st hour; AME, PME |
| lab.urine_re | Urine RE | AME, PME |
| lab.urine_me | Urine ME | AME, PME |
| lab.urine_specific_gravity | Specific gravity | AME, PME |
| lab.urine_albumin | Albumin | AME, PME |
| lab.urine_sugar | Sugar | AME, PME |
| lab.glucose_fasting | Fasting blood sugar | mg/dL; AME, PME |
| lab.glucose_2h_pp | 2-hour post-prandial blood sugar | mg/dL; AME, PME |
| lab.cholesterol | Cholesterol | mg/dL; AME, PME |
| lab.triglycerides | Triglycerides | mg/dL; AME, PME |
| lab.hdl | HDL | mg/dL; AME, PME |
| lab.vldl | VLDL | mg/dL; AME, PME |
| lab.ldl | LDL | mg/dL; AME, PME |
| lab.urea | Urea | mg/dL; PME |
| lab.creatinine | Creatinine | mg/dL; PME |
| lab.uric_acid | Uric acid | mg/dL; PME |

### Diagnostic investigations

| Canonical ID | Fields | Form applicability / notes |
|---|---|---|
| diag.ecg_rest_dmt | ECG R/DMT number, date, report | PME |
| diag.ecg_tmt | ECG TMT number, date, report | PME |
| diag.ecg | ECG number, date, report | AME; project from appropriate PME ECG record |
| diag.chest_xray_pa | Chest X-ray PA number, date, report/NAD | AME, PME |
| diag.other_test | Other investigation/test | Optional extension |
| doc.report_reference | Report/document attachment reference | Both |

### System examination findings

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| exam.respiratory | Respiratory system findings | AME, PME |
| exam.locomotor | Locomotor system | AME, PME |
| exam.spine | Spine | AME, PME |
| exam.hernia | Hernia | AME, PME |
| exam.hydrocele | Hydrocele | AME, PME |
| exam.haemorrhoids | Haemorrhoids | AME, PME |
| exam.breast | Breast findings | AME, PME |
| exam.gynaecology.menstrual_history | Menstrual history | AME, PME |
| exam.gynaecology.lmp | LMP | AME, PME |
| exam.gynaecology.pregnancies | Number of pregnancies | AME, PME |
| exam.gynaecology.abortions | Number of abortions | AME, PME |
| exam.gynaecology.children | Number of children | AME, PME |
| exam.gynaecology.last_confinement | Date of last confinement | AME, PME |
| exam.gynaecology.vaginal_discharge | Vaginal discharge | AME, PME |
| exam.gynaecology.prolapse | Prolapse | AME, PME |
| exam.gynaecology.usg_abdomen | USG abdomen | AME, PME |

### Dental

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| dental.missing_unsaveable_count | Total missing/unsaveable teeth | AME, PME |
| dental.defective_teeth | Tooth-wise defective teeth positions | AME, PME; preserve UR/UL notation |
| dental.dental_points | Tooth-wise dental points | AME, PME; preserve LR/LL notation |
| dental.gum_condition | Condition of gums | AME, PME |
| dental.tooth_chart | Tooth chart markings: missing '-' and unsaveable 'x' | AME, PME |
| dental.remarks | Dental remarks | AME, PME |

### Eye

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| eye.distant_vision | Right/left; with/without glasses | AME, PME |
| eye.near_vision | Right/left; with/without glasses | AME, PME |
| eye.glasses_power | Spectacle power | AME, PME where recorded |
| eye.colour_perception | CP | AME, PME |
| eye.trachoma_other_disease | Trachoma, complications or other disease | PME |
| eye.binocular_vision_grade | Binocular vision and grade | PME |
| eye.hypermetropia | Manifest hypermetropia, R/L | PME |
| eye.myopia | Manifest myopia, R/L | PME |
| eye.cover_test | Cover test | PME |
| eye.diaphragm_maddox_test | Diaphragm / PD Maddox wing test | PME |
| eye.fund_media | Fund and media | PME |
| eye.visual_fields | Fields | PME |
| eye.night_visual_capacity | Night visual capacity | PME |
| eye.convergence | Convergence C/SC measurements | PME |
| eye.accommodation | Accommodation R/L | PME |
| eye.remarks | Eye remarks | AME, PME |

### Ear, nose and throat

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| ent.hearing | Right/left/both | AME, PME |
| ent.hearing_fw | FW measurements, R/L/both | AME, PME |
| ent.hearing_cv | CV measurements, R/L/both | AME, PME |
| ent.external_ear | External ear / wax | PME |
| ent.middle_ear | Tympanic membrane and Eustachian tube | PME |
| ent.inner_ear | Cochlea and vestibular apparatus | PME |
| ent.tympanic_membrane_intact | Intact Y/N | AME |
| ent.mobility_valsalva | Mobility (Valsalva) | AME |
| ent.audiometry | Audiometry record | AME, PME |
| ent.nose | Nose findings | AME, PME |
| ent.throat | Throat findings | AME, PME |
| ent.sinuses | Sinus findings | AME; PME may include in nose/throat findings |

### Immunisation and medical category

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| immunisation.record | Immunisation details | AME; no explicit PME section identified |
| category.present | Present medical category | AME, PME |
| category.effective_date | Category effective date (wef) | AME |
| category.board_fitness | Found fit in medical category | PME |
| category.final | Final medical category / outcome | AME, PME; preserve decision context |
| category.recommendation | Specialist/board recommendation | Where recorded; distinct from approved category |

### Practitioners, authority and provenance

| Canonical ID | Field | Form applicability / notes |
|---|---|---|
| actor.medical_specialist | Medicine specialist identity/signature/date | PME |
| actor.surgical_specialist | Surgical specialist identity/signature/date | PME |
| actor.gynaecologist | Gynaecologist identity/signature/date | PME |
| actor.dental_officer | Dental officer identity/signature/date | AME, PME |
| actor.eye_specialist | Eye specialist identity/signature/date | PME |
| actor.ent_specialist | ENT specialist identity/signature/date | PME |
| actor.medical_attendant | Authorised Medical Attendant / Medical Specialist | AME |
| actor.approving_authority | Approving/perusing authority, signature, rank/designation, place/date | AME, PME |
| exchange.transaction_id | Transfer transaction ID | Workstation |
| exchange.package_id | Package ID | Workstation |
| exchange.direction | ADN-to-public / public-to-ADN | Workstation |
| exchange.source_system | Source system | Workstation |
| exchange.destination_system | Destination system | Workstation |
| exchange.operator | Operator ID and role | Workstation |
| exchange.timestamp | Capture/export/import/transform timestamps | Workstation |
| exchange.input_hash | Input package hash | Workstation |
| exchange.output_hash | Output package hash | Workstation |
| exchange.mapping_version | Mapping rules version | Workstation |
| exchange.schema_version | Source/destination schema version | Workstation |
| exchange.transformation_log | Per-field action, reason and result | Workstation |
| provenance.origin | Original source system/record/field | All projected fields |
| provenance.status | Captured / imported / enriched / amended / rejected / not transferred | All projected fields |
| provenance.actor_time | Actor and timestamp for capture/amendment | All projected fields |

## PME-to-AME projection matrix

| AME field group | PME source | Projection rule |
|---|---|---|
| Personal/service data | PME personal data | Direct map for equivalent fields |
| Past medical history/category | PME personal data | Map while preserving effective-date/context distinctions |
| Previous examination | Last AME carried out at | Map location; date/reference only if actually available |
| Dental | PME Dental | Map tooth chart and summary |
| Physical capacity | PME Medicine | Direct map |
| Cardiovascular | PME Medicine | Map; retain separate R/DMT and TMT ECG records |
| Respiratory / chest X-ray | PME Medicine | Map findings and report reference |
| Gastrointestinal | PME Medicine | Direct map |
| CNS | PME Medicine | Direct map |
| Laboratory | PME Medicine | Map common analytes; PME-only urea/creatinine/uric acid remain in source |
| Surgery / locomotor | PME Surgery | Map common findings |
| Gynaecology | PME Gynaecology | Map common fields |
| Vision | PME Eye | Map common vision/CP; retain additional specialist tests |
| Hearing / ENT | PME ENT | Map common fields; retain additional detail |
| Immunisation | No explicit PME section identified | AME-specific; leave blank or request separate entry |
| Final category | PME board fitness/category | Map only with decision context; do not conflate recommendation and approval |
| Signatures/authorities | PME specialists and board | Map only to equivalent roles; do not copy signatures into unrelated roles |

Before AME generation, show a completion report: ready; generated with optional fields blank; or requires completion of AME-required fields. Missing data is never invented.

## Directional sanitisation profiles

### ADN to public-side XML

Potentially eligible: clinical history, examination findings, observations, investigations, diagnostic reports, permitted demographics, relevant practitioner/facility information and supporting clinical documents.

Normally excluded in the demo: service number, rank, unit/ship, service, Arms/Corps, branch/trade, commission type/date, total service, military medical category/fitness decisions, board composition, military approving/perusing authorities, internal military references and military-only documents.

Review separately: direct identifiers, dates, facility names, rare/sensitive clinical facts, free text, embedded document metadata and any data that could identify military affiliation. Removal applies to the outbound copy only.

### Public-side XML to ADN

Potentially eligible: permitted demographics, clinical history, conditions, observations, investigations, reports, medications/allergies/immunisations if present, practitioner/facility details and document references.

Add/enrich only through an authorised workstation process: synthetic ADN linkage/personnel identifier and military administrative fields required by the ADN workflow. Do not silently overwrite authoritative ADN identity, service data, medical category or examination decisions. Hold conflicting or ambiguous identity matches for operator review.

These are PoC demonstration rules only, not approved operational sanitisation guidance.

## FHIR-inspired XML for the PoC

Use a human-readable structured XML representation inspired by resource-oriented FHIR/ABDM patterns. It is not required to be valid FHIR serialization, an ABDM profile, or schema-validated XML. Do not claim formal conformance.

Suggested sections: ClinicalExchangeBundle/BundleMetadata, Patient, Encounter, Condition, Observations/Observation, DiagnosticReports/DiagnosticReport, Medication, Allergy, Immunisation, Practitioner, Organization, DocumentReference and Provenance. Include exchange direction, source/destination, transaction/package IDs, mapping version and transformation summary. Use synthetic values only.

Alpha/Beta may select the formal ABDM implementation guide/profile, FHIR version, resource set, terminology bindings, serialization and validation approach. These choices do not block the PoC.

## Acceptance criteria

1. A completed structured PME generates an AME projection through deterministic mappings.
2. AME generation identifies fields needing separate completion, including AME-only immunisation where not otherwise captured.
3. No missing clinical value is fabricated; source data remains intact.
4. An ADN PME record produces a FHIR-inspired XML package after direction-specific outbound stripping.
5. XML contains eligible structured clinical/demographic data and provenance, excluding configured military-only fields.
6. Incoming representational XML maps to permitted ADN fields with provenance and without silent overwrite of authoritative ADN data.
7. Workstation reports pass, transform, add/enrich, remove, hold and unsupported/missing fields by direction.
8. PoC labels XML as representational and makes no claim of FHIR/ABDM validation or production sanitisation approval.
9. AME/PDF and exchange XML derive from structured records; PDFs are not parsed back as the interchange master.

## Source notes

- AFMSF 3A (Ver-2002) PME source: uploaded 3A-Filled.pdf. It includes Medicine, Surgery, Gynaecology, Dental, Eye, ENT, final observations/medical category, medical board members and approving/perusing authorities.
- AFMSF 3B (Ver 2002) AME source: uploaded AME.pdf. It includes personal data, dental, investigations, physical/system examination, vision, hearing, ENT, gynaecology, immunisation, final observations/category and authority fields.
- Where a field is not present in a form, do not assume it. Label extensions explicitly.
