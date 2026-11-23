export function validStudentDocument(value: string, countryCode: string): boolean {
  const raw = value.trim().toUpperCase();
  if (countryCode === 'CL') {
    if (!/^(?:\d{7,8}|\d{1,2}\.\d{3}\.\d{3})-?[\dK]$/.test(raw)) return false;
    const clean = raw.replace(/[.-]/g, '');
    const body = clean.slice(0, -1);
    if (/^0+$/.test(body)) return false;
    let sum = 0;
    let multiplier = 2;
    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }
    const result = 11 - sum % 11;
    return clean.slice(-1) === (result === 11 ? '0' : result === 10 ? 'K' : String(result));
  }
  if (countryCode === 'BR') {
    if (!/^(?:\d{11}|\d{3}\.\d{3}\.\d{3}-\d{2})$/.test(raw)) return false;
    const digits = raw.replace(/[.-]/g, '');
    if (/^(\d)\1{10}$/.test(digits)) return false;
    for (const length of [9, 10]) {
      let sum = 0;
      for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
      const remainder = sum % 11;
      if (Number(digits[length]) !== (remainder < 2 ? 0 : 11 - remainder)) return false;
    }
    return true;
  }
  return raw.length > 0;
}

export function normalizeStudentDocument(value: string, countryCode: string): string {
  const raw = value.trim().toUpperCase();
  if (countryCode === 'BR') return raw.replace(/[.-]/g, '');
  if (countryCode === 'CL') {
    const clean = raw.replace(/[.-]/g, '');
    return `${clean.slice(0, -1)}-${clean.slice(-1)}`;
  }
  return raw;
}
