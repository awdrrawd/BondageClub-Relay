// Site-wide fallback settings. {version} includes the R, e.g. R132.
// Leave fallbackVersion empty to prefer discovery / the last successful result.
export const GAME_DIRECTORY = 'https://www.bondageprojects.com/club_game/';
export const fallbackVersion = '';
export const fallbackEntries = [
  // Historical URLs are discovery starting points, NOT a hardcoded current version.
  {name: 'America Server', url: 'https://www.bondageprojects.elementfx.com/{version}/BondageClub/', seedUrl: 'https://www.bondageprojects.elementfx.com/R131/BondageClub/'},
  {name: 'Europe A', url: 'https://www.bondageeurope.com/{version}/BondageClub/', seedUrl: 'https://www.bondageeurope.com/R131/BondageClub/'},
  {name: 'Europe B', url: 'https://www.bondage-europe.com/{version}/BondageClub/', seedUrl: 'https://www.bondage-europe.com/R131/BondageClub/'},
  {name: 'Asia Server', url: 'https://www.bondage-asia.com/club/{version}/', seedUrl: 'https://www.bondage-asia.com/club/R131/'},
];
// Used only for status probes, independently of the loader/relay allowlists.
export const probeHosts = ['bondageprojects.elementfx.com', 'bondageeurope.com', 'bondage-europe.com', 'bondage-asia.com', 'bondageprojects.com'];
export const LAST_GOOD_MS = 7 * 24 * 60 * 60 * 1000;
export const validVersion = value => /^R\d+(?:Beta\d+)?$/.test(value || '');
export function gameVersion(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.port || url.search) return null;
    const match = /^\/(?:(R\d+(?:Beta\d+)?)\/BondageClub\/|club\/(R\d+(?:Beta\d+)?)\/)(?:index\.html)?$/.exec(url.pathname);
    return match?.[1] || match?.[2] || null;
  } catch { return null; }
}
export function canProbe(value) {
  return Boolean(gameVersion(value) && probeHosts.includes(new URL(value).hostname.replace(/^www\./, '')));
}
export function detectedVersion(links) {
  const versions = new Set(links.filter(link => !link.seed).map(link => gameVersion(link.url)).filter(Boolean));
  return versions.size === 1 ? [...versions][0] : null;
}
export function resolveEntries(entries, version) {
  return entries.map(entry => {
    const url = entry.url.replaceAll('{version}', validVersion(version) ? version : '');
    if (gameVersion(url)) return {...entry, url, seed:false};
    const seedUrl = entry.seedUrl || fallbackEntries.find(preset => preset.url === entry.url)?.seedUrl;
    return {...entry, url:canProbe(seedUrl) ? seedUrl : null, seed:true};
  });
}
