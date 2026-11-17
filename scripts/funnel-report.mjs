#!/usr/bin/env node
// Where visitors drop, tap and stall. Read-only: it prints totals and never an answer,
// a contact detail or a private link.
//
//   node scripts/funnel-report.mjs                 today (IST) from production
//   node scripts/funnel-report.mjs --hours 6       the last 6 hours
//   node scripts/funnel-report.mjs --since 2026-11-18T00:00:00+05:30
//   node scripts/funnel-report.mjs --ad 120248243481920009     one ad only
//   node scripts/funnel-report.mjs --file .data/events.ndjson  a local development log (all of it)
//
// Production needs `gcloud auth login` as someone who can read Firestore in fitovela-prod.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const args = process.argv.slice(2);
const arg = (name) => (args.includes(name) ? args[args.indexOf(name) + 1] : undefined);
const IST = 5.5 * 3600 * 1000;
const startOfIstDay = new Date(Math.floor((Date.now() + IST) / 86400000) * 86400000 - IST);
const since = arg('--since') ? new Date(arg('--since')) : arg('--hours') ? new Date(Date.now() - Number(arg('--hours')) * 3600 * 1000) : startOfIstDay;
const onlyAd = arg('--ad');
const ist = (d) => new Date(new Date(d).getTime() + IST).toISOString().slice(0, 16).replace('T', ' ');

async function fromFirestore() {
  const token = execSync('gcloud auth print-access-token', { encoding: 'utf8' }).trim();
  const url = 'https://firestore.googleapis.com/v1/projects/fitovela-prod/databases/(default)/documents:runQuery';
  const value = (f) => (f == null ? undefined : f.stringValue ?? (f.integerValue !== undefined ? Number(f.integerValue) : undefined) ?? f.doubleValue ?? f.booleanValue ?? (f.mapValue ? Object.fromEntries(Object.entries(f.mapValue.fields ?? {}).map(([k, v]) => [k, value(v)])) : undefined));
  const out = [];
  let after = null;
  // Pages of 5,000, ordered by time and then by document, so events written in the same
  // millisecond are neither skipped nor read twice.
  for (let page = 0; page < 60; page += 1) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ structuredQuery: {
        from: [{ collectionId: 'events' }],
        where: { fieldFilter: { field: { fieldPath: 'at' }, op: 'GREATER_THAN_OR_EQUAL', value: { stringValue: since.toISOString() } } },
        orderBy: [{ field: { fieldPath: 'at' }, direction: 'ASCENDING' }, { field: { fieldPath: '__name__' }, direction: 'ASCENDING' }],
        ...(after ? { startAt: { values: [{ stringValue: after.at }, { referenceValue: after.name }], before: false } } : {}),
        limit: 5000,
      } }),
    });
    if (!res.ok) throw new Error(`Firestore replied ${res.status}`);
    const rows = (await res.json()).filter((r) => r.document);
    out.push(...rows.map((r) => value({ mapValue: r.document })));
    if (rows.length < 5000) return out;
    const lastDoc = rows[rows.length - 1].document;
    after = { at: lastDoc.fields.at.stringValue, name: lastDoc.name };
  }
  throw new Error('More than 300,000 events in the range; narrow it with --hours.');
}

