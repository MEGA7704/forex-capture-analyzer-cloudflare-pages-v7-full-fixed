export async function onRequest(context) {
  const { env } = context; 

  const hasLICENSES =
    !!env?.LICENSES && typeof env.LICENSES.get === 'function';

  const hasEVENTS =
    !!env?.EVENTS && typeof env.EVENTS.get === 'function';

  const hasLicenseSecret =
    typeof env?.LICENSE_SECRET === 'string' &&
    env.LICENSE_SECRET.trim().length > 0;

  const hasAdminToken =
    typeof env?.ADMIN_TOKEN === 'string' &&
    env.ADMIN_TOKEN.trim().length > 0;

  const hasAdminMasterKey =
    typeof env?.ADMIN_MASTER_KEY === 'string' &&
    env.ADMIN_MASTER_KEY.trim().length > 0;

  return new Response(
    JSON.stringify(
      {
        ok: true,
        runtime: 'cloudflare-pages-functions',
        bindings: {
          LICENSES: hasLICENSES,
          EVENTS: hasEVENTS
        },
        secrets: {
          LICENSE_SECRET: hasLicenseSecret,
          ADMIN_TOKEN: hasAdminToken,
          ADMIN_MASTER_KEY: hasAdminMasterKey
        }
      },
      null,
      2
    ),
    {
      status: 200,
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'access-control-allow-origin': '*'
      }
    }
  );
}
