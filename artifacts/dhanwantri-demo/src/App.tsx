import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, BadgeCheck, ClipboardList,
  FileJson, FileText, FolderOpen, Plus, Printer, RotateCcw,
  ShieldAlert, ShieldCheck, Stethoscope, Trash2, Upload, UserRound, Workflow,
} from 'lucide-react';
import {
  blankExaminationValues, FORM_PAGES, makeBlankExamination, PME_TO_AME_FIELDS,
  type ExaminationType,
} from './lib/afmsfForms';
import {
  applyProfileToPackage, createAppliedProfile, createDefaultTransferProfiles,
  DEMO_OPERATOR, MAPPING_VERSION, normalizeAppliedProfile, normalizeTransferProfiles, selectedEnrichmentKeys,
  TRANSFER_FIELDS,
  type AppliedProfile, type TransferDirection, type TransferProfiles,
} from './lib/transferProfiles';

type Patient = {
  id: string; name: string; dob: string; sex: string; phone: string; email: string;
  address: string; serviceNumber: string; rank: string; unit: string; service: string;
};
type Encounter = {
  id: string; date: string; complaint: string; history: string; findings: string;
  assessment: string; plan: string; clinician: string;
};
type Provenance = { field: string; origin: 'captured' | 'imported' | 'enriched' | 'amended'; source: string; at: string };
type ExchangePackage = {
  kind: 'dhanwantri-exchange'; version: string; transactionId: string; source: string;
  destination: string; createdAt: string; profile: string; patient: Partial<Patient>;
  encounter: Partial<Encounter>; provenance: Provenance[]; militaryFields?: Record<string, string>;
  examination?: Examination;
  transferAudit?: {
    profile: AppliedProfile;
    availableFieldIds: string[];
    unavailableFieldIds: string[];
    action: 'pass' | 'add-enrich' | 'remove';
  };
};
type TransformationReport = {
  direction: string; transactionId: string; source: string; destination: string; operator: string; time: string;
  actions: string[]; warnings: string[]; result: string; exportStatus: string;
  selectedFields: string[]; excludedFields: string[]; unavailableFields: string[];
  profile: AppliedProfile;
};
type Examination = {
  type: ExaminationType; date: string; place: string; authority: string; pastHistory: string;
  generalFindings: string; finalObservations: string; category: string; officer: string;
  examinationRef: string; templateRef: string; provenance: Record<string, string>;
  values: Record<string, string>; savedAt: string; documentRef: string; documentCreatedAt: string;
  sourceExaminationRef: string; sourceTransactionRef: string;
};
type DemoState = {
  patient: Patient; encounter: Encounter; recordSaved: boolean; publicPackage: ExchangePackage | null;
  workstationPublicPackage: ExchangePackage | null;
  workstationPackage: ExchangePackage | null; adnPackage: ExchangePackage | null;
  adnOutboundPackage: ExchangePackage | null; publicReleasePackage: ExchangePackage | null;
  report: TransformationReport | null; examination: Examination; startedAt: string;
  transferProfiles: TransferProfiles; appliedProfile: AppliedProfile | null;
};

