import site from '../data/site.json';

export { site };

const DAY_NAMES: Record<string, string> = {
  Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday', Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
};

/** "17:30" -> "5:30pm", "10:00" -> "10am" */
export function formatTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number);
  const suffix = h >= 12 ? 'pm' : 'am';
  const h12 = h % 12 || 12;
  return m ? `${h12}:${String(m).padStart(2, '0')}${suffix}` : `${h12}${suffix}`;
}

function dayRange(days: string[]): string {
  const first = DAY_NAMES[days[0]];
  return days.length === 1 ? first : `${first} – ${DAY_NAMES[days[days.length - 1]]}`;
}

/** Display rows for hours, open days first, then a closed row. */
export const hoursRows: { label: string; value: string }[] = [
  ...site.hours.map((h) => ({ label: dayRange(h.days), value: `${formatTime(h.opens)} – ${formatTime(h.closes)}` })),
  { label: site.closedDays.map((d) => DAY_NAMES[d]).join(' & '), value: 'Closed' },
];

export const telHref = `tel:${site.phoneE164}`;
export const mailHref = `mailto:${site.email}`;

const a = site.address;
export const addressLine = `${a.street}, ${a.city}, ${a.region} ${a.postalCode}`;
export const directionsHref = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${site.name}, ${addressLine}`)}`;

export const laborRateLabel = `$${site.laborRate.amount}/${site.laborRate.unit}`;

/** schema.org MotorcycleRepair for the page head. */
export const localBusinessJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'MotorcycleRepair',
  name: site.name,
  description: site.tagline,
  url: site.url,
  telephone: site.phoneE164,
  email: site.email,
  address: {
    '@type': 'PostalAddress',
    streetAddress: a.street,
    addressLocality: a.city,
    addressRegion: a.region,
    postalCode: a.postalCode,
    addressCountry: a.country,
  },
  openingHoursSpecification: site.hours.map((h) => ({
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: h.days.map((d) => `https://schema.org/${DAY_NAMES[d]}`),
    opens: h.opens,
    closes: h.closes,
  })),
  sameAs: Object.values(site.social),
};
