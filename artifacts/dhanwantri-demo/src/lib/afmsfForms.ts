export type ExaminationType = 'PME' | 'AME';
export type ExaminationField = {
  key: string;
  label: string;
  type: 'text' | 'date' | 'number' | 'textarea' | 'select';
  options?: string[];
};
export type ExaminationSection = { title: string; fields: ExaminationField[] };
export type ExaminationPage = {
  number: number;
  total: number;
  title: string;
  continuation?: boolean;
  continuationIdentity?: boolean;
  sections: ExaminationSection[];
};

const field = (
  key: string,
  label: string,
  type: ExaminationField['type'] = 'text',
  options?: string[],
): ExaminationField => ({ key, label, type, options });
const section = (title: string, ...fields: ExaminationField[]): ExaminationSection => ({ title, fields });

const examinationHeader = section(
  'Examination header',
  field('exam.place', 'Medical examination held at'),
  field('exam.date', 'Date', 'date'),
  field('exam.authority', 'Examination authority'),
);

const personalService = section(
  'Personal data · fields 1–11',
  field('person.adn_personnel_number', '1. Number'),
  field('person.rank', '2. Rank'),
  field('person.name', '3. Name'),
  field('person.unit_ship', '4. Unit / ship'),
  field('person.service', '5. Service'),
  field('person.arms_corps', '6. Arms / Corps / Arm'),
  field('person.branch_trade', 'Branch / trade'),
  field('person.date_of_birth', '7. Date of birth', 'date'),
  field('person.sex', 'Sex (M / F)'),
  field('person.commission_type', '9. Type of commission (PC / SSC)'),
  field('person.commission_date', '10. Date of commission', 'date'),
  field('person.total_service', '11. Total service'),
);

const personalHistory = section(
  'Medical history and previous examination',
  field('clinical.past_medical_history', '12. Past medical history', 'textarea'),
  field('exam.previous_ame_place', '14. Last AME / PME carried out at'),
  field('exam.previous_ame_date', 'Previous examination date', 'date'),
);

const physicalCapacity = section(
  'Physical capacity measurements',
  field('obs.height', 'Height (cm)', 'number'),
  field('obs.weight_actual', 'Actual weight (kg)', 'number'),
  field('obs.weight_ideal', 'Ideal weight (kg)', 'number'),
  field('obs.overweight_percent', 'Overweight (%)', 'number'),
  field('obs.waist', 'Waist (cm)', 'number'),
  field('obs.chest_full_expiration', 'Chest full expiration (cm)', 'number'),
  field('obs.chest_expansion', 'Range of expansion (cm)', 'number'),
);

const cardiovascular = section(
  'Cardiovascular examination',
  field('obs.pulse', 'Pulse (per minute)', 'number'),
  field('obs.blood_pressure', 'Blood pressure (mmHg)'),
  field('obs.peripheral_pulsations', 'Peripheral pulsations'),
  field('obs.heart_size', 'Heart size'),
  field('obs.heart_sounds', 'Heart sounds'),
  field('obs.heart_rhythm', 'Rhythm'),
);

const gastrointestinal = section(
  'Gastrointestinal examination',
  field('obs.liver_palpable', 'Liver palpable (Y/N and measurement)'),
  field('obs.spleen_palpable', 'Spleen palpable (Y/N and measurement)'),
);

const cns = section(
  'Central nervous system examination',
  field('obs.hmf', 'Higher mental function'),
  field('obs.speech', 'Speech'),
  field('obs.reflexes', 'Reflexes'),
  field('obs.tremors', 'Tremors (Nil / Fine / Coarse)'),
  field('obs.self_balancing', 'Self-balancing (Fairly Steady / Unsteady)'),
);

