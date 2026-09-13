# BondageClub Relay

An unofficial project for learning and connection experiments: a userscript and Cloudflare Pages Worker relay WebSocket traffic from the official BC page. Official sites still supply game code and assets; this is not a full mirror.

- A: native (default). B: direct WebSocket. C: Cloudflare relay.
- Mode C carries the handshake, login and subsequent game traffic.
- The panel heading shows connection status. Browser languages zh/tw use Chinese; all others use English.
- Login removes the panel and polling. Reload to configure again.

[Installation and bilingual guide](https://bondageclub-relay.pages.dev/) · [中文](README.md)

## Installation and development

Install or update through the deployment's `/install.user.js`, not the repository template. Remote UI refreshes on page load; the early connection core updates through Tampermonkey's update checks.

```sh
npm ci
npm run check
```

Cloudflare build: `npm test && npm run build:relay`; output: `dist-relay`; NODE_VERSION: 22. Both build scripts use the same builder.

- [Deployment and troubleshooting (Chinese)](docs/connection-test.md)
- [Architecture and game updates (Chinese)](docs/architecture.md)

No upstream checkout, pinned game SHA, R2 or asset CDN is required. GitHub CI runs tests/build; Dependabot checks Actions monthly without auto-merging.

## Use statement

For learning, research and connection testing only. Stability, availability, speed and continued service are not guaranteed. Exhausted free quotas, platform restrictions, maintenance or upstream failures may cause throttling, interruption or termination. The maintainer does not commit to purchasing extra quota, a restoration deadline or compensation, and accepts no responsibility for resulting disruption or losses. Users assess their own risks; self-hosting operators manage their own quotas and charges.

Use only a relay you operate or trust. The code does not log login or chat content, but mode C carries that data through the relay. The LICENSE covers this repository's own code; official and third-party code retain their respective licenses.
