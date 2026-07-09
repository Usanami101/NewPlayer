# Contributing to NewPlayer

Thanks for helping improve NewPlayer.

## Development setup

1. Fork and clone the repo  
2. `npm install`  
3. `npm start`  
4. Prefer small, focused pull requests  

## Guidelines

- **Do not** commit `node_modules/`, `dist/`, or large `.exe` binaries — use GitHub Releases for downloads.  
- Keep mode UIs self-contained under `src/renderer/`.  
- Main-process logic lives in `src/main/`.  
- Settings go through `src/settings/catalog.js` + `electron-store`.  
- Weather/EAS must not spam users: respect severity thresholds and unlock rules.  
- Prefer free/public data sources only (NWS, Radio Browser, public RSS, iptv-org).  

## Commit style

Use clear messages, e.g.:

- `fix(newradio): improve dial filter layout`
- `feat(eas): allow dismiss after speech ends`
- `docs: update README download section`

## Reporting bugs

Include:

- Windows version  
- NewPlayer version  
- Mode (NewTube / NewTV / NewRadio / NewWeather / New(s))  
- Steps to reproduce  
- Console / main-process error text if any  

## Code of conduct

Be respectful. No harassment, spam, or illegal streaming requests.
