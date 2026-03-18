Pack d’import Cloudflare KV — Forex Capture Analyzer PRO

Contenu :
- cloudflare_kv_bulk_records.json : fichier JSON complet avec 1000 entrées clé/valeur.
- cloudflare_kv_bulk_records.ndjson : même contenu en NDJSON.
- cloudflare_kv_import_manifest.csv : manifeste lisible avec le JSON de chaque licence.
- fca_cloudflare_import_pack.xlsx : classeur de contrôle avec résumé + détails.
- fichiers JSON par groupe : 8 fichiers, un par tarif.

Répartition appliquée :
- Groupe 1 : 125 licences -> 5 captures -> 2 USDT
- Groupe 2 : 125 licences -> 25 captures -> 8 USDT
- Groupe 3 : 125 licences -> 50 captures -> 15 USDT
- Groupe 4 : 125 licences -> 100 captures -> 25 USDT
- Groupe 5 : 125 licences -> 30 jours -> 60 USDT
- Groupe 6 : 125 licences -> 90 jours -> 175 USDT
- Groupe 7 : 125 licences -> 190 jours -> 355 USDT
- Groupe 8 : 125 licences -> 365 jours -> 675 USDT

Structure JSON de chaque licence :
{
  "licenseKey": "...",
  "status": "active",
  "group": "Groupe X",
  "offerCode": "...",
  "offerLabel": "...",
  "mode": "captures" | "duration",
  "priceUsd": 2,
  "currency": "USDT",
  "capturesBought": 5,
  "capturesUsed": 0,
  "capturesRemaining": 5,
  "durationDays": null,
  "activatedAt": null,
  "expiresAt": null,
  "deviceId": null,
  "deviceLocked": false,
  "maxDevices": 1,
  "plan": "PRO",
  "sourceExpiration": "2027-03-03",
  "note": "..."
}
