'use strict';
// ════════════ utils ════════════
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rnd = (a, b) => a + Math.random() * (b - a);
const gauss = () => { let u = 0, v = 0; while (!u) u = Math.random(); while (!v) v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
const esc = t => String(t).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const store = {
  get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } },
};
function pickW(items, wf) {
  let tot = 0; for (const it of items) tot += wf(it);
  let r = Math.random() * tot;
  for (const it of items) { r -= wf(it); if (r <= 0) return it; }
  return items[items.length - 1];
}
// inverse normal CDF (Acklam)
function normInv(p) {
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  if (p > 1 - pl) { const q = Math.sqrt(-2 * Math.log(1 - p)); return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
  const q = p - 0.5, r = q * q;
  return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
}
function normCdf(x) { const t = 1 / (1 + 0.3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x / 2); return x >= 0 ? (1 + y) / 2 : (1 - y) / 2; }
const fmtNum = n => Math.round(n).toLocaleString('th-TH');
const fmtBaht = usd => '฿' + fmtNum(usd * THB_PER_PPP);
// ธงประเทศเป็นรูป (Windows ไม่แสดงอีโมจิธง) — ถ้าออฟไลน์จะแสดงรหัสประเทศแทน
const flag = id => `<img class="flagimg" src="https://flagcdn.com/w40/${id.toLowerCase()}.png" alt="${id}" loading="lazy">`;

// ════════════ income model (lognormal from Gini) ════════════
for (const c of COUNTRIES) {
  c.sigma = Math.SQRT2 * normInv((c.gini / 100 + 1) / 2);
  c.median = c.gdp * 1000 * 0.6 * Math.exp(-c.sigma * c.sigma / 2);
}
const incomeAt = (c, p) => c.median * Math.exp(c.sigma * normInv(clamp(p, 0.005, 0.995)));
const POP_TOTAL = COUNTRIES.reduce((a, c) => a + c.pop, 0);
function worldPct(income) {
  let s = 0; for (const c of COUNTRIES) s += c.pop * normCdf((Math.log(income) - Math.log(c.median)) / c.sigma);
  return s / POP_TOTAL;
}

// ════════════ mortality model (Gompertz-Makeham calibrated to life expectancy) ════════════
const lifeCache = {};
function lifeTable(c, g) {
  const key = c.id + g; if (lifeCache[key]) return lifeCache[key];
  const LE = c.le[g === 'M' ? 0 : 1];
  const q0 = clamp(0.002 + (82 - LE) * 0.0028, 0.002, 0.11);
  const A = 0.0003 + Math.max(0, 80 - LE) * 0.00006, k = 0.09;
  const qAt = (B, x) => x === 0 ? q0 : x < 5 ? q0 * 0.12 : Math.min(1, 1 - Math.exp(-(A + B * Math.exp(k * x))));
  const e0 = B => { let S = 1, e = 0; for (let x = 0; x <= 120; x++) { const q = qAt(B, x); e += S * (1 - q / 2); S *= 1 - q; } return e; };
  let lo = Math.log(1e-9), hi = Math.log(1e-1);
  for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (e0(Math.exp(m)) > LE) lo = m; else hi = m; }
  const B = Math.exp((lo + hi) / 2);
  const q = x => qAt(B, x);
  const S = [1]; for (let x = 0; x <= 120; x++) S.push(S[x] * (1 - q(x)));
  return (lifeCache[key] = { q, S, LE });
}
const WEALTH_MORT = [1.4, 1.15, 1.0, 0.85, 0.7];
let HEALTH_REF = 37; // ค่าอ้างอิง: สุขภาพเฉลี่ยที่ทำให้อายุขัยเฉลี่ยตรงกับข้อมูลจริง

function causeOfDeath(c, g, age, safe) {
  const poor = c.gdp < 10, af = c.reg === 'AF';
  let list;
  if (age < 1) list = [['ภาวะแทรกซ้อนจากการคลอดก่อนกำหนด', 4], ['การติดเชื้อในทารกแรกเกิด', 3], ['ภาวะขาดออกซิเจนระหว่างคลอด', 2], ['ความผิดปกติแต่กำเนิด', 2]];
  else if (age < 5) list = [['ปอดบวม', 4], ['ท้องร่วงรุนแรง', poor ? 4 : 1], ['มาลาเรีย', af ? 4 : 0.1], ['ภาวะทุพโภชนาการ', poor ? 3 : 0.1], ['อุบัติเหตุจมน้ำ', 2]];
  else if (age < 15) list = [['อุบัติเหตุจมน้ำ', 3], ['อุบัติเหตุทางถนน', 3], ['มาลาเรีย', af ? 3 : 0.1], ['มะเร็งเม็ดเลือดขาว', 1.5], ['ปอดบวม', 2]];
  else if (age < 40) list = [['อุบัติเหตุทางถนน', 5], ['วัณโรค', poor ? 2 : 0.2], ['HIV/เอดส์', af ? 3 : 0.3], ['ความรุนแรง', safe ? 0 : (c.reg === 'LA' || c.conflict ? 4 : 1)], ['ภาวะแทรกซ้อนจากการตั้งครรภ์', g === 'F' && poor ? 2 : 0], ['โรคหัวใจ', 1], ['มะเร็ง', 1]];
  else if (age < 70) list = [['โรคหัวใจขาดเลือด', 6], ['โรคหลอดเลือดสมอง', 4], ['มะเร็ง', 5], ['เบาหวาน', 2], ['โรคตับ', 1.5], ['วัณโรค', poor ? 1.5 : 0.1], ['อุบัติเหตุทางถนน', 1.5], ['โรคปอดอุดกั้นเรื้อรัง', 1.5]];
  else list = [['โรคหัวใจขาดเลือด', 6], ['โรคหลอดเลือดสมอง', 5], ['มะเร็ง', 3], ['ภาวะสมองเสื่อม', 3], ['ปอดอักเสบ', 2], ['โรคปอดอุดกั้นเรื้อรัง', 2], ['จากไปอย่างสงบตามวัย', 3]];
  return pickW(list.filter(x => x[1] > 0), x => x[1])[0];
}