const STORAGE_KEY = 'dhanwantri-demo-state-v1';
const now = () => new Date().toISOString();
const makeId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
const blankExam = (type: ExaminationType = 'PME'): Examination => makeBlankExamination(
  type,
  makeId(type === 'PME' ? 'PME' : 'AME'),
  type === 'PME' ? 'AFMSF-3A-Ver-2002' : 'AFMSF-3B-Ver-2002',
);
const initialState = (): DemoState => ({
  patient: { id: 'IDH-SYN-2048', name: 'Aarav Sen', dob: '1992-08-14', sex: 'Male', phone: '', email: '', address: '', serviceNumber: '', rank: '', unit: '', service: '' },
  encounter: { id: makeId('ENC'), date: '', complaint: '', history: '', findings: '', assessment: '', plan: '', clinician: '' },
  recordSaved: false, publicPackage: null, workstationPublicPackage: null,
  workstationPackage: null, adnPackage: null,
  adnOutboundPackage: null, publicReleasePackage: null, report: null,
  examination: blankExam(), startedAt: now(),
  transferProfiles: createDefaultTransferProfiles(), appliedProfile: null,
});
function normalizeExamination(value: unknown): Examination {
  const raw = value && typeof value === 'object' ? value as Partial<Examination> & Record<string, unknown> : {};
  const type: ExaminationType = raw.type === 'AME' ? 'AME' : 'PME';
  const fallback = blankExam(type);
  const values = { ...blankExaminationValues(type) };
  const incomingValues = raw.values && typeof raw.values === 'object'
    ? raw.values as Record<string, unknown>
    : {};
  Object.entries(incomingValues).forEach(([key, fieldValue]) => {
    if (typeof fieldValue === 'string' && key in values) values[key] = fieldValue;
  });
  const legacyFields: Record<string, string> = {
    date: 'exam.date',
    place: 'exam.place',
    authority: 'exam.authority',
    pastHistory: 'clinical.past_medical_history',
    generalFindings: 'clinical.general_observations',
    finalObservations: 'clinical.final_observations',
    category: 'category.final',
    officer: 'exam.officer_acknowledgement',
  };
  Object.entries(legacyFields).forEach(([oldKey, newKey]) => {
    const oldValue = raw[oldKey];
    if (!values[newKey] && typeof oldValue === 'string' && oldValue) values[newKey] = oldValue;
  });
  const provenance = raw.provenance && typeof raw.provenance === 'object'
    ? Object.fromEntries(Object.entries(raw.provenance as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
    : {};
  Object.entries(legacyFields).forEach(([oldKey, newKey]) => {
    if (!provenance[newKey] && typeof provenance[oldKey] === 'string') provenance[newKey] = provenance[oldKey];
  });
  return {
    ...fallback,
    ...Object.fromEntries(['date', 'place', 'authority', 'pastHistory', 'generalFindings', 'finalObservations', 'category', 'officer']
      .map(key => [key, typeof raw[key] === 'string' ? raw[key] as string : ''])),
    type,
    examinationRef: typeof raw.examinationRef === 'string' && raw.examinationRef ? raw.examinationRef : fallback.examinationRef,
    templateRef: typeof raw.templateRef === 'string' && raw.templateRef ? raw.templateRef : fallback.templateRef,
    values,
    provenance,
    savedAt: typeof raw.savedAt === 'string' ? raw.savedAt : '',
    documentRef: typeof raw.documentRef === 'string' ? raw.documentRef : '',
    documentCreatedAt: typeof raw.documentCreatedAt === 'string' ? raw.documentCreatedAt : '',
    sourceExaminationRef: typeof raw.sourceExaminationRef === 'string' ? raw.sourceExaminationRef : '',
    sourceTransactionRef: typeof raw.sourceTransactionRef === 'string' ? raw.sourceTransactionRef : '',
  };
}
function loadState(): DemoState {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value) {
      const parsed = JSON.parse(value) as Partial<DemoState>;
      return {
        ...initialState(),
        ...parsed,
        examination: normalizeExamination(parsed.examination),
        transferProfiles: normalizeTransferProfiles(parsed.transferProfiles),
        appliedProfile: normalizeAppliedProfile(parsed.appliedProfile),
      };
    }
  } catch { /* recover with a clean local demo */ }
  return initialState();
}
function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  URL.revokeObjectURL(url);
}
function valueAtPath(source: unknown, path: string): unknown {
  const parts = path.match(/[^.[\]]+|\[[^\]]+\]/g)?.map(part => part.startsWith('[') ? part.slice(1, -1) : part) ?? [];
  return parts.reduce<unknown>((current, part) => {
    if (!current || typeof current !== 'object') return undefined;
    return (current as Record<string, unknown>)[part];
  }, source);
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}
function hasStringValues(value: Record<string, unknown>): boolean {
  return Object.values(value).every(item => typeof item === 'string');
}
function packageFieldIsPresent(source: unknown, path: string): boolean {
  const value = valueAtPath(source, path);
  return value !== undefined && value !== null && value !== '';
}
function readPackage(file: File, success: (pkg: ExchangePackage) => void, failure: (message: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const raw = JSON.parse(String(reader.result)) as unknown;
      if (
        !isRecord(raw)
        || raw.kind !== 'dhanwantri-exchange'
        || !isRecord(raw.patient)
        || !hasStringValues(raw.patient)
        || !isRecord(raw.encounter)
        || !hasStringValues(raw.encounter)
        || typeof raw.transactionId !== 'string' || !raw.transactionId
        || typeof raw.source !== 'string' || !raw.source
        || typeof raw.destination !== 'string' || !raw.destination
        || (raw.provenance !== undefined && (!Array.isArray(raw.provenance) || !raw.provenance.every(item => isRecord(item)
          && typeof item.field === 'string' && typeof item.source === 'string' && typeof item.at === 'string'
          && ['captured', 'enriched', 'amended', 'imported'].includes(String(item.origin)))))
        || (raw.militaryFields !== undefined && (!isRecord(raw.militaryFields) || !hasStringValues(raw.militaryFields)))
        || (raw.examination !== undefined && raw.examination !== null
          && (!isRecord(raw.examination)
            || !isRecord(raw.examination.values)
            || !hasStringValues(raw.examination.values)
            || !isRecord(raw.examination.provenance)
            || !hasStringValues(raw.examination.provenance)))
      ) throw new Error('This file is not a supported Dhanwantri demo exchange package.');
      const parsed = raw as unknown as ExchangePackage;
      success(parsed);
    } catch (error) { failure(error instanceof Error ? error.message : 'Could not read this package.'); }
  };
  reader.onerror = () => failure('The selected file could not be read.');
  reader.readAsText(file);
}
function prefillPatientFields(examination: Examination, pkg: ExchangePackage): Examination {
  const mappings: Array<[string, keyof Patient]> = [
    ['person.adn_personnel_number', 'serviceNumber'],
    ['person.rank', 'rank'],
    ['person.name', 'name'],
    ['person.unit_ship', 'unit'],
    ['person.service', 'service'],
    ['person.date_of_birth', 'dob'],
    ['person.sex', 'sex'],
  ];
  const values = { ...examination.values };
  const provenance = { ...examination.provenance };
  let changed = false;
  mappings.forEach(([formKey, patientKey]) => {
    const sourceValue = pkg.patient[patientKey];
    if (values[formKey]?.trim() || !sourceValue?.trim()) return;
    const source = pkg.provenance?.find(item => item.field === `patient.${patientKey}`);
    values[formKey] = sourceValue;
    provenance[formKey] = `${source?.origin === 'enriched' ? 'Workstation-enriched' : 'Imported'} · ${source?.source ?? `ADN ingest patient.${patientKey}`}`;
    changed = true;
  });
  return changed
    ? { ...examination, values, provenance, savedAt: '', documentRef: '', documentCreatedAt: '' }
    : examination;
}
function App() {
  const [state, setState] = useState<DemoState>(loadState);
  const [path, setLocation] = useLocation();
  const [notice, setNotice] = useState('');
  const [military, setMilitary] = useState({ serviceNumber: '', rank: '', unit: '', service: '' });
  const [importError, setImportError] = useState('');
  const [adnTab, setAdnTab] = useState<'record' | 'form'>('record');
  const [profileDirection, setProfileDirection] = useState<TransferDirection>('public-to-adn');
  const [profileSearch, setProfileSearch] = useState('');
  const [formPage, setFormPage] = useState(1);

  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }, [state]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(''), 3000);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const update = <K extends keyof DemoState>(key: K, value: DemoState[K]) => setState(previous => ({ ...previous, [key]: value }));
  const reset = () => {
    const fresh = initialState();
    setState(fresh);
    setMilitary({ serviceNumber: '', rank: '', unit: '', service: '' });
    setProfileDirection('public-to-adn');
    setProfileSearch('');
    setFormPage(1);
    setLocation('/');
    setNotice('Demo reset. A fresh synthetic patient is ready.');
  };
  const updateProfileField = (fieldId: string, selected: boolean) => {
    const profile = state.transferProfiles[profileDirection];
    const definition = TRANSFER_FIELDS.find(item => item.id === fieldId);
    if (!definition || definition.lockedFor?.includes(profileDirection)) return;
    const selectedIds = new Set(profile.selectedFieldIds);
    if (selected) selectedIds.add(fieldId);
    else selectedIds.delete(fieldId);
    update('transferProfiles', {
      ...state.transferProfiles,
      [profileDirection]: {
        ...profile,
        selectedFieldIds: [...selectedIds],
        version: profile.version + 1,
        updatedBy: DEMO_OPERATOR,
        updatedAt: now(),
      },
    });
    update('appliedProfile', null);
  };
  const updateProfileGroup = (group: string, selected: boolean) => {
    const profile = state.transferProfiles[profileDirection];
    const selectedIds = new Set(profile.selectedFieldIds);
    TRANSFER_FIELDS.filter(item => item.group === group && !item.lockedFor?.includes(profileDirection))
      .forEach(item => selected ? selectedIds.add(item.id) : selectedIds.delete(item.id));
    update('transferProfiles', {
      ...state.transferProfiles,
      [profileDirection]: {
        ...profile,
        selectedFieldIds: [...selectedIds],
        version: profile.version + 1,
        updatedBy: DEMO_OPERATOR,
        updatedAt: now(),
      },
    });
    update('appliedProfile', null);
  };
  const restoreProfileDefaults = () => {
    if (!window.confirm(`Restore the demo defaults for ${state.transferProfiles[profileDirection].name}?`)) return;
    const defaults = createDefaultTransferProfiles(now());
    const current = state.transferProfiles[profileDirection];
    update('transferProfiles', {
      ...state.transferProfiles,
      [profileDirection]: { ...defaults[profileDirection], version: current.version + 1 },
    });
    update('appliedProfile', null);
    setNotice('Demo profile defaults restored. Apply the profile before transforming.');
  };
  const applyTransferProfile = () => {
    const input = state.adnOutboundPackage ?? state.workstationPublicPackage;
    if (!input) {
      setNotice('Import a package before applying a transfer profile.');
      return;
    }
    const expectedDirection: TransferDirection = state.adnOutboundPackage ? 'adn-to-public' : 'public-to-adn';
    if (profileDirection !== expectedDirection) {
      setNotice('Choose the profile that matches the imported package direction.');
      return;
    }
    update('appliedProfile', createAppliedProfile(state.transferProfiles[profileDirection]));
    setNotice(`${state.transferProfiles[profileDirection].name} v${state.transferProfiles[profileDirection].version} applied to the next package.`);
  };
  const saveEncounter = (event: FormEvent) => {
    event.preventDefault();
    update('recordSaved', true);
    setNotice('Structured encounter saved locally.');
  };
  const exportPublic = () => {
    if (!state.recordSaved) { setNotice('Save the structured encounter before exporting.'); return; }
    const pkg: ExchangePackage = {
      kind: 'dhanwantri-exchange', version: '1.0', transactionId: makeId('TXN'),
      source: 'i-Dhanwantri', destination: 'Secure Data Exchange Workstation',
      createdAt: now(), profile: 'FHIR-inspired clinical exchange · PoC v1',
      patient: { ...state.patient }, encounter: { ...state.encounter },
      provenance: [
        ...Object.entries(state.patient).filter(([, value]) => Boolean(value)).map(([field]) => ({ field: `patient.${field}`, origin: 'captured' as const, source: 'i-Dhanwantri synthetic registration', at: now() })),
        ...Object.entries(state.encounter).filter(([, value]) => Boolean(value)).map(([field]) => ({ field: `encounter.${field}`, origin: 'captured' as const, source: 'i-Dhanwantri structured encounter', at: now() })),
      ],
    };
    update('publicPackage', pkg);
    downloadJson(`${pkg.transactionId}-public-exchange.json`, pkg);
    setNotice('Public-side package exported as JSON.');
  };
  const importWorkstation = (file: File) => readPackage(file, pkg => {
    const fromAdn = pkg.source === 'Dhanwantri 3.0 ADN';
    if (!fromAdn && pkg.source !== 'i-Dhanwantri') {
      setImportError('Choose a package exported by i-Dhanwantri or Dhanwantri 3.0 ADN.');
      return;
    }
    if (fromAdn) {
      update('adnOutboundPackage', pkg);
      update('workstationPublicPackage', null);
      update('publicReleasePackage', null);
      setProfileDirection('adn-to-public');
    } else {
      update('workstationPublicPackage', pkg);
      update('adnOutboundPackage', null);
      update('publicReleasePackage', null);
      update('adnPackage', null);
      setProfileDirection('public-to-adn');
    }
    update('workstationPackage', null);
    update('report', null);
    update('appliedProfile', null);
    setImportError('');
    setNotice(fromAdn
      ? 'ADN-origin package imported for public-side sanitisation.'
      : 'Public-side package imported for ADN mapping.');
  }, setImportError);
  const transform = (operation: 'add' | 'strip') => {
    const source = operation === 'add' ? state.workstationPublicPackage : state.adnOutboundPackage;
    const direction: TransferDirection = operation === 'add' ? 'public-to-adn' : 'adn-to-public';
    if (!source) {
      setNotice(operation === 'add'
        ? 'Import a public-side package before adding ADN fields.'
        : 'Import an ADN-origin package before stripping fields.');
      return;
    }
    if (!state.appliedProfile || state.appliedProfile.direction !== direction) {
      setNotice('Apply the matching direction profile before creating an outgoing package.');
      return;
    }
    const appliedProfile = state.appliedProfile;
    const projected = applyProfileToPackage(
      source as unknown as Record<string, unknown>,
      appliedProfile,
    );
    const preparedSource = projected.package as unknown as ExchangePackage;
    const selectedEnrichment = selectedEnrichmentKeys(appliedProfile);
    const enrichmentFieldIds = TRANSFER_FIELDS
      .filter(item => item.enrichmentKey && selectedEnrichment.has(item.enrichmentKey))
      .map(item => item.id);
    const availableEnrichment = enrichmentFieldIds.filter(id => {
      const definition = TRANSFER_FIELDS.find(item => item.id === id);
      const value = definition?.enrichmentKey ? military[definition.enrichmentKey] : '';
      return Boolean(value?.trim());
    });
    const unavailableEnrichment = enrichmentFieldIds.filter(id => !availableEnrichment.includes(id));
    const unavailableFields = [...projected.unavailableFieldIds, ...unavailableEnrichment];
    const actions: string[] = [
      `Applied ${appliedProfile.name} · profile v${appliedProfile.version} · mapping v${appliedProfile.mappingVersion}.`,
      `${projected.availableFieldIds.length + availableEnrichment.length} selected source/enrichment fields are available; ${unavailableFields.length} selected fields are unavailable.`,
      'Deselecting fields affected only this outgoing copy; the imported source package remains unchanged.',
    ];
    let militaryFields: Record<string, string> = {};
    let patient: Partial<Patient> = { ...preparedSource.patient };
    let provenance = [...(preparedSource.provenance ?? [])].filter(item => {
      if (item.field.startsWith('patient.') || item.field.startsWith('encounter.')) {
        return packageFieldIsPresent(preparedSource, item.field);
      }
      return true;
    });
    let examination = preparedSource.examination
      ? { ...preparedSource.examination, values: { ...preparedSource.examination.values }, provenance: { ...preparedSource.examination.provenance } }
      : undefined;
    if (examination) {
      Object.keys(examination.provenance).forEach(key => {
        if (!appliedProfile.selectedFieldIds.includes(key)) delete examination!.provenance[key];
      });
    }
    if (operation === 'add') {
      militaryFields = Object.fromEntries(Object.entries(military)
        .filter(([key, value]) => selectedEnrichment.has(key) && value.trim())
        .map(([key, value]) => [key, value.trim()]));
      patient = { ...patient, ...militaryFields };
      Object.keys(militaryFields).forEach(field => provenance.push({ field: `patient.${field}`, origin: 'enriched', source: 'Workstation operator entry', at: now() }));
      if (examination) {
        const formKeys: Record<string, string> = {
          serviceNumber: 'person.adn_personnel_number',
          rank: 'person.rank',
          unit: 'person.unit_ship',
          service: 'person.service',
        };
        Object.entries(militaryFields).forEach(([key, value]) => {
          const formKey = formKeys[key];
          if (!formKey) return;
          examination!.values[formKey] = value;
          examination!.provenance[formKey] = 'Workstation-enriched · operator entry';
        });
      }
      actions.push(Object.keys(militaryFields).length
        ? `Add MII/PII: enriched ${Object.keys(militaryFields).join(', ')} on the outgoing copy.`
        : 'Add MII/PII: no selected workstation-enrichment values were populated.');
    } else {
      militaryFields = {};
      actions.push(`Strip MII/PII: excluded ${appliedProfile.excludedFieldIds.length} fields from the outgoing copy; locked military and authority fields remain excluded.`);
    }
    const presentAvailable = new Set(projected.availableFieldIds);
    availableEnrichment.forEach(id => presentAvailable.add(id));
    const selectedFields = appliedProfile.selectedFieldIds;
    actions.push(`Field selection: ${selectedFields.length} selected, ${appliedProfile.excludedFieldIds.length} excluded, ${unavailableFields.length} selected but unavailable.`);
    const outgoingTransactionId = makeId('TXN');
    const report: TransformationReport = {
      direction: operation === 'add' ? 'Public → ADN · Add MII/PII' : 'ADN → Public · Strip MII/PII',
      transactionId: outgoingTransactionId,
      source: source.source,
      destination: operation === 'add' ? 'Dhanwantri 3.0 ADN' : 'i-Dhanwantri public side',
      operator: DEMO_OPERATOR, time: now(), actions,
      warnings: [
        'Illustrative PoC rules only; not an approved sanitisation policy.',
        'FHIR-inspired label is representational and does not claim FHIR or ABDM conformance.',
        'Missing clinical values were left blank. Review free text for identifiers before any real release.',
      ],
      result: 'Outgoing copy prepared · not standards-validated',
      exportStatus: 'Prepared · JSON not yet exported',
      selectedFields: [...selectedFields],
      excludedFields: [...appliedProfile.excludedFieldIds],
      unavailableFields,
      profile: appliedProfile,
    };
    const out: ExchangePackage = {
      ...preparedSource,
      transactionId: outgoingTransactionId,
      source: 'Secure Data Exchange Workstation',
      destination: report.destination,
      createdAt: now(),
      profile: `${appliedProfile.name} · profile v${appliedProfile.version}`,
      patient,
      provenance,
      militaryFields,
      examination,
      transferAudit: {
        profile: appliedProfile,
        availableFieldIds: [...presentAvailable],
        unavailableFieldIds: unavailableFields,
        action: operation === 'add' ? 'add-enrich' : 'remove',
      },
    };
    update('workstationPackage', out);
    if (operation === 'add') {
      update('publicReleasePackage', null);
    } else {
      update('publicReleasePackage', out);
    }
    update('report', report);
    setNotice(operation === 'add' ? 'Add MII/PII operation recorded.' : 'Strip MII/PII operation recorded on the outgoing copy.');
  };
  const importAdn = (file: File) => readPackage(file, pkg => {
    if (pkg.destination !== 'Dhanwantri 3.0 ADN') {
      setImportError('Choose an ADN ingest package exported by the workstation.');
      return;
    }
    update('adnPackage', pkg);
    update('adnOutboundPackage', null);
    update('publicReleasePackage', null);
    const sourceExamination = pkg.examination ? normalizeExamination(pkg.examination) : state.examination;
    update('examination', prefillPatientFields(sourceExamination, pkg));
    setFormPage(1);
    setImportError('');
    setNotice('ADN ingest package imported. Field provenance is available below.');
    setAdnTab('record');
  }, setImportError);
  const exportAdn = () => {
    if (!state.workstationPackage) { setNotice('Run an explicit workstation transformation before exporting.'); return; }
    downloadJson(`${state.workstationPackage.transactionId}-adn-ingest.json`, state.workstationPackage);
    if (state.report) update('report', { ...state.report, exportStatus: 'Exported as ADN-ingest JSON' });
    setNotice('ADN ingest package exported as JSON.');
  };
  const exportAdnForSanitisation = () => {
    if (!state.adnPackage) { setNotice('Import an ADN ingest package before preparing an outbound package.'); return; }
    const pkg: ExchangePackage = {
      ...state.adnPackage,
      transactionId: makeId('TXN'),
      source: 'Dhanwantri 3.0 ADN',
      destination: 'Secure Data Exchange Workstation',
      createdAt: now(),
      profile: 'ADN outbound package · awaiting workstation sanitisation',
      examination: { ...state.examination },
    };
    downloadJson(`${pkg.transactionId}-adn-outbound.json`, pkg);
    setNotice('ADN outbound package exported. Import it at the workstation for sanitisation.');
  };
  const exportPublicRelease = () => {
    if (!state.publicReleasePackage) { setNotice('Run Strip MII/PII before exporting the public package.'); return; }
    downloadJson(`${state.publicReleasePackage.transactionId}-public-release.json`, state.publicReleasePackage);
    if (state.report) update('report', { ...state.report, exportStatus: 'Exported as public-release JSON' });
    setNotice('Sanitised public-side package exported as JSON.');
  };
  const updatePatient = (field: keyof Patient, value: string) => update('patient', { ...state.patient, [field]: value });
  const updateEncounter = (field: keyof Encounter, value: string) => {
    update('encounter', { ...state.encounter, [field]: value });
    update('recordSaved', false);
  };
  const updateExam = (field: string, value: string) => {
    const provenance = { ...state.examination.provenance, [field]: 'ADN-entered / amended' };
    const values = { ...state.examination.values, [field]: value };
    if (field === 'dental.tooth_chart') {
      let markings: Record<string, string> = {};
      try {
        const parsed = JSON.parse(value) as unknown;
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          markings = Object.fromEntries(Object.entries(parsed as Record<string, unknown>)
            .filter((entry): entry is [string, string] => typeof entry[1] === 'string' && ['-', 'x'].includes(entry[1])));
        }
      } catch { /* retain a typed manual value until the chart is changed again */ }
      values['dental.missing_unsaveable_count'] = Object.keys(markings).length ? String(Object.keys(markings).length) : '';
      provenance['dental.missing_unsaveable_count'] = 'Derived from dental chart markings';
    }
    update('examination', {
      ...state.examination,
      values,
      provenance,
      savedAt: '',
      documentRef: '',
      documentCreatedAt: '',
    });
  };
  const selectPme = () => {
    if (state.examination.type === 'PME') return;
    update('examination', blankExam('PME'));
    setFormPage(1);
    setNotice('Started a blank PME record. No AME-only values were carried back.');
  };
  const saveExamination = () => {
    update('examination', { ...state.examination, savedAt: now(), documentRef: '', documentCreatedAt: '' });
    setNotice('Structured examination record saved locally.');
  };
  const printExamination = () => {
    if (!state.examination.savedAt) {
      setNotice('Save the structured examination record before printing.');
      return;
    }
    update('examination', {
      ...state.examination,
      documentRef: makeId('DOC'),
      documentCreatedAt: now(),
    });
    window.setTimeout(() => window.print(), 50);
  };
  const createAmE = () => {
    const old = state.examination;
    const projected = blankExam('AME');
    const values = { ...projected.values };
    const provenance: Record<string, string> = {};
    PME_TO_AME_FIELDS.forEach(key => {
      const sourceValue = old.values[key]?.trim();
      if (!sourceValue) return;
      values[key] = old.values[key];
      provenance[key] = `Projected from PME ${old.examinationRef} · ${old.provenance[key] ?? key}`;
    });
    const pmeRestEcg = old.values['diag.ecg_rest_dmt']?.trim();
    if (pmeRestEcg) {
      values['diag.ecg'] = `PME R / DMT: ${pmeRestEcg}`;
      provenance['diag.ecg'] = `Projected from PME ${old.examinationRef} · diag.ecg_rest_dmt`;
    }
    projected.values = values;
    projected.provenance = provenance;
    projected.sourceExaminationRef = old.examinationRef;
    projected.sourceTransactionRef = state.adnPackage?.transactionId ?? '';
    update('examination', projected);
    setFormPage(1);
    setAdnTab('form');
    const ameFields = [...new Map(FORM_PAGES.AME.flatMap(page => page.sections.flatMap(group => group.fields)).map(item => [item.key, item])).values()];
    const blankCount = ameFields.filter(item => !projected.values[item.key]?.trim()).length;
    setNotice(`AME draft created; ${blankCount} fields remain blank for review or separate completion.`);
  };
  const currentPortal = path.startsWith('/workstation') ? 'workstation' : path.startsWith('/adn') ? 'adn' : 'public';
  const patientPackage = state.adnPackage;
  const workstationInput = state.adnOutboundPackage ?? state.workstationPublicPackage;
  const patient = patientPackage?.patient ?? state.patient;
  const encounter = patientPackage?.encounter ?? state.encounter;
  const provenanceFor = (field: string) => patientPackage?.provenance?.find(item => item.field === field);
  const activeFormPages = FORM_PAGES[state.examination.type];
  const activeFormPage = activeFormPages.find(page => page.number === formPage) ?? activeFormPages[0];
  const allFormFields = [...new Map(activeFormPages.flatMap(page => page.sections.flatMap(group => group.fields)).map(item => [item.key, item])).values()];
  const blankFormFieldCount = allFormFields.filter(item => !state.examination.values[item.key]?.trim()).length;
  const profile = state.transferProfiles[profileDirection];
  const profileSelected = new Set(profile.selectedFieldIds);
  const matchingFields = TRANSFER_FIELDS.filter(item => (
    (!profileSearch || `${item.label} ${item.id} ${item.group}`.toLowerCase().includes(profileSearch.toLowerCase()))
  ));
  const profileInput = state.adnOutboundPackage ?? state.workstationPublicPackage;
  const profileUnavailable = profileInput
    ? TRANSFER_FIELDS.filter(item => {
      if (!profileSelected.has(item.id)) return false;
      return item.enrichmentKey
        ? !military[item.enrichmentKey].trim()
        : !item.paths.some(path => packageFieldIsPresent(profileInput, path));
    })
    : [];
  const requiredTransferFields = workstationInput ? [
    ['patient.id', workstationInput.patient.id],
    ['patient.name', workstationInput.patient.name],
    ['encounter.id', workstationInput.encounter.id],
    ['encounter.date', workstationInput.encounter.date],
  ].filter(([, value]) => !String(value ?? '').trim()).map(([field]) => String(field)) : [];
  const expectedProfileDirection: TransferDirection | null = state.adnOutboundPackage
    ? 'adn-to-public'
    : state.workstationPublicPackage ? 'public-to-adn' : null;
  const profileDirectionMismatch = Boolean(expectedProfileDirection && profileDirection !== expectedProfileDirection);
  const profileLocked = matchingFields.filter(item => item.lockedFor?.includes(profileDirection)).length;

  return (
    <div className={`app-shell portal-${currentPortal}`}>
      <Switch>
        <Route path="/">
          <header className="topbar">
            <div className="brandlock"><div className="brandmark">iD</div><div><div className="brandname">i-Dhanwantri · Dhanwantri 3.0 ADN</div><div className="brandmeta">Interoperability proof of concept</div></div></div>
            <span className="demo-chip">DEMO / SYNTHETIC DATA</span>
          </header>
          <main className="page-wrap">
            <section className="hero-start surface">
              <div className="eyebrow">Empowered committee demonstration · Local-only PoC</div>
              <h1>i-Dhanwantri<br />↔ Dhanwantri 3.0 ADN</h1>
              <p>A synthetic clinical record moves through the Secure Data Exchange Workstation for review, mapping, enrichment, and manual package transfer.</p>
              <div className="btn-row">
                <Link href="/idh" className="btn btn-primary" data-testid="link-start-idh"><Stethoscope size={15} /> Open i-Dhanwantri <ArrowRight size={15} /></Link>
                <button className="btn" onClick={reset} data-testid="button-reset-demo"><RotateCcw size={14} /> Reset / replay</button>
              </div>
              <div className="signature">IDH-2048 · SYNTHETIC CASE · LOCAL BROWSER STORAGE</div>
            </section>
            <div className="flowline" aria-label="Journey status">
              <div className={`flowstep ${state.recordSaved ? 'done' : 'current'}`}><span className="step-no">01 — CAPTURE</span><b>i-Dhanwantri</b><span>{state.recordSaved ? 'Structured record saved' : 'Registration and encounter'}</span></div>
              <div className={`flowstep ${state.workstationPackage ? 'done' : state.workstationPublicPackage || state.adnOutboundPackage ? 'current' : ''}`}><span className="step-no">02 — TRANSFORM</span><b>Exchange Workstation</b><span>{state.publicReleasePackage ? 'Sanitised public package ready' : state.workstationPackage ? 'Report recorded · package ready' : state.workstationPublicPackage ? 'Public package imported' : state.adnOutboundPackage ? 'ADN package imported' : state.publicPackage ? 'Public package exported · import next' : 'Import, validate, map'}</span></div>
              <div className={`flowstep ${state.adnPackage ? 'done' : ''}`}><span className="step-no">03 — REUSE</span><b>Dhanwantri 3.0 ADN</b><span>{state.adnPackage ? 'Package available for examination' : 'Import and complete AFMSF form'}</span></div>
            </div>
            <div className="journey-layout">
              <div className="grid-three">
                <article className="surface portal-card public-card"><span className="card-number">PORTAL 01 / PUBLIC SIDE</span><h3>i-Dhanwantri</h3><p>Register the synthetic patient, capture one structured encounter, then export its exchange package.</p><Link href="/idh">Open clinical workspace →</Link></article>
                <article className="surface portal-card ws-card"><span className="card-number">PORTAL 02 / CONTROLLED WORKSTATION</span><h3>Secure Data Exchange</h3><p>Inspect source fields, run a distinct transformation and retain a human-readable operator report.</p><Link href="/workstation">Open transfer console →</Link></article>
                <article className="surface portal-card adn-card"><span className="card-number">PORTAL 03 / ADN SIDE</span><h3>Dhanwantri 3.0 ADN</h3><p>Import the receiving package, inspect field provenance and complete a PME or AME demo form.</p><Link href="/adn">Open medical record →</Link></article>
              </div>
              <aside className="surface panel-pad">
                <div className="eyebrow">Journey checkpoint</div><h2 className="section-title" style={{ marginTop: 8 }}>Current demo state</h2>
                <div className="record-row"><div><div className="record-label">Synthetic patient</div><div className="record-value">{state.patient.name}</div></div><span className="tag">REGISTERED</span></div>
                <div className="record-row"><div><div className="record-label">Clinical record</div><div className="record-value">{state.recordSaved ? 'Saved' : 'Not yet saved'}</div></div><Activity size={16} /></div>
                <div className="record-row"><div><div className="record-label">Exchange transaction</div><div className="record-value mono">{state.publicReleasePackage?.transactionId ?? state.workstationPackage?.transactionId ?? workstationInput?.transactionId ?? state.publicPackage?.transactionId ?? '—'}</div></div><ArrowLeftRight size={16} /></div>
                <div className="muted-note" style={{ marginTop: 16 }}>Local browser demo only. Package movement is an explicit JSON download and import, not a real network connection.</div>
              </aside>
            </div>
            <p className="signature">FHIR-INSPIRED REPRESENTATION · NOT FORMALLY FHIR / ABDM CONFORMANT</p>
          </main>
        </Route>
        <Route path="/idh">
          <PortalHeader active="idh" />
          <main className="page-wrap">
            <PageHeading kicker="Internet-side HIS · Clinical capture" title="Patient registration and clinical encounter" description="Synthetic patient registration and encounter capture. Save the structured record before creating a package for the workstation." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                  <div className="eyebrow">01 / Patient registration</div><h2 className="section-title" style={{ marginTop: 8 }}>Synthetic patient</h2><p className="section-sub">Pre-seeded demo identity. Edit or register the synthetic demographics used throughout this browser session.</p>
                  <div className="field-grid">
                    <Field label="Patient name" value={state.patient.name} onChange={v => updatePatient('name', v)} testId="input-patient-name" />
                    <Field label="Synthetic patient reference" value={state.patient.id} onChange={v => updatePatient('id', v)} testId="input-patient-id" />
                    <Field label="Date of birth" type="date" value={state.patient.dob} onChange={v => updatePatient('dob', v)} testId="input-patient-dob" />
                    <Field label="Sex" value={state.patient.sex} onChange={v => updatePatient('sex', v)} testId="input-patient-sex" />
                    <Field label="Contact phone" value={state.patient.phone} onChange={v => updatePatient('phone', v)} testId="input-patient-phone" />
                    <Field label="Email" value={state.patient.email} onChange={v => updatePatient('email', v)} testId="input-patient-email" />
                    <Field label="Address" value={state.patient.address} onChange={v => updatePatient('address', v)} testId="input-patient-address" full />
                  </div>
                </section>
                <form className="surface panel-pad" style={{ marginTop: 16 }} onSubmit={saveEncounter}>
                  <div className="eyebrow">02 / Structured encounter</div><h2 className="section-title" style={{ marginTop: 8 }}>Clinical note · {state.encounter.id}</h2><p className="section-sub">Only documented information is included. Unknown and unsupported values remain blank.</p>
                  <div className="field-grid">
                    <Field label="Clinical date" type="date" value={state.encounter.date} onChange={v => updateEncounter('date', v)} testId="input-encounter-date" />
                    <Field label="Clinician" value={state.encounter.clinician} onChange={v => updateEncounter('clinician', v)} testId="input-encounter-clinician" />
                    <Field label="Presenting complaint" value={state.encounter.complaint} onChange={v => updateEncounter('complaint', v)} testId="input-encounter-complaint" full multiline />
                    <Field label="Relevant history" value={state.encounter.history} onChange={v => updateEncounter('history', v)} testId="input-encounter-history" full multiline />
                    <Field label="Examination findings" value={state.encounter.findings} onChange={v => updateEncounter('findings', v)} testId="input-encounter-findings" full multiline />
                    <Field label="Assessment" value={state.encounter.assessment} onChange={v => updateEncounter('assessment', v)} testId="input-encounter-assessment" full multiline />
                    <Field label="Plan" value={state.encounter.plan} onChange={v => updateEncounter('plan', v)} testId="input-encounter-plan" full multiline />
                  </div>
                  <div className="btn-row" style={{ marginTop: 18 }}>
                    <button className="btn btn-primary" type="submit" data-testid="button-save-record"><BadgeCheck size={15} /> Save structured record</button>
                    {state.recordSaved && <span className="tag" data-testid="status-record-saved">SAVED · {state.encounter.id}</span>}
                  </div>
                </form>
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">03 / Export centre</div><h2 className="section-title" style={{ marginTop: 8 }}>Purpose-specific output</h2><p className="section-sub">Create an explicit JSON package for manual import into the workstation.</p>
                  <div className="record-row"><div><div className="record-label">Interchange artifact</div><div className="record-value">FHIR-inspired JSON package</div></div><FileJson size={17} /></div>
                  <div className="record-row"><div><div className="record-label">Profile label</div><div className="record-value">PoC clinical exchange · v1</div></div><span className="tag">REPRESENTATIONAL</span></div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={exportPublic} disabled={!state.recordSaved} data-testid="button-export-public"><ArrowDownToLine size={15} /> Export for ADN workstation</button>
                  {!state.recordSaved && <p className="section-sub" style={{ margin: '10px 0 0' }}>Save the encounter to enable package export.</p>}
                  {state.publicPackage && <div className="muted-note" style={{ marginTop: 16 }}>Latest package · <span className="mono">{state.publicPackage.transactionId}</span><br />Download this file, then import it on the workstation.</div>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">Saved record snapshot</div><div className="record-row"><div><div className="record-label">Patient / encounter</div><div className="record-value">{state.patient.name} · {state.encounter.id}</div></div><ClipboardList size={16} /></div>
                  <div className="record-row"><div><div className="record-label">Complaint</div><div className="record-value">{state.encounter.complaint || '—'}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Assessment</div><div className="record-value">{state.encounter.assessment || '—'}</div></div></div>
                </section>
              </aside>
            </div>
            <div className="muted-note" style={{ marginTop: 18 }}>FHIR-inspired only. This demo does not validate against a formal FHIR version or ABDM profile. PDFs and rendered documents are not the interchange master.</div>
          </main>
        </Route>
        <Route path="/workstation">
          <PortalHeader active="workstation" />
          <main className="page-wrap">
            <PageHeading kicker="Transfer control · Operator workspace" title="Package review and transfer configuration" description="Import a public-side package, inspect supported fields, then record an explicit Add or Strip MII/PII operation. These controls demonstrate a workflow; they are not a security boundary." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                  <div className="eyebrow">01 / Inbound package</div><h2 className="section-title" style={{ marginTop: 8 }}>Import a transfer package</h2><p className="section-sub">Import a public-side package for ADN, or an ADN outbound package for public-side sanitisation. No direct connection is made.</p>
                  <PackageImporter onFile={importWorkstation} />
                  {importError && <div className="muted-note" role="alert" style={{ marginTop: 12, borderColor: '#b75a4f' }}>{importError}</div>}
                  {workstationInput && <div style={{ marginTop: 16 }}>
                    <div className="record-row"><div><div className="record-label">Transaction / received</div><div className="record-value mono">{workstationInput.transactionId} · {new Date(workstationInput.createdAt).toLocaleString()}</div></div><span className="tag">IMPORTED</span></div>
                    <div className="record-row"><div><div className="record-label">Source → destination</div><div className="record-value">{workstationInput.source} → Secure Data Exchange Workstation</div></div></div>
                    <div className="record-row"><div><div className="record-label">Schema/profile label</div><div className="record-value">{workstationInput.profile}</div></div></div>
                  </div>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">02 / Validation and mapping</div><h2 className="section-title" style={{ marginTop: 8 }}>Supported fields</h2><p className="section-sub">A readable mapping view of package content. Absent source values are reported as blank.</p>
                  {workstationInput ? <>
                    <div className={`validation-panel ${requiredTransferFields.length ? 'has-warnings' : 'is-valid'}`} role="status" data-testid="status-package-validation">
                      <b>Package structure valid</b>
                      <span>{requiredTransferFields.length ? `${requiredTransferFields.length} expected demo value${requiredTransferFields.length === 1 ? '' : 's'} missing; nothing will be invented.` : 'All expected demo values are present.'}</span>
                      {requiredTransferFields.length > 0 && <small>Missing: {requiredTransferFields.join(', ')}</small>}
                    </div>
                    <MappingTable pkg={workstationInput} />
                  </> : <EmptyState icon={<FolderOpen size={19} />} title="No package loaded" body="Import a JSON exchange package to review mapping and field availability." />}
                </section>
                <section className="surface panel-pad transfer-profile-panel" style={{ marginTop: 16 }}>
                  <div className="eyebrow">03 / Direction-specific configuration</div>
                  <h2 className="section-title" style={{ marginTop: 8 }}>Transfer profile</h2>
                  <p className="section-sub">Selections are saved independently for each direction. Excluded fields are omitted from the outgoing copy; the imported source is unchanged.</p>
                  <div className="profile-tabs" role="tablist" aria-label="Transfer direction">
                    <button type="button" role="tab" aria-selected={profileDirection === 'public-to-adn'} className={profileDirection === 'public-to-adn' ? 'active' : ''} onClick={() => { setProfileDirection('public-to-adn'); update('appliedProfile', null); }} data-testid="tab-profile-public-adn">Public → ADN</button>
                    <button type="button" role="tab" aria-selected={profileDirection === 'adn-to-public'} className={profileDirection === 'adn-to-public' ? 'active' : ''} onClick={() => { setProfileDirection('adn-to-public'); update('appliedProfile', null); }} data-testid="tab-profile-adn-public">ADN → Public</button>
                  </div>
                  <div className="profile-meta">
                    <div><b>{profile.name}</b><span>Profile v{profile.version} · Mapping v{MAPPING_VERSION}</span></div>
                    <div><span>Updated by {profile.updatedBy}</span><span>{new Date(profile.updatedAt).toLocaleString()}</span></div>
                  </div>
                  <div className="profile-counts">
                    <span>{profile.selectedFieldIds.length} selected</span>
                    <span>{TRANSFER_FIELDS.length - profile.selectedFieldIds.length} excluded or locked</span>
                    <span>{profileInput ? `${profileUnavailable.length} selected but unavailable` : 'Import package to check availability'}</span>
                  </div>
                  <label className="profile-search">
                    <span>Search fields</span>
                    <input type="search" value={profileSearch} onChange={event => setProfileSearch(event.target.value)} placeholder="Label, group, or canonical ID" data-testid="input-profile-search" />
                  </label>
                  <div className="profile-groups">
                    {[...new Set(matchingFields.map(item => item.group))].map((group, index) => {
                      const groupFields = matchingFields.filter(item => item.group === group);
                      const mutableGroupFields = TRANSFER_FIELDS.filter(item => item.group === group && !item.lockedFor?.includes(profileDirection));
                      const selectedCount = mutableGroupFields.filter(item => profileSelected.has(item.id)).length;
                      return <details className="profile-group" key={group} open={index === 0}>
                        <summary><b>{group}</b><span>{selectedCount}/{mutableGroupFields.length} selected</span></summary>
                        <div className="profile-group-actions">
                          <button type="button" className="text-button" onClick={() => updateProfileGroup(group, true)} disabled={!mutableGroupFields.length}>Select available</button>
                          <button type="button" className="text-button" onClick={() => updateProfileGroup(group, false)} disabled={!mutableGroupFields.length}>Deselect available</button>
                        </div>
                        {groupFields.map(item => {
                          const locked = item.lockedFor?.includes(profileDirection) ?? false;
                          return <label className={`profile-field ${locked ? 'locked' : ''}`} key={item.id}>
                            <input type="checkbox" checked={profileSelected.has(item.id)} disabled={locked} onChange={event => updateProfileField(item.id, event.target.checked)} data-testid={`checkbox-profile-${item.id.replaceAll('.', '-')}`} />
                            <span className="profile-field-label"><b>{item.label}</b><code>{item.id}</code></span>
                            {locked ? <span className="profile-badge locked-badge">Locked out</span> : item.review ? <span className="profile-badge review-badge">Review</span> : null}
                          </label>;
                        })}
                      </details>;
                    })}
                  </div>
                  {profileInput && <div className="profile-preview">
                    <b>Outgoing field preview</b>
                    <span>{profile.selectedFieldIds.length - profileUnavailable.length} selected fields have source values. {profileUnavailable.length} selected fields are not present or remain blank.</span>
                    {profileUnavailable.length > 0 && <details>
                      <summary>Show unavailable fields</summary>
                      <ul>{profileUnavailable.slice(0, 24).map(item => <li key={item.id}><code>{item.id}</code> · blank or absent</li>)}</ul>
                      {profileUnavailable.length > 24 && <small>And {profileUnavailable.length - 24} more.</small>}
                    </details>}
                  </div>}
                  {profileDirectionMismatch && <div className="muted-note" role="alert" style={{ marginTop: 12 }}>The selected profile does not match the imported package direction.</div>}
                  <div className="profile-actions">
                    <button className="btn btn-primary" type="button" onClick={applyTransferProfile} disabled={!profileInput || profileDirectionMismatch} data-testid="button-apply-profile">Apply profile</button>
                    <button className="btn" type="button" onClick={restoreProfileDefaults} data-testid="button-restore-profile">Restore demo defaults</button>
                  </div>
                  {state.appliedProfile && <p className="profile-applied" role="status">Applied snapshot · {state.appliedProfile.name} · v{state.appliedProfile.version} · {new Date(state.appliedProfile.appliedAt).toLocaleString()}</p>}
                </section>
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">04 / Explicit operation</div><h2 className="section-title" style={{ marginTop: 8 }}>Choose a transformation</h2>
                  <div className="muted-note" style={{ margin: '14px 0' }}><b>PoC safeguard.</b> Demonstration rules only, not approved sanitisation guidance. Removing values affects the outgoing copy only; source package is retained.</div>
                  {!state.adnOutboundPackage && <div className="field-grid">
                    <Field label="ADN personnel number" value={military.serviceNumber} onChange={v => setMilitary({ ...military, serviceNumber: v })} testId="input-mii-service-number" />
                    <Field label="Rank" value={military.rank} onChange={v => setMilitary({ ...military, rank: v })} testId="input-mii-rank" />
                    <Field label="Unit / ship" value={military.unit} onChange={v => setMilitary({ ...military, unit: v })} testId="input-mii-unit" />
                    <Field label="Service" value={military.service} onChange={v => setMilitary({ ...military, service: v })} testId="input-mii-service" />
                  </div>}
                  <div className="btn-row" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={() => transform('add')} disabled={!state.workstationPublicPackage || state.appliedProfile?.direction !== 'public-to-adn'} data-testid="button-add-mii-pii"><Plus size={14} /> Add MII / PII</button>
                    <button className="btn btn-danger" onClick={() => transform('strip')} disabled={!state.adnOutboundPackage || state.appliedProfile?.direction !== 'adn-to-public'} data-testid="button-strip-mii-pii"><Trash2 size={14} /> Strip MII / PII</button>
                  </div>
                  <p className="section-sub" style={{ margin: '11px 0 0' }}>{state.adnOutboundPackage ? 'ADN → Public is active. Strip removes service and contact identifiers from the outgoing copy; the imported source is retained.' : 'Public → ADN is active. Add uses only operator-supplied values above; import an ADN outbound package to run the separate Strip operation.'}</p>
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">05 / Transformation report</div><h2 className="section-title" style={{ marginTop: 8 }}>Operator record</h2>
                  {state.report ? <ReportView report={state.report} /> : <EmptyState icon={<ShieldAlert size={18} />} title="No transformation recorded" body="Choose an explicit operation after importing and reviewing a package." />}
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={state.adnOutboundPackage ? exportPublicRelease : exportAdn} disabled={state.adnOutboundPackage ? !state.publicReleasePackage : !state.workstationPackage} data-testid="button-export-adn"><ArrowDownToLine size={15} /> {state.adnOutboundPackage ? 'Export sanitised public package' : 'Export ADN ingest package'}</button>
                  {state.workstationPackage && <div className="record-row"><div><div className="record-label">Outgoing transaction</div><div className="record-value mono">{state.workstationPackage.transactionId}</div></div><ShieldCheck size={16} /></div>}
                </section>
              </aside>
            </div>
          </main>
        </Route>
        <Route path="/adn">
          <PortalHeader active="adn" />
          <main className="page-wrap">
            <PageHeading kicker="ADN-side military medical workflow" title="ADN record and examination forms" description="Import the workstation's ADN package. Supported values remain traceable to their source; form-specific fields not present in the package stay blank until entered here." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                  <div className="eyebrow">01 / ADN package import</div><h2 className="section-title" style={{ marginTop: 8 }}>Receiving record</h2><p className="section-sub">Import the exported ADN ingest JSON package. No real cross-domain connection or server storage is used.</p>
                  <PackageImporter onFile={importAdn} />
                  {importError && <div className="muted-note" role="alert" style={{ marginTop: 12 }}>{importError}</div>}
                  <div className="btn-row" style={{ marginTop: 16 }}>
                    <button className={`btn ${adnTab === 'record' ? 'btn-primary' : ''}`} onClick={() => setAdnTab('record')} data-testid="button-adn-record-tab"><UserRound size={14} /> Patient record</button>
                    <button className={`btn ${adnTab === 'form' ? 'btn-primary' : ''}`} onClick={() => setAdnTab('form')} data-testid="button-adn-form-tab"><FileText size={14} /> AFMSF form</button>
                  </div>
                  <button className="btn" style={{ marginTop: 12 }} onClick={exportAdnForSanitisation} disabled={!state.adnPackage} data-testid="button-export-adn-outbound"><ArrowDownToLine size={14} /> Export ADN package for sanitisation</button>
                  <p className="section-sub" style={{ margin: '8px 0 0' }}>Use this separate outbound package to demonstrate ADN → Public sanitisation at the workstation.</p>
                </section>
                {adnTab === 'record' ? <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">02 / Military patient record</div><h2 className="section-title" style={{ marginTop: 8 }}>{patient.name || 'No patient package imported'}</h2>
                  <p className="section-sub">{patientPackage ? `Patient reference ${patient.id} · Imported through workstation` : 'Import a package to populate supported demographic and encounter fields.'}</p>
                  {patientPackage ? <>
                    <div className="record-row"><div><div className="record-label">Date of birth</div><div className="record-value">{patient.dob || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.dob')} /></div>
                    <div className="record-row"><div><div className="record-label">Sex</div><div className="record-value">{patient.sex || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.sex')} /></div>
                    <div className="record-row"><div><div className="record-label">ADN personnel number</div><div className="record-value">{patient.serviceNumber || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.serviceNumber')} /></div>
                    <div className="record-row"><div><div className="record-label">Rank · Unit · Service</div><div className="record-value">{[patient.rank, patient.unit, patient.service].filter(Boolean).join(' · ') || '—'}</div></div><span className="prov prov-enriched">WORKSTATION / BLANK IF ABSENT</span></div>
                    <div className="record-row"><div><div className="record-label">Presenting complaint</div><div className="record-value">{encounter.complaint || '—'}</div></div><ProvenanceMark item={provenanceFor('encounter.complaint')} /></div>
                    <div className="record-row"><div><div className="record-label">History</div><div className="record-value">{encounter.history || '—'}</div></div><ProvenanceMark item={provenanceFor('encounter.history')} /></div>
                    <div className="record-row"><div><div className="record-label">Findings · assessment · plan</div><div className="record-value">{[encounter.findings, encounter.assessment, encounter.plan].filter(Boolean).join(' / ') || '—'}</div></div><span className="prov prov-imported">IMPORTED · i-DHANWANTRI</span></div>
                    <p className="signature">TXN {patientPackage.transactionId} · {patientPackage.profile}</p>
                  </> : <EmptyState icon={<Upload size={18} />} title="Awaiting ingest package" body="Import the JSON file produced by the workstation. This is a manual demonstration handoff." />}
                </section> : <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">03 / AFMSF structured examination</div><h2 className="section-title" style={{ marginTop: 8 }}>{state.examination.type === 'PME' ? 'PME · AFMSF 3A' : 'AME · AFMSF 3B'}</h2>
                  <p className="section-sub">Demo form references only. Fields absent from the inbound package or not entered by the officer remain blank.</p>
                  <div className="btn-row" style={{ marginBottom: 16 }}>
                    <button className={`btn ${state.examination.type === 'PME' ? 'btn-primary' : ''}`} onClick={selectPme} data-testid="button-select-pme">PME · 3A</button>
                    <button className={`btn ${state.examination.type === 'AME' ? 'btn-primary' : ''}`} onClick={createAmE} disabled={state.examination.type !== 'PME'} data-testid="button-project-ame">Project AME · 3B</button>
                  </div>
                  <div className="form-page-nav" role="tablist" aria-label="AFMSF form pages">
                    {activeFormPages.map(page => <button
                      key={page.number}
                      type="button"
                      role="tab"
                      aria-selected={formPage === page.number}
                      className={formPage === page.number ? 'active' : ''}
                      onClick={() => setFormPage(page.number)}
                      data-testid={`tab-form-page-${page.number}`}
                    >Page {page.number} of {page.total}</button>)}
                  </div>
                  <div className="form-page-title"><span>{activeFormPage.continuation ? 'CONTINUATION' : 'EXAMINATION FORM'}</span><b>{activeFormPage.title}</b></div>
                  <div className="exam-sections">
                    {activeFormPage.sections.map(group => <section className="exam-section" key={group.title}>
                      <h3>{group.title}</h3>
                      <div className="field-grid">
                        {group.fields.map(item => item.key === 'dental.tooth_chart'
                          ? <div className="field full" key={item.key}>
                            <label>{item.label}</label>
                            <DentalChart
                              value={state.examination.values[item.key] ?? ''}
                              onChange={value => updateExam(item.key, value)}
                              testId="dental-chart-editor"
                            />
                            <small className="field-provenance">{state.examination.provenance[item.key] || 'Blank · no markings entered'}</small>
                          </div>
                          : <Field
                            key={item.key}
                            label={item.label}
                            type={item.type === 'textarea' ? 'text' : item.type}
                            options={item.options}
                            value={state.examination.values[item.key] ?? ''}
                            provenance={state.examination.provenance[item.key]}
                            onChange={value => updateExam(item.key, value)}
                            testId={`input-form-${item.key.replaceAll('.', '-')}`}
                            full={item.type === 'textarea'}
                            multiline={item.type === 'textarea'}
                          />)}
                      </div>
                    </section>)}
                  </div>
                  <div className="btn-row" style={{ marginTop: 18 }}>
                    <button className="btn btn-primary" onClick={saveExamination} data-testid="button-save-examination"><BadgeCheck size={15} /> Save structured examination</button>
                    {state.examination.savedAt && <span className="tag" data-testid="status-examination-saved">SAVED · {new Date(state.examination.savedAt).toLocaleString()}</span>}
                  </div>
                  <div className="muted-note" style={{ marginTop: 16 }}>
                    {state.examination.type === 'AME'
                      ? `Only documented PME-to-AME mappings are projected. ${blankFormFieldCount} fields remain blank; AME-only values such as immunisation require separate entry.`
                      : `${blankFormFieldCount} fields remain blank. Unknown findings and unavailable source values are not filled in.`}
                  </div>
                  <div className="source-reference-warning" role="note">Page structure is based on the supplied AFMSF 3A / 3B examples. Official marks are intentionally omitted; this demo uses synthetic data and is not an official medical record.</div>
                </section>}
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">Field-level provenance</div><h2 className="section-title" style={{ marginTop: 8 }}>Where values came from</h2>
                  <div className="record-row"><span className="prov prov-imported">IMPORTED</span><div className="record-value">From i-Dhanwantri package</div></div>
                  <div className="record-row"><span className="prov prov-enriched">ENRICHED</span><div className="record-value">Entered by workstation operator</div></div>
                  <div className="record-row"><span className="prov prov-entered">ADN-ENTERED</span><div className="record-value">Entered or amended in this form</div></div>
                  {patientPackage?.provenance?.length ? <p className="signature">{patientPackage.provenance.length} source field references in package</p> : <p className="section-sub" style={{ margin: '14px 0 0' }}>Import a package to show field-specific origins.</p>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">Document output</div><h2 className="section-title" style={{ marginTop: 8 }}>Printable examination</h2>
                  <p className="section-sub">Generate a local print-to-PDF document from the structured form values.</p>
                  <div className="record-row"><div><div className="record-label">Record reference</div><div className="record-value mono">{state.examination.examinationRef}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Template reference</div><div className="record-value">{state.examination.templateRef}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Source record</div><div className="record-value mono">{state.examination.sourceExaminationRef || 'Current examination record'}</div></div></div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 14 }} onClick={printExamination} disabled={!state.examination.savedAt} data-testid="button-print-examination"><Printer size={15} /> Print / Save as PDF</button>
                  {!state.examination.savedAt && <p className="section-sub" style={{ margin: '10px 0 0' }}>Save the structured examination before printing.</p>}
                  {state.examination.documentRef && <p className="signature" data-testid="text-document-reference">{state.examination.documentRef} · {state.examination.documentCreatedAt}</p>}
                </section>
              </aside>
            </div>
            <div id="print-document" className="print-document">
              <div className="print-preview-warning no-print">Print preview based on the supplied AFMSF examples · official marks omitted · synthetic demo data.</div>
              {activeFormPages.map(page => <section className={`afmsf-print-page ${state.examination.type === 'AME' ? 'afmsf-print-page--ame' : ''} ${page.number === 2 ? 'afmsf-print-page--2' : ''}`} key={`${state.examination.type}-${page.number}`} data-testid={`print-page-${page.number}`}>
                <header className="afmsf-print-header">
                  <b className="confidential-mark">CONFIDENTIAL</b>
                  <span className="synthetic-mark">DEMO · SYNTHETIC DATA · PAGE {page.number} OF {page.total}</span>
                  <h2>{state.examination.type === 'PME' ? 'PERIODIC / SPECIAL MEDICAL EXAMINATION' : 'ANNUAL MEDICAL EXAMINATION'}</h2>
                  <b className="afmsf-form-code">{state.examination.type === 'PME' ? 'A.F.M.S.F. 3A (Ver-2002)' : 'A.F.M.S.F. 3B (Ver 2002)'}</b>
                </header>
                {page.continuationIdentity && <ContinuationIdentityStrip values={state.examination.values} />}
                {page.sections.map(group => group.title === 'Personal Data'
                  ? <PrintPersonalData key={group.title} type={state.examination.type} values={state.examination.values} />
                  : group.title === 'Continuation identity strip'
                    ? null
                    : <section className={`print-section layout-${printLayoutFor(group.title)}`} key={`print-${group.title}`}>
                      <h3>{group.title}</h3>
                      <div className={`print-grid ${group.title.includes('Dental') ? 'dental-print-grid' : ''}`}>
                        {group.fields.map(item => item.key === 'dental.tooth_chart'
                          ? <div className="print-dental-chart" key={item.key}><b>{item.label}</b><PrintDentalChart value={state.examination.values[item.key] ?? ''} /></div>
                          : <PrintCell key={item.key} label={item.label} value={state.examination.values[item.key] ?? ''} className={item.type === 'textarea' ? 'print-cell--textarea' : undefined} />)}
                      </div>
                    </section>)}
                {page.number === 1 && <div className="afmsf-form-note">Note: Delete what is not applicable. If any abnormality is detected, delete “NAD” and enter the findings. No findings are prefilled in this demo.</div>}
                {state.examination.type === 'AME' && page.number === 1 && <div className="afmsf-pto">(PTO)</div>}
              </section>)}
            </div>
          </main>
        </Route>
        <Route component={NotFound} />
      </Switch>
      {notice && <div className="toast" role="status" data-testid="status-toast">{notice}</div>}
    </div>
  );
}

function PortalHeader({ active }: { active: 'idh' | 'workstation' | 'adn' }) {
  const config = active === 'idh'
    ? { name: 'i-Dhanwantri', meta: 'Internet-side clinical information system', initials: 'iD' }
    : active === 'workstation'
      ? { name: 'Secure Data Exchange Workstation', meta: 'Controlled transfer console · operator mode', initials: 'SX' }
      : { name: 'Dhanwantri 3.0 ADN', meta: 'Military medical record · demo environment', initials: 'AD' };
  return <header className="topbar">
    <div className="brandlock"><div className="brandmark">{config.initials}</div><div><div className="brandname">{config.name}</div><div className="brandmeta">{config.meta}</div></div></div>
    <nav className="portal-nav" aria-label="Demo portals">
      <Link href="/" data-testid="link-demo-home">Journey</Link>
      <Link href="/idh" className={active === 'idh' ? 'active' : ''} data-testid="link-portal-idh">i-Dhanwantri</Link>
      <Link href="/workstation" className={active === 'workstation' ? 'active' : ''} data-testid="link-portal-workstation">Workstation</Link>
      <Link href="/adn" className={active === 'adn' ? 'active' : ''} data-testid="link-portal-adn">ADN</Link>
    </nav>
    <span className="demo-chip">DEMO / SYNTHETIC DATA</span>
  </header>;
}
function PageHeading({ kicker, title, description }: { kicker: string; title: string; description: string }) {
  return <div className="page-heading"><div><div className="eyebrow">{kicker}</div><h1>{title}</h1><p>{description}</p></div><Link href="/" className="btn" data-testid="link-back-journey"><RotateCcw size={14} /> Journey / reset</Link></div>;
}
function Field({ label, value, onChange, testId, type = 'text', options, full = false, multiline = false, provenance }: {
  label: string; value: string; onChange: (value: string) => void; testId: string; type?: string; options?: string[]; full?: boolean; multiline?: boolean; provenance?: string;
}) {
  return <div className={`field ${full ? 'full' : ''}`}><label htmlFor={testId}>{label}</label>{multiline
    ? <textarea id={testId} data-testid={testId} value={value} onChange={event => onChange(event.target.value)} />
    : options
      ? <select id={testId} data-testid={testId} value={value} onChange={event => onChange(event.target.value)}>
        <option value="">Select…</option>
        {options.map(option => <option value={option} key={option}>{option}</option>)}
      </select>
      : <input id={testId} data-testid={testId} type={type === 'select' ? 'text' : type} value={value} onChange={event => onChange(event.target.value)} />}
    <small className="field-provenance" data-testid={`provenance-${testId.slice('input-form-'.length)}`}>{provenance || (value ? 'ADN-entered / amended' : 'Blank · no value available')}</small>
  </div>;
}
const UPPER_RIGHT_TEETH = [18, 17, 16, 15, 14, 13, 12, 11];
const UPPER_LEFT_TEETH = [21, 22, 23, 24, 25, 26, 27, 28];
const LOWER_LEFT_TEETH = [31, 32, 33, 34, 35, 36, 37, 38];
const LOWER_RIGHT_TEETH = [48, 47, 46, 45, 44, 43, 42, 41];
function dentalMarks(value: string): Record<string, '-' | 'x'> {
  try {
    const raw = JSON.parse(value) as unknown;
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
    return Object.fromEntries(Object.entries(raw as Record<string, unknown>)
      .filter((entry): entry is [string, '-' | 'x'] => typeof entry[1] === 'string' && ['-', 'x'].includes(entry[1])));
  } catch { return {}; }
}
function DentalChart({ value, onChange, testId }: { value: string; onChange: (value: string) => void; testId: string }) {
  const marks = dentalMarks(value);
  const cycle = (tooth: number) => {
    const current = marks[String(tooth)];
    const next = current === undefined ? '-' : current === '-' ? 'x' : undefined;
    const updated = { ...marks };
    if (next) updated[String(tooth)] = next;
    else delete updated[String(tooth)];
    onChange(JSON.stringify(updated));
  };
  const row = (label: string, teeth: number[], side: string) => <div className="dental-chart-quadrant" key={label}>
    <span className="dental-chart-side">{side}</span>
    <div className="dental-teeth">{teeth.map(tooth => <button
      type="button"
      className={`dental-tooth ${marks[String(tooth)] ? 'marked' : ''}`}
      key={tooth}
      onClick={() => cycle(tooth)}
      aria-label={`Tooth ${tooth}, ${marks[String(tooth)] === '-' ? 'missing' : marks[String(tooth)] === 'x' ? 'unsaveable' : 'unmarked'}. Click to cycle notation.`}
      title="Click: blank → missing (−) → unsaveable (x) → blank"
      data-testid={`${testId}-tooth-${tooth}`}
    ><small>{tooth}</small><b>{marks[String(tooth)] ?? ''}</b></button>)}</div>
  </div>;
  return <div className="dental-chart" data-testid={testId}>
    <div className="dental-chart-arch"><span className="dental-arch-label">UPPER</span>{row('upper-right', UPPER_RIGHT_TEETH, 'UR')}{row('upper-left', UPPER_LEFT_TEETH, 'UL')}</div>
    <div className="dental-chart-midline" aria-hidden="true" />
    <div className="dental-chart-arch"><span className="dental-arch-label">LOWER</span>{row('lower-right', LOWER_RIGHT_TEETH, 'LR')}{row('lower-left', LOWER_LEFT_TEETH, 'LL')}</div>
    <div className="dental-chart-legend"><span><b>−</b> Missing</span><span><b>x</b> Unsaveable</span><span>{Object.keys(marks).length} marked</span></div>
  </div>;
}
function PrintDentalChart({ value }: { value: string }) {
  const marks = dentalMarks(value);
  const row = (label: string, teeth: number[], side: string) => <div className="print-dental-quadrant" key={label}>
    <b>{side}</b>{teeth.map(tooth => <span className={`print-tooth ${marks[String(tooth)] ? 'marked' : ''}`} key={tooth}><small>{tooth}</small><strong>{marks[String(tooth)] ?? ''}</strong></span>)}
  </div>;
  return <div className="print-dental-chart" data-testid="print-dental-chart">
    <div className="print-dental-row">{row('print-upper-right', UPPER_RIGHT_TEETH, 'UR')}{row('print-upper-left', UPPER_LEFT_TEETH, 'UL')}</div>
    <div className="print-dental-row">{row('print-lower-right', LOWER_RIGHT_TEETH, 'LR')}{row('print-lower-left', LOWER_LEFT_TEETH, 'LL')}</div>
    <small>− Missing · x Unsaveable</small>
  </div>;
}
function ContinuationIdentityStrip({ values }: { values: Record<string, string> }) {
  return <div className="continuation-identity">
    <span><b>NO</b>{values['person.adn_personnel_number'] || '\u00a0'}</span>
    <span><b>RANK</b>{values['person.rank'] || '\u00a0'}</span>
    <span><b>NAME</b>{values['person.name'] || '\u00a0'}</span>
    <span><b>INDL SIGN</b>{values['person.individual_signature'] || '\u00a0'}</span>
  </div>;
}
function PackageImporter({ onFile }: { onFile: (file: File) => void }) {
  const handle = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) onFile(file);
    event.target.value = '';
  };
  return <div className="dropzone"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Upload size={21} /></div><div style={{ fontWeight: 700, fontSize: 12 }}>Choose a Dhanwantri exchange JSON file</div><div className="section-sub" style={{ margin: '5px 0 0' }}>Manual export / import handoff · no network transfer</div><input type="file" accept=".json,application/json" onChange={handle} data-testid="input-package-import" /></div>;
}
function MappingTable({ pkg }: { pkg: ExchangePackage }) {
  const rows = [
    ['Patient reference', pkg.patient.id, 'person.source_patient_id'],
    ['Name', pkg.patient.name, 'person.name'],
    ['Date of birth', pkg.patient.dob, 'person.date_of_birth'],
    ['Sex', pkg.patient.sex, 'person.sex'],
    ['Presenting complaint', pkg.encounter.complaint, 'clinical.present_complaints'],
    ['History', pkg.encounter.history, 'clinical.past_medical_history'],
    ['Findings', pkg.encounter.findings, 'clinical.general_observations'],
    ['Assessment', pkg.encounter.assessment, 'clinical.assessment'],
    ['Plan', pkg.encounter.plan, 'clinical.plan'],
    ['Clinician', pkg.encounter.clinician, 'actor.clinician'],
  ];
  return <div className="table-scroll"><table className="field-table"><thead><tr><th>Source field</th><th>Mapped ADN field</th><th>Source value</th><th>Outcome</th></tr></thead><tbody>{rows.map(([label, value, target]) => <tr key={label}><td>{label}</td><td><code>{target}</code></td><td>{value || <span className="mono">blank</span>}</td><td><span className="tag">{value ? 'MAP' : 'BLANK'}</span></td></tr>)}</tbody></table></div>;
}
function ReportView({ report }: { report: TransformationReport }) {
  return <div>
    <div className="record-row"><div><div className="record-label">Source → destination</div><div className="record-value">{report.source} → {report.destination}<br /><span className="mono">{report.direction}</span></div></div><Workflow size={16} /></div>
    <div className="record-row"><div><div className="record-label">Transaction / operator</div><div className="record-value mono">{report.transactionId}<br />{report.profile.name} · v{report.profile.version}<br />{report.operator}</div></div></div>
    <div className="record-row"><div><div className="record-label">Operation time / export status</div><div className="record-value">{new Date(report.time).toLocaleString()}<br />{report.result}<br /><b>{report.exportStatus}</b></div></div></div>
    <div className="profile-counts report-counts">
      <span>{report.selectedFields.length} selected</span>
      <span>{report.excludedFields.length} excluded</span>
      <span>{report.unavailableFields.length} unavailable</span>
    </div>
    <div style={{ marginTop: 13 }}>{report.actions.map((action, index) => <div className="audit-item" key={index}><time>ACTION {String(index + 1).padStart(2, '0')}</time><span>{action}</span></div>)}</div>
    <div className="report-field-details">
      <details><summary>Selected fields</summary><ul>{report.selectedFields.slice(0, 30).map(id => <li key={id}><code>{id}</code></li>)}</ul>{report.selectedFields.length > 30 && <small>And {report.selectedFields.length - 30} more.</small>}</details>
      <details><summary>Excluded fields</summary><ul>{report.excludedFields.slice(0, 30).map(id => <li key={id}><code>{id}</code></li>)}</ul>{report.excludedFields.length > 30 && <small>And {report.excludedFields.length - 30} more.</small>}</details>
      {report.unavailableFields.length > 0 && <details><summary>Unavailable selected fields</summary><ul>{report.unavailableFields.slice(0, 30).map(id => <li key={id}><code>{id}</code></li>)}</ul>{report.unavailableFields.length > 30 && <small>And {report.unavailableFields.length - 30} more.</small>}</details>}
    </div>
    <div className="muted-note" style={{ marginTop: 14 }}>{report.warnings.join(' ')}</div>
  </div>;
}
function ProvenanceMark({ item }: { item?: Provenance }) {
  if (!item) return <span className="prov prov-imported">SOURCE UNAVAILABLE / BLANK</span>;
  const type = item.origin === 'enriched' ? 'enriched' : item.origin === 'amended' ? 'entered' : 'imported';
  return <span className={`prov prov-${type}`}>{item.origin.toUpperCase()} · {item.source}</span>;
}
function EmptyState({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div style={{ padding: '24px 4px', textAlign: 'center' }}><div style={{ display: 'flex', justifyContent: 'center', opacity: .58 }}>{icon}</div><h3 className="section-title" style={{ marginTop: 10 }}>{title}</h3><p className="section-sub" style={{ marginBottom: 0 }}>{body}</p></div>;
}
function printLayoutFor(title: string): string {
  const value = title.toLowerCase();
  if (value.includes('personal data')) return 'personal';
  if (value.includes('examination header')) return 'header';
  if (value.includes('medicine')) return 'medicine';
  if (value.includes('investigations')) return 'investigations';
  if (value.includes('physical capacity')) return 'physical';
  if (value.includes('dental')) return 'dental';
  if (value.includes('vision') || value.includes('eye')) return 'eye';
  if (value.includes('hearing') || value.includes('ent')) return 'ent';
  if (value.includes('surgery') || value.includes('locomotor')) return 'surgery';
  if (value.includes('gynaecology')) return 'gynaecology';
  if (value.includes('authority') || value.includes('medical board')) return 'authority';
  if (value.includes('final observations')) return 'final';
  return 'standard';
}
function PrintPersonalData({ type, values }: { type: 'PME' | 'AME'; values: Record<string, string> }) {
  const value = (key: string) => values[key]?.trim() ?? '';
  const age = [
    value('person.age_years') && `${value('person.age_years')} years`,
    type === 'PME' && value('person.age_months') && `${value('person.age_months')} months`,
    value('person.sex') && `Sex: ${value('person.sex')}`,
  ].filter(Boolean).join(' · ');
  const category = [
    value('category.present'),
    type === 'AME' && value('category.effective_date') && `wef ${value('category.effective_date')}`,
  ].filter(Boolean).join(' · ');
  const previous = [value('exam.previous_ame_place'), value('exam.previous_ame_date')].filter(Boolean).join(' · ');
  const serviceGroup = [value('person.arms_corps'), value('person.branch_trade')].filter(Boolean).join(' / ');
  return <section className="print-section layout-personal">
    <h3>PERSONAL DATA</h3>
    <div className="print-grid">
      <PrintCell label="1. Number" value={value('person.adn_personnel_number')} />
      <PrintCell label="2. Rank" value={value('person.rank')} />
      <PrintCell label="3. Name" value={value('person.name')} />
      <PrintCell label="4. Unit / Ship" value={value('person.unit_ship')} />
      <PrintCell label="5. Service" value={value('person.service')} />
      <PrintCell label="6. Arm / Corps / Branch / Trade" value={serviceGroup} />
      <PrintCell label="7. Date of birth" value={value('person.date_of_birth')} />
      <PrintCell label="8. Age / Sex" value={age} />
      <PrintCell label="9. Type of commission" value={value('person.commission_type')} />
      <PrintCell label="10. Date of commission" value={value('person.commission_date')} />
      <PrintCell label="11. Total service" value={value('person.total_service')} />
      <PrintCell label="12. Past medical history" value={value('clinical.past_medical_history')} className="print-cell--span-2" />
      <PrintCell label="13. Present medical category" value={category} className="print-cell--span-2" />
      <PrintCell label="14. Last AME / PME carried out at" value={previous} className="print-cell--span-2" />
      <PrintCell label="Signature of the officer / Date" value={value('exam.officer_acknowledgement')} className="print-cell--span-2" />
    </div>
  </section>;
}
function PrintCell({ label, value, provenance, className }: { label: string; value: string; provenance?: string; className?: string }) {
  return <div className={`print-cell ${className ?? ''}`}><b>{label}</b><span>{value || '\u00a0'}</span>{provenance && <small>{provenance}</small>}</div>;
}
function NotFound() {
  return <div className="page-wrap"><div className="surface panel-pad"><div className="eyebrow">Unknown portal</div><h1 className="section-title" style={{ fontSize: 28, marginTop: 10 }}>This route is not in the demo.</h1><Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}><ArrowRight size={15} /> Return to journey</Link></div></div>;
}
export default App;
