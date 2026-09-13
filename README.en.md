# BondageClub Relay

A userscript and Cloudflare Pages Worker that relay connections from the official Bondage Club page. Game code and assets remain on official sites; this repository is not a game mirror.

- A: native connection. B: direct WebSocket. C: Cloudflare WebSocket relay.
- Mode C relays login and subsequent game messages, not just the handshake.
- Mode A is the default. Switching reloads the page; controls hide after login.
- Install and update through your deployment's `/install.user.js`, not the repository template.

## Build and deploy

```sh
npm ci
npm run check
```

Existing Cloudflare settings remain valid: build `npm test && npm run build:relay`, output `dist-relay`, Node.js 22. The `build` and `build:relay` scripts use the same builder.

Source is in `src/`, the builder in `scripts/`, and tests in `tests/`. No upstream checkout, pinned game commit, R2, asset CDN or service worker is needed.

## Game updates

Outfit, activity, translation and ordinary UI updates generally need no relay release: the official page loads the game, and the Worker forwards its socket without interpreting gameplay messages.

Review compatibility if official domains, server addresses, Socket.IO initialization, Engine.IO protocol, CSP or userscript injection behavior change. Login visibility also depends on `Player.MemberNumber`.

After game updates, verify mode C's WebSocket destination, login, chat, room changes and reconnection. A working status endpoint does not prove an upstream connection works.

- [Deployment and troubleshooting (Chinese)](docs/connection-test.md)
- [Architecture and maintenance (Chinese)](docs/architecture.md)

The LICENSE covers this repository's own code. Official game and third-party code retain their respective licenses.

## Loader lifecycle

The installed loader hooks Socket.IO synchronously, before downloading the remote UI. `runtime.js` and CSS refresh on each page load; the early connection core remains in the loader to avoid a download race. Core changes require a version bump and are picked up by Tampermonkey's update checks through the deployment's updateURL/downloadURL. Install 0.2.0 once to migrate.

Login removes the panel, its poll and lifecycle listeners permanently for that page. Reload to configure again. CI runs tests/build on main pushes and PRs; Dependabot checks GitHub Actions monthly without auto-merging.