const events = (arg('--file') ? readFileSync(arg('--file'), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : await fromFirestore()).sort((a, b) => (a.at < b.at ? -1 : 1));

// One person = one visit. Browser events carry a visit id; server events carry a session id;
// any event with both joins the two.
const visitOfSession = new Map();
for (const e of events) if (e.sessionId && e.visitId && !visitOfSession.has(e.sessionId)) visitOfSession.set(e.sessionId, e.visitId);
const who = (e) => e.visitId ?? (e.sessionId ? visitOfSession.get(e.sessionId) ?? `s:${e.sessionId}` : undefined);
const P = (e) => e.props ?? {};

// The ad and device of each visit come from its first page view.
const visits = new Map();
for (const e of events) {
  if (e.name !== 'page_view' || !e.visitId) continue;
  const v = visits.get(e.visitId) ?? { ad: undefined, hook: undefined, src: P(e).src, ua: P(e).ua, os: P(e).os, first: e.at };
  if (P(e).ad && !v.ad) v.ad = String(P(e).ad);
  if (P(e).hook && !v.hook) v.hook = P(e).hook;
  visits.set(e.visitId, v);
}
// landing_view is written by the server before any visit exists, so it is matched on its own ad id.
// Our own test visits are tagged utm_source=claude_check and left out unless asked for by ad id.
const keep = (e) => (onlyAd ? (e.name === 'landing_view' ? String(P(e).ad ?? '') === onlyAd : visits.get(who(e))?.ad === onlyAd) : visits.get(who(e))?.src !== 'claude_check' && P(e).ad !== 'CLAUDE_CHECK');
const E = events.filter(keep);

const people = (pred) => new Set(E.filter(pred).map(who).filter(Boolean));
const n = (pred) => people(pred).size;
const pct = (a, b) => (b ? `${Math.round((a / b) * 100)}%` : '–');
const median = (xs) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : undefined);
const top = (pred, key, limit = 12) => {
  const m = new Map();
  for (const e of E.filter(pred)) {
    const k = key(e);
    if (k === undefined || k === '') continue;
    if (!m.has(k)) m.set(k, new Set());
    m.get(k).add(who(e) ?? Math.random());
  }
  return [...m].map(([k, s]) => [k, s.size]).sort((a, b) => b[1] - a[1]).slice(0, limit);
};
const line = (label, count, base) => console.log(`  ${String(count).padStart(6)}  ${pct(count, base).padStart(4)}  ${label}`);
const head = (t) => console.log(`\n${t}\n${'-'.repeat(t.length)}`);
const list = (rows, base) => rows.forEach(([k, c]) => line(k, c, base));
const on = (name, path) => (e) => e.name === name && (path === undefined || P(e).path === path);

console.log(`Fitovela behaviour report · ${ist(since)} IST to ${ist(new Date())} IST${onlyAd ? ` · ad ${onlyAd}` : ''}`);
console.log(`${E.length} events. Percentages are of the first line in each block. People are counted once each.`);
console.log('Each deploy starts one test assessment (utm_source=deploy-check); it has no browser visit, so it shows up only in the server counts.');

head('1. Landing page');
const loads = E.filter(on('landing_view'));
const known = loads.filter((e) => P(e).ua);
const robots = known.filter((e) => ['meta_crawler', 'bot', 'none'].includes(P(e).ua)).length;
console.log(`  Server loads: ${loads.length}. Device recorded for ${known.length} of them (it was not recorded before 18 Nov 2026, 02:20 IST): ${robots} were Meta's crawler or other robots.`);
const land = n(on('page_view', '/'));
line('people whose browser showed the page', land, land);
line('  … with the page actually on screen', n((e) => on('page_view', '/')(e) && P(e).vis !== false), land);
line('stayed 3 seconds', n((e) => on('engaged', '/')(e) && P(e).s === 3), land);
line('stayed 10 seconds', n((e) => on('engaged', '/')(e) && P(e).s === 10), land);
line('stayed 30 seconds', n((e) => on('engaged', '/')(e) && P(e).s === 30), land);
line('touched the page at all', n(on('first_touch', '/')), land);
line('scrolled', n(on('scroll', '/')), land);
line('tapped something that is not a button', n(on('tap_dead', '/')), land);
line('tapped an age button', n((e) => e.name === 'age_tap'), land);
line('assessment started (server)', n((e) => e.name === 'age_selected'), land);
line('could not start (error shown)', n((e) => e.name === 'session_error'), land);
console.log('  Sections seen:');
list(top(on('section_view', '/'), (e) => `    ${P(e).sec}`), land);
console.log('  Taps on things that are not buttons (section › element):');
list(top(on('tap_dead', '/'), (e) => `    ${P(e).sec ?? '?'} › ${P(e).el}`, 8), land);
console.log('  Buttons and links tapped:');
list(top(on('tap', '/'), (e) => `    ${P(e).label ?? P(e).el}`, 10), land);
console.log('  By device:');
list(top(on('page_view', '/'), (e) => `    ${P(e).ua ?? '?'} / ${P(e).os ?? '?'}`, 8), land);
const lcp = median(E.filter(on('perf', '/')).map((e) => P(e).lcp).filter((x) => typeof x === 'number'));
if (lcp !== undefined) console.log(`  Median time until the page was drawn: ${(lcp / 1000).toFixed(1)} s`);

