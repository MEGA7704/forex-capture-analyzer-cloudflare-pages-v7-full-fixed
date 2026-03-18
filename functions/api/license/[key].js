import { json, options, getLicense, sanitizeLicenseForClient } from '../../_lib/common.js';

export async function onRequest(context) {
  const { request, env, params } = context;
  if (request.method === 'OPTIONS') return options();
  if (request.method !== 'GET') return json({ ok: false, success: false, error: 'Méthode non autorisée' }, 405);

  const key = String(params?.key || '').trim().toUpperCase();
  if (!key) return json({ ok: false, success: false, error: 'Clé manquante' }, 400);

  try {
    const license = await getLicense(env, request, key);
    if (!license) {
      return json({ ok: false, success: false, error: 'Licence introuvable' }, 404);
    }

    return json({
      ok: true,
      success: true,
      license: sanitizeLicenseForClient(license)
    });
  } catch (err) {
    return json({ ok: false, success: false, error: err?.message || 'Erreur serveur' }, 500);
  }
}
