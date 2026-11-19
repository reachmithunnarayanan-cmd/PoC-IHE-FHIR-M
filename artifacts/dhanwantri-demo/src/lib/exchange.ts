import { jsPDF } from 'jspdf';
import { FORM_PAGES, type ExaminationType } from './afmsfForms';

type ExchangeLike = Record<string, unknown> & {
  transactionId?: string;
  source?: string;
  destination?: string;
  createdAt?: string;
  profile?: string;
  examination?: {
    type?: ExaminationType;
    examinationRef?: string;
    templateRef?: string;
    values?: Record<string, string>;
  };
  patient?: Record<string, string>;
  transferAudit?: {
    profile?: { mappingVersion?: string; version?: number };
  };
};

const escapeXml = (value: string) => value
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&apos;');

function xmlNode(name: string, value: unknown): string {
  if (value === null || value === undefined) {
    return `<field name="${escapeXml(name)}" type="null"/>`;
  }
  if (Array.isArray(value)) {
    return `<field name="${escapeXml(name)}" type="array">${value.map((item, index) => xmlNode(String(index), item)).join('')}</field>`;
  }
  if (typeof value === 'object') {
    const children = Object.entries(value as Record<string, unknown>)
      .map(([childName, childValue]) => xmlNode(childName, childValue)).join('');
    return `<field name="${escapeXml(name)}" type="object">${children}</field>`;
  }
  return `<field name="${escapeXml(name)}" type="${typeof value === 'boolean' || typeof value === 'number' ? typeof value : 'string'}">${escapeXml(String(value))}</field>`;
}

export function serializeExchangeXml(data: ExchangeLike): string {
  const payload = Object.fromEntries(Object.entries(data).filter(([key]) => key !== 'exchangeFormat'));
  return `<?xml version="1.0" encoding="UTF-8"?>\n<dhanwantriExchange format="dhanwantri-poc-exchange" formatVersion="1.0">\n${xmlNode('package', payload)}\n</dhanwantriExchange>`;
}

function readXmlNode(element: Element): unknown {
  const type = element.getAttribute('type') ?? 'string';
  if (type === 'null') return null;
  if (type === 'array') return [...element.children].map(readXmlNode);
  if (type === 'object') {
    return Object.fromEntries([...element.children].map(child => [
      child.getAttribute('name') ?? '',
      readXmlNode(child),
    ]));
  }
  const value = element.textContent ?? '';
  if (type === 'boolean') return value === 'true';
  if (type === 'number') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return value;
}

export function parseExchangeXml(xml: string): Record<string, unknown> {
  if (xml.length > 10_000_000) throw new Error('The XML package is larger than the 10 MB demo limit.');
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new Error('Document type and entity declarations are not accepted.');
  const document = new DOMParser().parseFromString(xml, 'application/xml');
  if (document.querySelector('parsererror')) throw new Error('The selected XML is not well-formed.');
  const root = document.documentElement;
  if (root.localName !== 'dhanwantriExchange'
    || root.getAttribute('format') !== 'dhanwantri-poc-exchange'
    || root.getAttribute('formatVersion') !== '1.0') {
    throw new Error('This XML is not a supported Dhanwantri PoC exchange package.');
  }
  const packageNode = [...root.children].find(child => child.getAttribute('name') === 'package');
  if (!packageNode) throw new Error('The XML package payload is missing.');
  const result = readXmlNode(packageNode);
  if (!result || typeof result !== 'object' || Array.isArray(result)) throw new Error('The XML package payload is invalid.');
  return result as Record<string, unknown>;
}

