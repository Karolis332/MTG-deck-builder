Second public Windows build of The Black Grimoire — the MTG Arena companion. Installs over beta.1; beta.1 picks this up through its auto-update feed.

**Highlights since beta.1**
- Web sync: every recorded Arena match is sent to your theblackgrimoire.com account — automatically after each match and on app start, or on demand from Settings → Web Sync (Test connection, Sync now). Create the token on the site under Dashboard → Matches → "Connect the desktop app", paste it once; the app never shows it again.
- Match recording never waits on the network: a failed sync is retried on the next match or launch; rows with no usable date or match id are skipped and reported in Settings instead of blocking a batch.
- Local API hardening: the settings endpoints accept JSON from the app window only (same-origin + signed-in), so a web page open in your browser cannot repoint where your matches are sent.

**Install**
- `the-black-grimoire-1.0.0-beta.2-win-x64.exe` — installer (recommended; auto-updates from this feed)
- `-portable.exe` — no install, single file; `.zip` — unpacked
- Windows 10/11 x64. The build is not code-signed yet: SmartScreen shows "Windows protected your PC" → **More info → Run anyway**.
