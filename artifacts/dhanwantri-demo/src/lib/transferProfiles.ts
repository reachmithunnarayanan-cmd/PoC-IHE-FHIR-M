import { FORM_PAGES } from './afmsfForms';

export type TransferDirection = 'public-to-adn' | 'adn-to-public';
export type TransferProfile = {
  name: string;
  direction: TransferDirection;
  version: number;
  selectedFieldIds: string[];
  updatedBy: string;
  updatedAt: string;
};
export type TransferProfiles = Record<TransferDirection, TransferProfile>;
export type AppliedProfile = {
  name: string;
  direction: TransferDirection;
  version: number;
  mappingVersion: string;
  selectedFieldIds: string[];
  excludedFieldIds: string[];
  appliedBy: string;
  appliedAt: string;
};
export type TransferFieldDefinition = {
  id: string;
  label: string;
  group: string;
  paths: string[];
  lockedFor?: TransferDirection[];
  defaultExcludedFor?: TransferDirection[];
  enrichmentKey?: 'serviceNumber' | 'rank' | 'unit' | 'service';
  review?: boolean;
};

const lockedFromPublic = new Set([
  'person.adn_personnel_number', 'person.rank', 'person.unit_ship', 'person.service',
  'person.arms_corps', 'person.branch_trade', 'person.commission_type',
  'person.commission_date', 'person.total_service',
]);
const lockedFromAdn = new Set([
  ...lockedFromPublic,
  'category.present', 'category.effective_date', 'category.board_fitness',
  'category.final', 'category.recommendation', 'actor.medical_specialist',
  'actor.surgical_specialist', 'actor.gynaecologist', 'actor.dental_officer',
  'actor.eye_specialist', 'actor.ent_specialist', 'actor.medical_attendant',
  'actor.approving_authority', 'actor.perusing_authority',
  'exam.approving_authority_place', 'exam.approving_authority_date',
  'exam.perusing_authority_place', 'exam.perusing_authority_date',
  'exam.final_place', 'exam.final_date', 'exam.medicine_date', 'exam.surgery_date',
  'exam.gynaecology_date', 'exam.dental_date', 'exam.eye_date', 'exam.ent_date',
  'exam.board_place_date', 'exam.board_member_1',
  'exam.board_member_2', 'exam.board_president', 'exam.officer_acknowledgement',
  'exam.place', 'exam.authority',
  'person.individual_signature',
]);
const defaultExcludedFromAdn = new Set([
  'exam.previous_ame_place', 'exam.previous_ame_date', 'exam.previous_pme_place',
  'exam.previous_pme_date', 'exam.previous_report_ref',
]);

const field = (
  id: string,
  label: string,
  group: string,
  paths: string[],
  options: Pick<TransferFieldDefinition, 'lockedFor' | 'defaultExcludedFor' | 'enrichmentKey' | 'review'> = {},
): TransferFieldDefinition => ({ id, label, group, paths, ...options });

