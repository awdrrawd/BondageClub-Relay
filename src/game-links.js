import {fallbackEntries, fallbackVersion, LAST_GOOD_MS, validVersion, gameVersion, detectedVersion, resolveEntries, canProbe} from './game-config.js';
import {t, getLanguage, initLanguage} from './site-i18n.js';

const status = document.getElementById('game-links-status');
const list = document.getElementById('game-links');
const retry = document.getElementById('game-links-retry');
const check = document.getElementById('game-links-check');
const form = document.getElementById('game-links-settings');
const input = document.getElementById('game-links-input');
const versionInput = document.getElementById('game-version-input');
const feedback = document.getElementById('game-settings-status');
const settingsKey = 'bc-relay-entry-settings-v1', backupKey = 'bc-relay-entry-backup-v1';
let directory = {links:[], mode:'unavailable'}, cards = [], run = 0, controller;
let loading = true, checking = false, feedbackKey = '';
initLanguage();

function readSaved(key) { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } }
function writeSaved(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch { return false; } }
function validLinks(links) {
  return Array.isArray(links) && links.length > 0 && links.every(link => typeof link.name === 'string' && gameVersion(link.url));
}
function recent(data) {
  const age = Date.now() - Date.parse(data?.updatedAt);
  return age >= 0 && age < LAST_GOOD_MS && validLinks(data?.links);
}
function recentBackup() {
  return [directory, readSaved(backupKey)].filter(recent)
    .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt))[0];
}
function parseEntries(value) {
  const lines = value.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length > 12) throw new Error('tooMany');
  return lines.map(line => {
    const split = line.indexOf('|');
    const name = split < 0 ? '' : line.slice(0, split).trim();
    const url = (split < 0 ? line : line.slice(split + 1)).trim();
    if (url.length > 2000 || !gameVersion(url.replaceAll('{version}', 'R1'))) throw new Error('invalidURL');
    return {name:name.slice(0,80) || new URL(url.replaceAll('{version}', 'R1')).hostname, url};
  });
}
let custom = [], manualVersion = '';
const saved = readSaved(settingsKey);
try {
  if (saved && typeof saved.entries === 'string') {
    custom = parseEntries(saved.entries);
    manualVersion = validVersion(saved.version) ? saved.version : '';
  }
} catch { /* Invalid browser settings use site defaults. */ }
input.value = saved && custom.length ? saved.entries : fallbackEntries.map(entry => entry.name + ' | ' + entry.url).join('\n');
versionInput.value = manualVersion;

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}
function displayTime(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString(getLanguage() === 'zh' ? 'zh-TW' : 'en-GB');
}
function templateVersion() {
  return (directory.mode === 'official' ? detectedVersion(directory.links) : null) || manualVersion || detectedVersion(directory.links) || fallbackVersion;
}
function serverText(data) {
  if (data.state === 'available') return t('reachable');
  if (data.state === 'idle') return t('pending');
  if (data.state === 'checking') return t('checking');
  if (data.reason === 'http') return 'HTTP ' + data.httpStatus;
  return t({'not-game':'notGame',timeout:'timeout',redirect:'redirectUnknown',unsupported:'unsupported'}[data.reason] || 'unconfirmed');
}
function updateCard(card) {
  const {entry, serverData, localState} = card;
  const serverState = ['available','unavailable','checking','idle'].includes(serverData.state) ? serverData.state : 'unknown';
  const ready = serverState === 'available' && localState === 'available';
  const state = !entry.url ? 'unknown' : serverState === 'unavailable' ? 'unavailable'
    : serverState === 'checking' || localState === 'checking' ? 'checking'
      : ready ? 'available' : serverState === 'idle' ? 'idle' : 'unknown';
  card.node.dataset.state = state;
  card.badge.textContent = t(!entry.url ? 'needsVersion' : ({available:'ready',unavailable:'missing',checking:'checking',idle:'pending',unknown:'unconfirmed'})[state]);
  const finalUrl = card.finalUrl || entry.url;
  const oldVersion = gameVersion(entry.url), newVersion = gameVersion(finalUrl);
  card.originLabel.textContent = t(entry.seed ? 'originSeed' : entry.origin);
  card.version.textContent = oldVersion ? oldVersion + (finalUrl !== entry.url ? ' → ' + newVersion : '') : t('needsVersion');
  card.host.textContent = finalUrl ? new URL(finalUrl).hostname : t('configureVersion');
  card.link.textContent = t(entry.url ? 'enter' : 'configureVersion');
  card.link.setAttribute('aria-label', t(entry.url ? 'enter' : 'configureVersion') + ' · ' + entry.name);
  if (finalUrl) card.link.href = finalUrl;
  card.serverLabel.textContent = t('gamePage');
  card.localLabel.textContent = t('localAsset');
  card.server.textContent = entry.url ? serverText(serverData) : '—';
  card.server.dataset.state = serverState;
  card.local.textContent = !entry.url ? '—' : t(({available:'reachable',unknown:'unconfirmed',checking:'checking',idle:'pending'})[localState]);
  card.local.dataset.state = localState;
  card.local.title = localState === 'unknown' ? t('assetUnknown') : '';
  card.detailsLabel.textContent = t('checkDetails');
  card.redirect.textContent = finalUrl && finalUrl !== entry.url ? t('redirected') : '';
  card.time.textContent = t('serverAt') + ' · ' + (serverData.checkedAt ? displayTime(serverData.checkedAt) : '—') +
    '\n' + t('localAt') + ' · ' + (card.localAt ? displayTime(card.localAt) : '—');
  card.start.textContent = entry.url ? t('originalURL') + ' · ' + entry.url : t('configureVersion');
  card.ready = ready;
}
function updateSummary() {
  document.getElementById('entry-count').textContent = cards.length ? String(cards.length).padStart(2,'0') : '—';
  document.getElementById('ready-count').textContent = cards.length ? cards.filter(card => card.ready).length + ' / ' + cards.length : '—';
  document.getElementById('directory-version').textContent = detectedVersion(directory.links) || t('unknownVersion');
  document.getElementById('check-action-label').textContent = t(checking ? 'checkingAction' : 'check');
  check.disabled = checking || !cards.some(card => card.entry.url);
  check.setAttribute('aria-busy', String(checking));
  if (loading) { status.textContent = t('loading'); return; }
  const source = directory.mode === 'official' ? 'officialSource' : ['stale','browser'].includes(directory.mode) ? 'staleSource' : 'fallbackSource';
  status.textContent = t(source) + (directory.updatedAt ? '\n' + t('sourceTime', {time:displayTime(directory.updatedAt)}) : '');
  if (directory.mode !== 'official' && manualVersion) status.textContent += ' · ' + t('manualSource');
}
function render() {
  controller?.abort();
  run++;
  const live = directory.mode === 'official';
  const entries = (!live && manualVersion ? [] : directory.links).map(link => ({...link, origin:live ? 'originOfficial' : 'originFallback'}));
  const presets = !entries.length ? fallbackEntries.map(entry => ({...entry, origin:'originFallback'})) : [];
  const configured = custom.map(entry => ({...entry, origin:'originCustom'}));
  for (const entry of resolveEntries([...presets, ...configured], templateVersion())) {
    if (!entry.url || !entries.some(link => link.url === entry.url)) entries.push(entry);
  }
  cards = entries.map(entry => {
    const node = element('article', 'game-card');
    const heading = element('div', 'card-heading');
    const mark = element('span', 'region-mark', entry.name.replace(/[^a-z0-9]/gi, '').slice(0,2).toUpperCase() || 'BC');
    mark.setAttribute('aria-hidden', 'true');
    const badge = element('span', 'entry-badge');
    heading.append(mark, badge);
    const name = element('h3', 'entry-name', entry.name);
    const origin = element('p', 'entry-origin'), originLabel = element('span'), version = element('span', 'version-chip');
    origin.append(originLabel, version);
    const host = element('p', 'entry-host');
    const statuses = element('div', 'status-list');
    const serverRow = element('div', 'status-row'), localRow = element('div', 'status-row');
    const serverLabel = element('span', 'status-label'), localLabel = element('span', 'status-label');
    const server = element('span', 'entry-state server-state'), local = element('span', 'entry-state local-state');
    serverRow.append(serverLabel, server); localRow.append(localLabel, local); statuses.append(serverRow, localRow);
    const link = element(entry.url ? 'a' : 'span', 'game-link');
    if (entry.url) link.rel = 'noreferrer';
    const details = element('details', 'entry-details'), detailsLabel = element('summary'), redirect = element('p','redirect-note');
    const time = element('p','entry-time'), start = element('p','entry-time entry-start');
    details.append(detailsLabel, redirect, time, start);
    node.append(heading, name, origin, host, statuses, link, details);
    const card = {entry,node,badge,originLabel,version,host,serverLabel,localLabel,server,local,link,detailsLabel,redirect,time,start,serverData:{state:'idle'},localState:'idle'};
    updateCard(card);
    return card;
  });
  list.replaceChildren(...cards.map(card => card.node));
  list.setAttribute('aria-busy', 'false');
  updateSummary();
  void checkAll();
}

