# BondageClub Relay

An independent full-client experiment. Official BC code runs in the browser; a Cloudflare Pages Worker relays Socket.IO, while a browser Service Worker loads media directly from an external asset host.

**Not playable yet:** a CORS-enabled, matching-version asset host is required. The pinned source is `R132Beta1`, so the configuration defaults to TEST. Production builds reject beta/alpha versions.

Run `npm ci`, `npm test`, `npm run build`, then `npm run check:assets`. Builds fetch the exact SHA in `upstream-version.txt`; source downloads and generated output are ignored by Git. No changes are made to Lite.

See [setup](docs/setup.md) and [architecture](docs/architecture.md). This repository's MIT license covers its own deployment tooling, not upstream BC or third-party code.