// ════════════ unique profile draw — ไม่ซ้ำ ════════════
function sibWeights(c) {
  const br = c.births / c.pop * 1000; const t = clamp((br - 9) / 26, 0, 1);
  const low = [0.42, 0.4, 0.13, 0.04, 0.01], high = [0.05, 0.12, 0.2, 0.25, 0.38];
  return low.map((l, i) => l + (high[i] - l) * t);
}
const TOTAL_COMBOS = COUNTRIES.length * GENDERS.length * QUINTILES.length * FAMILIES.length * SIBLINGS.length;
const profileKey = p => `${p.c}|${p.g}|${p.q}|${p.f}|${p.s}`;
function drawUniqueProfile(method, exclude = new Set()) {
  const used = new Set(store.get('usedProfiles', []));
  const list = [];
  for (const c of COUNTRIES) {
    const cw = method === 'pop' ? c.pop : c.births, sw = sibWeights(c);
    for (const g of GENDERS) for (let q = 0; q < 5; q++) for (const f of FAMILIES) for (let s = 0; s < 5; s++) {
      const p = { c: c.id, g: g.id, q, f: f.id, s };
      const k = profileKey(p);
      if (used.has(k) || exclude.has(k)) continue;
      p.w = cw * g.w * 0.2 * f.w * sw[s];
      list.push(p);
    }
  }
  if (!list.length) return null;
  return pickW(list, p => p.w);
}
const markUsed = p => { const u = store.get('usedProfiles', []); u.push(profileKey(p)); store.set('usedProfiles', u); };
const usedCount = () => store.get('usedProfiles', []).length;

// ════════════ settings ════════════
const settings = Object.assign({ minutes: 15, method: 'births', real: 'TH', safe: false, auto: false, theme: null }, store.get('settings', {}));
const saveSettings = () => store.set('settings', settings);

// ════════════ game state ════════════
let S = null;          // สถานะชีวิตปัจจุบัน
let speed = 1, paused = false, lastT = 0, acc = 0, rafId = 0, skipping = false;

function newLife(profile) {
  markUsed(profile);
  const c = COUNTRIES.find(x => x.id === profile.c);
  const fam = FAMILIES.find(x => x.id === profile.f);
  const lt = lifeTable(c, profile.g);
  const pFam = rnd(...QUINTILES[profile.q].p);
  const famIncome = incomeAt(c, pFam) * fam.money;
  const s = {
    profile, c, g: profile.g, q: profile.q, lt, pFam, famIncome,
    age: 0, year: new Date().getFullYear(), alive: true, born: Date.now(),
    st: { health: clamp(55 + (c.le[profile.g === 'M' ? 0 : 1] - 50) * 0.9 + profile.q * 2 + rnd(-6, 6), 30, 95), happy: 60 + rnd(-8, 8), know: 5, rel: 55 + rnd(-6, 6) },
    money: { income: 0, savings: 0, invest: 0, earned: 0 },
    f: { family: profile.f, sibs: profile.s, school: false, eduLevel: 0, eduEnd: 0, job: null, partner: false, married: false, kids: 0 },
    focus: 'balance', used: new Set(), log: [], mood: [], marks: {}, reflections: [], thoughts: [], queue: [],
    cohort: [], cause: null, number: usedCount(),
  };
  s.add = fx => applyFx(s, fx);
  s.base = () => s.money.income > 0 ? s.money.income : Math.max(s.famIncome * 0.5, 400);
  applyFx(s, fam.fx);
  createFamily(s);
  // จำนวนลูกที่อยากมี ตามอัตราเจริญพันธุ์ของประเทศ (ประมาณจากอัตราการเกิด)
  const tfr = 0.65 + 0.11 * (c.births / c.pop * 1000);
  s.kidTarget = clamp(Math.round(tfr + gauss() * 1.1), 0, 6);
  // คนที่เกิดในวินาทีเดียวกัน (ไม่ซ้ำกับคุณและไม่ซ้ำกันเอง)
  const ex = new Set([profileKey(profile)]);
  for (let i = 0; i < 4; i++) {
    const p = drawUniqueProfile(settings.method, ex); if (!p) break;
    ex.add(profileKey(p));
    const cc = COUNTRIES.find(x => x.id === p.c);
    s.cohort.push({ p, c: cc, lt: lifeTable(cc, p.g), alive: true, age: 0, cause: null });
  }
  return s;
}

function applyFx(s, fx) {
  if (!fx) return;
  for (const k of ['health', 'happy', 'know', 'rel']) if (fx[k]) s.st[k] = clamp(s.st[k] + fx[k], 0, 100);
  if (fx.cash) s.money.savings += fx.cash * s.base();
}

function log(text, kind = '') {
  S.log.push({ age: S.age, text, kind, pin: false });
  if (kind) S.marks[S.age] = kind;
  renderLog();
  if (!$('#life').hidden) bubble(text);
}