const commonLaboratory = section(
  'Laboratory investigations',
  field('lab.hb', 'Haemoglobin (Gm%)'),
  field('lab.tlc', 'Total leucocyte count (mm3)'),
  field('lab.dlc_p', 'DLC P'),
  field('lab.dlc_l', 'DLC L'),
  field('lab.dlc_m', 'DLC M'),
  field('lab.dlc_e', 'DLC E'),
  field('lab.dlc_b', 'DLC B'),
  field('lab.esr', 'ESR (mm fall in 1st hour)'),
  field('lab.urine_re', 'Urine RE'),
  field('lab.urine_me', 'Urine ME'),
  field('lab.urine_specific_gravity', 'Urine specific gravity'),
  field('lab.urine_albumin', 'Urine albumin'),
  field('lab.urine_sugar', 'Urine sugar'),
  field('lab.glucose_fasting', 'Fasting blood sugar (mg/dL)'),
  field('lab.glucose_2h_pp', '2-hour post-prandial blood sugar (mg/dL)'),
  field('lab.cholesterol', 'Cholesterol (mg/dL)'),
  field('lab.triglycerides', 'Triglycerides (mg/dL)'),
  field('lab.hdl', 'HDL (mg/dL)'),
  field('lab.vldl', 'VLDL (mg/dL)'),
  field('lab.ldl', 'LDL (mg/dL)'),
);

const chestXray = field('diag.chest_xray_pa', 'Chest X-ray PA number / date / report');
const respiratory = field('exam.respiratory', 'Respiratory system findings', 'textarea');
const locomotor = section(
  'Surgical examination',
  field('exam.locomotor', 'Locomotor system', 'textarea'),
  field('exam.spine', 'Spine'),
  field('exam.hernia', 'Hernia'),
  field('exam.hydrocele', 'Hydrocele'),
  field('exam.haemorrhoids', 'Haemorrhoids'),
  field('exam.breast', 'Breast findings'),
  field('exam.surgery_remarks', 'Remarks', 'textarea'),
  field('exam.surgery_date', 'Date', 'date'),
  field('actor.surgical_specialist', 'Signature of Surgical Specialist'),
);

const gynaecology = section(
  'Gynaecological examination',
  field('exam.gynaecology.menstrual_history', 'Menstrual history', 'textarea'),
  field('exam.gynaecology.lmp', 'LMP', 'date'),
  field('exam.gynaecology.pregnancies', 'Number of pregnancies', 'number'),
  field('exam.gynaecology.abortions', 'Number of abortions', 'number'),
  field('exam.gynaecology.children', 'Number of children', 'number'),
  field('exam.gynaecology.last_confinement', 'Date of last confinement', 'date'),
  field('exam.gynaecology.vaginal_discharge', 'Vaginal discharge'),
  field('exam.gynaecology.prolapse', 'Prolapse'),
  field('exam.gynaecology.usg_abdomen', 'USG abdomen'),
  field('exam.gynaecology_remarks', 'Remarks', 'textarea'),
  field('exam.gynaecology_date', 'Date', 'date'),
  field('actor.gynaecologist', 'Signature of Gynaecologist'),
);

const dental = section(
  'Dental examination',
  field('dental.missing_unsaveable_count', 'Total missing / unsaveable teeth', 'number'),
  field('dental.defective_teeth', 'Tooth-wise defective teeth positions'),
  field('dental.dental_points', 'Tooth-wise dental points'),
  field('dental.gum_condition', 'Condition of gums'),
  field('dental.tooth_chart', 'Tooth chart markings (missing - / unsaveable x)', 'textarea'),
  field('dental.remarks', 'Dental remarks', 'textarea'),
  field('exam.dental_date', 'Date', 'date'),
  field('actor.dental_officer', 'Dental officer signature'),
);

const eyeCommon = section(
  'Vision',
  field('eye.distant_vision', 'Distant vision (right / left; with / without glasses)'),
  field('eye.near_vision', 'Near vision (right / left; with / without glasses)'),
  field('eye.glasses_power', 'Spectacle power'),
  field('eye.colour_perception', 'Colour perception (CP)'),
  field('eye.trachoma_other_disease', 'Trachoma, complications or other disease', 'textarea'),
  field('eye.binocular_vision_grade', 'Binocular vision and grade'),
  field('eye.hypermetropia', 'Manifest hypermetropia (right / left)'),
  field('eye.myopia', 'Manifest myopia (right / left)'),
  field('eye.cover_test', 'Cover test'),
  field('eye.diaphragm_maddox_test', 'Diaphragm / PD Maddox wing test'),
  field('eye.fund_media', 'Fund and media'),
  field('eye.visual_fields', 'Visual fields'),
  field('eye.night_visual_capacity', 'Night visual capacity'),
  field('eye.convergence', 'Convergence C / SC measurements'),
  field('eye.accommodation', 'Accommodation (right / left)'),
  field('eye.remarks', 'Eye remarks', 'textarea'),
  field('exam.eye_date', 'Date', 'date'),
  field('actor.eye_specialist', 'Signature of Eye Specialist'),
);

