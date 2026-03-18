import {
  json,
  options,
  readJsonBody,
  verifyToken,
  getLicense,
  getLicenseAccessError,
  putLicense,
  sanitizeLicenseForClient,
  nowIso
} from '../../_lib/common.js';

export async function onRequest({ request, env }) {
  if (request.method === 'OPTIONS') {
    return options();
  }

  if (request.method !== 'POST') {
    return json({ ok: false, error: 'Méthode non autorisée' }, 405);
  }

  try {
    const body = await readJsonBody(request);
    const token = String(body?.token || '').trim();
    const claimedDevice = String(body?.deviceId || '').trim();

    if (!token) {
      return json({ ok: false, error: 'Token manquant' }, 400);
    }

    if (!claimedDevice) {
      return json({ ok: false, error: 'Appareil manquant' }, 400);
    }

    const payload = await verifyToken(token, env.LICENSE_SECRET);

    if (!payload?.sub) {
      return json({ ok: false, error: 'Token invalide' }, 401);
    }

    const license = await getLicense(env, request, payload.sub);

    if (!license) {
      return json({ ok: false, error: 'Licence introuvable' }, 404);
    }

    const accessError = getLicenseAccessError(license);
    if (accessError) {
      return json({ ok: false, error: accessError }, 403);
    }

    if (payload.device_id !== claimedDevice || license.device_id !== claimedDevice) {
      return json({ ok: false, error: 'Appareil non autorisé' }, 403);
    }

    license.last_seen_at = nowIso();

    await putLicense(env, request, license);

    return json(
      {
        ok: true,
        license: sanitizeLicenseForClient(license)
      },
      200
    );
  } catch (err) {
    return json(
      {
        ok: false,
        error: err?.message || 'Erreur serveur'
      },
      401
    );
  }
}