const MILITARY_FIELD_IDS = new Set([
  'person.mii',
  'person.adn_personnel_number',
  'person.rank',
  'person.unit_ship',
  'person.service',
  'person.arms_corps',
  'person.branch_trade',
  'person.commission_type',
  'person.commission_date',
  'person.total_service',
  'person.individual_signature',
  'actor.medical_specialist',
  'actor.surgical_specialist',
  'actor.gynaecologist',
  'actor.dental_officer',
  'actor.eye_specialist',
  'actor.ent_specialist',
  'actor.medical_attendant',
  'actor.approving_authority',
  'actor.perusing_authority',
  'exam.approving_authority_place',
  'exam.approving_authority_date',
  'exam.perusing_authority_place',
  'exam.perusing_authority_date',
  'exam.final_place',
  'exam.final_date',
  'exam.medicine_date',
  'exam.surgery_date',
  'exam.gynaecology_date',
  'exam.dental_date',
  'exam.eye_date',
  'exam.ent_date',
  'exam.board_place_date',
  'exam.board_member_1',
  'exam.board_member_2',
  'exam.board_president',
  'exam.officer_acknowledgement',
  'exam.authority',
  'exam.place',
  'exam.previous_ame_place',
  'exam.previous_ame_date',
  'exam.previous_pme_place',
  'exam.previous_pme_date',
  'exam.previous_report_ref',
  'enrichment.person.adn_personnel_number',
  'enrichment.person.mii',
  'enrichment.person.rank',
  'enrichment.person.unit_ship',
  'enrichment.person.service',
]);
const MILITARY_PATIENT_KEYS = new Set(['mii', 'serviceNumber', 'rank', 'unit', 'service']);

export function sanitizePublicExchange<T extends Record<string, unknown>>(source: T): T {
  const output = JSON.parse(JSON.stringify(source)) as T;
  const outputRecord = output as Record<string, unknown>;
  const patient = output.patient;
  if (patient && typeof patient === 'object' && !Array.isArray(patient)) {
    for (const key of MILITARY_PATIENT_KEYS) delete (patient as Record<string, unknown>)[key];
  }
  delete output.militaryFields;
  const examination = output.examination;
  if (examination && typeof examination === 'object' && !Array.isArray(examination)) {
    const exam = examination as Record<string, unknown>;
    const values = exam.values;
    if (values && typeof values === 'object' && !Array.isArray(values)) {
      for (const key of MILITARY_FIELD_IDS) delete (values as Record<string, unknown>)[key];
    }
    const provenance = exam.provenance;
    if (provenance && typeof provenance === 'object' && !Array.isArray(provenance)) {
      for (const key of MILITARY_FIELD_IDS) delete (provenance as Record<string, unknown>)[key];
    }
  }
  const provenance = outputRecord.provenance;
  if (Array.isArray(provenance)) {
    outputRecord.provenance = provenance.filter(item => {
      if (!item || typeof item !== 'object') return false;
      const field = String((item as Record<string, unknown>).field ?? '');
      return !/serviceNumber|\.mii$|\.rank$|\.unit$|\.service$|adn_personnel_number|arms_corps|branch_trade|commission|total_service|approving_authority|perusing_authority|officer_acknowledgement|individual_signature|board_member|board_president|board_place|medicine_date|surgery_date|gynaecology_date|dental_date|eye_date|ent_date|final_place|final_date|previous_ame|previous_pme|previous_report_ref|exam\.place/i.test(field);
    });
  }
  const audit = output.transferAudit;
  if (audit && typeof audit === 'object' && !Array.isArray(audit)) {
    const transferAudit = audit as Record<string, unknown>;
    for (const key of ['availableFieldIds', 'unavailableFieldIds']) {
      const ids = transferAudit[key];
      if (Array.isArray(ids)) transferAudit[key] = ids.filter(id => !MILITARY_FIELD_IDS.has(String(id)));
    }
    const profile = transferAudit.profile;
    if (profile && typeof profile === 'object' && !Array.isArray(profile)) {
      const snapshot = profile as Record<string, unknown>;
      for (const key of ['selectedFieldIds', 'excludedFieldIds']) {
        const ids = snapshot[key];
        if (Array.isArray(ids)) snapshot[key] = ids.filter(id => !MILITARY_FIELD_IDS.has(String(id)));
      }
    }
  }
  return output;
}

export function isSanitisedPublicExchange(source: Record<string, unknown>): boolean {
  const clean = sanitizePublicExchange(source);
  if (JSON.stringify(clean) !== JSON.stringify(source)) return false;
  const identifiers: string[] = [];
  const patient = source.patient;
  if (patient && typeof patient === 'object') {
    Object.entries(patient as Record<string, unknown>).forEach(([key, value]) => {
      if (MILITARY_PATIENT_KEYS.has(key) && typeof value === 'string' && value.trim()) identifiers.push(value.trim());
    });
  }
  const examination = source.examination;
  if (examination && typeof examination === 'object') {
    const values = (examination as Record<string, unknown>).values;
    if (values && typeof values === 'object') {
      Object.entries(values as Record<string, unknown>).forEach(([key, value]) => {
        if (MILITARY_FIELD_IDS.has(key) && typeof value === 'string' && value.trim()) identifiers.push(value.trim());
      });
    }
  }
  const cleanText = JSON.stringify(clean);
  return identifiers.every(identifier => !cleanText.includes(identifier));
}