const entCommon = section(
  'Hearing and ENT examination',
  field('ent.hearing', 'Hearing (right / left / both)'),
  field('ent.hearing_fw', 'FW measurements (right / left / both)'),
  field('ent.hearing_cv', 'CV measurements (right / left / both)'),
  field('ent.audiometry', 'Audiometry record'),
  field('ent.nose', 'Nose findings', 'textarea'),
  field('ent.throat', 'Throat findings', 'textarea'),
  field('ent.remarks', 'Remarks', 'textarea'),
  field('exam.ent_date', 'Date', 'date'),
  field('actor.ent_specialist', 'Signature of ENT Specialist'),
);

const finalObservations = field('clinical.final_observations', 'Final observations', 'textarea');
const officerAcknowledgement = field('exam.officer_acknowledgement', 'Officer signature reference and date');
const categoryFinal = field('category.final', 'Final medical category / outcome');
const approvingAuthority = field(
  'actor.approving_authority',
  'Approving authority signature, rank and designation',
  'textarea',
);

const pmeEnt = section(
  'Additional ENT examination',
  field('ent.external_ear', 'External ear / wax'),
  field('ent.middle_ear', 'Tympanic membrane and Eustachian tube'),
  field('ent.inner_ear', 'Cochlea and vestibular apparatus'),
);

const pmeSpecialists = section(
  'Approving and perusing authorities',
  field('exam.board_place_date', 'Medical board place and date'),
  field('exam.board_member_1', 'Member-1'),
  field('exam.board_member_2', 'Member-2'),
  field('exam.board_president', 'President Medical Board'),
  field('exam.approving_authority_place', 'Approving authority place'),
  field('exam.approving_authority_date', 'Approving authority date', 'date'),
  approvingAuthority,
  field('exam.perusing_authority_place', 'Perusing authority place'),
  field('exam.perusing_authority_date', 'Perusing authority date', 'date'),
  field('actor.perusing_authority', 'Perusing authority signature, rank and designation', 'textarea'),
);

const agePme = section('Age', field('person.age_years', '8. Age (years)', 'number'), field('person.age_months', 'Age (months)', 'number'));
const ageAme = section('Age', field('person.age_years', '8. Age (years)', 'number'));
const pmeMedicine = section(
  '15 · Medicine',
  ...physicalCapacity.fields,
  ...cardiovascular.fields,
  respiratory,
  ...gastrointestinal.fields,
  ...cns.fields,
  ...commonLaboratory.fields,
  field('lab.urea', 'Urea (mg/dL)'),
  field('lab.creatinine', 'Creatinine (mg/dL)'),
  field('lab.uric_acid', 'Uric acid (mg/dL)'),
  field('diag.ecg_rest_dmt', 'ECG R / DMT number, date and report'),
  field('diag.ecg_tmt', 'ECG TMT number, date and report'),
  chestXray,
  field('clinical.medicine_remarks', 'Remarks', 'textarea'),
  field('exam.medicine_date', 'Date', 'date'),
  field('actor.medical_specialist', 'Signature of Medical Specialist'),
);
const pmePersonal = section(
  'Personal Data',
  ...personalService.fields,
  ...agePme.fields,
  personalHistory.fields[0],
  field('category.present', '13. Present medical category'),
  personalHistory.fields[1],
  officerAcknowledgement,
);
const continuationIdentity = section(
  'Continuation identity strip',
  personalService.fields[0],
  personalService.fields[1],
  personalService.fields[2],
  field('person.individual_signature', 'INDL SIGN'),
);
const pmeEyeSection = section('19 · Eye', ...eyeCommon.fields);
const pmeEntSection = section('20 · ENT', ...entCommon.fields, ...pmeEnt.fields);
const pmeFinal = section(
  'Final observations & medical category',
  finalObservations,
  personalHistory.fields[1],
  field('category.board_fitness', 'Found fit in medical category'),
  field('exam.place', 'Present PME carried out at'),
  field('category.final', 'Final medical category / outcome'),
  field('category.recommendation', 'Specialist / board recommendation', 'textarea'),
  field('exam.final_place', 'Place'),
  field('exam.final_date', 'Date', 'date'),
);