const patientFields: TransferFieldDefinition[] = [
  field('person.source_patient_id', 'Synthetic patient reference', 'Identity', ['patient.id']),
  field('person.name', 'Name', 'Identity', ['patient.name', 'examination.values[person.name]'], { review: true }),
  field('person.date_of_birth', 'Date of birth', 'Identity', ['patient.dob', 'examination.values[person.date_of_birth]']),
  field('person.sex', 'Sex', 'Identity', ['patient.sex', 'examination.values[person.sex]']),
  field('person.adn_personnel_number', 'ADN personnel number', 'Service', ['patient.serviceNumber', 'militaryFields.serviceNumber', 'examination.values[person.adn_personnel_number]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.rank', 'Rank', 'Service', ['patient.rank', 'militaryFields.rank', 'examination.values[person.rank]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.unit_ship', 'Unit / ship', 'Service', ['patient.unit', 'militaryFields.unit', 'examination.values[person.unit_ship]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.service', 'Service', 'Service', ['patient.service', 'militaryFields.service', 'examination.values[person.service]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.arms_corps', 'Arms / Corps / Arm', 'Service', ['examination.values[person.arms_corps]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.branch_trade', 'Branch / trade', 'Service', ['examination.values[person.branch_trade]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.commission_type', 'Commission type', 'Service', ['examination.values[person.commission_type]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.commission_date', 'Date of commission', 'Service', ['examination.values[person.commission_date]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.total_service', 'Total service', 'Service', ['examination.values[person.total_service]'], { lockedFor: ['public-to-adn', 'adn-to-public'] }),
  field('person.contact', 'Phone, email and address', 'Identity', ['patient.phone', 'patient.email', 'patient.address'], { review: true, defaultExcludedFor: ['adn-to-public'] }),
  field('clinical.encounter_date', 'Clinical encounter date', 'Encounter', ['encounter.date']),
  field('clinical.present_complaints', 'Presenting complaint', 'Encounter', ['encounter.complaint'], { review: true }),
  field('clinical.past_medical_history', 'Relevant history', 'History', ['encounter.history', 'examination.values[clinical.past_medical_history]'], { review: true }),
  field('clinical.general_observations', 'Examination findings', 'Observations', ['encounter.findings', 'examination.values[clinical.general_observations]'], { review: true }),
  field('clinical.assessment', 'Assessment', 'Encounter', ['encounter.assessment'], { review: true }),
  field('clinical.plan', 'Plan', 'Encounter', ['encounter.plan'], { review: true }),
  field('actor.clinician', 'Clinician', 'Authorities', ['encounter.clinician']),
  field('clinical.final_observations', 'Final observations', 'Observations', ['examination.values[clinical.final_observations]'], { review: true }),
];

const formFields = Object.values(FORM_PAGES)
  .flat()
  .flatMap(page => page.sections.flatMap(section => section.fields.map(item => ({
    id: item.key,
    label: item.label,
    group: section.title,
    path: `examination.values[${item.key}]`,
  }))))
  .filter((item, index, all) => all.findIndex(candidate => candidate.id === item.id) === index)
  .filter(item => !patientFields.some(existing => existing.id === item.id))
  .map(item => field(item.id, item.label, item.group, [
    ...(item.id === 'exam.place' ? ['examination.place'] : []),
    ...(item.id === 'exam.authority' ? ['examination.authority'] : []),
    ...(item.id === 'exam.date' ? ['examination.date'] : []),
    item.path,
  ], {
    lockedFor: lockedFromAdn.has(item.id) ? ['adn-to-public'] : undefined,
    defaultExcludedFor: defaultExcludedFromAdn.has(item.id) ? ['adn-to-public'] : undefined,
    review: item.id.startsWith('clinical.') || item.id.startsWith('exam.') || item.id.startsWith('category.'),
  }));

const enrichmentFields: TransferFieldDefinition[] = [
  field('enrichment.person.adn_personnel_number', 'ADN personnel number', 'Workstation enrichment', [], { enrichmentKey: 'serviceNumber', lockedFor: ['adn-to-public'] }),
  field('enrichment.person.rank', 'Rank', 'Workstation enrichment', [], { enrichmentKey: 'rank', lockedFor: ['adn-to-public'] }),
  field('enrichment.person.unit_ship', 'Unit / ship', 'Workstation enrichment', [], { enrichmentKey: 'unit', lockedFor: ['adn-to-public'] }),
  field('enrichment.person.service', 'Service', 'Workstation enrichment', [], { enrichmentKey: 'service', lockedFor: ['adn-to-public'] }),
];

export const TRANSFER_FIELDS: TransferFieldDefinition[] = [
  ...patientFields,
  ...formFields,
  ...enrichmentFields,
];

export const TRANSFER_GROUPS = [...new Set(TRANSFER_FIELDS.map(item => item.group))];
export const MAPPING_VERSION = '1.3';
export const DEMO_OPERATOR = 'Demo workstation operator';

export function createDefaultTransferProfiles(timestamp = new Date().toISOString()): TransferProfiles {
  const selectedFor = (direction: TransferDirection) => TRANSFER_FIELDS
    .filter(item => !item.lockedFor?.includes(direction))
    .map(item => item.id);
  return {
    'public-to-adn': {
      name: 'Public → ADN · Clinical ingest',
      direction: 'public-to-adn',
      version: 1,
      selectedFieldIds: selectedFor('public-to-adn'),
      updatedBy: DEMO_OPERATOR,
      updatedAt: timestamp,
    },
    'adn-to-public': {
      name: 'ADN → Public · Illustrative release',
      direction: 'adn-to-public',
      version: 1,
      selectedFieldIds: selectedFor('adn-to-public').filter(id => {
        const definition = TRANSFER_FIELDS.find(item => item.id === id);
        return !definition?.defaultExcludedFor?.includes('adn-to-public');
      }),
      updatedBy: DEMO_OPERATOR,
      updatedAt: timestamp,
    },
  };
}

export function normalizeTransferProfiles(value: unknown): TransferProfiles {
  const defaults = createDefaultTransferProfiles();
  if (!value || typeof value !== 'object') return defaults;
  const raw = value as Partial<Record<TransferDirection, Partial<TransferProfile>>>;
  const normalize = (direction: TransferDirection): TransferProfile => {
    const fallback = defaults[direction];
    const candidate = raw[direction];
    if (!candidate || !Array.isArray(candidate.selectedFieldIds)) return fallback;
    const allowed = new Set(TRANSFER_FIELDS.filter(item => !item.lockedFor?.includes(direction)).map(item => item.id));
    return {
      ...fallback,
      ...candidate,
      name: typeof candidate.name === 'string' ? candidate.name : fallback.name,
      direction,
      version: Number.isInteger(candidate.version) && (candidate.version ?? 0) > 0 ? candidate.version! : fallback.version,
      selectedFieldIds: [...new Set(candidate.selectedFieldIds.filter((id): id is string => typeof id === 'string' && allowed.has(id)))],
      updatedBy: typeof candidate.updatedBy === 'string' ? candidate.updatedBy : fallback.updatedBy,
      updatedAt: typeof candidate.updatedAt === 'string' ? candidate.updatedAt : fallback.updatedAt,
    };
  };
  return { 'public-to-adn': normalize('public-to-adn'), 'adn-to-public': normalize('adn-to-public') };
}

export function createAppliedProfile(profile: TransferProfile, timestamp = new Date().toISOString()): AppliedProfile {
  const locked = new Set(TRANSFER_FIELDS.filter(item => item.lockedFor?.includes(profile.direction)).map(item => item.id));
  const selected = new Set(profile.selectedFieldIds.filter(id => !locked.has(id)));
  const selectedFieldIds = TRANSFER_FIELDS.filter(item => selected.has(item.id)).map(item => item.id);
  return {
    name: profile.name,
    direction: profile.direction,
    version: profile.version,
    mappingVersion: MAPPING_VERSION,
    selectedFieldIds,
    excludedFieldIds: TRANSFER_FIELDS.filter(item => !selected.has(item.id)).map(item => item.id),
    appliedBy: DEMO_OPERATOR,
    appliedAt: timestamp,
  };
}

export function normalizeAppliedProfile(value: unknown): AppliedProfile | null {
  if (!value || typeof value !== 'object') return null;
  const raw = value as Partial<AppliedProfile>;
  if ((raw.direction !== 'public-to-adn' && raw.direction !== 'adn-to-public')
    || raw.mappingVersion !== MAPPING_VERSION
    || !Array.isArray(raw.selectedFieldIds)) return null;
  const locked = new Set(TRANSFER_FIELDS.filter(item => item.lockedFor?.includes(raw.direction!)).map(item => item.id));
  const selectedFieldIds = [...new Set(raw.selectedFieldIds
    .filter((id): id is string => typeof id === 'string' && TRANSFER_FIELDS.some(item => item.id === id) && !locked.has(id)))];
  const profile: TransferProfile = {
    name: typeof raw.name === 'string' ? raw.name : 'Saved transfer profile',
    direction: raw.direction,
    version: Number.isInteger(raw.version) && (raw.version ?? 0) > 0 ? raw.version! : 1,
    selectedFieldIds,
    updatedBy: typeof raw.appliedBy === 'string' ? raw.appliedBy : DEMO_OPERATOR,
    updatedAt: typeof raw.appliedAt === 'string' ? raw.appliedAt : new Date().toISOString(),
  };
  return createAppliedProfile(profile, profile.updatedAt);
}

function pathSegments(path: string): string[] {
  return path.match(/[^.[\]]+|\[[^\]]+\]/g)?.map(part => part.startsWith('[') ? part.slice(1, -1) : part) ?? [];
}

function readPath(source: unknown, path: string): unknown {
  return pathSegments(path).reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
}

function deletePath(target: unknown, path: string): void {
  const parts = pathSegments(path);
  let current = target as Record<string, unknown> | undefined;
  for (const part of parts.slice(0, -1)) {
    const next = current?.[part];
    if (!next || typeof next !== 'object') return;
    current = next as Record<string, unknown>;
  }
  if (current) delete current[parts[parts.length - 1]];
}

export function applyProfileToPackage<T extends Record<string, unknown>>(
  source: T,
  snapshot: AppliedProfile,
): { package: T; availableFieldIds: string[]; unavailableFieldIds: string[] } {
  const output = JSON.parse(JSON.stringify(source)) as T;
  const locked = new Set(TRANSFER_FIELDS.filter(item => item.lockedFor?.includes(snapshot.direction)).map(item => item.id));
  const selected = new Set(snapshot.selectedFieldIds.filter(id => !locked.has(id)));
  const availableFieldIds: string[] = [];
  const unavailableFieldIds: string[] = [];
  for (const definition of TRANSFER_FIELDS) {
    if (definition.enrichmentKey) continue;
    const present = definition.paths.some(path => {
      const value = readPath(source, path);
      return value !== undefined && value !== null && value !== '';
    });
    if (selected.has(definition.id) && present) availableFieldIds.push(definition.id);
    else if (selected.has(definition.id)) unavailableFieldIds.push(definition.id);
    if (!selected.has(definition.id)) definition.paths.forEach(path => deletePath(output, path));
  }
  return { package: output, availableFieldIds, unavailableFieldIds };
}

export function selectedEnrichmentKeys(snapshot: AppliedProfile): Set<string> {
  const selected = new Set(snapshot.selectedFieldIds);
  return new Set(TRANSFER_FIELDS
    .filter(item => item.enrichmentKey && selected.has(item.id) && !item.lockedFor?.includes(snapshot.direction))
    .map(item => item.enrichmentKey!));
}
