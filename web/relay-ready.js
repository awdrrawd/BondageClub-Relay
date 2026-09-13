// Loaded before official code; GameStart awaits this before loading any assets or connecting.
window.RelayReady = async function () {
  if (!navigator.serviceWorker?.controller) {
    location.replace('/');
    throw new Error('Open the Relay entry page first.');
  }
  const config = await fetch('/relay-build.json', { cache: 'no-store' }).then(r => r.json());
  const revision = await new Promise((resolve, reject) => {
    const channel = new MessageChannel();
    const timeout = setTimeout(() => { channel.port1.close(); reject(new Error('Media router did not respond')); }, 5000);
    channel.port1.onmessage = event => { clearTimeout(timeout); channel.port1.close(); resolve(event.data); };
    navigator.serviceWorker.controller.postMessage('revision', [channel.port2]);
  });
  if (!config.assetBase || revision !== config.revision) {
    location.replace('/');
    throw new Error('Media configuration is missing or outdated.');
  }
};
