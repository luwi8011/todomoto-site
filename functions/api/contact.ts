// Cloudflare Pages Function: POST /api/contact
// Verifies Turnstile, validates the fields, and emails the message to the shop via Resend.
//
// Secrets (Cloudflare dashboard > Pages project > Settings > Variables and Secrets,
// or .dev.vars for `wrangler pages dev`):
//   TURNSTILE_SECRET_KEY  Turnstile widget secret
//   RESEND_API_KEY        Resend API key; todomotoboulder.com must be verified in Resend
// Optional:
//   CONTACT_FROM          sender, default "Todo Moto Website <website@todomotoboulder.com>"

import site from '../../src/data/site.json';
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  TURNSTILE_FIELD,
  validateContact,
  type ContactData,
  type ContactResponse,
} from '../../src/lib/contact';

interface Env {
  TURNSTILE_SECRET_KEY?: string;
  RESEND_API_KEY?: string;
  CONTACT_FROM?: string;
}

interface Context {
  request: Request;
  env: Env;
}

const json = (body: ContactResponse, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const callUs = `Please call us at ${site.phone}.`;

async function verifyTurnstile(token: string, secret: string, ip: string | null): Promise<boolean> {
  const body = new FormData();
  body.append('secret', secret);
  body.append('response', token);
  if (ip) body.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body });
  const result = (await res.json()) as { success: boolean; 'error-codes'?: string[] };
  if (!result.success) console.warn('turnstile rejected', result['error-codes']);
  return result.success;
}

function emailText(d: ContactData): string {
  return (Object.keys(CONTACT_FIELDS) as (keyof ContactData)[])
    .filter((k) => d[k])
    .map((k) => (k === 'message' ? `\n${d[k]}` : `${CONTACT_FIELDS[k].label}: ${d[k]}`))
    .join('\n');
}

export async function onRequestPost({ request, env }: Context): Promise<Response> {
  if (!env.TURNSTILE_SECRET_KEY || !env.RESEND_API_KEY) {
    console.error('contact form misconfigured: TURNSTILE_SECRET_KEY or RESEND_API_KEY missing');
    return json({ ok: false, error: `The contact form isn't working right now. ${callUs}` }, 500);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ ok: false, error: 'Invalid form submission.' }, 400);
  }
  const get = (k: string) => {
    const v = form.get(k);
    return typeof v === 'string' ? v : null;
  };

  // Bots fill every field; pretend success so they don't retry.
  if (get(HONEYPOT_FIELD)) return json({ ok: true });

  const token = get(TURNSTILE_FIELD);
  if (!token || !(await verifyTurnstile(token, env.TURNSTILE_SECRET_KEY, request.headers.get('CF-Connecting-IP')))) {
    return json({ ok: false, error: 'The spam check failed. Please try it again.' }, 403);
  }

  const { data, errors } = validateContact(get);
  if (Object.keys(errors).length) {
    return json({ ok: false, error: 'Please fix the highlighted fields.', fields: errors }, 400);
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: env.CONTACT_FROM ?? 'Todo Moto Website <website@todomotoboulder.com>',
      to: [site.contactFormRecipient],
      reply_to: data.email,
      // Name is user input; keep it to one line in the subject.
      subject: `Website message from ${data.name.replace(/[\r\n]+/g, ' ')}`,
      text: emailText(data),
    }),
  });
  if (!res.ok) {
    console.error('resend failed', res.status, await res.text());
    return json({ ok: false, error: `Your message couldn't be sent. ${callUs}` }, 502);
  }
  return json({ ok: true });
}
