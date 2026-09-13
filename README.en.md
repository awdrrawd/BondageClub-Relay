# BondageClub Relay

An unofficial project for learning and connection experiments: a userscript and Cloudflare Pages Worker relay WebSocket traffic from the official BC page. Official sites still supply game code and assets; this is not a full mirror.

- A: native (default). B: direct WebSocket. C: Cloudflare relay.
- Mode C carries the handshake, login and subsequent game traffic.
- The panel heading shows connection status. Browser languages zh/tw use Chinese; all others use English.
- Login removes the panel and polling. Reload to configure again.

[Installation and bilingual guide](https://bondageclub-relay.pages.dev/) · [中文](README.md)

## Install with Tampermonkey

1. Visit the [official Tampermonkey website](https://www.tampermonkey.net/), choose your browser and install through its official extension store.
2. Enable Tampermonkey and allow it to run on the official BC game site. Follow any manager prompts for userscript permissions.
3. Open the [BC Relay installation page](https://bondageclub-relay.pages.dev/) and select Install / Update Loader, or open [install.user.js](https://bondageclub-relay.pages.dev/install.user.js) directly. Confirm installation in Tampermonkey.
4. Check that **BC Relay Connection Test** is enabled, with only one copy installed. Do not copy `src/client.user.js` from the repository: it is an unconfigured template.
5. Reload or reopen the official game page. Click the lower-right bubble, select **C · Cloudflare relay**, press Apply and confirm the reload, then log in. The default A mode connects directly.

The bubble and polling are removed after login. Reload to configure again. If the bubble is missing, check script activation, site permissions and conflicting connection mods.

**Updates:** remote UI JS/CSS refresh on page load. Tampermonkey checks for loader core updates; you can also reopen the installation link to update. Self-hosters should install from their own Relay deployment.

**Tampermonkey is the supported relay installation method.** Bookmark and console injection normally occur after official socket initialization and cannot reliably intercept the connection, so those loading methods are not offered.

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

## Public load monitor

The `/monitor/` page publishes aggregate usage only, with no game probes. Configure read-only Cloudflare monitoring secrets first. [Setup](docs/monitor.md).
