import { json, options, readJsonBody, requireAdmin, normalizeKey, getLicense, putLicense, appendEvent, restoreLicenseStatus, nowIso, isExpired, dateOnlyUtc, sanitizeLicenseForClient } from '../../_lib/common.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'POST') return json({ ok: false, error: 'Méthode non autorisée' }, 405);
  try {
    requireAdmin(request, env);
    const body = await readJsonBody(request);
    const key = normalizeKey(body?.key);
    const action = String(body?.action || '').trim();
    const reason = String(body?.reason || '').trim();
    const days = Number(body?.days || 0);

    let license = await getLicense(env, request, key);
    if (!license) return json({ ok: false, error: 'Licence introuvable' }, 404);

    if (action === 'block') {
      license.status = 'blocked';
    } else if (action === 'unblock') {
      Object.assign(license, restoreLicenseStatus(license));
    } else if (action === 'reset_device') {
      license.device_id = null;
      license.device_locked = false;
      license.activated_at = null;
      license.last_seen_at = null;
      license.last_ip_hash = null;
      license.session_count = 0;
      Object.assign(license, restoreLicenseStatus(license));
    } else if (action === 'extend_days' || action === 'extend') {
      const anchor = (license.mode === 'duration' && isExpired(license))
        ? new Date(`${dateOnlyUtc(nowIso())}T00:00:00Z`)
        : (license.expiration ? new Date(`${dateOnlyUtc(license.expiration)}T00:00:00Z`) : new Date());
      anchor.setUTCDate(anchor.getUTCDate() + Math.max(days, 1));
      license.expiration = anchor.toISOString().slice(0, 10);
      Object.assign(license, restoreLicenseStatus(license));
    } else {
      return json({ ok: false, error: 'Action inconnue' }, 400);
    }

    license = await putLicense(env, request, license);
    await appendEvent(env, request, {
      created_at: nowIso(),
      event_type: 'admin_' + action,
      license_key: license.license_key,
      device_id: license.device_id || '',
      details: { reason, days }
    });

    return json({ ok: true, license: sanitizeLicenseForClient(license) });
  } catch (err) {
    return json({ ok: false, error: err.message }, 400);
  }
}