// ════════════ yearly simulation ════════════
function advanceYear() {
  const s = S; if (!s.alive) return;
  s.age++; s.year++;
  const a = s.age, c = s.c;

  // การศึกษา
  if (a === 6) {
    const p = clamp(0.5 + c.gdp / 35 + (s.q - 2) * 0.1 - (s.g === 'F' && c.gdp < 5 ? 0.15 : 0), 0.15, 0.995);
    if (Math.random() < p) { s.f.school = true; log('วันแรกที่โรงเรียน คุณสะพายกระเป๋าใบใหญ่กว่าตัว', 'school'); }
    else { s.f.eduEnd = 6; log('ครอบครัวไม่มีเงินส่งคุณไปโรงเรียน', 'bad'); }
  }
  if (a === 12 && s.f.school) {
    s.f.eduLevel = 1;
    const p = clamp(0.3 + c.gdp / 45 + (s.q - 2) * 0.12 + s.st.know / 300, 0.1, 0.99);
    if (Math.random() < p) log('คุณจบประถมและได้เรียนต่อมัธยม', 'school');
    else { s.f.school = false; s.f.eduEnd = 12; log('คุณจบประถม แต่ไม่ได้เรียนต่อ', 'bad'); }
  }
  if (a === 17 && s.f.school && !s.f.uni) { s.f.eduLevel = 2; log('คุณเรียนจบมัธยมปลาย', 'school'); }
  if (a > 19 && s.f.school && !s.f.uni) { s.f.school = false; s.f.eduEnd = a; }
  if (s.f.uni && s.f.school && a >= s.f.eduEnd) { s.f.school = false; s.f.eduLevel = 3; log('คุณได้รับปริญญา ครอบครัวมาถ่ายรูปกันพร้อมหน้า', 'good'); }

  // การทำงาน
  const workAge = c.gdp < 10 && s.q <= 1 ? 13 : 16;
  if (!s.f.school && !s.f.job && !s.f.retired && a >= Math.max(workAge, s.f.eduEnd) && a < 75) {
    if (Math.random() < 0.45 + s.st.know / 200 + (c.gdp < 10 ? 0.3 : 0)) findJob(s);
  }
  if (s.f.job && !s.f.retired && a < 50) s.money.income *= 1.02;

  // สถานะรายปี
  const st = s.st, foc = s.focus, know0 = st.know;
  if (s.f.school) st.know += (s.f.uni ? 5 : 3) + c.gdp / 40 + (foc === 'study' ? 3 : 0);
  else if (a > 5) st.know += (s.f.job ? 0.6 : 0.2) + (foc === 'study' ? 2 : 0);
  if (a < 6) st.know += 2;
  if (st.know > know0) st.know = know0 + (st.know - know0) * (1 - know0 / 125);
  if (a > 72) st.know -= 0.7;
  const decline = a > 35 ? (a - 35) * 0.045 : a < 18 ? -0.6 : 0;
  st.health += -decline + (s.q - 2) * 0.35 + (foc === 'health' ? 2 : 0) - (s.f.smoker ? 1.5 : 0) - (foc === 'work' ? 0.6 : 0) + gauss() * 1.2;
  const relTarget = 45 + (s.f.partner ? 12 : 0) + Math.min(s.f.kids, 3) * 4 + (s.f.family === 'extended' ? 4 : 0) - (s.f.migrant ? 8 : 0) - (a > 70 ? (a - 70) * 0.5 : 0);
  st.rel += (relTarget - st.rel) * 0.15 + (foc === 'love' ? 3 : 0) + gauss() * 1.5;
  const pNow = s.money.income > 0 ? clamp(countryPct(s, s.money.income), 0, 1) : s.pFam;
  const happyTarget = 30 + pNow * 22 + st.rel * 0.22 + st.health * 0.18 + (s.f.partner ? 5 : 0) - (s.money.savings < 0 ? 8 : 0) + (foc === 'balance' ? 4 : 0);
  st.happy += (happyTarget - st.happy) * 0.25 + gauss() * 2.5;

  // การเงิน
  if (s.money.income > 0) {
    const inc = s.money.income * (s.f.job ? 1 : 0.3);
    s.money.earned += inc;
    const saveRate = clamp(0.03 + pNow * 0.15 + (foc === 'work' ? 0.05 : 0) - s.f.kids * 0.02, -0.05, 0.3);
    s.money.savings += inc * saveRate;
  }
  if (s.money.savings < 0) s.money.savings *= 1.06; // ดอกเบี้ยหนี้
  if (settings.auto && a >= 25 && s.money.savings > s.base()) { s.money.invest += s.money.savings * 0.3; s.money.savings *= 0.7; }
  if (s.money.invest > 0) s.money.invest *= 1 + 0.05 + gauss() * 0.13;
  for (const k in st) st[k] = clamp(st[k], 0, 100);

  // เหตุการณ์ (ไม่ซ้ำในชีวิตเดียว)
  rollEvent(s);

  // ครอบครัวแก่ตัวลง เกิด-ตาย-ย้ายบ้าน
  famYear(s, log, applyFx, settings.safe);
  lifeStageFamily(s);

  // คำถามสะท้อนตัวเอง
  if (REFLECT_AGES[a] && !settings.auto) s.queue.push({ type: 'reflect', q: REFLECT_AGES[a], age: a });

  // ความตาย
  let q = s.lt.q(a) * (a >= 1 ? WEALTH_MORT[s.q] * Math.exp((HEALTH_REF - st.health) / 30) : WEALTH_MORT[s.q]);
  if (Math.random() < clamp(q, 0, 1)) die(causeOfDeath(c, s.g, a, settings.safe));
  s.mood[a] = Math.round(st.happy);

  // คนที่เกิดพร้อมคุณ
  for (const m of s.cohort) if (m.alive) {
    m.age = a;
    if (Math.random() < m.lt.q(a) * WEALTH_MORT[m.p.q]) { m.alive = false; m.cause = causeOfDeath(m.c, m.p.g, a, settings.safe); }
  }
  render();
}

function countryPct(s, income) { return normCdf((Math.log(income) - Math.log(s.c.median)) / s.c.sigma); }

function findJob(s) {
  const p = clamp(0.45 * s.pFam + 0.45 * s.st.know / 100 + 0.05 + gauss() * 0.1 + (s.f.eduLevel >= 3 ? 0.1 : 0), 0.02, 0.98);
  const tier = clamp(Math.floor(p * 5), 0, 4);
  const title = JOBS[tier][Math.floor(Math.random() * JOBS[tier].length)];
  s.f.job = title;
  s.money.income = incomeAt(s.c, p) * (s.f.migrant ? 2.5 : 1);
  log(`คุณได้งานเป็น${title} รายได้ราว ${fmtBaht(s.money.income / 12)}/เดือน`, 'work');
}

function rollEvent(s) {
  const ok = e => !s.used.has(e.id) && s.age >= e.a[0] && s.age <= e.a[1] && !(e.heavy && settings.safe) && (!e.cond || e.cond(s));
  const forced = EVENTS.find(e => e.force && ok(e));
  let e = forced;
  // เรื่องครอบครัว (ความรัก แต่งงาน ลูก) มีโอกาสของตัวเองทุกปี
  if (!e && Math.random() < 0.45) {
    const fpool = EVENTS.filter(x => x.fam && ok(x));
    if (fpool.length) e = pickW(fpool, x => x.w);
  }
  if (!e && Math.random() < 0.6) {
    const pool = EVENTS.filter(x => !x.force && ok(x));
    if (pool.length) e = pickW(pool, x => x.w);
  }
  if (!e) return;
  s.used.add(e.id);
  let text = typeof e.t === 'function' ? e.t(s) : e.t;
  if (!e.choices) { const r = e.apply ? e.apply(s) : null; if (r) text = r; applyFx(s, e.fx); log(text, fxKind(e.fx)); return; }
  if (e.apply) e.apply(s);
  if (settings.auto) {
    const ch = e.choices.find(x => x.tag === s.focus) || e.choices[Math.floor(Math.random() * e.choices.length)];
    resolveChoice(e, ch, text, true);
  } else s.queue.push({ type: 'decision', e, text });
}

function resolveChoice(e, ch, text, auto) {
  let res = ch.t;
  if (ch.apply) { const r = ch.apply(S); if (r) res = r; }
  applyFx(S, ch.fx);
  log(`${text} → ${auto ? '(อัตโนมัติ) ' : ''}${ch.l}: ${res}`, 'choice');
}
const fxKind = fx => { if (!fx) return ''; const v = (fx.health || 0) + (fx.happy || 0) + (fx.rel || 0) + (fx.know || 0); return v > 3 ? 'good' : v < -3 ? 'bad' : ''; };

function die(cause) {
  S.alive = false; S.cause = cause;
  S.mood[S.age] = Math.round(S.st.happy);
  log(`คุณเสียชีวิตเมื่ออายุ ${S.age} ปี — ${cause}`, 'death');
}

// ════════════ loop ════════════
const secPerYear = () => settings.minutes * 60 / S.lt.LE;
function loop(t) {
  rafId = requestAnimationFrame(loop);
  if (!S) return;
  const dt = lastT ? Math.min(0.25, (t - lastT) / 1000) : 0; lastT = t;
  if (!S.alive) { cancelAnimationFrame(rafId); setTimeout(showDeath, 1600); return; }
  if (paused || S.queue.length) { showQueue(); return; }
  acc += dt * speed;
  $('#yearProgress').style.width = (clamp(acc / secPerYear(), 0, 1) * 100) + '%';
  if (acc >= secPerYear()) { acc = 0; advanceYear(); }
}

