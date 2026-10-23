export type IssuingOffice = {
  code: string;
  name: string;
  label: string;
};

export const ISSUING_OFFICES: IssuingOffice[] = [
  { code: 'PRES', name: 'Office of the President', label: 'Presidency' },
  { code: 'VP', name: 'Office of the Vice President', label: 'Vice Presidency' },
  { code: 'SEC', name: 'Office of the Secretary General', label: 'Secretariat' },
  { code: 'FIN', name: 'Office of the Financial Secretary', label: 'Finance' },
  { code: 'TREAS', name: 'Office of the Treasurer', label: 'Treasury' },
  { code: 'PRO', name: 'Office of the Public Relations Officer', label: 'Public Relations' },
  { code: 'WELF', name: 'Office of the Welfare Director', label: 'Welfare' },
  { code: 'SPORT', name: 'Office of the Director of Sports', label: 'Sports' },
  { code: 'SOC', name: 'Office of the Social Director', label: 'Socials' },
  { code: 'ACAD', name: 'Office of the Academic Director', label: 'Academic Affairs' },
  { code: 'TECH', name: 'Office of the Technical Director', label: 'Technical Affairs' },
  { code: 'OTHER', name: '', label: 'Other office / committee' },
];

const knownByCode = new Map(ISSUING_OFFICES.filter((office) => office.code !== 'OTHER').map((office) => [office.code, office]));
const CODE_PATTERN = /^[A-Z][A-Z0-9]{1,7}$/;

export function resolveIssuingOffice(codeValue: unknown, customCodeValue?: unknown, customNameValue?: unknown): IssuingOffice | null {
  if (typeof codeValue !== 'string') return null;
  const code = codeValue.trim().toUpperCase();
  if (code === 'OTHER') {
    if (typeof customCodeValue !== 'string' || typeof customNameValue !== 'string') return null;
    const customCode = customCodeValue.trim().toUpperCase();
    const customName = customNameValue.trim();
    if (!CODE_PATTERN.test(customCode) || knownByCode.has(customCode) || customName.length < 3 || customName.length > 120) {
      return null;
    }
    return { code: customCode, name: customName, label: customName };
  }

  return knownByCode.get(code) ?? null;
}