const amePersonal = section(
  'Personal Data',
  ...personalService.fields,
  ...ageAme.fields,
  personalHistory.fields[0],
  field('category.present', 'Present medical category'),
  field('category.effective_date', 'Present medical category effective date (wef)', 'date'),
  personalHistory.fields[1],
  personalHistory.fields[2],
  field('exam.previous_report_ref', 'Previous AME / PME report reference'),
  officerAcknowledgement,
);
const ameInvestigations = section(
  '16 · Investigations',
  ...commonLaboratory.fields,
  chestXray,
  field('diag.ecg', 'ECG number, date and report'),
);
const amePhysicalSystem = section(
  '17 · Physical Capacity and system examination',
  ...physicalCapacity.fields,
  ...cardiovascular.fields,
  respiratory,
  ...gastrointestinal.fields,
  ...cns.fields,
);
const ameHearing = section(
  '20 · Hearing',
  ...entCommon.fields.slice(0, 4),
  field('ent.tympanic_membrane_intact', 'Tympanic membrane intact (Y / N)', 'select', ['Yes', 'No']),
  field('ent.mobility_valsalva', 'Mobility (Valsalva)'),
  field('ent.nose', 'Nose findings', 'textarea'),
  field('ent.throat', 'Throat findings', 'textarea'),
  field('ent.sinuses', 'Sinus findings'),
);
const ameFinal = section(
  'Final observations & medical category',
  finalObservations,
  categoryFinal,
  field('category.recommendation', 'Specialist / board recommendation', 'textarea'),
  field('exam.final_place', 'Place'),
  field('exam.final_date', 'Date', 'date'),
);
const ameAuthorities = section(
  'Approving / perusing authority',
  field('actor.medical_attendant', 'Authorised Medical Attendant / Medical Specialist'),
  field('exam.approving_authority_place', 'Approving authority place'),
  field('exam.approving_authority_date', 'Approving authority date', 'date'),
  approvingAuthority,
  field('exam.perusing_authority_place', 'Perusing authority place'),
  field('exam.perusing_authority_date', 'Perusing authority date', 'date'),
  field('actor.perusing_authority', 'Perusing authority signature, rank and designation', 'textarea'),
);

export const FORM_PAGES: Record<ExaminationType, ExaminationPage[]> = {
  PME: [
    { number: 1, total: 3, title: 'AFMSF 3A · Page 1', sections: [examinationHeader, pmePersonal, pmeMedicine] },
    {
      number: 2, total: 3, title: 'AFMSF 3A · Page 2',
      sections: [
        section('16 · Surgery', ...locomotor.fields),
        section('17 · Gynaecology', ...gynaecology.fields),
        section('18 · Dental', ...dental.fields),
        pmeEyeSection,
      ],
    },
    {
      number: 3, total: 3, title: 'AFMSF 3A · Page 3', continuation: true, continuationIdentity: true,
      sections: [
        continuationIdentity,
        pmeEntSection,
        pmeFinal,
        section('Medical board signatures and authorities', ...pmeSpecialists.fields),
      ],
    },
  ],
  AME: [
    {
      number: 1, total: 2, title: 'AFMSF 3B · Page 1',
      sections: [
        examinationHeader,
        amePersonal,
        section('15 · Dental', ...dental.fields),
        ameInvestigations,
        amePhysicalSystem,
      ],
    },
    {
      number: 2, total: 2, title: 'AFMSF 3B · Page 2', continuation: true,
      sections: [
        section('18 · Surgery / Locomotor system', ...locomotor.fields.slice(0, 6)),
        section('19 · Vision', ...eyeCommon.fields.slice(0, 4)),
        ameHearing,
        section('21 · Gynaecological Examination', ...gynaecology.fields.slice(0, 9)),
        section('22 · Immunization', field('immunisation.record', 'Immunisation details', 'textarea')),
        ameFinal,
        ameAuthorities,
      ],
    },
  ],
};