function skipToDecision() {
  for (let i = 0; i < 120 && S.alive && !S.queue.length; i++) advanceYear();
  acc = 0;
}

// ════════════ UI: screens ════════════
function show(id) { $$('.screen').forEach(x => x.hidden = x.id !== id); window.scrollTo(0, 0); }

function homeInit() {
  const t0 = Date.now();
  clearInterval(homeInit.iv);
  homeInit.iv = setInterval(() => {
    const sec = (Date.now() - t0) / 1000;
    $('#cBirth').textContent = fmtNum(sec * 4.3);
    $('#cDeath').textContent = fmtNum(sec * 2.0);
  }, 250);
  $('#usedInfo').textContent = `สุ่มไปแล้ว ${fmtNum(usedCount())} จาก ${fmtNum(TOTAL_COMBOS)} ชีวิตที่เป็นไปได้ — แต่ละชีวิตจะไม่ถูกสุ่มซ้ำ`;
  // settings controls
  $('#setMinutes').value = settings.minutes;
  $('#setMethod').value = settings.method;
  $('#setSafe').checked = settings.safe;
  const sel = $('#setReal');
  if (!sel.options.length) {
    sel.add(new Option('— ไม่ระบุ —', ''));
    [...COUNTRIES].sort((a, b) => a.th.localeCompare(b.th, 'th')).forEach(c => sel.add(new Option(c.th, c.id)));
  }
  sel.value = settings.real;
  renderPast();
  show('home');
}

function renderPast() {
  const lives = store.get('pastLives', []);
  $('#pastList').innerHTML = lives.length ? lives.map((l, i) => `
    <li><span class="flag">${flag(l.cid)}</span><span class="past-main"><b>${esc(l.title)}</b><small>${esc(l.sub)}</small></span>
    <button class="btn ghost sm" data-past="${i}">ดูอีกครั้ง</button></li>`).join('') : '<li class="muted">ยังไม่มีชาติก่อน</li>';
  $$('[data-past]').forEach(b => b.onclick = () => { const l = store.get('pastLives', [])[+b.dataset.past]; showDeathCard(l); });
}