export function downloadExchangeXml(filename: string, data: ExchangeLike): void {
  const xml = serializeExchangeXml(data);
  parseExchangeXml(xml);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const printable = (value: unknown): string => String(value ?? '')
  .replace(/[^\x20-\x7E]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

function drawDentalChart(doc: jsPDF, x: number, y: number, width: number, value: string): number {
  let markings: Record<string, string> = {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      markings = parsed as Record<string, string>;
    }
  } catch { /* Keep the chart empty if its source value is not valid chart JSON. */ }
  const quadrants = [
    ['UR', [18, 17, 16, 15, 14, 13, 12, 11]],
    ['UL', [21, 22, 23, 24, 25, 26, 27, 28]],
    ['LR', [48, 47, 46, 45, 44, 43, 42, 41]],
    ['LL', [31, 32, 33, 34, 35, 36, 37, 38]],
  ] as const;
  const labelWidth = 8;
  const toothWidth = (width / 2 - labelWidth) / 8;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.text('DENTAL TOOTH CHART   - Missing     x Unsaveable', x, y + 3);
  let rowY = y + 5;
  for (let row = 0; row < 2; row += 1) {
    const cells = quadrants.slice(row * 2, row * 2 + 2);
    cells.forEach(([side, teeth], sideIndex) => {
      const startX = x + sideIndex * (width / 2);
      doc.text(side, startX, rowY + 4);
      teeth.forEach((tooth, index) => {
        const cellX = startX + labelWidth + index * toothWidth;
        doc.rect(cellX, rowY, toothWidth, 6);
        doc.setFontSize(4.5);
        doc.text(String(tooth), cellX + 0.4, rowY + 2);
        doc.setFontSize(6);
        const mark = markings[String(tooth)];
        if (mark === '-' || mark === 'x') doc.text(mark, cellX + toothWidth / 2, rowY + 5.3, { align: 'center' });
      });
    });
    rowY += 7;
  }
  return rowY + 1;
}

export function createAfmsfPdf(data: ExchangeLike): Blob {
  const exam = data.examination ?? {};
  const type: ExaminationType = exam.type === 'AME' ? 'AME' : 'PME';
  const pages = FORM_PAGES[type];
  const values = exam.values ?? {};
  const patient = data.patient ?? {};
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({
    title: `${type === 'PME' ? 'AFMSF 3A' : 'AFMSF 3B'} synthetic demonstration`,
    subject: 'Dhanwantri PoC exchange document',
    creator: 'Dhanwantri Interoperability Demo',
  });
  const pageWidth = 210;
  const left = 12;
  const right = 198;
  const contentWidth = right - left;
  const transactionId = printable(data.transactionId) || 'Not assigned';
  const generatedAt = printable(data.createdAt) || new Date().toISOString();
  const mappingVersion = printable(data.transferAudit?.profile?.mappingVersion) || '1.3';
  const uhid = printable(patient.uhid || values['person.uhid']) || 'Not recorded';

  pages.forEach((page, pageIndex) => {
    if (pageIndex > 0) doc.addPage('a4', 'portrait');
    let y = 10;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('CONFIDENTIAL · SYNTHETIC DEMONSTRATION', pageWidth / 2, y, { align: 'center' });
    y += 5;
    doc.setFontSize(10);
    doc.text(type === 'PME' ? 'PERIODIC / SPECIAL MEDICAL EXAMINATION' : 'ANNUAL MEDICAL EXAMINATION', pageWidth / 2, y, { align: 'center' });
    doc.setFontSize(8);
    doc.text(type === 'PME' ? 'A.F.M.S.F. 3A (Ver-2002)' : 'A.F.M.S.F. 3B (Ver 2002)', right, y, { align: 'right' });
    y += 5;
    doc.setDrawColor(35);
    doc.line(left, y, right, y);
    y += 4;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(`UHID: ${uhid}`, left, y);
    const militaryId = printable(patient.serviceNumber || values['person.adn_personnel_number']);
    const mii = printable(patient.mii || (data.militaryFields as Record<string, string> | undefined)?.mii);
    if (mii) doc.text(`MII: ${mii}`, left + 74, y);
    if (militaryId) doc.text(`Military number: ${militaryId}`, left + 125, y);
    doc.text(`Page ${page.number} of ${page.total}`, right, y, { align: 'right' });
    y += 3;
    doc.setFontSize(5);
    doc.text('DEMO FIELD LAYOUT · NOT A SOURCE-FORM FACSIMILE', pageWidth / 2, y, { align: 'center' });
    y += 4;

    if (page.continuationIdentity) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.text('CONTINUATION IDENTITY', left, y);
      y += 2;
      const cells = [
        ['UHID', uhid],
        ['NO.', militaryId],
        ['RANK', printable(patient.rank || values['person.rank'])],
        ['NAME', printable(patient.name || values['person.name'])],
      ];
      const cellWidth = contentWidth / cells.length;
      cells.forEach(([label, value], index) => {
        const x = left + cellWidth * index;
        doc.rect(x, y, cellWidth, 10);
        doc.setFontSize(5);
        doc.text(label, x + 1, y + 3);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6);
        doc.text(doc.splitTextToSize(value || ' ', cellWidth - 2).slice(0, 1), x + 1, y + 7);
        doc.setFont('helvetica', 'bold');
      });
      y += 12;
    }

    for (const section of page.sections) {
      if (section.title === 'Continuation identity strip') continue;
      const fields = section.fields;
      if (!fields.length) continue;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text(printable(section.title).toUpperCase(), left, y + 3);
      doc.line(left, y + 4, right, y + 4);
      y += 6;
      const regular = fields.filter(item => item.key !== 'dental.tooth_chart');
      const dental = fields.find(item => item.key === 'dental.tooth_chart');
      const rows: Array<Array<(typeof regular)[number]>> = [];
      let pending: (typeof regular)[number][] = [];
      for (const field of regular) {
        if (field.type === 'textarea') {
          if (pending.length) rows.push(pending);
          pending = [];
          rows.push([field]);
        } else {
          pending.push(field);
          if (pending.length === 2) {
            rows.push(pending);
            pending = [];
          }
        }
      }
      if (pending.length) rows.push(pending);
      for (const row of rows) {
        const full = row.length === 1;
        const height = row.some(item => item.type === 'textarea') ? 9 : 6;
        const cellWidth = full ? contentWidth : contentWidth / 2;
        row.forEach((field, index) => {
          const x = left + (full ? 0 : index * cellWidth);
          doc.rect(x, y, cellWidth, height);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.3);
          let label = printable(field.label);
          if (field.key === 'person.adn_personnel_number') {
            label = militaryId ? '1. Military number' : '1. UHID';
          }
          const labelLines = doc.splitTextToSize(label, cellWidth - 2).slice(0, 1);
          doc.text(labelLines, x + 1, y + 2.1);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          const value = field.key === 'person.adn_personnel_number' && !militaryId
            ? uhid
            : printable(values[field.key]);
          const lines = doc.splitTextToSize(value, cellWidth - 2).slice(0, height > 6 ? 2 : 1);
          if (lines.length) doc.text(lines, x + 1, y + (height > 6 ? 5 : 4.7));
        });
        y += height;
      }
      if (dental) y = drawDentalChart(doc, left, y, contentWidth, values[dental.key] ?? '');
      y += 1.2;
    }
    const footerY = 276;
    doc.setDrawColor(110);
    doc.line(left, footerY - 3, right, footerY - 3);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(`Transaction: ${transactionId}`, left, footerY);
    doc.text(`Source: ${printable(data.source)}`, left, footerY + 3);
    doc.text(`Destination: ${printable(data.destination)}`, left, footerY + 6);
    doc.text(`Direction: ${printable(data.direction)}`, left, footerY + 9);
    doc.text(`Profile: ${printable(data.profile)} · Mapping v${mappingVersion}`, left, footerY + 12);
    doc.text(`Generated: ${generatedAt}`, left, footerY + 15);
    doc.setFont('helvetica', 'bold');
    doc.text('SYNTHETIC DEMONSTRATION · NOT AN OFFICIAL MEDICAL RECORD', pageWidth / 2, 294, { align: 'center' });
  });
  return doc.output('blob');
}

export function downloadAfmsfPdf(filename: string, data: ExchangeLike): void {
  downloadBlob(filename, createAfmsfPdf(data));
}
