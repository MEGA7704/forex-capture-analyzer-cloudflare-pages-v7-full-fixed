const LICENSES_KEY = 'licenses_blob_v1';
const EVENTS_KEY = 'events_blob_v1';

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
      ...extraHeaders,
    },
  });
}

export function options() {
  return new Response(null, {
    status: 204,
    headers: {
      'access-control-allow-origin': '*',
      'access-control-allow-methods': 'GET,POST,OPTIONS',
      'access-control-allow-headers': 'content-type, authorization',
    },
  });
}

export async function readJsonBody(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('JSON de requête invalide');
  }
}

export function normalizeKey(key = '') {
  return String(key).trim().toUpperCase();
}

export function nowIso() {
  return new Date().toISOString();
}

export function toFiniteNumber(value, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export function dateOnlyUtc(value) {
  return String(value || '').slice(0, 10);
}

export function isExpired(license) {
  const expiration = license?.expiration || license?.expiresAt || license?.expires_at;
  if (!expiration) return false;
  const exp = new Date(`${dateOnlyUtc(expiration)}T23:59:59Z`).getTime();
  return Number.isFinite(exp) ? Date.now() > exp : false;
}

export function isCountExhausted(license) {
  if (!license) return false;

  const mode = String(license.mode || '').toLowerCase();
  if (!['count', 'captures'].includes(mode)) return false;

  const used = toFiniteNumber(license.analysis_count ?? license.capturesUsed, 0);
  const limit = toFiniteNumber(license.analysis_limit ?? license.capturesBought, 0);

  return limit <= 0 || used >= limit;
}

export function normalizeLicenseShape(license) {
  if (!license || typeof license !== 'object') return null;

  const out = { ...license };

  out.license_key = normalizeKey(out.license_key || out.key || '');
  out.plan_id = String(out.plan_id || out.plan || '').trim();
  out.plan_label = String(out.plan_label || out.plan_id || '').trim();

  const rawMode = String(out.mode || '').toLowerCase();
  out.mode = ['count', 'captures'].includes(rawMode) ? 'count' : 'duration';

  out.analysis_limit = Math.max(
    0,
    Math.trunc(toFiniteNumber(out.analysis_limit ?? out.capturesBought, 0))
  );
  out.analysis_count = Math.max(
    0,
    Math.trunc(toFiniteNumber(out.analysis_count ?? out.capturesUsed, 0))
  );

  out.session_count = Math.max(0, Math.trunc(toFiniteNumber(out.session_count, 0)));
  out.error_reports = Math.max(0, Math.trunc(toFiniteNumber(out.error_reports, 0)));
  out.sos_reports = Math.max(0, Math.trunc(toFiniteNumber(out.sos_reports, 0)));
  out.piracy_flags = Math.max(0, Math.trunc(toFiniteNumber(out.piracy_flags, 0)));
  out.duration_days = Math.max(
    0,
    Math.trunc(toFiniteNumber(out.duration_days ?? out.durationDays, 0))
  );

  out.device_id = out.device_id || out.deviceId || null;
  out.device_locked = Boolean((out.device_locked ?? out.deviceLocked) && out.device_id);
  out.expiration = out.expiration || out.expiresAt || out.expires_at || null;
  out.activated_at = out.activated_at || out.activatedAt || null;

  out.analyses_remaining =
    out.mode === 'count' ? Math.max(0, out.analysis_limit - out.analysis_count) : null;

  return out;
}

export function refreshComputedStatus(license) {
  if (!license) return license;

  const out = normalizeLicenseShape(license);
  const previous = String(out.status || '').trim().toLowerCase();

  if (previous === 'blocked') return out;

  if (out.mode === 'duration' && isExpired(out)) {
    out.status = 'expired';
  } else if (out.mode === 'count' && isCountExhausted(out)) {
    out.status = 'quota_reached';
  } else if (
    out.activated_at ||
    out.device_locked ||
    out.session_count > 0 ||
    out.analysis_count > 0
  ) {
    out.status = 'active';
  } else {
    out.status = previous && previous !== 'blocked' ? previous : 'unused';
  }

  return out;
}

export function getLicenseAccessError(license) {
  if (!license) return 'Licence introuvable';

  const x = refreshComputedStatus(license);

  if (x.status === 'blocked') return 'Licence bloquée';
  if (x.mode === 'duration' && (x.status === 'expired' || isExpired(x))) {
    return 'Licence expirée';
  }
  if (x.mode === 'count' && (x.status === 'quota_reached' || isCountExhausted(x))) {
    return 'Quota de captures atteint';
  }

  return '';
}

export function restoreLicenseStatus(license) {
  if (!license) return license;
  const previous = String(license.status || '').trim().toLowerCase();
  if (previous === 'blocked') return license;
  return refreshComputedStatus(license);
}

export function sanitizeLicenseForClient(license) {
  const clone = { ...license };
  delete clone.notes;
  delete clone.last_ip_hash;
  delete clone.client_meta;
  return clone;
}

export function safeIpHash(ip = '') {
  return !ip ? '' : 'ip_' + String(ip).split('.').slice(0, 2).join('_');
}

export function pickClientIp(request) {
  return (
    request.headers.get('CF-Connecting-IP') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    ''
  );
}

function randomLicenseBlock(size = 4) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let out = '';
  const values = new Uint32Array(size);
  crypto.getRandomValues(values);

  for (let i = 0; i < size; i += 1) {
    out += chars[values[i] % chars.length];
  }

  return out;
}

export function generateLicenseKey(prefix = 'FXA') {
  return `${prefix}-${randomLicenseBlock(4)}-${randomLicenseBlock(4)}-${randomLicenseBlock(4)}-${randomLicenseBlock(4)}`;
}

