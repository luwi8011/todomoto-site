// Shared by the contact form (src/components/ContactForm.tsx) and the
// Cloudflare Pages Function that sends it (functions/api/contact.ts).

// `noun` is how error messages refer to the field ("Please enter your email.").
export const CONTACT_FIELDS = {
  name: { label: 'Name', noun: 'your name', max: 100, required: true },
  email: { label: 'Email', noun: 'your email', max: 254, required: true },
  phone: { label: 'Phone', noun: 'your phone number', max: 40, required: false },
  bike: { label: 'Bike (year, make, model)', noun: 'your bike details', max: 120, required: false },
  message: { label: 'How can we help?', noun: 'a message', max: 5000, required: true },
} as const;

export type ContactField = keyof typeof CONTACT_FIELDS;
export type ContactData = Record<ContactField, string>;
export type FieldErrors = Partial<Record<ContactField, string>>;

/** Hidden field that people never see; bots fill it in. */
export const HONEYPOT_FIELD = 'company';
export const TURNSTILE_FIELD = 'cf-turnstile-response';

export type ContactResponse = { ok: true } | { ok: false; error: string; fields?: FieldErrors };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateContact(get: (key: ContactField) => string | null): { data: ContactData; errors: FieldErrors } {
  const data = {} as ContactData;
  const errors: FieldErrors = {};
  for (const [key, spec] of Object.entries(CONTACT_FIELDS) as [ContactField, (typeof CONTACT_FIELDS)[ContactField]][]) {
    const value = (get(key) ?? '').trim();
    data[key] = value;
    if (spec.required && !value) errors[key] = `Please enter ${spec.noun}.`;
    else if (value.length > spec.max) errors[key] = `Please shorten ${spec.noun} to ${spec.max} characters or fewer.`;
  }
  if (data.email && !errors.email && !EMAIL_RE.test(data.email)) errors.email = 'Enter a valid email address.';
  return { data, errors };
}
