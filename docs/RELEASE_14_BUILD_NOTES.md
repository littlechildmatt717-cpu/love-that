# love that — Release 14 build notes

## Dependency policy
The app now pins the direct JavaScript dependencies to exact versions instead of `latest` so a future install cannot silently jump to a new major release.

Pinned versions:
- React 19.3.0
- React DOM 19.3.0
- Vite 8.3.0
- @vitejs/plugin-react 6.1.1
- Lucide React 1.45.0
- Capacitor Core/Android/iOS/CLI 8.5.2
- Supabase JS 2.116.0

These versions were checked against npm's current package metadata on 14 September 2026.

## Lockfile status
A `package-lock.json` is still not included because the current execution environment cannot complete an npm registry install within the available network timeout. GitHub Actions therefore retains a safe fallback: `npm ci` when a lockfile is present, otherwise `npm install` using the exact versions in `package.json`.

For the production repository, the recommended next step is to run `npm install` once in a normal developer/CI environment, commit the resulting `package-lock.json`, and then change the workflows to require `npm ci`.
