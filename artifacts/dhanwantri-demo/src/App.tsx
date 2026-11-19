import { type ChangeEvent, type FormEvent, type ReactNode, useEffect, useState } from 'react';
import { Link, Route, Switch, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, ArrowDownToLine, ArrowLeftRight, ArrowRight, BadgeCheck, ClipboardList,
  FileJson, FileText, FolderOpen, Plus, Printer, RotateCcw,
  ShieldAlert, ShieldCheck, Stethoscope, Trash2, Upload, UserRound, Workflow,
} from 'lucide-react';
import {
  blankExaminationValues, FORM_SECTIONS, makeBlankExamination, PME_TO_AME_FIELDS,
  type ExaminationType,
} from './lib/afmsfForms';

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
  destination: string; createdAt: string; profile: string; patient: Patient;
  encounter: Encounter; provenance: Provenance[]; militaryFields?: Record<string, string>;
  examination?: Examination;
};
type TransformationReport = {
  direction: string; operator: string; time: string; actions: string[]; warnings: string[]; result: string;
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
      return { ...initialState(), ...parsed, examination: normalizeExamination(parsed.examination) };
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
function readPackage(file: File, success: (pkg: ExchangePackage) => void, failure: (message: string) => void) {
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(String(reader.result)) as ExchangePackage;
      if (parsed?.kind !== 'dhanwantri-exchange' || !parsed.patient || !parsed.encounter) throw new Error('This file is not a supported Dhanwantri demo exchange package.');
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
    setLocation('/');
    setNotice('Demo reset. A fresh synthetic patient is ready.');
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
    } else {
      update('workstationPublicPackage', pkg);
      update('adnOutboundPackage', null);
      update('publicReleasePackage', null);
      update('adnPackage', null);
    }
    update('workstationPackage', null);
    update('report', null);
    setImportError('');
    setNotice(fromAdn
      ? 'ADN-origin package imported for public-side sanitisation.'
      : 'Public-side package imported for ADN mapping.');
  }, setImportError);
  const transform = (operation: 'add' | 'strip') => {
    const source = operation === 'add' ? state.workstationPublicPackage : state.adnOutboundPackage;
    if (!source) {
      setNotice(operation === 'add'
        ? 'Import a public-side package before adding ADN fields.'
        : 'Import an ADN-origin package before stripping fields.');
      return;
    }
    const actions: string[] = ['Mapped supported patient demographics and encounter fields; the imported source package remains unchanged.'];
    let militaryFields: Record<string, string> = {};
    let patient = { ...source.patient };
    let provenance = [...(source.provenance ?? [])];
    let examination = source.examination ? { ...source.examination } : undefined;
    if (operation === 'add') {
      militaryFields = Object.fromEntries(Object.entries(military).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]));
      patient = { ...patient, ...militaryFields };
      Object.keys(militaryFields).forEach(field => provenance.push({ field: `patient.${field}`, origin: 'enriched', source: 'Workstation operator entry', at: now() }));
      actions.push(Object.keys(militaryFields).length ? `Add MII/PII: enriched ${Object.keys(militaryFields).join(', ')} on outgoing copy.` : 'Add MII/PII: operation recorded; no operator-supplied military fields were populated.');
    } else {
      const removed = ['serviceNumber', 'rank', 'unit', 'service', 'phone', 'email', 'address']
        .filter(key => Boolean((patient as unknown as Record<string, string>)[key]));
      patient = { ...patient, serviceNumber: '', rank: '', unit: '', service: '', phone: '', email: '', address: '' };
      const removedFields = new Set([
        'patient.serviceNumber', 'patient.rank', 'patient.unit', 'patient.service',
        'patient.phone', 'patient.email', 'patient.address',
      ]);
      provenance = provenance.filter(item => !removedFields.has(item.field));
      if (examination) {
        const restrictedFormFields = [
          'person.adn_personnel_number', 'person.rank', 'person.unit_ship', 'person.service',
          'person.arms_corps', 'person.branch_trade', 'person.commission_type',
          'person.commission_date', 'person.total_service', 'exam.place', 'exam.authority',
          'exam.previous_ame_place', 'exam.previous_pme_place', 'category.present',
          'category.effective_date', 'category.final', 'category.board_fitness',
          'category.recommendation', 'actor.medical_specialist', 'actor.surgical_specialist',
          'actor.gynaecologist', 'actor.dental_officer', 'actor.eye_specialist',
          'actor.ent_specialist', 'actor.medical_attendant', 'actor.approving_authority',
          'exam.board_place_date', 'exam.board_member_1', 'exam.board_member_2', 'exam.board_president',
          'exam.officer_acknowledgement',
        ];
        const formValues = { ...(examination.values ?? {}) };
        const formProvenance = { ...examination.provenance };
        const removedFormFields = restrictedFormFields.filter(key => Boolean(formValues[key]));
        restrictedFormFields.forEach(key => {
          formValues[key] = '';
          delete formProvenance[key];
        });
        if (examination.place || examination.authority || removedFormFields.length) {
          actions.push('Removed military service, category, authority and signature fields from the outgoing examination copy.');
        }
        examination = {
          ...examination,
          place: '',
          authority: '',
          values: formValues,
          provenance: formProvenance,
        };
      }
      militaryFields = {};
      actions.push(`Strip MII/PII: removed ${removed.length ? removed.join(', ') : 'military/contact identifiers (none present)'} from outgoing copy only.`);
    }
    const report: TransformationReport = {
      direction: operation === 'add' ? 'Public → ADN · Add MII/PII' : 'ADN → Public · Strip MII/PII',
      operator: 'Demo workstation operator', time: now(), actions,
      warnings: [
        'Illustrative PoC rules only; not an approved sanitisation policy.',
        'FHIR-inspired label is representational and does not claim FHIR or ABDM conformance.',
        'Missing clinical values were left blank. Review free text for identifiers before any real release.',
      ],
      result: 'Demo mapping recorded · not standards-validated',
    };
    const out: ExchangePackage = {
      ...source,
      transactionId: makeId('TXN'),
      source: 'Secure Data Exchange Workstation',
      destination: operation === 'add' ? 'Dhanwantri 3.0 ADN' : 'i-Dhanwantri public side',
      createdAt: now(),
      profile: operation === 'add' ? 'ADN ingest projection · mapping v1.0' : 'ADN-to-public projection · illustrative v1.0',
      patient, provenance, militaryFields, examination,
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
    setImportError('');
    setNotice('ADN ingest package imported. Field provenance is available below.');
    setAdnTab('record');
  }, setImportError);
  const exportAdn = () => {
    if (!state.workstationPackage) { setNotice('Run an explicit workstation transformation before exporting.'); return; }
    downloadJson(`${state.workstationPackage.transactionId}-adn-ingest.json`, state.workstationPackage);
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
    setNotice('Sanitised public-side package exported as JSON.');
  };
  const updatePatient = (field: keyof Patient, value: string) => update('patient', { ...state.patient, [field]: value });
  const updateEncounter = (field: keyof Encounter, value: string) => {
    update('encounter', { ...state.encounter, [field]: value });
    update('recordSaved', false);
  };
  const updateExam = (field: string, value: string) => {
    const provenance = { ...state.examination.provenance, [field]: 'ADN-entered / amended' };
    update('examination', {
      ...state.examination,
      values: { ...state.examination.values, [field]: value },
      provenance,
      savedAt: '',
      documentRef: '',
      documentCreatedAt: '',
    });
  };
  const selectPme = () => {
    if (state.examination.type === 'PME') return;
    update('examination', blankExam('PME'));
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
    setAdnTab('form');
    const blankCount = FORM_SECTIONS.AME.flatMap(group => group.fields)
      .filter(item => !projected.values[item.key]?.trim()).length;
    setNotice(`AME draft created; ${blankCount} fields remain blank for review or separate completion.`);
  };
  const currentPortal = path.startsWith('/workstation') ? 'workstation' : path.startsWith('/adn') ? 'adn' : 'public';
  const patientPackage = state.adnPackage;
  const workstationInput = state.adnOutboundPackage ?? state.workstationPublicPackage;
  const patient = patientPackage?.patient ?? state.patient;
  const encounter = patientPackage?.encounter ?? state.encounter;
  const provenanceFor = (field: string) => patientPackage?.provenance?.find(item => item.field === field);
  const activeFormSections = FORM_SECTIONS[state.examination.type];
  const blankFormFieldCount = activeFormSections.flatMap(group => group.fields)
    .filter(item => !state.examination.values[item.key]?.trim()).length;

  return (
    <div className={`app-shell portal-${currentPortal}`}>
      <Switch>
        <Route path="/">
          <header className="topbar">
            <div className="brandlock"><div className="brandmark">D3</div><div><div className="brandname">Dhanwantri interoperability PoC</div><div className="brandmeta">Three portals · one synthetic journey</div></div></div>
            <span className="demo-chip">DEMO / SYNTHETIC DATA</span>
          </header>
          <main className="page-wrap">
            <section className="hero-start surface">
              <div className="eyebrow">Committee demonstration · Local-only PoC</div>
              <h1>Capture once.<br />Exchange by design.</h1>
              <p>One synthetic clinical encounter travels through three distinct systems. Review every mapping, transformation and field origin along the way.</p>
              <div className="btn-row">
                <Link href="/idh" className="btn btn-primary" data-testid="link-start-idh"><Stethoscope size={15} /> Begin the journey <ArrowRight size={15} /></Link>
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
            <PageHeading kicker="Internet-side HIS · Clinical capture" title="One visit, clearly structured." description="Synthetic patient registration and encounter capture. Save the structured record before creating a package for the workstation." />
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
            <PageHeading kicker="Transfer control · Operator workspace" title="A deliberate boundary between systems." description="Import a public-side package, inspect supported fields, then record an explicit Add or Strip MII/PII operation. These controls demonstrate a workflow; they are not a security boundary." />
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
                  {workstationInput ? <MappingTable pkg={workstationInput} /> : <EmptyState icon={<FolderOpen size={19} />} title="No package loaded" body="Import a JSON exchange package to review mapping and field availability." />}
                </section>
              </div>
              <aside>
                <section className="surface panel-pad">
                  <div className="eyebrow">03 / Explicit operation</div><h2 className="section-title" style={{ marginTop: 8 }}>Choose a transformation</h2>
                  <div className="muted-note" style={{ margin: '14px 0' }}><b>PoC safeguard.</b> Demonstration rules only, not approved sanitisation guidance. Removing values affects the outgoing copy only; source package is retained.</div>
                  {!state.adnOutboundPackage && <div className="field-grid">
                    <Field label="ADN personnel number" value={military.serviceNumber} onChange={v => setMilitary({ ...military, serviceNumber: v })} testId="input-mii-service-number" />
                    <Field label="Rank" value={military.rank} onChange={v => setMilitary({ ...military, rank: v })} testId="input-mii-rank" />
                    <Field label="Unit / ship" value={military.unit} onChange={v => setMilitary({ ...military, unit: v })} testId="input-mii-unit" />
                    <Field label="Service" value={military.service} onChange={v => setMilitary({ ...military, service: v })} testId="input-mii-service" />
                  </div>}
                  <div className="btn-row" style={{ marginTop: 16 }}>
                    <button className="btn btn-primary" onClick={() => transform('add')} disabled={!state.workstationPublicPackage} data-testid="button-add-mii-pii"><Plus size={14} /> Add MII / PII</button>
                    <button className="btn btn-danger" onClick={() => transform('strip')} disabled={!state.adnOutboundPackage} data-testid="button-strip-mii-pii"><Trash2 size={14} /> Strip MII / PII</button>
                  </div>
                  <p className="section-sub" style={{ margin: '11px 0 0' }}>{state.adnOutboundPackage ? 'ADN → Public is active. Strip removes service and contact identifiers from the outgoing copy; the imported source is retained.' : 'Public → ADN is active. Add uses only operator-supplied values above; import an ADN outbound package to run the separate Strip operation.'}</p>
                </section>
                <section className="surface panel-pad" style={{ marginTop: 16 }}>
                  <div className="eyebrow">04 / Transformation report</div><h2 className="section-title" style={{ marginTop: 8 }}>Operator record</h2>
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
            <PageHeading kicker="ADN-side military medical workflow" title="Receive, verify, reuse." description="Import the workstation's ADN package. Supported values remain traceable to their source; form-specific fields not present in the package stay blank until entered here." />
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
                  <div className="exam-sections">
                    {activeFormSections.map(group => <section className="exam-section" key={group.title}>
                      <h3>{group.title}</h3>
                      <div className="field-grid">
                        {group.fields.map(item => <Field
                          key={item.key}
                          label={item.label}
                          type={item.type === 'textarea' ? 'text' : item.type}
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
            <div id="print-document" className="print-sheet surface" style={{ marginTop: 18 }}>
              <div className="eyebrow no-print">Print preview · structured record source</div>
              <h2>{state.examination.type === 'PME' ? 'AFMSF 3A (Ver-2002) · PERIODIC / SPECIAL MEDICAL EXAMINATION' : 'AFMSF 3B (Ver 2002) · ANNUAL MEDICAL EXAMINATION'}</h2>
              <p className="print-banner">DEMO / SYNTHETIC DATA · DOCUMENTARY OUTPUT · TEMPLATE {state.examination.templateRef}</p>
              <div className="print-identifiers">
                <PrintCell label="Form reference" value={state.examination.type === 'PME' ? 'AFMSF 3A (Ver-2002)' : 'AFMSF 3B (Ver 2002)'} />
                <PrintCell label="Record reference" value={state.examination.examinationRef} />
                <PrintCell label="Document reference" value={state.examination.documentRef || 'Not generated'} />
                <PrintCell label="Document created" value={state.examination.documentCreatedAt || 'Not generated'} />
                <PrintCell label="Template version" value={state.examination.templateRef} />
                <PrintCell label="Source examination record" value={state.examination.sourceExaminationRef || 'Current record'} />
                <PrintCell label="Source transaction" value={state.examination.sourceTransactionRef || patientPackage?.transactionId || 'Not imported'} />
                <PrintCell label="Record saved" value={state.examination.savedAt || 'Not saved'} />
              </div>
              {activeFormSections.map(group => <section className="print-section" key={`print-${group.title}`}>
                <h3>{group.title}</h3>
                <div className="print-grid">
                  {group.fields.map(item => <PrintCell
                    key={item.key}
                    label={item.label}
                    value={state.examination.values[item.key] ?? ''}
                    provenance={state.examination.provenance[item.key] || (state.examination.values[item.key] ? 'Origin not recorded' : 'Blank · not available in source')}
                  />)}
                </div>
              </section>)}
              <p className="print-provenance">Output generated from the saved structured examination record. No digital signature is asserted.</p>
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
function Field({ label, value, onChange, testId, type = 'text', full = false, multiline = false, provenance }: {
  label: string; value: string; onChange: (value: string) => void; testId: string; type?: string; full?: boolean; multiline?: boolean; provenance?: string;
}) {
  return <div className={`field ${full ? 'full' : ''}`}><label htmlFor={testId}>{label}</label>{multiline
    ? <textarea id={testId} data-testid={testId} value={value} onChange={event => onChange(event.target.value)} />
    : <input id={testId} data-testid={testId} type={type} value={value} onChange={event => onChange(event.target.value)} />}
    <small className="field-provenance" data-testid={`provenance-${testId.slice('input-form-'.length)}`}>{provenance || (value ? 'ADN-entered / amended' : 'Blank · no value available')}</small>
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
    <div className="record-row"><div><div className="record-label">Direction / operator</div><div className="record-value">{report.direction}<br /><span className="mono">{report.operator}</span></div></div><Workflow size={16} /></div>
    <div className="record-row"><div><div className="record-label">Operation time / result</div><div className="record-value">{new Date(report.time).toLocaleString()}<br />{report.result}</div></div></div>
    <div style={{ marginTop: 13 }}>{report.actions.map((action, index) => <div className="audit-item" key={index}><time>ACTION {String(index + 1).padStart(2, '0')}</time><span>{action}</span></div>)}</div>
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
function PrintCell({ label, value, provenance }: { label: string; value: string; provenance?: string }) {
  return <div className="print-cell"><b>{label}</b><span>{value || '\u00a0'}</span>{provenance && <small>{provenance}</small>}</div>;
}
function NotFound() {
  return <div className="page-wrap"><div className="surface panel-pad"><div className="eyebrow">Unknown portal</div><h1 className="section-title" style={{ fontSize: 28, marginTop: 10 }}>This route is not in the demo.</h1><Link href="/" className="btn btn-primary" style={{ marginTop: 16 }}><ArrowRight size={15} /> Return to journey</Link></div></div>;
}
export default App;
