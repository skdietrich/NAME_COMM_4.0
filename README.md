# NAMECOMM

CSPRNG-backed psychic number generator with optional human-entropy mixing, audit log, CSV export, and offline PWA.

## Local preview
Just open `index.html` in a modern browser. No build step.

## Deploy on GitHub Pages
1. Push this folder to a public repo named `NAMECOMM` (or any name).
2. Repo **Settings → Pages** → Source: `main`, Folder: `/ (root)` → **Save**.
3. Wait until it says **Published**.  
   Your URL: `https://<your-user>.github.io/<repo-name>/`

## Netlify (optional)
- Build command: *(empty)*
- Publish directory: `/`

## Notes
- Paths are relative (`./…`) so it works under project subpaths.
- Update the service worker `VERSION` string to roll caches after changes.