async function loadGameLinks() {
  retry.disabled = true;
  loading = true;
  updateSummary();
  try {
    const response = await fetch('/api/game-links', {signal:AbortSignal.timeout(12000)});
    if (!response.ok) throw new Error('Directory unavailable');
    const data = await response.json();
    if (!['official','stale','configured','unavailable'].includes(data.mode) || !Array.isArray(data.links) || (data.links.length && !validLinks(data.links))) throw new Error('Invalid directory');
    const backup = recentBackup();
    directory = data;
    if (data.mode === 'official' && recent(data)) writeSaved(backupKey, data);
    else if (data.mode !== 'official' && backup && (!recent(data) || Date.parse(backup.updatedAt) > Date.parse(data.updatedAt))) {
      directory = {...backup, mode:'browser'};
    }
  } catch {
    const backup = recentBackup();
    directory = backup ? {...backup, mode:'browser'} : {links:[], mode:'unavailable'};
  } finally { retry.disabled = false; loading = false; }
  render();
}

function probeImage(url, signal) {
  return new Promise(resolve => {
    const img = new Image();
    let settled = false;
    const finish = reachable => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      img.onload = img.onerror = null;
      img.src = '';
      resolve(reachable);
    };
    const abort = () => finish(false);
    const timer = setTimeout(() => finish(false), 7000);
    signal.addEventListener('abort', abort, {once:true});
    img.referrerPolicy = 'no-referrer';
    img.onload = () => finish(true);
    img.onerror = () => finish(false);
    const asset = new URL('Icons/Logo.png', url);
    asset.searchParams.set('relay-check', Date.now());
    img.src = asset.href;
    if (signal.aborted) abort();
  });
}
async function checkCard(card, generation, signal) {
  if (!card.entry.url) return;
  if (!canProbe(card.entry.url)) {
    card.serverData = {state:'unknown',reason:'unsupported'};
    card.localState = 'unknown';
    updateCard(card);
    return;
  }
  card.serverData = {state:'checking'};
  card.localState = 'idle';
  card.localAt = null;
  card.ready = false;
  updateCard(card);
  updateSummary();
  const data = await (async () => {
    try {
      const response = await fetch('/api/game-link-status?url=' + encodeURIComponent(card.entry.url), {signal:AbortSignal.any([signal, AbortSignal.timeout(11000)])});
      if (!response.ok) throw new Error('Probe unavailable');
      const result = await response.json();
      return result && typeof result === 'object' ? result : {state:'unknown',reason:'network'};
    } catch { return {state:'unknown', reason:'network'}; }
  })();
  if (generation !== run || signal.aborted) return;
  card.finalUrl = data.state === 'available' && canProbe(data.finalUrl) ? data.finalUrl : card.entry.url;
  card.serverData = data;
  card.localState = 'checking';
  updateCard(card);
  // Check assets only at the verified destination when an entry redirects.
  const localOK = await probeImage(card.finalUrl, signal);
  if (generation !== run || signal.aborted) return;
  card.localState = localOK ? 'available' : 'unknown';
  card.localAt = Date.now();
  updateCard(card);
  updateSummary();
}
async function checkAll() {
  controller?.abort();
  controller = new AbortController();
  const signal = controller.signal, generation = ++run;
  checking = true;
  for (const card of cards) {
    card.ready = false; card.serverData = {state:'idle'}; card.localState = 'idle'; card.localAt = null;
    updateCard(card);
  }
  updateSummary();
  let next = 0;
  const snapshot = cards;
  await Promise.all([0,1].map(async () => {
    while (next < snapshot.length && generation === run) await checkCard(snapshot[next++], generation, signal);
  }));
  if (generation === run) { checking = false; updateSummary(); }
}
function showFeedback(key) {
  feedbackKey = key;
  feedback.textContent = t(key);
}
form.addEventListener('submit', event => {
  event.preventDefault();
  try {
    const entries = parseEntries(input.value);
    const version = versionInput.value.trim();
    if (version && !validVersion(version)) throw new Error('invalidVersion');
    custom = entries;
    manualVersion = version;
    const persisted = writeSaved(settingsKey, {entries:input.value, version});
    showFeedback(persisted ? 'saved' : 'saveFailed');
    render();
  } catch (error) { showFeedback(error.message); }
});
document.getElementById('game-settings-reset').addEventListener('click', () => {
  custom = []; manualVersion = '';
  input.value = fallbackEntries.map(entry => entry.name + ' | ' + entry.url).join('\n');
  versionInput.value = '';
  const persisted = writeSaved(settingsKey, {entries:'', version:''});
  showFeedback(persisted ? 'resetDone' : 'resetFailed');
  render();
});
document.addEventListener('site-language-change', () => {
  cards.forEach(updateCard);
  updateSummary();
  if (feedbackKey) feedback.textContent = t(feedbackKey);
});
retry.addEventListener('click', loadGameLinks);
check.addEventListener('click', checkAll);
void loadGameLinks();
