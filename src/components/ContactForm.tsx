import { useEffect, useRef, useState, type SubmitEvent } from 'react';
import {
  CONTACT_FIELDS,
  HONEYPOT_FIELD,
  type ContactField,
  type ContactResponse,
  type FieldErrors,
} from '../lib/contact';

interface Turnstile {
  render(el: HTMLElement, options: Record<string, unknown>): string;
  reset(widgetId: string): void;
  remove(widgetId: string): void;
}
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function loadTurnstile(): Promise<Turnstile> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  const { promise, resolve, reject } = Promise.withResolvers<Turnstile>();
  let script = document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SRC}"]`);
  if (!script) {
    script = document.createElement('script');
    script.src = TURNSTILE_SRC;
    script.async = true;
    document.head.append(script);
  }
  script.addEventListener('load', () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing after load'))), { once: true });
  script.addEventListener('error', () => reject(new Error('Turnstile failed to load')), { once: true });
  return promise;
}

type Status = { state: 'idle' } | { state: 'sending' } | { state: 'sent' } | { state: 'error'; message: string };

interface Props {
  siteKey: string;
  phone: string;
  phoneHref: string;
}

const inputClass =
  'mt-1.5 w-full rounded-md border border-line bg-ink px-3 py-2.5 text-cream placeholder:text-muted/60 aria-[invalid=true]:border-flame';

export default function ContactForm({ siteKey, phone, phoneHref }: Props) {
  const [status, setStatus] = useState<Status>({ state: 'idle' });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [verified, setVerified] = useState(false);
  const widgetEl = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadTurnstile()
      .then((ts) => {
        if (cancelled || !widgetEl.current) return;
        widgetId.current = ts.render(widgetEl.current, {
          sitekey: siteKey,
          theme: 'dark',
          callback: () => setVerified(true),
          'expired-callback': () => setVerified(false),
          'error-callback': () => setVerified(false),
        });
      })
      .catch(() => {
        if (!cancelled) setStatus({ state: 'error', message: `The spam check couldn't load. Please call us at ${phone}.` });
      });
    return () => {
      cancelled = true;
      if (widgetId.current) window.turnstile?.remove(widgetId.current);
    };
  }, [siteKey, phone]);

  async function onSubmit(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!verified) {
      setStatus({ state: 'error', message: 'Please complete the spam check above the Send button.' });
      return;
    }
    setStatus({ state: 'sending' });
    setFieldErrors({});
    try {
      const res = await fetch('/api/contact', { method: 'POST', body: new FormData(e.currentTarget), headers: { Accept: 'application/json' } });
      const body = (await res.json()) as ContactResponse;
      if (body.ok) {
        setStatus({ state: 'sent' });
        return;
      }
      setFieldErrors(body.fields ?? {});
      setStatus({ state: 'error', message: body.error });
    } catch {
      setStatus({ state: 'error', message: `Your message couldn't be sent. Please call us at ${phone}.` });
    }
    // A Turnstile token is single-use; get a fresh one for the retry.
    if (widgetId.current) window.turnstile?.reset(widgetId.current);
    setVerified(false);
  }

  if (status.state === 'sent') {
    return (
      <div role="status" className="rounded-lg border border-line bg-surface p-6">
        <p className="font-display text-3xl text-flame">Thanks!</p>
        <p className="mt-2 text-lg">Your message is on its way to the shop. We'll get back to you soon.</p>
        <p className="mt-2 text-muted">
          In a hurry? Call us at <a href={phoneHref} className="text-flame underline">{phone}</a>.
        </p>
      </div>
    );
  }

  const field = (name: ContactField, type: string, autoComplete: string, multiline = false) => {
    const spec = CONTACT_FIELDS[name];
    const error = fieldErrors[name];
    const common = {
      id: `contact-${name}`,
      name,
      required: spec.required,
      maxLength: spec.max,
      autoComplete,
      'aria-invalid': error ? true : undefined,
      'aria-describedby': error ? `contact-${name}-error` : undefined,
      className: inputClass,
    };
    return (
      <div>
        <label htmlFor={common.id} className="font-bold">
          {spec.label}
          {!spec.required && <span className="font-normal text-muted"> (optional)</span>}
        </label>
        {multiline ? <textarea {...common} rows={6} /> : <input {...common} type={type} />}
        {error && (
          <p id={`contact-${name}-error`} className="mt-1 text-sm text-flame">
            {error}
          </p>
        )}
      </div>
    );
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-lg border border-line bg-surface p-6">
      <div className="grid gap-5 sm:grid-cols-2">
        {field('name', 'text', 'name')}
        {field('email', 'email', 'email')}
        {field('phone', 'tel', 'tel')}
        {field('bike', 'text', 'off')}
      </div>
      {field('message', 'text', 'off', true)}

      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor={`contact-${HONEYPOT_FIELD}`}>Leave this field empty</label>
        <input id={`contact-${HONEYPOT_FIELD}`} name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {/* Turnstile injects its hidden cf-turnstile-response input into this element. */}
      <div ref={widgetEl} className="min-h-[65px]" />

      {status.state === 'error' && (
        <p role="alert" className="rounded-md border border-flame/60 bg-brand/25 px-4 py-3">
          {status.message}
        </p>
      )}

      <button
        type="submit"
        disabled={status.state === 'sending'}
        className="inline-flex w-full items-center justify-center rounded-md bg-brand px-7 py-3.5 text-lg font-bold text-cream ring-1 ring-flame/35 transition-colors hover:bg-brand-hover disabled:opacity-60 sm:w-auto"
      >
        {status.state === 'sending' ? 'Sending…' : 'Send message'}
      </button>
    </form>
  );
}
