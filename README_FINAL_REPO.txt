FOREX CAPTURE ANALYZER — REPO FINAL PRET

Ce pack contient :
1) site/  -> projet final a mettre sur GitHub puis connecter a Cloudflare Pages
2) licenses/ -> pack d'import des 1000 licences pre-creees pour Workers KV LICENSES

DEPLOIEMENT DU SITE
- Utiliser UNIQUEMENT le dossier site/
- Creer un depot GitHub vide: forex-capture-analyzer
- Uploader le contenu du dossier site/ (pas le zip entier, pas le dossier parent)
- Connecter ce repo a Cloudflare Pages via "Connect Git"
- Output directory: /
- Build command: laisser vide

CONFIGURATION CLOUDFLARE A GARDER
- KV Bindings:
  - LICENSES -> namespace LICENSES
  - EVENTS -> namespace EVENTS
- Variables / secrets:
  - LICENSE_SECRET
  - ADMIN_TOKEN
  - ADMIN_MASTER_KEY

TESTS APRES DEPLOIEMENT
- /api/health -> doit afficher OK
- /api/license/TEST-1234-TEST-5678 -> doit afficher du JSON

IMPORT DES 1000 LICENCES
- Le pack d'import est dans licenses/
- Fichier principal: cloudflare_kv_bulk_records.ndjson
- Ces licences doivent etre importees dans le KV LICENSES
- Le site ne se deploie PAS avec ce pack d'import

IMPORTANT
- Utiliser le dossier site/ pour GitHub + Cloudflare Pages
- Utiliser licenses/ uniquement pour remplir Workers KV LICENSES
