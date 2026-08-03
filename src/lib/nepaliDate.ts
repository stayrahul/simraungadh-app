// @ts-nocheck
// ============================================================
// Simraungadh Civic Hub — Bikram Sambat (BS) Nepali Date Utility
// Converts Gregorian (AD) dates to accurate Nepali Date (BS)
// ============================================================

const nepaliMonthsEN = [
  'Baisakh', 'Jestha', 'Ashadh', 'Shrawan', 'Bhadra', 'Ashwin',
  'Kartik', 'Mangsir', 'Poush', 'Magh', 'Falgun', 'Chaitra'
];

const nepaliMonthsNE = [
  'वैशाख', 'ज्येष्ठ', 'आषाढ', 'श्रावण', 'भाद्र', 'आश्विन',
  'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुन', 'चैत्र'
];

const nepaliDaysEN = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const nepaliDaysNE = ['आइत', 'सोम', 'मङ्गल', 'बुध', 'बिहि', 'शुक्र', 'शनि'];

const nepaliDigits = ['०', '१', '२', '३', '४', '५', '६', '७', '८', '९'];

export function toNepaliDigits(num: number | string): string {
  return num.toString().split('').map(char => {
    const digit = parseInt(char, 10);
    return isNaN(digit) ? char : nepaliDigits[digit];
  }).join('');
}

// BS Month Days table for years 2080 - 2085 BS
const bsData: Record<number, number[]> = {
  2080: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2081: [31, 31, 32, 32, 31, 30, 30, 30, 29, 30, 29, 31],
  2082: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
  2083: [31, 31, 32, 31, 31, 31, 30, 29, 30, 29, 30, 30],
  2084: [31, 32, 31, 32, 31, 30, 30, 30, 29, 29, 30, 30],
  2085: [31, 32, 31, 32, 31, 30, 30, 30, 29, 30, 29, 30],
};

/**
 * Returns accurate formatted Nepali Date (BS) for any given Date object.
 * Lang defaults to 'ne' (Nepali script) or 'en' (English transliterated).
 */
export function getNepaliDate(adDate: Date = new Date(), lang: 'en' | 'ne' = 'ne', includeYear: boolean = false): string {
  // If English mode, return standard Gregorian (A.D.) date
  if (lang === 'en') {
    const options: Intl.DateTimeFormatOptions = includeYear
      ? { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }
      : { weekday: 'short', month: 'short', day: 'numeric' };
    return adDate.toLocaleDateString('en-US', options);
  }

  // If Nepali mode, calculate and return Bikram Sambat (B.S.) date in Nepali script
  const dayOfWeek = adDate.getDay();
  const dayName = nepaliDaysNE[dayOfWeek];

  // Reference Anchor: April 14, 2026 AD = Baisakh 1, 2083 BS
  const anchorAD = new Date(2026, 3, 14); // April 14, 2026
  
  const utcA = Date.UTC(adDate.getFullYear(), adDate.getMonth(), adDate.getDate());
  const utcB = Date.UTC(anchorAD.getFullYear(), anchorAD.getMonth(), anchorAD.getDate());
  let diffDays = Math.floor((utcA - utcB) / (1000 * 60 * 60 * 24));

  let bsYear = 2083;
  let bsMonth = 0; // Baisakh
  let bsDay = 1;

  if (diffDays >= 0) {
    while (diffDays > 0) {
      const monthDays = bsData[bsYear]?.[bsMonth] || 30;
      if (diffDays >= monthDays) {
        diffDays -= monthDays;
        bsMonth++;
        if (bsMonth >= 12) {
          bsMonth = 0;
          bsYear++;
        }
      } else {
        bsDay += diffDays;
        diffDays = 0;
      }
    }
  } else {
    diffDays = Math.abs(diffDays);
    bsYear = 2082;
    bsMonth = 11;
    bsDay = 30;
    while (diffDays > 0) {
      if (diffDays > bsDay) {
        diffDays -= bsDay;
        bsMonth--;
        if (bsMonth < 0) {
          bsMonth = 11;
          bsYear--;
        }
        bsDay = bsData[bsYear]?.[bsMonth] || 30;
      } else {
        bsDay = bsDay - diffDays + 1;
        diffDays = 0;
      }
    }
  }

  const monthName = nepaliMonthsNE[bsMonth];

  return includeYear 
    ? `${dayName}, ${monthName} ${toNepaliDigits(bsDay)}, ${toNepaliDigits(bsYear)} वि.सं.`
    : `${dayName}, ${monthName} ${toNepaliDigits(bsDay)}`;
}
