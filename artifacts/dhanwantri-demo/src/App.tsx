import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, BadgeCheck, ClipboardList,
  FileText, FolderOpen, Plus, RotateCcw,
  ShieldAlert, ShieldCheck, Stethoscope, Trash2, Upload, UserRound, Workflow,
} from 'lucide-react';
import {
  blankExaminationValues, FORM_PAGES, makeBlankExamination, MILITARY_ONLY_EXAM_FIELDS, PME_TO_AME_FIELDS,
  type ExaminationType,
} from './lib/afmsfForms';
import {
  downloadAfmsfPdf, downloadExchangeXml, isSanitisedPublicExchange, parseExchangeXml, sanitizePublicExchange,
} from './lib/exchange';
import {
  applyProfileToPackage, createAppliedProfile, createDefaultTransferProfiles,
  DEMO_OPERATOR, MAPPING_VERSION, normalizeAppliedProfile, normalizeTransferProfiles, selectedEnrichmentKeys,
  TRANSFER_FIELDS,
  type AppliedProfile, type TransferDirection, type TransferProfiles,
} from './lib/transferProfiles';

type Patient = {
  id: string; uhid: string; name: string; dob: string; sex: string; phone: string; email: string;
  address: string; mii: string; serviceNumber: string; rank: string; unit: string; service: string;
};
type Encounter = {
  id: string; date: string; complaint: string; history: string; findings: string;
  assessment: string; plan: string; clinician: string;
};
type Provenance = { field: string; origin: 'captured' | 'imported' | 'enriched' | 'amended'; source: string; at: string };
type ExchangePackage = {
  kind: 'dhanwantri-exchange'; version: string; transactionId: string; source: string;
  destination: string; createdAt: string; profile: string; patient: Partial<Patient>;
  mappingVersion?: string; direction?: string;
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
  generalFindings: string; finalObservations: string; category: string; officer: string; patientUhid: string;
  examinationRef: string; templateRef: string; provenance: Record<string, string>;
  values: Record<string, string>; savedAt: string; documentRef: string; documentCreatedAt: string;
  sourceExaminationRef: string; sourceTransactionRef: string;
};
type DemoState = {
  patient: Patient; encounter: Encounter; recordSaved: boolean; publicPackage: ExchangePackage | null; publicReceivedPackage: ExchangePackage | null;
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
  patient: { id: 'IDH-SYN-2048', uhid: 'UHID-SYN-2048', name: 'Aarav Sen', dob: '1992-08-14', sex: 'Male', phone: '', email: '', address: '', mii: '', serviceNumber: '', rank: '', unit: '', service: '' },
  encounter: { id: makeId('ENC'), date: '', complaint: '', history: '', findings: '', assessment: '', plan: '', clinician: '' },
  recordSaved: false, publicPackage: null, publicReceivedPackage: null, workstationPublicPackage: null,
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
    patientUhid: typeof raw.patientUhid === 'string' ? raw.patientUhid : '',
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
      const defaults = initialState();
      return {
        ...defaults,
        ...parsed,
        patient: { ...defaults.patient, ...(parsed.patient ?? {}) },
        encounter: { ...defaults.encounter, ...(parsed.encounter ?? {}) },
        examination: normalizeExamination(parsed.examination),
        transferProfiles: normalizeTransferProfiles(parsed.transferProfiles),
        appliedProfile: normalizeAppliedProfile(parsed.appliedProfile),
      };
    }
  } catch { /* recover with a clean local demo */ }
  return initialState();
}
function downloadExchangePair(pkg: ExchangePackage, suffix: string): void {
  const base = `${pkg.transactionId}-${suffix}`;
  downloadExchangeXml(`${base}.xml`, pkg as unknown as Record<string, unknown>);
  downloadAfmsfPdf(`${base}.pdf`, pkg as unknown as Record<string, unknown>);
}
function publicClinicalCopy(examination: Examination): Examination {
  const copy = {
    ...examination,
    values: { ...examination.values },
    provenance: { ...examination.provenance },
  };
  MILITARY_ONLY_EXAM_FIELDS.forEach(key => {
    delete copy.values[key];
    delete copy.provenance[key];
  });
  return copy;
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
      const sourceText = String(reader.result);
      const raw = file.name.toLowerCase().endsWith('.xml')
        ? parseExchangeXml(sourceText)
        : JSON.parse(sourceText) as unknown;
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
  const [military, setMilitary] = useState({ mii: '', serviceNumber: '', rank: '', unit: '', service: '' });
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
    setMilitary({ mii: '', serviceNumber: '', rank: '', unit: '', service: '' });
    setProfileDirection('public-to-adn');
    setProfileSearch('');
    setFormPage(1);
    setLocation('/');
    setNotice('Demo reset. A fresh synthetic patient is ready.');
  };
  const updateProfileField = (fieldId: string, selected: boolean) => {
    const profile = state.transferProfiles[profileDirection];
    const definition = TRANSFER_FIELDS.find(item => item.id === fieldId);
    if (!definition || definition.lockedFor?.includes(profileDirection)
      || (definition.requiredFor?.includes(profileDirection) && !selected)) return;
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
      .forEach(item => {
        if (selected || !item.requiredFor?.includes(profileDirection)) {
          selected ? selectedIds.add(item.id) : selectedIds.delete(item.id);
        }
      });
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
    if (!state.examination.savedAt) {
      setNotice('Save the PME/AME examination before exporting.');
      return;
    }
    const publicPatient: Partial<Patient> = {
      id: state.patient.id,
      uhid: state.patient.uhid,
      name: state.patient.name,
      dob: state.patient.dob,
      sex: state.patient.sex,
      phone: state.patient.phone,
      email: state.patient.email,
      address: state.patient.address,
    };
    const pkg: ExchangePackage = {
      kind: 'dhanwantri-exchange', version: '2.0', transactionId: makeId('TXN'),
      source: 'i-Dhanwantri', destination: 'Secure Data Exchange Workstation',
      createdAt: now(), profile: 'dhanwantri-poc-exchange · v1.0',
      mappingVersion: MAPPING_VERSION,
      direction: 'i-Dhanwantri → Secure Data Exchange Workstation',
      patient: publicPatient, encounter: { ...state.encounter },
      examination: publicClinicalCopy(state.examination),
      provenance: [
        ...Object.entries(publicPatient).filter(([, value]) => Boolean(value)).map(([field]) => ({ field: `patient.${field}`, origin: 'captured' as const, source: 'i-Dhanwantri synthetic registration', at: now() })),
        ...Object.entries(state.encounter).filter(([, value]) => Boolean(value)).map(([field]) => ({ field: `encounter.${field}`, origin: 'captured' as const, source: 'i-Dhanwantri structured encounter', at: now() })),
      ],
    };
    update('publicPackage', pkg);
    update('publicReceivedPackage', null);
    downloadExchangePair(pkg, 'public-clinical-exchange');
    setNotice('Public clinical XML and AFMSF PDF downloaded with one transaction ID.');
  };
  const importPublicReturn = (file: File) => readPackage(file, pkg => {
    if (pkg.source !== 'Secure Data Exchange Workstation' || pkg.destination !== 'i-Dhanwantri public side') {
      setImportError('Choose the sanitised public-release XML produced by the workstation.');
      return;
    }
    if (!pkg.patient.uhid?.trim() || !pkg.examination
      || !isSanitisedPublicExchange(pkg as unknown as Record<string, unknown>)) {
      setImportError('The returned package is missing UHID/examination data or still contains military-only fields.');
      return;
    }
    update('publicReceivedPackage', pkg);
    setImportError('');
    setNotice('Sanitised return imported. The original i-Dhanwantri source record was not changed.');
  }, setImportError);
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
    if (operation === 'add' && (!source.patient.uhid?.trim()
      || !source.examination?.savedAt
      || !['PME', 'AME'].includes(source.examination.type)
      || source.examination.patientUhid !== source.patient.uhid)) {
      setNotice('The incoming package needs a UHID and a saved PME/AME examination before military enrichment.');
      return;
    }
    if (operation === 'add' && !military.mii.trim()) {
      setNotice('Enter the required MII at the workstation before creating the military record.');
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
      source.examination
        ? `Imported ${source.examination.type === 'PME' ? 'AFMSF 3A / PME' : 'AFMSF 3B / AME'} ${source.examination.examinationRef} for UHID ${source.patient.uhid || 'missing'}.`
        : 'No structured examination was present in the imported package.',
      `Mapped ${projected.availableFieldIds.length} available source fields and ${availableEnrichment.length} enrichment fields; ${unavailableFields.length} selected fields are blank or unavailable.`,
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
        ? `Added workstation military fields: ${Object.keys(militaryFields).join(', ')}.`
        : 'No workstation military enrichment values were populated.');
    } else {
      militaryFields = {};
      actions.push(`Sanitised the outgoing copy; ${appliedProfile.excludedFieldIds.length} fields were excluded by the applied profile and military/authority fields were removed.`);
    }
    const presentAvailable = new Set(projected.availableFieldIds);
    availableEnrichment.forEach(id => presentAvailable.add(id));
    const selectedFields = appliedProfile.selectedFieldIds;
    actions.push(`Field selection: ${selectedFields.length} selected, ${appliedProfile.excludedFieldIds.length} excluded, ${unavailableFields.length} selected but unavailable.`);
    const outgoingTransactionId = makeId('TXN');
    const report: TransformationReport = {
      direction: operation === 'add' ? 'Public → ADN · workstation enrichment' : 'ADN → Public · sanitised release',
      transactionId: outgoingTransactionId,
      source: source.source,
      destination: operation === 'add' ? 'Dhanwantri 3.0 ADN' : 'i-Dhanwantri public side',
      operator: DEMO_OPERATOR, time: now(), actions,
      warnings: [
        'Illustrative PoC rules only; not an approved sanitisation policy.',
        'Dhanwantri PoC XML is a custom format and does not claim FHIR, CDA, CCD or ABDM conformance.',
        'Missing clinical values were left blank. Review free text for identifiers before any real release.',
      ],
      result: 'Outgoing copy prepared · not standards-validated',
      exportStatus: 'Prepared · paired XML/PDF not yet downloaded',
      selectedFields: [...selectedFields],
      excludedFields: [...appliedProfile.excludedFieldIds],
      unavailableFields,
      profile: appliedProfile,
    };
    const outBase: ExchangePackage = {
      ...preparedSource,
      version: '2.0',
      transactionId: outgoingTransactionId,
      source: 'Secure Data Exchange Workstation',
      destination: report.destination,
      createdAt: now(),
      profile: `${appliedProfile.name} · profile v${appliedProfile.version}`,
      mappingVersion: MAPPING_VERSION,
      direction: report.direction,
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
    const out = (operation === 'strip'
      ? sanitizePublicExchange(outBase as unknown as Record<string, unknown>)
      : outBase) as unknown as ExchangePackage;
    update('workstationPackage', out);
    if (operation === 'add') {
      update('publicReleasePackage', null);
    } else {
      update('publicReleasePackage', out);
    }
    update('report', report);
    setNotice(operation === 'add' ? 'Workstation enrichment recorded on a copy; the public source remains unchanged.' : 'Military-only values removed from the outgoing copy; the ADN source remains unchanged.');
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
    downloadExchangePair(state.workstationPackage, 'adn-ingest');
    if (state.report) update('report', { ...state.report, exportStatus: 'XML + AFMSF PDF downloaded' });
    setNotice('ADN ingest XML and matching AFMSF PDF downloaded.');
  };
  const exportAdnForSanitisation = () => {
    if (!state.adnPackage) { setNotice('Import an ADN ingest package before preparing an outbound package.'); return; }
    const pkg: ExchangePackage = {
      ...state.adnPackage,
      version: '2.0',
      transactionId: makeId('TXN'),
      source: 'Dhanwantri 3.0 ADN',
      destination: 'Secure Data Exchange Workstation',
      createdAt: now(),
      profile: 'ADN outbound package · awaiting workstation sanitisation',
      mappingVersion: MAPPING_VERSION,
      direction: 'Dhanwantri 3.0 ADN → Secure Data Exchange Workstation',
      examination: { ...state.examination },
    };
    downloadExchangePair(pkg, 'adn-outbound');
    setNotice('ADN outbound XML and AFMSF PDF downloaded for workstation sanitisation.');
  };
  const exportPublicRelease = () => {
    if (!state.publicReleasePackage) { setNotice('Run workstation sanitisation before exporting the public package.'); return; }
    downloadExchangePair(state.publicReleasePackage, 'sanitised-public-release');
    if (state.report) update('report', { ...state.report, exportStatus: 'Sanitised XML + AFMSF PDF downloaded' });
    setNotice('Sanitised XML and matching AFMSF PDF downloaded.');
  };
  const updatePatient = (field: keyof Patient, value: string) => {
    update('patient', { ...state.patient, [field]: value });
    update('recordSaved', false);
    update('examination', { ...state.examination, savedAt: '', documentRef: '', documentCreatedAt: '' });
  };
  const updateEncounter = (field: keyof Encounter, value: string) => {
    update('encounter', { ...state.encounter, [field]: value });
    update('recordSaved', false);
    update('examination', { ...state.examination, savedAt: '', documentRef: '', documentCreatedAt: '' });
  };
  const updateExam = (field: string, value: string) => {
    const provenance = { ...state.examination.provenance, [field]: 'Captured by i-Dhanwantri clinician' };
    const values = { ...state.examination.values, [field]: value };
    const patientFields: Partial<Record<string, keyof Patient>> = {
      'person.name': 'name',
      'person.date_of_birth': 'dob',
      'person.sex': 'sex',
    };
    if (patientFields[field]) {
      update('patient', { ...state.patient, [patientFields[field]!]: value });
      update('recordSaved', false);
    }
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
    setNotice('Started a blank PME record in i-Dhanwantri. No AME-only values were carried back.');
  };
  const saveExamination = () => {
    const values = { ...state.examination.values };
    const provenance = { ...state.examination.provenance };
    const capturedValues: Record<string, string> = {
      'person.name': state.patient.name,
      'person.date_of_birth': state.patient.dob,
      'person.sex': state.patient.sex,
      'clinical.past_medical_history': state.encounter.history,
      'clinical.general_observations': state.encounter.findings,
      'clinical.final_observations': state.encounter.assessment,
      'exam.date': state.encounter.date,
    };
    Object.entries(capturedValues).forEach(([key, value]) => {
      if (value && !values[key]?.trim()) {
        values[key] = value;
        provenance[key] = 'Imported from saved i-Dhanwantri registration / encounter';
      }
    });
    update('examination', { ...state.examination, patientUhid: state.patient.uhid, values, provenance, savedAt: now(), documentRef: '', documentCreatedAt: '' });
    setNotice('Structured clinical examination saved locally in i-Dhanwantri.');
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
    projected.sourceTransactionRef = state.publicPackage?.transactionId ?? '';
    update('examination', projected);
    setFormPage(1);
    const ameFields = [...new Map(FORM_PAGES.AME.flatMap(page => page.sections.flatMap(group => group.fields)).map(item => [item.key, item])).values()];
    const blankCount = ameFields.filter(item => !projected.values[item.key]?.trim()).length;
    setNotice(`AME draft created in i-Dhanwantri; ${blankCount} fields remain blank for review or separate completion.`);
  };
  const currentPortal = path.startsWith('/workstation') ? 'workstation' : path.startsWith('/adn') ? 'adn' : 'public';
  const patientPackage = state.adnPackage;
  const workstationInput = state.adnOutboundPackage ?? state.workstationPublicPackage;
  const patient = patientPackage?.patient ?? state.patient;
  const encounter = patientPackage?.encounter ?? state.encounter;
  const provenanceFor = (field: string) => patientPackage?.provenance?.find(item => item.field === field);
  const activeFormPages = FORM_PAGES[state.examination.type];
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
    ['patient.uhid', workstationInput.patient.uhid],
    ['patient.name', workstationInput.patient.name],
    ['encounter.id', workstationInput.encounter.id],
    ['examination.patientUhid', workstationInput.examination?.patientUhid === workstationInput.patient.uhid ? workstationInput.examination?.patientUhid : ''],
    ['examination.savedAt', workstationInput.examination?.savedAt],
    ['examination.type', workstationInput.examination?.type],
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
              <p>A synthetic PME or AME is captured in i-Dhanwantri, enriched at the Secure Data Exchange Workstation, received for review in ADN, then sanitised for the public return journey.</p>
              <div className="btn-row">
                <Link href="/idh" className="btn btn-primary" data-testid="link-start-idh"><Stethoscope size={15} /> Open i-Dhanwantri <ArrowRight size={15} /></Link>
                <button className="btn" onClick={reset} data-testid="button-reset-demo"><RotateCcw size={14} /> Reset / replay</button>
              </div>
              <div className="signature">IDH-2048 · SYNTHETIC CASE · LOCAL BROWSER STORAGE</div>
            </section>
            <div className="flowline" aria-label="Journey status">
              <div className={`flowstep ${state.recordSaved || state.examination.savedAt ? 'done' : 'current'}`}><span className="step-no">01 — CAPTURE</span><b>i-Dhanwantri</b><span>{state.examination.savedAt ? 'PME / AME examination saved' : state.recordSaved ? 'Clinical encounter saved' : 'Registration and examination'}</span></div>
              <div className={`flowstep ${state.workstationPackage ? 'done' : state.workstationPublicPackage || state.adnOutboundPackage ? 'current' : ''}`}><span className="step-no">02 — TRANSFORM</span><b>Exchange Workstation</b><span>{state.publicReleasePackage ? 'Sanitised public package ready' : state.workstationPackage ? 'Report recorded · package ready' : state.workstationPublicPackage ? 'Public package imported' : state.adnOutboundPackage ? 'ADN package imported' : state.publicPackage ? 'Public package exported · import next' : 'Import, validate, map'}</span></div>
              <div className={`flowstep ${state.adnPackage ? 'done' : ''}`}><span className="step-no">03 — REVIEW</span><b>Dhanwantri 3.0 ADN</b><span>{state.adnPackage ? 'Completed AFMSF record received' : 'Receive and review the completed form'}</span></div>
            </div>
            <div className="journey-layout">
              <div className="grid-three">
                <article className="surface portal-card public-card"><span className="card-number">PORTAL 01 / PUBLIC SIDE</span><h3>i-Dhanwantri</h3><p>Register the synthetic patient with UHID and capture the PME or AME clinical form.</p><Link href="/idh">Open clinical workspace →</Link></article>
                <article className="surface portal-card ws-card"><span className="card-number">PORTAL 02 / CONTROLLED WORKSTATION</span><h3>Secure Data Exchange</h3><p>Inspect source fields, run a distinct transformation and retain a human-readable operator report.</p><Link href="/workstation">Open transfer console →</Link></article>
                <article className="surface portal-card adn-card"><span className="card-number">PORTAL 03 / ADN SIDE</span><h3>Dhanwantri 3.0 ADN</h3><p>Receive the workstation-enriched AFMSF record and review its clinical and military sections.</p><Link href="/adn">Open medical record →</Link></article>
              </div>
              <aside className="surface panel-pad">
                <div className="eyebrow">Journey checkpoint</div><h2 className="section-title" style={{ marginTop: 8 }}>Current demo state</h2>
                <div className="record-row"><div><div className="record-label">Synthetic patient</div><div className="record-value">{state.patient.name}</div></div><span className="tag">REGISTERED</span></div>
                <div className="record-row"><div><div className="record-label">Clinical record</div><div className="record-value">{state.recordSaved ? 'Saved' : 'Not yet saved'}</div></div><Activity size={16} /></div>
                <div className="record-row"><div><div className="record-label">Exchange transaction</div><div className="record-value mono">{state.publicReleasePackage?.transactionId ?? state.workstationPackage?.transactionId ?? workstationInput?.transactionId ?? state.publicPackage?.transactionId ?? '—'}</div></div><ArrowLeftRight size={16} /></div>
                <div className="muted-note" style={{ marginTop: 16 }}>Local browser demo only. Package movement uses explicit XML download and import; paired PDFs are generated from the same record. No real network connection is made.</div>
              </aside>
            </div>
            <p className="signature">DHANWANTRI POC XML · CUSTOM FORMAT · NOT FHIR / CDA / CCD CONFORMANT</p>
          </main>
        </Route>
        <Route path="/idh">
          <PortalHeader active="idh" />
          <main className="page-wrap">
            <PageHeading kicker="i-Dhanwantri · Public-domain clinical capture" title="Patient registration and PME / AME" description="Register the synthetic patient, confirm the UHID, and capture the complete clinical examination here before transfer." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                  <div className="eyebrow">01 / Patient registration</div><h2 className="section-title" style={{ marginTop: 8 }}>Synthetic patient</h2><p className="section-sub">Pre-seeded demo identity. Edit or register the synthetic demographics used throughout this browser session.</p>
                  <div className="field-grid">
                    <Field label="Patient name" value={state.patient.name} onChange={v => updatePatient('name', v)} testId="input-patient-name" />
                    <Field label="Synthetic patient reference" value={state.patient.id} onChange={v => updatePatient('id', v)} testId="input-patient-id" />
                    <Field label="UHID · Unique Health Identifier" value={state.patient.uhid} onChange={v => updatePatient('uhid', v)} testId="input-patient-uhid" />
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
                <ClinicalCapture
                  examination={state.examination}
                  patient={state.patient}
                  formPage={formPage}
                  setFormPage={setFormPage}
                  onUpdate={updateExam}
                  onUhidChange={value => updatePatient('uhid', value)}
                  onSelectPme={selectPme}
                  onCreateAme={createAmE}
                  onSave={saveExamination}
                />
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">04 / Paired export</div><h2 className="section-title" style={{ marginTop: 8 }}>Clinical exchange</h2><p className="section-sub">Download a versioned PoC XML file and a human-readable AFMSF review PDF. Both share one transaction ID and examination record; the generated layout is not an exact source-form facsimile.</p>
                  <div className="record-row"><div><div className="record-label">Exchange format</div><div className="record-value">Dhanwantri PoC XML · v1.0</div></div><FileText size={17} /></div>
                  <div className="record-row"><div><div className="record-label">Linked form</div><div className="record-value">{state.examination.type === 'PME' ? 'AFMSF 3A · three pages' : 'AFMSF 3B · two pages'}</div></div><span className="tag">XML + PDF</span></div>
                  <button className="btn btn-primary" style={{ width: '100%', marginTop: 16 }} onClick={exportPublic} disabled={!state.examination.savedAt} data-testid="button-export-public"><ArrowDownToLine size={15} /> Download clinical XML + PDF</button>
                  {!state.examination.savedAt && <p className="section-sub" style={{ margin: '10px 0 0' }}>Save the PME/AME examination to enable export.</p>}
                  {state.publicPackage && <div className="muted-note" style={{ marginTop: 16 }}>Latest transaction · <span className="mono">{state.publicPackage.transactionId}</span><br />Import the XML file at the workstation. The public source record remains unchanged.</div>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">Saved record snapshot</div><div className="record-row"><div><div className="record-label">Patient / encounter</div><div className="record-value">{state.patient.name} · {state.encounter.id}</div></div><ClipboardList size={16} /></div>
                  <div className="record-row"><div><div className="record-label">Complaint</div><div className="record-value">{state.encounter.complaint || '—'}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Assessment</div><div className="record-value">{state.encounter.assessment || '—'}</div></div></div>
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">05 / Return from military domain</div>
                  <h2 className="section-title" style={{ marginTop: 8 }}>Receive sanitised clinical copy</h2>
                  <p className="section-sub">Import the workstation's sanitised XML to complete the return journey. This is stored separately; the original public source record is preserved.</p>
                  <PackageImporter onFile={importPublicReturn} />
                  {importError && <div className="muted-note" role="alert" style={{ marginTop: 12 }}>{importError}</div>}
                  {state.publicReceivedPackage && <div className="muted-note" style={{ marginTop: 14 }} data-testid="status-public-return">
                    Returned UHID {state.publicReceivedPackage.patient.uhid} · AFMSF {state.publicReceivedPackage.examination?.type === 'PME' ? '3A / PME' : '3B / AME'} · TXN {state.publicReceivedPackage.transactionId}.
                    <br />Military identifiers were removed; the original public source remains unchanged.
                  </div>}
                </section>
              </aside>
            </div>
            <div className="muted-note" style={{ marginTop: 18 }}>XML uses the versioned Dhanwantri PoC exchange format; it is not FHIR, CDA or CCD. This local-only demo uses synthetic data and has no production security accreditation.</div>
          </main>
        </Route>
        <Route path="/workstation">
          <PortalHeader active="workstation" />
          <main className="page-wrap">
            <PageHeading kicker="Transfer control · Operator workspace" title="Validate, enrich and sanitise exchange packages" description="Import a public clinical XML package, validate its UHID and examination, add military identity only here, or sanitise an ADN package for public release." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                  <div className="eyebrow">01 / Inbound package</div><h2 className="section-title" style={{ marginTop: 8 }}>Import a transfer package</h2><p className="section-sub">Import a public-side package for ADN, or an ADN outbound package for public-side sanitisation. No direct connection is made.</p>
                  <PackageImporter onFile={importWorkstation} />
                  {importError && <div className="muted-note" role="alert" style={{ marginTop: 12, borderColor: '#b75a4f' }}>{importError}</div>}
                  {workstationInput && <div style={{ marginTop: 16 }}>
                    <div className="record-row"><div><div className="record-label">Transaction / received</div><div className="record-value mono">{workstationInput.transactionId} · {new Date(workstationInput.createdAt).toLocaleString()}</div></div><span className="tag">IMPORTED</span></div>
                    <div className="record-row"><div><div className="record-label">UHID / examination</div><div className="record-value">{workstationInput.patient.uhid || 'UHID missing'} · {workstationInput.examination?.type || 'Examination missing'}</div></div></div>
                    <div className="record-row"><div><div className="record-label">Source → destination</div><div className="record-value">{workstationInput.source} → Secure Data Exchange Workstation</div></div></div>
                    <div className="record-row"><div><div className="record-label">Schema/profile label</div><div className="record-value">{workstationInput.profile}</div></div></div>
                  </div>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">02 / Validation and mapping</div><h2 className="section-title" style={{ marginTop: 8 }}>Supported fields</h2><p className="section-sub">A readable mapping view of package content. Absent source values are reported as blank.</p>
                  {workstationInput ? <>
                    <div className={`validation-panel ${requiredTransferFields.length ? 'has-warnings' : 'is-valid'}`} role="status" data-testid="status-package-validation">
                      <b>{requiredTransferFields.length ? 'Package loaded with validation warnings' : 'Package structure, UHID and examination are present'}</b>
                      <span>{requiredTransferFields.length ? `${requiredTransferFields.length} required value${requiredTransferFields.length === 1 ? '' : 's'} missing; nothing will be invented.` : 'The saved PME/AME clinical package is ready for field mapping.'}</span>
                      {requiredTransferFields.length > 0 && <small>Missing: {requiredTransferFields.join(', ')}</small>}
                    </div>
                    <MappingTable pkg={workstationInput} />
                  </> : <EmptyState icon={<FolderOpen size={19} />} title="No package loaded" body="Import a versioned XML exchange package to review mapping and field availability." />}
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
                       const mutableGroupFields = TRANSFER_FIELDS.filter(item => item.group === group
                         && !item.lockedFor?.includes(profileDirection)
                         && !item.requiredFor?.includes(profileDirection));
                      const selectedCount = mutableGroupFields.filter(item => profileSelected.has(item.id)).length;
                      return <details className="profile-group" key={group} open={index === 0}>
                        <summary><b>{group}</b><span>{selectedCount}/{mutableGroupFields.length} selected</span></summary>
                        <div className="profile-group-actions">
                          <button type="button" className="text-button" onClick={() => updateProfileGroup(group, true)} disabled={!mutableGroupFields.length}>Select available</button>
                          <button type="button" className="text-button" onClick={() => updateProfileGroup(group, false)} disabled={!mutableGroupFields.length}>Deselect available</button>
                        </div>
                        {groupFields.map(item => {
                          const locked = item.lockedFor?.includes(profileDirection) ?? false;
                          const required = item.requiredFor?.includes(profileDirection) ?? false;
                          return <label className={`profile-field ${locked ? 'locked' : ''}`} key={item.id}>
                            <input type="checkbox" checked={profileSelected.has(item.id)} disabled={locked || required} onChange={event => updateProfileField(item.id, event.target.checked)} data-testid={`checkbox-profile-${item.id.replaceAll('.', '-')}`} />
                            <span className="profile-field-label"><b>{item.label}</b><code>{item.id}</code></span>
                            {locked ? <span className="profile-badge locked-badge">Locked out</span> : required ? <span className="profile-badge review-badge">Required</span> : item.review ? <span className="profile-badge review-badge">Review</span> : null}
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
                  <div className="muted-note" style={{ margin: '14px 0' }}><b>PoC safeguard.</b> Demo rules only, not approved sanitisation guidance. A required MII and any other military values are added here only. Transformations never modify the imported source.</div>
                  {!state.adnOutboundPackage && <div className="field-grid">
                    <Field label="Military Identity Identifier (MII)" value={military.mii} onChange={v => setMilitary({ ...military, mii: v })} testId="input-mii" />
                    <Field label="ADN personnel number" value={military.serviceNumber} onChange={v => setMilitary({ ...military, serviceNumber: v })} testId="input-mii-service-number" />
                    <Field label="Rank" value={military.rank} onChange={v => setMilitary({ ...military, rank: v })} testId="input-mii-rank" />
                    <Field label="Unit / ship" value={military.unit} onChange={v => setMilitary({ ...military, unit: v })} testId="input-mii-unit" />
                    <Field label="Service" value={military.service} onChange={v => setMilitary({ ...military, service: v })} testId="input-mii-service" />
                  </div>}
                  <div className="btn-row" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={() => transform('add')} disabled={!state.workstationPublicPackage || state.appliedProfile?.direction !== 'public-to-adn' || requiredTransferFields.length > 0} data-testid="button-add-mii-pii"><Plus size={14} /> Add military fields</button>
                    <button className="btn btn-danger" onClick={() => transform('strip')} disabled={!state.adnOutboundPackage || state.appliedProfile?.direction !== 'adn-to-public' || requiredTransferFields.length > 0} data-testid="button-strip-mii-pii"><Trash2 size={14} /> Sanitise for public</button>
                  </div>
                   <p className="section-sub" style={{ margin: '11px 0 0' }}>{state.adnOutboundPackage ? 'ADN → Public is active. Sanitisation removes military identity and administrative fields from the outgoing copy; the imported source remains unchanged.' : 'Public → ADN is active. Add uses only operator-supplied military values; clinical values come from the saved public examination.'}</p>
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
            <PageHeading kicker="Dhanwantri 3.0 ADN · Military-domain receipt" title="Received military medical record" description="Import the workstation-enriched package and review the completed AFMSF record. Clinical examination remains in the public source record and is not re-entered here." />
            <div className="grid-two">
              <div>
                <section className="surface panel-pad">
                    <div className="eyebrow">01 / ADN package import</div><h2 className="section-title" style={{ marginTop: 8 }}>Receiving record</h2><p className="section-sub">Import the workstation's versioned XML package. Legacy JSON packages remain accepted for replay compatibility.</p>
                  <PackageImporter onFile={importAdn} />
                  {importError && <div className="muted-note" role="alert" style={{ marginTop: 12 }}>{importError}</div>}
                  <div className="btn-row" style={{ marginTop: 16 }}>
                    <button className={`btn ${adnTab === 'record' ? 'btn-primary' : ''}`} onClick={() => setAdnTab('record')} data-testid="button-adn-record-tab"><UserRound size={14} /> Patient record</button>
                    <button className={`btn ${adnTab === 'form' ? 'btn-primary' : ''}`} onClick={() => setAdnTab('form')} data-testid="button-adn-form-tab"><FileText size={14} /> AFMSF review</button>
                  </div>
                  <button className="btn" style={{ marginTop: 12 }} onClick={exportAdnForSanitisation} disabled={!state.adnPackage} data-testid="button-export-adn-outbound"><ArrowDownToLine size={14} /> Export ADN package for sanitisation</button>
                    <p className="section-sub" style={{ margin: '8px 0 0' }}>Download the military record's XML and matching AFMSF PDF, then import the XML at the workstation for outbound sanitisation.</p>
                </section>
                {adnTab === 'record' ? <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">02 / Military patient record</div><h2 className="section-title" style={{ marginTop: 8 }}>{patient.name || 'No patient package imported'}</h2>
                    <p className="section-sub">{patientPackage ? `UHID ${patient.uhid || '—'} · imported through workstation` : 'Import a package to populate the patient and clinical record.'}</p>
                  {patientPackage ? <>
                    <div className="record-row"><div><div className="record-label">UHID · Unique Health Identifier</div><div className="record-value">{patient.uhid || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.uhid')} /></div>
                    <div className="record-row"><div><div className="record-label">Date of birth</div><div className="record-value">{patient.dob || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.dob')} /></div>
                    <div className="record-row"><div><div className="record-label">Sex</div><div className="record-value">{patient.sex || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.sex')} /></div>
                    <div className="record-row"><div><div className="record-label">Military Identity Identifier (MII)</div><div className="record-value">{patient.mii || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.mii')} /></div>
                    <div className="record-row"><div><div className="record-label">ADN personnel number</div><div className="record-value">{patient.serviceNumber || '—'}</div></div><ProvenanceMark item={provenanceFor('patient.serviceNumber')} /></div>
                    <div className="record-row"><div><div className="record-label">Rank · Unit · Service</div><div className="record-value">{[patient.rank, patient.unit, patient.service].filter(Boolean).join(' · ') || '—'}</div></div><span className="prov prov-enriched">WORKSTATION / BLANK IF ABSENT</span></div>
                    <div className="record-row"><div><div className="record-label">Presenting complaint</div><div className="record-value">{encounter.complaint || '—'}</div></div><ProvenanceMark item={provenanceFor('encounter.complaint')} /></div>
                    <div className="record-row"><div><div className="record-label">History</div><div className="record-value">{encounter.history || '—'}</div></div><ProvenanceMark item={provenanceFor('encounter.history')} /></div>
                    <div className="record-row"><div><div className="record-label">Findings · assessment · plan</div><div className="record-value">{[encounter.findings, encounter.assessment, encounter.plan].filter(Boolean).join(' / ') || '—'}</div></div><span className="prov prov-imported">IMPORTED · i-DHANWANTRI</span></div>
                    <p className="signature">TXN {patientPackage.transactionId} · {patientPackage.profile}</p>
                  </> : <EmptyState icon={<Upload size={18} />} title="Awaiting ingest package" body="Import the XML file produced by the workstation. Legacy JSON packages are accepted for replay." />}
                </section> : patientPackage
                  ? <ExaminationReview examination={state.examination} patient={patient} />
                  : <section className="surface panel-pad" style={{ marginTop: 16 }}>
                    <EmptyState icon={<FileText size={18} />} title="No examination to review" body="Import the workstation-enriched XML package to see the completed AFMSF 3A or 3B record." />
                  </section>}
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">Field-level provenance</div><h2 className="section-title" style={{ marginTop: 8 }}>Where values came from</h2>
                  <div className="record-row"><span className="prov prov-imported">IMPORTED</span><div className="record-value">From i-Dhanwantri package</div></div>
                  <div className="record-row"><span className="prov prov-enriched">ENRICHED</span><div className="record-value">Entered by workstation operator</div></div>
                  <div className="record-row"><span className="prov prov-entered">REVIEWED IN ADN</span><div className="record-value">Read-only receipt; no clinical re-entry</div></div>
                  {patientPackage?.provenance?.length ? <p className="signature">{patientPackage.provenance.length} source field references in package</p> : <p className="section-sub" style={{ margin: '14px 0 0' }}>Import a package to show field-specific origins.</p>}
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">Exchange output</div><h2 className="section-title" style={{ marginTop: 8 }}>Paired record files</h2>
                  <p className="section-sub">The workstation produces an XML exchange file and a direct-download PDF from the same transformed record. Use the outbound action below for the return journey.</p>
                  <div className="record-row"><div><div className="record-label">Record reference</div><div className="record-value mono">{state.examination.examinationRef}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Template reference</div><div className="record-value">{state.examination.templateRef}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Source record</div><div className="record-value mono">{state.examination.sourceExaminationRef || 'Current examination record'}</div></div></div>
                  <div className="record-row"><div><div className="record-label">Patient identifier</div><div className="record-value">{patient.uhid || 'UHID unavailable'}</div></div></div>
                  {state.examination.documentRef && <p className="signature" data-testid="text-document-reference">{state.examination.documentRef} · {state.examination.documentCreatedAt}</p>}
                </section>
              </aside>
            </div>
            {adnTab === 'form' && patientPackage && <div id="print-document" className="print-document">
              <div className="print-preview-warning no-print">Browser review layout only; it follows section order but is not a faithful source-form facsimile. Official marks and uploaded patient values are omitted.</div>
              {activeFormPages.map(page => <section className={`afmsf-print-page ${state.examination.type === 'AME' ? 'afmsf-print-page--ame' : ''} ${page.number === 2 ? 'afmsf-print-page--2' : ''}`} key={`${state.examination.type}-${page.number}`} data-testid={`print-page-${page.number}`}>
                <header className="afmsf-print-header">
                  <b className="confidential-mark">CONFIDENTIAL</b>
                  <span className="synthetic-mark">DEMO · SYNTHETIC DATA · PAGE {page.number} OF {page.total}</span>
                  <h2>{state.examination.type === 'PME' ? 'PERIODIC / SPECIAL MEDICAL EXAMINATION' : 'ANNUAL MEDICAL EXAMINATION'}</h2>
                  <b className="afmsf-form-code">{state.examination.type === 'PME' ? 'A.F.M.S.F. 3A (Ver-2002)' : 'A.F.M.S.F. 3B (Ver 2002)'}</b>
                </header>
                {page.continuationIdentity && <ContinuationIdentityStrip values={state.examination.values} uhid={patient.uhid || ''} />}
                {page.sections.map(group => group.title === 'Personal Data'
                  ? <PrintPersonalData key={group.title} type={state.examination.type} values={state.examination.values} patient={patient} />
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
            </div>}
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
function ClinicalCapture({
  examination, patient, formPage, setFormPage, onUpdate, onUhidChange,
  onSelectPme, onCreateAme, onSave,
}: {
  examination: Examination;
  patient: Patient;
  formPage: number;
  setFormPage: (page: number) => void;
  onUpdate: (field: string, value: string) => void;
  onUhidChange: (value: string) => void;
  onSelectPme: () => void;
  onCreateAme: () => void;
  onSave: () => void;
}) {
  const pages = FORM_PAGES[examination.type];
  const page = pages.find(item => item.number === formPage) ?? pages[0];
  const fields = [...new Map(pages.flatMap(item => item.sections.flatMap(group => group.fields))
    .filter(item => !MILITARY_ONLY_EXAM_FIELDS.includes(item.key as typeof MILITARY_ONLY_EXAM_FIELDS[number]))
    .map(item => [item.key, item])).values()];
  const blankCount = fields.filter(item => !examination.values[item.key]?.trim()).length;
  return <section className="surface panel-pad" style={{ marginTop: 16 }}>
    <div className="eyebrow">03 / Public-domain clinical examination</div>
    <h2 className="section-title" style={{ marginTop: 8 }}>
      {examination.type === 'PME' ? 'PME · AFMSF 3A' : 'AME · AFMSF 3B'}
    </h2>
    <p className="section-sub">Clinical capture takes place in i-Dhanwantri. Military identifiers are not requested or included here. The examination is saved against this patient UHID.</p>
    <div className="identity-banner">
      <Field label="1. UHID · Unique Health Identifier" value={patient.uhid} onChange={onUhidChange} testId="input-clinical-uhid" />
      <div><b>Patient</b><span>{patient.name || 'Not recorded'} · {patient.dob || 'Date of birth blank'}</span></div>
    </div>
    <div className="btn-row" style={{ margin: '14px 0 10px' }}>
      <button type="button" className={`btn ${examination.type === 'PME' ? 'btn-primary' : ''}`} onClick={onSelectPme} data-testid="button-select-pme">PME · AFMSF 3A</button>
      <button type="button" className={`btn ${examination.type === 'AME' ? 'btn-primary' : ''}`} onClick={onCreateAme} data-testid="button-select-ame">AME · AFMSF 3B</button>
    </div>
    <div className="form-page-nav" role="tablist" aria-label="Clinical AFMSF pages">
      {pages.map(item => <button key={item.number} type="button" role="tab" aria-selected={formPage === item.number}
        className={formPage === item.number ? 'active' : ''} onClick={() => setFormPage(item.number)}>
        Page {item.number} of {item.total}
      </button>)}
    </div>
    <div className="form-page-title"><span>{page.continuation ? 'CONTINUATION' : 'EXAMINATION FORM'}</span><b>{page.title}</b></div>
    <div className="exam-sections">
      {page.sections.map(group => <section className="exam-section" key={group.title}>
        <h3>{group.title}</h3>
        <div className="field-grid">
          {group.fields.filter(item => !MILITARY_ONLY_EXAM_FIELDS.includes(item.key as typeof MILITARY_ONLY_EXAM_FIELDS[number]))
            .map(item => item.key === 'dental.tooth_chart'
              ? <div className="field full" key={item.key}>
                <label>{item.label}</label>
                <DentalChart value={examination.values[item.key] ?? ''} onChange={value => onUpdate(item.key, value)} testId="public-dental-chart" />
                <small className="field-provenance">{examination.provenance[item.key] || 'Blank · no markings entered'}</small>
              </div>
              : <Field key={item.key}
                label={item.label}
                type={item.type === 'textarea' ? 'text' : item.type}
                options={item.options}
                value={examination.values[item.key]
                  || (item.key === 'person.name' ? patient.name : item.key === 'person.date_of_birth' ? patient.dob : item.key === 'person.sex' ? patient.sex : '')}
                provenance={examination.provenance[item.key]}
                onChange={value => onUpdate(item.key, value)}
                testId={`input-public-exam-${item.key.replaceAll('.', '-')}`}
                full={item.type === 'textarea'}
                multiline={item.type === 'textarea'}
              />)}
        </div>
      </section>)}
    </div>
    <div className="btn-row" style={{ marginTop: 18 }}>
      <button type="button" className="btn btn-primary" onClick={onSave} data-testid="button-save-examination">
        <BadgeCheck size={15} /> Save clinical examination
      </button>
      {examination.savedAt && <span className="tag" data-testid="status-examination-saved">SAVED · {new Date(examination.savedAt).toLocaleString()}</span>}
    </div>
    <div className="muted-note" style={{ marginTop: 14 }}>{blankCount} clinical fields remain blank. No findings are assumed or populated automatically.</div>
    <div className="source-reference-warning">This review layout follows the source forms' section structure but is not a faithful facsimile. Official marks and values from the uploaded patient examples are omitted.</div>
  </section>;
}

function ExaminationReview({ examination, patient }: { examination: Examination; patient: Partial<Patient> }) {
  const pages = FORM_PAGES[examination.type];
  return <section className="surface panel-pad" style={{ marginTop: 16 }}>
    <div className="eyebrow">03 / Received military medical record</div>
    <h2 className="section-title" style={{ marginTop: 8 }}>
      {examination.type === 'PME' ? 'Completed PME · AFMSF 3A' : 'Completed AME · AFMSF 3B'}
    </h2>
    <p className="section-sub">Read-only review of the clinical examination captured in i-Dhanwantri and the workstation-enriched military fields. No clinical re-entry is required in ADN.</p>
    <div className="record-row"><div><div className="record-label">UHID · Unique Health Identifier</div><div className="record-value">{patient.uhid || '—'}</div></div><span className="prov prov-imported">COMMON PATIENT ID</span></div>
    <div className="record-row"><div><div className="record-label">Military Identity Identifier (MII)</div><div className="record-value">{patient.mii || 'Blank · not supplied'}</div></div><span className="prov prov-enriched">WORKSTATION ENRICHMENT</span></div>
    <div className="record-row"><div><div className="record-label">Military number · rank · unit · service</div><div className="record-value">{[patient.serviceNumber, patient.rank, patient.unit, patient.service].filter(Boolean).join(' · ') || 'Blank · no enrichment values supplied'}</div></div><span className="prov prov-enriched">WORKSTATION ENRICHMENT</span></div>
    {pages.map(page => <details className="review-page" key={page.number} open={page.number === 1}>
      <summary>{page.title}</summary>
      {page.sections.filter(section => section.title !== 'Continuation identity strip').map(section => <div className="review-section" key={`${page.number}-${section.title}`}>
        <h3>{section.title}</h3>
        <dl>{section.fields.map(field => {
          const value = examination.values[field.key] ?? '';
          return <div key={field.key}><dt>{field.key === 'person.adn_personnel_number' ? 'Military number' : field.label}</dt><dd>{value || '—'}</dd></div>;
        })}</dl>
      </div>)}
    </details>)}
    <div className="muted-note" style={{ marginTop: 14 }}>UHID is shared across domains. Military-only identifiers were added at the workstation. This local synthetic demo is not connected to a secure military network.</div>
  </section>;
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
    <small className="field-provenance" data-testid={`provenance-${testId.slice('input-form-'.length)}`}>{provenance || (value ? 'Entered in this portal' : 'Blank · no value available')}</small>
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
function ContinuationIdentityStrip({ values, uhid }: { values: Record<string, string>; uhid: string }) {
  return <div className="continuation-identity">
    <span><b>UHID</b>{uhid || '\u00a0'}</span>
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
  return <div className="dropzone"><div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}><Upload size={21} /></div><div style={{ fontWeight: 700, fontSize: 12 }}>Choose a Dhanwantri XML exchange file</div><div className="section-sub" style={{ margin: '5px 0 0' }}>Versioned PoC XML · legacy JSON files remain accepted · manual local handoff</div><input type="file" accept=".xml,application/xml,text/xml,.json,application/json" onChange={handle} data-testid="input-package-import" /></div>;
}
function MappingTable({ pkg }: { pkg: ExchangePackage }) {
  const rows = [
    ['Synthetic reference', pkg.patient.id, 'person.source_patient_id'],
    ['UHID', pkg.patient.uhid, 'person.uhid'],
    ['Name', pkg.patient.name, 'person.name'],
    ['Date of birth', pkg.patient.dob, 'person.date_of_birth'],
    ['Sex', pkg.patient.sex, 'person.sex'],
    ['Presenting complaint', pkg.encounter.complaint, 'clinical.present_complaints'],
    ['History', pkg.encounter.history, 'clinical.past_medical_history'],
    ['Findings', pkg.encounter.findings, 'clinical.general_observations'],
    ['Assessment', pkg.encounter.assessment, 'clinical.assessment'],
    ['Plan', pkg.encounter.plan, 'clinical.plan'],
    ['Clinician', pkg.encounter.clinician, 'actor.clinician'],
    ['Examination type', pkg.examination?.type, 'examination.type'],
    ['Clinical examination date', pkg.examination?.values?.['exam.date'], 'examination.values[exam.date]'],
    ['Clinical history', pkg.examination?.values?.['clinical.past_medical_history'], 'examination.values[clinical.past_medical_history]'],
    ['Clinical findings', pkg.examination?.values?.['clinical.general_observations'], 'examination.values[clinical.general_observations]'],
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
function PrintPersonalData({ type, values, patient }: { type: 'PME' | 'AME'; values: Record<string, string>; patient: Partial<Patient> }) {
  const value = (key: string) => values[key]?.trim() ?? '';
  const militaryNumber = patient.serviceNumber || value('person.adn_personnel_number');
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
      <PrintCell label={militaryNumber ? '1. Military number / UHID' : '1. UHID'} value={militaryNumber ? `${militaryNumber} · UHID ${patient.uhid || '—'}` : patient.uhid || '—'} />
      {patient.mii && <PrintCell label="Military Identity Identifier (MII)" value={patient.mii} />}
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
