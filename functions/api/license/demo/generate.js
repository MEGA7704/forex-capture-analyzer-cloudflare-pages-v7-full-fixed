import { json, options, readJsonBody, getLicenses, saveLicenses, normalizeLicenseShape, nowIso, signToken, sanitizeLicenseForClient } from '../../../_lib/common.js';

async function saveAndReturnExisting(env, items, updated) {
  const next = (items || []).map(x => String(x.license_key||'').trim().toUpperCase() === String(updated.license_key||'').trim().toUpperCase() ? updated : x);
  await saveLicenses(env, next);
  return updated;
}

export async function onRequest({request,env}){
  if(request.method==='OPTIONS') return options();
  if(request.method!=='POST') return json({ok:false,error:'Méthode non autorisée'},405);
  try{
    const body=await readJsonBody(request);
    const deviceId=String(body?.deviceId||'').trim();
    const clientMeta=body?.clientMeta||{};
    const email=String(body?.email || clientMeta?.email || '').trim().toLowerCase();
    if(!deviceId) return json({ok:false,error:'deviceId manquant'},400);
    if(!email) return json({ok:false,error:'email manquant'},400);
    const items=await getLicenses(env,request);
    let existing=items.find(x=>String(x.plan_id||'').trim()==='DEMO_10_CAPTURE' && String(x.device_id||'').trim()===deviceId);
    if(existing){
      existing.email = existing.email || email;
      existing.user_email = existing.user_email || email;
      existing.client_meta = { ...(existing.client_meta || {}), ...clientMeta, email: (existing.client_meta && existing.client_meta.email) || email };
      existing = await saveAndReturnExisting(env, items, existing);
      const token=await signToken({sub:existing.license_key,device_id:deviceId,role:'client',exp:Math.floor(Date.now()/1000)+60*60*12},env.LICENSE_SECRET);
      return json({ok:true,demoKey:existing.license_key,token,license:sanitizeLicenseForClient(existing)});
    }
    const key='DEMO-'+Math.random().toString(36).substring(2,6).toUpperCase()+'-'+Math.random().toString(36).substring(2,6).toUpperCase()+'-'+Math.random().toString(36).substring(2,6).toUpperCase();
    const license=normalizeLicenseShape({license_key:key,plan_id:'DEMO_10_CAPTURE',plan_label:'Démo 10 captures',mode:'count',analysis_limit:10,analysis_count:0,device_id:deviceId,device_locked:true,live_allowed:false,issued_at:nowIso(),expiration:new Date(Date.now()+365*24*3600*1000).toISOString(),client_meta:{...clientMeta,email},email,user_email:email,status:'active'});
    await saveLicenses(env,[...items,license]);
    const token=await signToken({sub:license.license_key,device_id:deviceId,role:'client',exp:Math.floor(Date.now()/1000)+60*60*12},env.LICENSE_SECRET);
    return json({ok:true,demoKey:key,token,license:sanitizeLicenseForClient(license)});
  }catch(err){
    return json({ok:false,error:err.message},500);
  }
}