export const FORM_SECTIONS: Record<ExaminationType, ExaminationSection[]> = {
  PME: FORM_PAGES.PME.flatMap(page => page.sections),
  AME: FORM_PAGES.AME.flatMap(page => page.sections),
};

export function blankExaminationValues(type: ExaminationType): Record<string, string> {
  return Object.fromEntries(
    FORM_SECTIONS[type].flatMap(group => group.fields).map(item => [item.key, '']),
  );
}

// This allow-list follows docs/CANONICAL-FIELD-DICTIONARY.md's PME-to-AME
// matrix. Form-only fields, role-specific signatures, and AME-only fields are
// intentionally excluded.
export const PME_TO_AME_FIELDS = [
  'exam.date',
  'exam.place',
  'exam.authority',
  'exam.officer_acknowledgement',
  'person.adn_personnel_number',
  'person.rank',
  'person.name',
  'person.unit_ship',
  'person.service',
  'person.arms_corps',
  'person.branch_trade',
  'person.date_of_birth',
  'person.sex',
  'person.commission_type',
  'person.commission_date',
  'person.total_service',
  'person.age_years',
  'clinical.past_medical_history',
  'clinical.final_observations',
  'category.present',
  'category.final',
  'exam.previous_ame_place',
  'exam.previous_ame_date',
  'obs.height',
  'obs.weight_actual',
  'obs.weight_ideal',
  'obs.overweight_percent',
  'obs.waist',
  'obs.chest_full_expiration',
  'obs.chest_expansion',
  'obs.pulse',
  'obs.blood_pressure',
  'obs.peripheral_pulsations',
  'obs.heart_size',
  'obs.heart_sounds',
  'obs.heart_rhythm',
  'obs.liver_palpable',
  'obs.spleen_palpable',
  'obs.hmf',
  'obs.speech',
  'obs.reflexes',
  'obs.tremors',
  'obs.self_balancing',
  'lab.hb',
  'lab.tlc',
  'lab.dlc_p',
  'lab.dlc_l',
  'lab.dlc_m',
  'lab.dlc_e',
  'lab.dlc_b',
  'lab.esr',
  'lab.urine_re',
  'lab.urine_me',
  'lab.urine_specific_gravity',
  'lab.urine_albumin',
  'lab.urine_sugar',
  'lab.glucose_fasting',
  'lab.glucose_2h_pp',
  'lab.cholesterol',
  'lab.triglycerides',
  'lab.hdl',
  'lab.vldl',
  'lab.ldl',
  'diag.chest_xray_pa',
  'exam.respiratory',
  'exam.locomotor',
  'exam.spine',
  'exam.hernia',
  'exam.hydrocele',
  'exam.haemorrhoids',
  'exam.breast',
  'exam.gynaecology.menstrual_history',
  'exam.gynaecology.lmp',
  'exam.gynaecology.pregnancies',
  'exam.gynaecology.abortions',
  'exam.gynaecology.children',
  'exam.gynaecology.last_confinement',
  'exam.gynaecology.vaginal_discharge',
  'exam.gynaecology.prolapse',
  'exam.gynaecology.usg_abdomen',
  'dental.missing_unsaveable_count',
  'dental.defective_teeth',
  'dental.dental_points',
  'dental.gum_condition',
  'dental.tooth_chart',
  'dental.remarks',
  'eye.distant_vision',
  'eye.near_vision',
  'eye.glasses_power',
  'eye.colour_perception',
  'eye.remarks',
  'ent.hearing',
  'ent.hearing_fw',
  'ent.hearing_cv',
  'ent.audiometry',
  'ent.nose',
  'ent.throat',
  'actor.dental_officer',
  'actor.approving_authority',
] as const;

export function makeBlankExamination(
  type: ExaminationType,
  examinationRef: string,
  templateRef: string,
) {
  return {
    type,
    date: '',
    place: '',
    authority: '',
    pastHistory: '',
    generalFindings: '',
    finalObservations: '',
    category: '',
    officer: '',
    examinationRef,
    templateRef,
    values: blankExaminationValues(type),
    provenance: {},
    savedAt: '',
    documentRef: '',
    documentCreatedAt: '',
    sourceExaminationRef: '',
    sourceTransactionRef: '',
  };
}