export function daysFromNowUtc(days) {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() + Math.max(0, Number(days || 0)));
  return d.toISOString().slice(0, 10);
}

export function buildLicenseFromPlan(plan = {}) {
  const mode = String(plan.mode || 'count') === 'duration' ? 'duration' : 'count';
  const analysisLimit = Math.max(0, Math.trunc(toFiniteNumber(plan.analysis_limit, 0)));
  const durationDays = Math.max(1, Math.trunc(toFiniteNumber(plan.duration_days, 365)));
  const issuedAt = nowIso().slice(0, 10);
  const expiration = daysFromNowUtc(durationDays);

  return refreshComputedStatus({
    license_key: generateLicenseKey('FXA'),
    plan_id: String(
      plan.plan_id ||
        (mode === 'count'
          ? `CAPTURE_${analysisLimit || 5}`
          : `ACCESS_${durationDays}_DAYS`)
    ).trim(),
    plan_label: String(
      plan.plan_label ||
        (mode === 'count' ? `${analysisLimit || 5} Captures` : `${durationDays} Jours`)
    ).trim(),
    price_usdt: toFiniteNumber(plan.price_usdt, 0),
    mode,
    analysis_limit: mode === 'count' ? analysisLimit : 0,
    analyses_remaining: mode === 'count' ? analysisLimit : null,
    duration_days: durationDays,
    issued_at: issuedAt,
    expiration,
    status: 'unused',
    device_id: null,
    device_locked: false,
    activated_at: null,
    last_seen_at: null,
    last_ip_hash: null,
    session_count: 0,
    analysis_count: 0,
    error_reports: 0,
    sos_reports: 0,
    piracy_flags: 0,
    notes: String(plan.notes || '').trim(),
  });
}

export function generateBulkLicenses(existing, count, plan) {
  const seen = new Set(
    (existing || [])
      .map((item) => normalizeKey(item.license_key))
      .filter(Boolean)
  );

  const out = [];
  const safeCount = Math.min(1000, Math.max(1, Math.trunc(toFiniteNumber(count, 1))));

  while (out.length < safeCount) {
    const license = buildLicenseFromPlan(plan);
    const key = normalizeKey(license.license_key);

    if (!seen.has(key)) {
      seen.add(key);
      out.push(license);
    }
  }

  return out;
}

function base64UrlEncode(bytes) {
  let binary = '';
  const chunk = 0x8000;

  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }

  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlDecode(str) {
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const base64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return bytes;
}

async function hmacSha256Base64Url(input, secret) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(input));
  return base64UrlEncode(new Uint8Array(sig));
}

export async function signToken(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const enc = (obj) => base64UrlEncode(new TextEncoder().encode(JSON.stringify(obj)));
  const body = `${enc(header)}.${enc(payload)}`;
  const sig = await hmacSha256Base64Url(body, secret);
  return `${body}.${sig}`;
}

export async function verifyToken(token, secret) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('Token invalide');

  const [h, p, sig] = parts;
  const body = `${h}.${p}`;
  const expected = await hmacSha256Base64Url(body, secret);

  if (sig !== expected) throw new Error('Signature invalide');

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(p)));
  if (payload.exp && Date.now() > payload.exp * 1000) {
    throw new Error('Session expirée');
  }

  return payload;
}

export function requireAdmin(request, env) {
  const auth = request.headers.get('authorization') || '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();

  if (!token || token !== String(env.ADMIN_TOKEN || '').trim()) {
    throw new Error('Accès admin refusé');
  }
}

async function ensureSeeded() {
  return;
}

export async function getLicenses(env, request) {
  await ensureSeeded(env, request);

  const raw = await env.LICENSES.get(LICENSES_KEY, 'json');
  const items = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.licenses)
      ? raw.licenses
      : [];

  return items
    .map((item) => refreshComputedStatus(item))
    .filter(Boolean)
    .sort((a, b) => a.license_key.localeCompare(b.license_key));
}

export async function saveLicenses(env, items) {
  const normalized = (Array.isArray(items) ? items : [])
    .map((item) => refreshComputedStatus(item))
    .filter(Boolean);

  await env.LICENSES.put(LICENSES_KEY, JSON.stringify(normalized));
  return normalized;
}

export async function getEvents(env, request) {
  await ensureSeeded(env, request);
  const raw = await env.EVENTS.get(EVENTS_KEY, 'json');
  return Array.isArray(raw) ? raw : [];
}

export async function saveEvents(env, items) {
  await env.EVENTS.put(EVENTS_KEY, JSON.stringify(Array.isArray(items) ? items : []));
}

export async function getLicense(env, request, key) {
  await ensureSeeded(env, request);

  const normalizedKey = normalizeKey(key);
  if (!normalizedKey) return null;

  const items = await getLicenses(env, request);
  return items.find((x) => normalizeKey(x.license_key) === normalizedKey) || null;
}

export async function putLicense(env, request, license) {
  await ensureSeeded(env, request);

  const normalized = refreshComputedStatus(license);
  if (!normalized?.license_key) {
    throw new Error('Licence invalide');
  }

  const items = await getLicenses(env, request);
  const idx = items.findIndex(
    (x) => normalizeKey(x.license_key) === normalizeKey(normalized.license_key)
  );

  if (idx >= 0) {
    items[idx] = normalized;
  } else {
    items.push(normalized);
  }

  await saveLicenses(env, items);
  return normalized;
}

export async function appendEvent(env, request, event) {
  const items = await getEvents(env, request);
  const full = {
    id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...event,
  };
  items.push(full);
  await saveEvents(env, items);
  return full;
}
