# Changelog

All notable changes to NewPlayer are documented here.

## [2.1.0] — 2026-07-10

### Added
- **NewFile** — high-quality file manager: browse drives/folders, smart *Sense* classification, duplicate detection, search, trash/rename/open, and **Auto-organize** into `_NewFile_Organized` categories
- **NewTalk** — NewPlayer accounts, private servers (invite codes), public topic rooms (Welcome, Gaming, Tech, Music, Movies, Random, Help), local-first messaging with optional peer sync via public Gun relays (no developer-hosted servers)

### Update notes (user data safe)
- Same `appId` (`com.newplayer.app`) and settings store (`newtube-settings`) — **install over 2.0.0 to update; settings, favorites, and window prefs are kept**
- Installer keeps `deleteAppDataOnUninstall: false` and the same NSIS GUID
- NewTalk data lives under `%APPDATA%/NewPlayer/newtalk/` and survives updates

## [2.0.0] — 2026-07-09

### Added
- **NewPlayer** unified home launcher (five modes)
- **NewTube** — YouTube TV shell, Ad Shield, Multi Desk, deep settings
- **NewTV** — IPTV by country/genre, favorites, custom M3U, HLS playback
- **NewRadio** — radio dial UI; filter by genre, country, faith, language
- **NewWeather** — NWS forecast & alerts; tray background watcher
- **EAS** full-screen takeover for severe weather (tones + real NWS text)
- **New(s)** — worldwide RSS headlines
- Professional NSIS installer + portable builds

### Fixed
- Invalid adblock URL patterns crashing main process
- Fullscreen exit / window restore (draggable framed window)
- EAS dismiss after 30s or when speech finishes
- Installer branding (NewRadio, not NewMusi)

## [1.0.0] — 2026-07-09

### Added
- Initial NewTube-only Electron client (historical)