head('2. By ad (people who saw the landing page → tapped an age → saw the report → saw the prices → paid)');
const byAd = new Map();
const bump = (id, i) => {
  const ad = visits.get(id)?.ad ?? '(no ad id)';
  const row = byAd.get(ad) ?? [0, 0, 0, 0, 0];
  row[i] += 1;
  byAd.set(ad, row);
};
[on('page_view', '/'), (e) => e.name === 'age_selected', (e) => e.name === 'result_view', (e) => e.name === 'unlock_view', (e) => e.name === 'payment_confirmed'].forEach((pred, i) => people(pred).forEach((id) => bump(id, i)));
for (const [ad, r] of [...byAd].sort((a, b) => b[1][0] - a[1][0])) console.log(`  ${ad.padEnd(22)} ${r.map((x) => String(x).padStart(5)).join(' →')}`);

head('3. Assessment, question by question');
const started = n((e) => e.name === 'age_selected');
const order = new Map();
for (const e of E.filter(on('question_view'))) if (!order.has(P(e).q) || P(e).n < order.get(P(e).q)) order.set(P(e).q, P(e).n);
line('started', started, started);
for (const [q] of [...order].sort((a, b) => a[1] - b[1])) {
  const saw = n((e) => e.name === 'question_view' && P(e).q === q);
  const did = n((e) => e.name === 'question_answered' && P(e).question === q);
  console.log(`  ${String(saw).padStart(6)}  ${pct(saw, started).padStart(4)}  saw "${q}"  → ${did} answered, ${saw - did > 0 ? `${saw - did} left here` : 'none left here'}`);
}
line('went back a question', n(on('question_back')), started);
line('reached "building your report"', n(on('analysing_view')), started);
line('saw the email step', n(on('lead_view')), started);
line('gave an email or number', n((e) => e.name === 'lead_captured'), started);
line('skipped the email step', n((e) => e.name === 'lead_skipped'), started);
line('saw her report', n((e) => e.name === 'result_view'), started);
console.log('  Form problems (form › box):');
list(top(on('form_error'), (e) => `    ${P(e).form} › ${P(e).field}`), started);
list(top(on('save_error'), (e) => `    answer did not save › ${P(e).q} (${P(e).status})`), started);

head('4. Report page');
const res = n((e) => e.name === 'result_view');
line('saw her report', res, res);
list(top(on('section_view', '/result'), (e) => `reached section: ${P(e).sec}`), res);
list(top(on('toggle', '/result'), (e) => `opened: ${P(e).label}`), res);
line('tapped "Unlock my diet plan"', n((e) => on('tap', '/result')(e) && P(e).label === 'unlock_cta'), res);

head('5. Prices page');
const unl = n((e) => e.name === 'unlock_view');
line('saw the prices page', unl, unl);
line('shown "talk to us first" instead', n((e) => e.name === 'unlock_blocked'), unl);
list(top(on('section_view', '/unlock'), (e) => `reached section: ${P(e).sec}`), unl);
list(top(on('tier_select'), (e) => `chose: ${P(e).tier} (${P(e).plan})`), unl);
list(top(on('toggle', '/unlock'), (e) => `opened question: ${P(e).label}`, 8), unl);
line('tapped the pay button', n(on('checkout_tap')), unl);
list(top(on('checkout_error'), (e) => `was shown an error: ${P(e).code}`, 8), unl);
line('order created', n((e) => e.name === 'order_created'), unl);
line('payment page opened', n((e) => e.name === 'checkout_opened'), unl);
line('paid', n((e) => e.name === 'payment_confirmed'), unl);
line('launch price ran out while she was there', n(on('offer_expired')), unl);

head('6. Time and scroll on each page (median of each person\'s last record)');
const last = new Map();
for (const e of E.filter(on('page_exit'))) last.set(`${who(e)}|${P(e).path}`, e);
const byPath = new Map();
for (const e of last.values()) byPath.set(P(e).path, [...(byPath.get(P(e).path) ?? []), e]);
for (const [path, rows] of [...byPath].sort((a, b) => b[1].length - a[1].length)) {
  const untouched = rows.filter((e) => P(e).touched === false).length;
  console.log(`  ${String(path).padEnd(10)} ${String(rows.length).padStart(5)} people · ${median(rows.map((e) => P(e).s ?? 0))} s on screen · scrolled ${median(rows.map((e) => P(e).max ?? 0))}% · ${untouched} never touched it`);
}

head('7. Problems');
const errs = top(on('js_error'), (e) => `${P(e).path}: ${P(e).msg} (${P(e).at})`, 10);
if (errs.length === 0) console.log('  No script errors recorded.');
list(errs, land);
list(top(on('rage_tap'), (e) => `repeated fast taps: ${P(e).path} › ${P(e).sec ?? '?'} › ${P(e).el}`, 8), land);