function startBirth() {
  const p = drawUniqueProfile(settings.method);
  if (!p) {
    openModal(`<h3>คุณเกิดครบทุกแบบแล้ว</h3><p>ทั้ง ${fmtNum(TOTAL_COMBOS)} ชีวิตที่เป็นไปได้ถูกสุ่มไปหมดแล้ว ล้างประวัติเพื่อเริ่มใหม่ได้</p>
      <div class="row end"><button class="btn" id="mReset">ล้างประวัติการสุ่ม</button><button class="btn ghost" id="mClose">ปิด</button></div>`);
    $('#mReset').onclick = () => { store.set('usedProfiles', []); closeModal(); homeInit(); };
    $('#mClose').onclick = closeModal;
    return;
  }
  clearInterval(homeInit.iv);
  S = newLife(p);
  const c = S.c, fam = FAMILIES.find(f => f.id === p.f);
  const wp = worldPct(S.famIncome);
  const rows = [
    ['ชื่อ', esc(S.name)],
    ['ประเทศ', `${flag(c.id)} ${c.th}`],
    ['เพศ', GENDERS.find(g => g.id === p.g).th],
    ['ครอบครัว', fam.th],
    ['พี่น้อง', SIBLINGS[p.s]],
    ['ฐานะ', `${QUINTILES[p.q].th} ในประเทศ`],
    ['รายได้ครัวเรือน (ต่อคน)', `${fmtBaht(S.famIncome / 12)}/เดือน <small>(เทียบกำลังซื้อในไทย)</small>`],
    ['เทียบทั้งโลก', `มีรายได้มากกว่า ${Math.round(wp * 100)}% ของคนทั้งโลก`],
    ['อายุคาดเฉลี่ยที่นี่', `${S.lt.LE} ปี`],
  ];
  $('#birthNo').textContent = `ชีวิตที่ #${fmtNum(S.number)} · ไม่ซ้ำกับชีวิตใดที่คุณเคยเกิดมา`;
  $('#birthRows').innerHTML = rows.map((r, i) => `<div class="brow" style="animation-delay:${i * 0.35}s"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  $('#birthStart').style.animationDelay = rows.length * 0.35 + 's';
  show('birth');
  renderScene($('#birthScene'), snapOf(S), { fresh: true });
}

function startLife() {
  show('life');
  speed = 1; paused = false; acc = 0; lastT = 0;
  const fam = FAMILIES.find(f => f.id === S.f.family);
  const elders = S.fam.filter(m => ['mother', 'father', 'grandma', 'grandpa'].includes(m.role)).map(m => `${roleLabel(S, m)}${m.name}`).join(' ');
  $('#scene')._nodes = null;
  log(`${S.name} ลืมตาดูโลกที่${S.c.th} เป็น${GENDERS.find(g => g.id === S.g).th} ใน${fam.th} (${SIBLINGS[S.f.sibs]}) — คนที่รอรับคุณอยู่คือ ${elders}`, 'birth');
  $('#focus').value = 'balance';
  $('#autoBtn').classList.toggle('on', settings.auto);
  $('#safeBtn').classList.toggle('on', settings.safe);
  setSpeedUI();
  render();
  cancelAnimationFrame(rafId);
  rafId = requestAnimationFrame(loop);
}

// ════════════ UI: life render ════════════
function render() {
  const s = S;
  $('#ageBig').textContent = s.age;
  $('#lifeWhere').innerHTML = `<b class="who">${esc(s.name)}</b> ${flag(s.c.id)} ${esc(s.c.th)} · ${GENDERS.find(g => g.id === s.g).th} · ปี ${s.year + 543}`;
  const bars = [['health', 'สุขภาพ', 'ส่งผลต่อความเสี่ยงการเสียชีวิต'], ['happy', 'ความสุข', 'ความพึงพอใจในชีวิต'], ['know', 'ความรู้', 'ส่งผลต่องานและรายได้'], ['rel', 'ความสัมพันธ์', 'ส่งผลต่อความรักและความเหงา']];
  $('#stats').innerHTML = bars.map(([k, l, h]) => `<div class="stat" title="${h}"><div class="stat-h"><span>${l}</span><b>${Math.round(s.st[k])}</b></div><div class="bar"><i class="b-${k}" style="width:${s.st[k]}%"></i></div></div>`).join('');
  const edu = s.f.uni && s.f.school ? 'มหาวิทยาลัย (กำลังเรียน)' : ['ไม่ได้เรียน', 'ประถม', 'มัธยม', 'ปริญญาตรี'][s.f.eduLevel] + (s.f.school ? ' (กำลังเรียน)' : '');
  const fam = [
    ['การศึกษา', s.age < 6 ? '—' : edu],
    ['งาน', s.f.job || (s.f.retired ? 'เกษียณ' : s.age < 15 ? '—' : 'ว่างงาน')],
    ['รายได้', s.money.income > 0 ? `${fmtBaht(s.money.income / 12)}/เดือน` : `ครอบครัว ${fmtBaht(s.famIncome / 12)}/เดือน`],
    ['เงินเก็บ', (s.money.savings < 0 ? 'หนี้ ' : '') + fmtBaht(Math.abs(s.money.savings))],
    ['เงินลงทุน', fmtBaht(s.money.invest)],
    ['คู่ชีวิต', s.f.married ? 'แต่งงานแล้ว' : s.f.partner ? 'มีแฟน' : s.f.widowed ? 'เป็นหม้าย' : 'โสด'],
    ['ลูก', s.f.kids ? `${s.f.kids} คน` : '—'],
    ['บ้าน', HOME_NAMES[homeLevel(s)]],
  ];
  $('#famInfo').innerHTML = fam.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const canMoney = s.age >= 18 && s.alive;
  $('#spendBtn').disabled = !canMoney || s.money.savings < s.base() * 0.1;
  $('#investBtn').disabled = !canMoney || s.money.savings <= 0;
  $('#withdrawBtn').disabled = !canMoney || s.money.invest <= 0;
  renderMap(); renderCurve(); renderCohort();
  renderScene($('#scene'), snapOf(s));
  renderFamList();
  $('#nextDecBtn').disabled = !s.alive;
}

function renderLog() {
  const el = $('#log');
  const fresh = S.log.length !== renderLog.n; renderLog.n = S.log.length;
  el.innerHTML = S.log.slice(-60).reverse().map((l, i) => {
    const idx = S.log.length - 1 - i;
    return `<li class="k-${l.kind}${l.pin ? ' pin' : ''}${fresh && i === 0 ? ' new' : ''}" data-i="${idx}"><span class="la">${l.age} ปี</span><span>${esc(l.text)}</span><span class="star">${l.pin ? '★' : '☆'}</span></li>`;
  }).join('');
}

function renderMap() {
  const max = Math.max(100, S.age + 1);
  let h = '';
  for (let a = 0; a < max; a++) {
    const m = S.mood[a];
    let cls = 'cell', style = '';
    if (a === S.age && S.alive) cls += ' now';
    else if (m != null) style = `background:hsl(${m * 1.3},55%,${45 + m * 0.1}%)`;
    else if (a > S.age) cls += ' future';
    if (!S.alive && a === S.age) cls += ' dead';
    const mk = S.marks[a] ? `<i class="mk mk-${S.marks[a]}"></i>` : '';
    h += `<div class="${cls}" style="${style}" title="อายุ ${a}">${mk}</div>`;
  }
  $('#lifeMap').innerHTML = h;
}

function renderCurve() {
  const Sx = S.lt.S, W = 300, H = 110, maxA = 100;
  const pts = []; for (let a = 0; a <= maxA; a++) pts.push(`${(a / maxA * W).toFixed(1)},${(H - Sx[a] * H).toFixed(1)}`);
  const ax = Math.min(S.age, maxA), x = ax / maxA * W, y = H - Sx[ax] * H;
  $('#curve').innerHTML = `
    <line x1="0" y1="${H}" x2="${W}" y2="${H}" class="axis"/>
    <polyline points="0,${H} ${pts.join(' ')} ${W},${H}" class="area"/>
    <polyline points="${pts.join(' ')}" class="line"/>
    <line x1="${x}" y1="0" x2="${x}" y2="${H}" class="marker"/>
    <circle cx="${x}" cy="${y}" r="4" class="dot"/>
    ${[0, 25, 50, 75, 100].map(a => `<text x="${a / maxA * W}" y="${H + 13}" class="tick">${a}</text>`).join('')}`;
  $('#curveTxt').textContent = `ของคนที่เกิดที่${S.c.th}พร้อมคุณ ${(Sx[ax] * 100).toFixed(1)}% ยังมีชีวิตถึงอายุ ${ax} ปี`;
}

function renderCohort() {
  $('#cohort').innerHTML = S.cohort.map(m => `<li class="${m.alive ? '' : 'gone'}"><span class="flag">${flag(m.c.id)}</span>
    <span><b>${GENDERS.find(g => g.id === m.p.g).th} · ${esc(m.c.th)}</b><small>${QUINTILES[m.p.q].short} · ${m.alive ? `ยังมีชีวิต อายุ ${m.age} ปี` : `จากไปเมื่ออายุ ${m.age} ปี (${m.cause})`}</small></span></li>`).join('');
}

// ════════════ modal & queue ════════════
function openModal(html) { $('#modalBody').innerHTML = html; $('#modal').hidden = false; }
function closeModal() { $('#modal').hidden = true; $('#modalBody').innerHTML = ''; }

function showQueue() {
  if (!$('#modal').hidden || !S.queue.length) return;
  $('#waitFlag').hidden = false;
  const it = S.queue[0];
  if (it.type === 'decision') {
    openModal(`<p class="eyebrow">อายุ ${S.age} ปี · การตัดสินใจ</p><h3>${esc(it.text)}</h3>
      <div class="choices">${it.e.choices.map((c, i) => `<button class="btn choice" data-c="${i}">${esc(c.l)}</button>`).join('')}</div>`);
    $$('[data-c]').forEach(b => b.onclick = () => { S.queue.shift(); closeModal(); resolveChoice(it.e, it.e.choices[+b.dataset.c], it.text, false); doneQueue(); });
  } else if (it.type === 'reflect') {
    openModal(`<p class="eyebrow">เวลาหยุดลงชั่วขณะ · อายุ ${it.age} ปี</p><h3>${esc(it.q)}</h3>
      <textarea id="refTxt" rows="3" maxlength="300" placeholder="เขียนสักบรรทัด (หรือข้ามก็ได้)"></textarea>
      <div class="row end"><button class="btn ghost" id="refSkip">ข้าม</button><button class="btn" id="refOk">บันทึก</button></div>`);
    const done = save => { const v = $('#refTxt').value.trim(); if (save && v) { S.reflections.push({ age: it.age, q: it.q, a: v }); log(`✎ "${v}"`, 'thought'); } S.queue.shift(); closeModal(); doneQueue(); };
    $('#refOk').onclick = () => done(true); $('#refSkip').onclick = () => done(false);
    setTimeout(() => $('#refTxt')?.focus(), 50);
  }
}
function doneQueue() { if (!S.queue.length) $('#waitFlag').hidden = true; render(); lastT = 0; }

// ════════════ death ════════════
function showDeath() {
  if (!S || S.alive || S.shownDeath) return;
  S.shownDeath = true; closeModal();
  const real = COUNTRIES.find(c => c.id === settings.real);
  const s = S, gTh = GENDERS.find(g => g.id === s.g).th;
  const wp = worldPct(s.money.income > 0 ? s.money.income : s.famIncome);
  const card = {
    name: s.name, scene: snapOf(s), famLeft: household(s).length, cid: s.c.id, title: `${s.name} · ${gTh} · ${s.c.th} · ${s.age} ปี`, sub: `${s.cause} · ${QUINTILES[s.q].short}`,
    age: s.age, cause: s.cause, country: s.c.th, le: s.lt.LE, gender: gTh, q: QUINTILES[s.q].th,
    job: s.f.job || (s.f.retired ? 'เกษียณ' : '—'), kids: s.f.kids, married: s.f.married || s.f.widowed,
    earned: s.money.earned, worldPct: Math.round(wp * 100), stats: Object.fromEntries(Object.entries(s.st).map(([k, v]) => [k, Math.round(v)])),
    pinned: s.log.filter(l => l.pin).map(l => `${l.age} ปี — ${l.text}`),
    reflections: s.reflections, mood: s.mood, number: s.number,
    cohort: s.cohort.map(m => `${m.c.id}|${GENDERS.find(g => g.id === m.p.g).th} · ${m.c.th} — ${m.alive ? `ยังมีชีวิต (${m.age} ปี)` : `จากไปเมื่ออายุ ${m.age} ปี`}`),
    real: real ? { th: real.th, le: real.le[s.g === 'M' ? 0 : 1], gdp: real.gdp } : null, gdp: s.c.gdp,
    date: new Date().toLocaleDateString('th-TH'), message: '',
  };
  const lives = store.get('pastLives', []); lives.unshift(card); store.set('pastLives', lives.slice(0, 10));
  showDeathCard(card, true);
}

function showDeathCard(d, fresh = false) {
  const diff = d.age - d.le;
  const moodCells = (d.mood || []).map(m => m == null ? '' : `<i style="background:hsl(${m * 1.3},55%,${45 + m * 0.1}%)"></i>`).join('');
  $('#deathBody').innerHTML = `
    <p class="eyebrow">ชีวิตที่ #${fmtNum(d.number)} · ${d.date}</p>
    <h2 class="serif">${flag(d.cid)} ${d.name ? esc(d.name) + ' · ' : ''}${esc(d.gender)} จาก${esc(d.country)}<br>มีชีวิตอยู่ ${d.age} ปี</h2>
    ${d.scene ? '<div class="scene" id="deathScene"></div>' : ''}
    <p class="lead">สาเหตุ: ${esc(d.cause)} · ${Math.round(diff) === 0 ? 'ใกล้เคียงกับอายุคาดเฉลี่ยพอดี' : diff > 0 ? `อยู่ได้นานกว่าอายุคาดเฉลี่ย ${diff.toFixed(0)} ปี` : `จากไปก่อนอายุคาดเฉลี่ย ${(-diff).toFixed(0)} ปี`} (${d.le} ปี)</p>
    <div class="moodstrip">${moodCells}</div>
    <div class="grid2">
      <div class="panel"><h4>สรุปชีวิต</h4><dl class="kv">
        <dt>ฐานะตอนเกิด</dt><dd>${esc(d.q)}</dd><dt>อาชีพสุดท้าย</dt><dd>${esc(d.job)}</dd>
        <dt>รายได้รวมตลอดชีวิต</dt><dd>${fmtBaht(d.earned)}</dd><dt>รวยกว่าคนทั้งโลก</dt><dd>${d.worldPct}%</dd>
        <dt>ครอบครัว</dt><dd>${d.married ? 'เคยแต่งงาน' : 'ไม่ได้แต่งงาน'} · ลูก ${d.kids} คน</dd>
        ${d.famLeft != null ? `<dt>อยู่ข้างกายตอนจากไป</dt><dd>${d.famLeft ? d.famLeft + ' คน' : 'ไม่มีใคร'}</dd>` : ''}
        <dt>สถานะสุดท้าย</dt><dd>สุขภาพ ${d.stats.health} · ความสุข ${d.stats.happy} · ความรู้ ${d.stats.know} · ความสัมพันธ์ ${d.stats.rel}</dd>
      </dl></div>
      <div class="panel"><h4>คนที่เกิดในวินาทีเดียวกัน</h4><ul class="plain">${d.cohort.map(x => { const [id, t] = x.split('|'); return `<li>${flag(id)} ${esc(t)}</li>`; }).join('')}</ul>
      ${d.real ? `<h4>เทียบกับประเทศที่คุณเกิดจริง</h4><p>ถ้าเกิดเป็น${esc(d.gender)}ที่${esc(d.real.th)} อายุคาดเฉลี่ยคือ ${d.real.le} ปี และรายได้เฉลี่ยต่อหัว ${d.real.gdp > d.gdp ? 'สูงกว่า' : 'ต่ำกว่า'}${esc(d.country)} ${(Math.max(d.real.gdp, d.gdp) / Math.min(d.real.gdp, d.gdp)).toFixed(1)} เท่า</p>` : ''}</div>
    </div>
    ${d.pinned.length ? `<div class="panel"><h4>☆ ช่วงเวลาที่คุณปักหมุดไว้</h4><ul class="plain">${d.pinned.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${d.reflections.length ? `<div class="panel"><h4>สิ่งที่คุณเขียนไว้ระหว่างทาง</h4>${d.reflections.map(r => `<blockquote><small>${r.age} ปี · ${esc(r.q)}</small>${esc(r.a)}</blockquote>`).join('')}</div>` : ''}
    <div class="panel"><h4>ข้อความถึงคนคนนี้</h4>
      ${fresh ? `<textarea id="msgTxt" rows="2" maxlength="300" placeholder="อยากบอกอะไรกับชีวิตนี้..."></textarea><div class="row end"><button class="btn ghost sm" id="msgSave">บันทึกข้อความ</button></div>` : `<p>${d.message ? `"${esc(d.message)}"` : '<span class="muted">ไม่มีข้อความ</span>'}</p>`}
    </div>`;
  if (fresh) $('#msgSave').onclick = () => {
    const v = $('#msgTxt').value.trim(); const lives = store.get('pastLives', []);
    if (lives[0]) { lives[0].message = v; store.set('pastLives', lives); }
    $('#msgSave').textContent = 'บันทึกแล้ว ✓';
  };
  show('death');
  if (d.scene) renderScene($('#deathScene'), d.scene, { fresh: true, ghost: true });
  $('#shareBtn').onclick = () => shareLife(d);
}

// ════════════ family scene ════════════
function lifeStageFamily(s) {
  const a = s.age;
  if (!s.f.leftHome && (s.f.married || a >= (s.c.gdp > 20 ? 22 : 26))) {
    s.f.leftHome = true;
    if (s.f.family === 'extended' && !s.f.migrant) log('คุณยังอยู่บ้านหลังเดิมกับครอบครัวใหญ่' + (s.f.married ? ' และพาคู่ชีวิตเข้ามาอยู่ด้วย' : ''));
    else log(s.f.married ? 'คุณกับคู่ชีวิตย้ายออกมาสร้างบ้านของตัวเอง' : 'คุณย้ายออกจากบ้านมาใช้ชีวิตของตัวเอง', 'good');
  }
  for (const m of s.fam) if (m.role === 'child' && m.alive && m.age === 22) log(`${m.name} ${roleLabel(s, m)}ของคุณย้ายออกไปใช้ชีวิตของตัวเอง`);
  if (s.f.leftHome && a >= 40 && s.c.gdp < 40) for (const m of s.fam) {
    if ((m.role === 'mother' || m.role === 'father') && m.alive && m.age >= 75 && !m.movedIn) { m.movedIn = true; log(`${roleLabel(s, m)} ${m.name} อายุมากแล้ว ย้ายมาอยู่กับคุณเพื่อให้คุณดูแล`, 'good'); }
  }
}

const ROLE_ORDER = { grandpa: 0, grandma: 1, father: 2, mother: 3, partner: 4, self: 5, child: 7, grandchild: 8 };
function snapOf(s) {
  const relMood = clamp(55 + (s.st.rel - 50) * 0.6, 20, 92);
  const ms = household(s).map(m => ({
    id: m.id, g: m.g, age: m.age, skin: m.skin, hair: m.hair, shirt: m.shirt, hairStyle: m.hairStyle, glasses: m.glasses,
    name: m.name, label: roleLabel(s, m), mood: relMood, ord: m.role === 'sibling' ? (m.age > s.age ? 4.5 : 6) : ROLE_ORDER[m.role],
  }));
  ms.push({ id: 'self', self: true, g: s.g, age: s.age, ...s.look, name: s.name, label: 'คุณ', mood: s.st.happy, school: s.f.school && s.age < 13, ord: 5 });
  ms.sort((a, b) => a.ord - b.ord || b.age - a.age);
  return { level: homeLevel(s), bg: { age: s.age, c: { reg: s.c.reg, drought: !!s.c.drought } }, members: ms };
}

function renderScene(el, snap, opt = {}) {
  if (!el) return;
  if (!el._nodes || opt.fresh) {
    el.innerHTML = '<div class="bgwrap"></div><div class="people"></div><span class="homeTag"></span>';
    el._nodes = new Map(); el._bgKey = '';
  }
  const bgKey = snap.level + '|' + skyFor(snap.bg.age)[2] + '|' + snap.bg.c.reg + snap.bg.c.drought;
  if (bgKey !== el._bgKey) { el.querySelector('.bgwrap').innerHTML = sceneBgSVG(snap.bg, snap.level); el._bgKey = bgKey; }
  el.querySelector('.homeTag').textContent = HOME_NAMES[snap.level];
  const n = snap.members.length, W = el.clientWidth || 640;
  const sc = Math.round(clamp((W - 24) / (n * 70), 0.5, W > 700 ? 1.45 : 1.15) * 20) / 20;
  const people = el.querySelector('.people'), seen = new Set();
  snap.members.forEach((m, i) => {
    seen.add(m.id);
    let node = el._nodes.get(m.id);
    if (!node) {
      node = document.createElement('div');
      node.className = 'person' + (m.self ? ' me' : '') + (opt.fresh ? '' : ' enter');
      node.innerHTML = '<div class="bubble" hidden></div><div class="fig"></div><div class="nm"><b></b><small></small></div>';
      node.style.setProperty('--d', (Math.random() * -3).toFixed(2) + 's');
      el._nodes.set(m.id, node);
    }
    const live = [...people.children].filter(x => !x.classList.contains('leave'));
    if (live[i] !== node) people.insertBefore(node, live[i] || null);
    const mb = m.mood > 80 ? 3 : m.mood > 55 ? 2 : m.mood > 30 ? 1 : 0;
    const key = [stageOf(m.age), Math.round(heightOf(m.age)), mb, sc, m.school ? 1 : 0].join('|');
    if (node._key !== key) { node.querySelector('.fig').innerHTML = avatarSVG({ ...m, mood: [20, 45, 70, 90][mb], scale: sc }); node._key = key; }
    node.classList.toggle('ghost', !!(opt.ghost && m.self));
    node.querySelector('b').textContent = m.self && !opt.ghost ? `คุณ · ${m.name}` : m.name;
    node.querySelector('small').textContent = m.self ? (opt.ghost ? `จากไปเมื่ออายุ ${m.age} ปี` : `${m.age} ปี`) : `${m.label} · ${m.age} ปี`;
  });
  for (const [id, node] of el._nodes) if (!seen.has(id)) {
    el._nodes.delete(id); node.classList.add('leave'); setTimeout(() => node.remove(), 800);
  }
}

function bubble(text) {
  const me = $('#scene')._nodes?.get('self'); if (!me) return;
  const b = me.querySelector('.bubble');
  b.textContent = text.length > 80 ? text.slice(0, 78) + '…' : text;
  b.hidden = false; b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  clearTimeout(bubble.t); bubble.t = setTimeout(() => { b.hidden = true; }, 5000);
}

function renderFamList() {
  const list = S.fam.filter(m => !m.left);
  $('#famList').innerHTML = list.length ? list.map(m => `<li class="${m.alive ? '' : 'gone'}">
    <span class="mini">${avatarSVG({ ...m, mood: m.alive ? 70 : 45, portrait: true })}</span>
    <span><b>${esc(m.name)}</b><small>${roleLabel(S, m)} · ${m.alive ? m.age + ' ปี' : '🕯 จากไปเมื่ออายุ ' + m.diedAt}</small></span></li>`).join('')
    : '<li class="muted">ไม่มีครอบครัวใกล้ชิด</li>';
}

function shareLife(d) {
  const url = location.href.split(/[?#]/)[0];
  const text = `ชาตินี้ฉันเกิดเป็น${d.gender}ที่${d.country}${d.name ? ' ชื่อ ' + d.name : ''} มีชีวิตอยู่ ${d.age} ปี (${d.cause}) — ลองสุ่มเกิดใหม่ในเกม "หนึ่งในแปดพันล้าน" ดูสิ`;
  if (navigator.share) { navigator.share({ title: 'หนึ่งในแปดพันล้าน', text, url }).catch(() => { }); return; }
  const done = () => toast('คัดลอกข้อความและลิงก์แล้ว ส่งให้เพื่อนได้เลย');
  if (navigator.clipboard) navigator.clipboard.writeText(text + '\n' + url).then(done, () => toast(url));
  else toast(url);
}

function toast(msg) {
  let t = $('#toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
}

// ════════════ music (เสียงแอมเบียนต์เบาๆ ด้วย WebAudio) ════════════
const music = {
  ctx: null, nodes: [], on: false,
  toggle() {
    if (this.on) { this.nodes.forEach(n => { try { n.stop(); } catch { } }); this.nodes = []; this.on = false; return false; }
    this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
    const ctx = this.ctx, out = ctx.createGain(); out.gain.value = 0.05; out.connect(ctx.destination);
    [130.81, 196.0, 261.63, 329.63].forEach((f, i) => {
      const o = ctx.createOscillator(), g = ctx.createGain(), l = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f; l.frequency.value = 0.05 + i * 0.03; lg.gain.value = 0.5;
      g.gain.value = 0.5; l.connect(lg); lg.connect(g.gain); o.connect(g); g.connect(out); o.start(); l.start();
      this.nodes.push(o, l);
    });
    this.on = true; return true;
  },
};

// ════════════ theme ════════════
function applyTheme() { if (settings.theme) document.documentElement.dataset.theme = settings.theme; else delete document.documentElement.dataset.theme; }
function toggleTheme() {
  const cur = settings.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  settings.theme = cur === 'dark' ? 'light' : 'dark'; saveSettings(); applyTheme();
}

// ════════════ wiring ════════════
const SPEEDS = [1, 2, 4, 8, 12, 16];
function setSpeedUI() {
  $('#speeds').innerHTML = SPEEDS.map(v => `<button class="sp${v === speed && !paused ? ' on' : ''}" data-sp="${v}">${v}×</button>`).join('');
  $$('[data-sp]').forEach(b => b.onclick = () => { speed = +b.dataset.sp; paused = false; $('#pauseBtn').textContent = '❚❚ หยุดชั่วคราว'; setSpeedUI(); });
}

function wire() {
  applyTheme();
  $('#quickBtn').onclick = startBirth;
  $('#birthStart').onclick = startLife;
  $('#setMinutes').onchange = e => { settings.minutes = +e.target.value; saveSettings(); };
  $('#setMethod').onchange = e => { settings.method = e.target.value; saveSettings(); };
  $('#setReal').onchange = e => { settings.real = e.target.value; saveSettings(); };
  $('#setSafe').onchange = e => { settings.safe = e.target.checked; saveSettings(); };
  $('#resetUsed').onclick = () => {
    openModal(`<h3>ล้างประวัติการสุ่ม?</h3><p>ชีวิตที่เคยสุ่มได้ทั้งหมดจะกลับมามีโอกาสถูกสุ่มอีกครั้ง (บันทึกชาติก่อนยังอยู่)</p>
      <div class="row end"><button class="btn ghost" id="mNo">ยกเลิก</button><button class="btn danger" id="mYes">ล้าง</button></div>`);
    $('#mNo').onclick = closeModal; $('#mYes').onclick = () => { store.set('usedProfiles', []); closeModal(); homeInit(); };
  };
  $('#clearPast').onclick = () => {
    openModal(`<h3>ลบบันทึกชาติก่อนทั้งหมด?</h3><p>ชีวิตที่ลบแล้วจะกู้คืนไม่ได้</p>
      <div class="row end"><button class="btn ghost" id="mNo">ยกเลิก</button><button class="btn danger" id="mYes">ลบทั้งหมด</button></div>`);
    $('#mNo').onclick = closeModal; $('#mYes').onclick = () => { store.set('pastLives', []); closeModal(); renderPast(); };
  };
  $('#pauseBtn').onclick = () => { paused = !paused; $('#pauseBtn').textContent = paused ? '▶ เล่นต่อ' : '❚❚ หยุดชั่วคราว'; lastT = 0; setSpeedUI(); };
  $('#nextDecBtn').onclick = () => { if (S.queue.length) return; skipToDecision(); };
  $('#autoBtn').onclick = () => { settings.auto = !settings.auto; saveSettings(); $('#autoBtn').classList.toggle('on', settings.auto); };
  $('#safeBtn').onclick = () => { settings.safe = !settings.safe; saveSettings(); $('#safeBtn').classList.toggle('on', settings.safe); };
  $('#musicBtn').onclick = () => $('#musicBtn').classList.toggle('on', music.toggle());
  $$('.themeBtn').forEach(b => b.onclick = toggleTheme);
  $('#focus').onchange = e => { S.focus = e.target.value; };
  $('#thinkBtn').onclick = () => {
    paused = true;
    openModal(`<p class="eyebrow">อายุ ${S.age} ปี</p><h3>ตอนนี้คุณกำลังคิดอะไรอยู่?</h3><textarea id="thTxt" rows="3" maxlength="300"></textarea>
      <div class="row end"><button class="btn ghost" id="thNo">ยกเลิก</button><button class="btn" id="thOk">บันทึก</button></div>`);
    const end = () => { closeModal(); paused = false; lastT = 0; };
    $('#thNo').onclick = end;
    $('#thOk').onclick = () => { const v = $('#thTxt').value.trim(); if (v) { S.reflections.push({ age: S.age, q: 'ความคิดระหว่างทาง', a: v }); log(`✎ "${v}"`, 'thought'); } end(); };
    setTimeout(() => $('#thTxt')?.focus(), 50);
  };
  $('#exitBtn').onclick = () => {
    openModal(`<h3>ออกจากชีวิตนี้?</h3><p>ชีวิตนี้จะไม่ถูกบันทึก และจะไม่ถูกสุ่มกลับมาอีก</p>
      <div class="row end"><button class="btn ghost" id="mNo">อยู่ต่อ</button><button class="btn danger" id="mYes">ออก</button></div>`);
    paused = true;
    $('#mNo').onclick = () => { closeModal(); paused = false; lastT = 0; };
    $('#mYes').onclick = () => { closeModal(); cancelAnimationFrame(rafId); S = null; paused = false; homeInit(); };
  };
  $('#spendBtn').onclick = () => { const amt = S.base() * 0.1; S.money.savings -= amt; applyFx(S, { happy: 4, health: 1 }); log(`คุณใช้เงิน ${fmtBaht(amt)} ดูแลตัวเองและคนที่รัก`, 'good'); render(); };
  $('#investBtn').onclick = () => { const amt = S.money.savings * 0.5; S.money.savings -= amt; S.money.invest += amt; log(`คุณนำเงิน ${fmtBaht(amt)} ไปลงทุน`); render(); };
  $('#withdrawBtn').onclick = () => { S.money.savings += S.money.invest; log(`คุณถอนเงินลงทุน ${fmtBaht(S.money.invest)} กลับมา`); S.money.invest = 0; render(); };
  $('#log').onclick = e => { const li = e.target.closest('li[data-i]'); if (!li) return; const l = S.log[+li.dataset.i]; l.pin = !l.pin; renderLog(); };
  $('#againBtn').onclick = startBirth;
  $('#homeBtn').onclick = homeInit;
  document.addEventListener('keydown', e => { if (e.key === ' ' && !$('#life').hidden && $('#modal').hidden && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); $('#pauseBtn').click(); } });
  window.addEventListener('resize', () => { if (S && !$('#life').hidden) renderScene($('#scene'), snapOf(S)); });
  homeInit();
}
if (typeof window !== 'undefined') document.addEventListener('DOMContentLoaded', wire);
