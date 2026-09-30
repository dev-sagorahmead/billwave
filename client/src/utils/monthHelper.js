// Month formatting and arrears utilities for Dish/Cable TV billing

export const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

export const ENGLISH_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Convert English numerals to Bengali digits (e.g. 2026 -> ২০২৬)
export function toBengaliNumerals(str) {
  const bengaliDigits = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
  return String(str || '').replace(/[0-9]/g, (d) => bengaliDigits[Number(d)]);
}

// Format YYYY-MM into readable month and year in Bengali and English
export function formatBillingMonth(yearMonthStr, format = 'both') {
  if (!yearMonthStr) return '';
  const parts = String(yearMonthStr).split('-');
  if (parts.length < 2) return yearMonthStr;
  
  const year = parts[0];
  const monthIdx = parseInt(parts[1], 10) - 1;
  if (monthIdx < 0 || monthIdx > 11) return yearMonthStr;

  const bnMonth = BENGALI_MONTHS[monthIdx];
  const enMonth = ENGLISH_MONTHS[monthIdx];
  const bnYear = toBengaliNumerals(year);

  if (format === 'bengali') {
    return `${bnMonth} ${bnYear}`;
  }
  if (format === 'english') {
    return `${enMonth} ${year}`;
  }
  return `${bnMonth} ${bnYear} (${enMonth} ${year})`;
}

// Get the default arrears month (1 month prior to current date, e.g. September -> August)
export function getDefaultArrearsMonth() {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() - 1);
  const yr = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  return `${yr}-${mo}`;
}

// Generate dropdown options for billing months
export function getBillingMonthOptions(count = 6) {
  const options = [];
  const today = new Date();

  // 1. Current month (optional advance)
  const curD = new Date(today.getFullYear(), today.getMonth(), 1);
  const curVal = `${curD.getFullYear()}-${String(curD.getMonth() + 1).padStart(2, '0')}`;
  options.push({
    value: curVal,
    label: `${BENGALI_MONTHS[curD.getMonth()]} ${toBengaliNumerals(curD.getFullYear())} [চলতি মাস]`
  });

  // 2. Previous months (Arrears, starting with 1 month arrears as default)
  for (let i = 1; i <= count; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const yr = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, '0');
    const val = `${yr}-${mo}`;
    const bnLabel = `${BENGALI_MONTHS[d.getMonth()]} ${toBengaliNumerals(yr)}`;
    const tag = i === 1 ? ' [১ মাস বকেয়া - ডিফল্ট]' : ` [${toBengaliNumerals(i)} মাস পূর্বের]`;

    options.push({
      value: val,
      label: `${bnLabel}${tag}`
    });
  }

  return options;
}
