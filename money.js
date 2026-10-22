'use strict';
// ════════════ ระบบเงิน: รายรับ-รายจ่ายรายปี ทรัพย์สินสุทธิ วิถีชีวิต และการลงทุน ════════════
// จำนวนเงินทั้งหมดคิดเป็น PPP$ ต่อปี แล้วแสดงเป็นบาทตามค่าครองชีพไทย (fmtBaht)

// ที่เก็บเงินออม (ผลตอบแทนจริงหลังหักเงินเฟ้อ เฉลี่ย mu ผันผวน sd)
const PLACES = [
  { id: 'cash', th: 'เงินฝากธนาคาร', d: 'ปลอดภัย ผลตอบแทนหลังหักเงินเฟ้อราวปีละ 1%', mu: 0.01, sd: 0.004 },
  { id: 'bond', th: 'พันธบัตรรัฐบาล', d: 'เฉลี่ยราว 2% ขึ้นลงน้อย', mu: 0.02, sd: 0.03 },
  { id: 'mixed', th: 'กองทุนผสม', d: 'หุ้นกับพันธบัตรอย่างละครึ่ง เฉลี่ย 3.5% ขึ้นลงปานกลาง', mu: 0.035, sd: 0.08 },
  { id: 'index', th: 'กองทุนดัชนีหุ้น', d: 'เฉลี่ย 5% แต่บางปีติดลบหนัก ต้องถือยาว', mu: 0.05, sd: 0.16 },
  { id: 'stock', th: 'เลือกหุ้นซื้อขายเอง', d: 'ส่วนใหญ่ได้น้อยกว่าดัชนี เพราะค่าธรรมเนียมและการตัดสินใจตามอารมณ์', mu: 0.025, sd: 0.28 },
];
// ระดับการใช้จ่าย: need = คูณค่าครองชีพพื้นฐาน, extra = สัดส่วนของรายได้ส่วนเกินที่ใช้ไป
const LIFESTYLES = [
  { id: 'frugal', th: 'ประหยัด', d: 'ใช้เท่าที่จำเป็น เก็บเงินได้มากขึ้น แต่ชีวิตตึงขึ้นนิดหน่อย', need: 0.9, extra: 0.7, fx: { happy: -1.2 } },
  { id: 'normal', th: 'พอดี ๆ', d: 'ใช้จ่ายเหมือนคนส่วนใหญ่ที่มีรายได้เท่ากัน', need: 1, extra: 0.88, fx: {} },
  { id: 'comfy', th: 'ใช้ชีวิตสบาย', d: 'ไม่ค่อยคิดเรื่องราคา เก็บเงินได้น้อย แต่สบายใจกว่า', need: 1.1, extra: 0.98, fx: { happy: 1.5 } },
];
const FOODS = [
  { id: 'local', th: 'กินเหมือนคนรอบข้าง', d: '', cost: 0, fx: {} },
  { id: 'healthy', th: 'กินอย่างใส่ใจ', d: 'ผักมากขึ้น ลดหวานมันเค็ม ค่าอาหารแพงขึ้นเล็กน้อย แต่โรคเรื้อรังมาช้าลง', cost: 0.06, fx: { health: 0.8 } },
  { id: 'out', th: 'กินข้าวนอกบ้านและสั่งเดลิเวอรีบ่อย', d: 'สะดวกและอร่อย แต่แพงกว่าและไม่ค่อยดีต่อสุขภาพ', cost: 0.12, fx: { happy: 1, health: -0.6 } },
];
// oop = สัดส่วนค่ารักษาที่ต้องจ่ายเอง
const INSURANCE = [
  { id: 'none', th: 'ไม่ทำประกัน', d: 'ไม่มีเบี้ยรายปี แต่ถ้าป่วยหนักต้องจ่ายเองตามสิทธิ์ของประเทศ', prem: 0, oop: 1 },
  { id: 'basic', th: 'คุ้มครองพื้นฐาน', d: 'เบี้ยไม่แพง ลดค่ารักษาที่ต้องจ่ายเองได้ราวครึ่งหนึ่ง', prem: 0.03, oop: 0.5 },
  { id: 'full', th: 'คุ้มครองเต็มที่', d: 'เบี้ยแพง แต่ป่วยหนักแทบไม่ต้องจ่ายเอง', prem: 0.08, oop: 0.15 },
];
const GIFTS = [
  { id: 'full', th: 'ให้เต็มที่', d: '', cost: 0.03, fx: { rel: 0.8 } },
  { id: 'half', th: 'ให้ตามกำลัง', d: '', cost: 0.015, fx: {} },
  { id: 'none', th: 'แค่ไปร่วมงาน', d: 'ประหยัดเงิน แต่บางคนอาจน้อยใจ', cost: 0, fx: { rel: -0.8 } },
];
const pick = (list, id) => list.find(x => x.id === id) || list[0];

function newMoney() {
  return { income: 0, savings: 0, earned: 0, pInc: 0, house: 0, loan: 0, loanPay: 0, ledger: [], did: {}, spent: 0 };
}
function newLifeStyle() { return { place: 'cash', style: 'normal', food: 'local', ins: 'none', gift: 'half', parents: false, pvd: false }; }

// ค่าครองชีพพื้นฐานของผู้ใหญ่หนึ่งคนต่อปี
const unitCost = s => s.c.median * 0.55 * (s.f.city ? 1.15 : 1) * (s.f.rural ? 0.85 : 1);
const kidsAtHome = s => s.fam.filter(m => m.role === 'child' && m.alive && !m.left && m.age < 22).length;
const eldersIn = s => s.fam.filter(m => m.movedIn && m.alive && ['mother', 'father'].includes(m.role)).length;
function needOf(s) { return unitCost(s) * (1 + (s.f.married ? 0.7 : 0) + eldersIn(s) * 0.4); }
const independent = s => s.f.leftHome || !!s.f.job || s.f.retired || s.age >= 22;
const parentsAlive = s => s.fam.some(m => (m.role === 'mother' || m.role === 'father') && m.alive);
const netWorth = s => s.money.savings + s.money.house - s.money.loan;

// ค่ารักษาที่ต้องจ่ายเอง: sev = เท่าของค่าครองชีพหนึ่งปี ปรับตามระบบสาธารณสุขของประเทศและประกัน
function coverage(s) { return s.c.gdp >= 35 ? 0.25 : s.c.id === 'TH' ? 0.35 : s.c.gdp >= 15 ? 0.6 : 1; }
function medCost(s, sev) { return unitCost(s) * sev * coverage(s) * pick(INSURANCE, s.life.ins).oop; }

// บันทึกการเงิน (บวก = เงินเข้า, ลบ = เงินออก)
function pay(s, amt, label) {
  if (!amt) return;
  s.money.savings += amt;
  const L = s.money.ledger, row = L.find(r => r[0] === label);
  if (row) row[1] += amt; else L.push([label, amt]);
}

function yearMoney(s) {
  const m = s.money, a = s.age;
  m.ledger = [];
  // คู่ชีวิต
  const p = famPartner(s);
  if (!s.f.married || !p) m.pInc = 0;
  else if (!m.pSet) { m.pSet = true; m.pInc = Math.random() < (s.c.gdp > 20 ? 0.8 : 0.6) ? incomeAt(s.c, clamp(s.pFam * 0.6 + Math.random() * 0.4, 0.03, 0.97)) : 0; }
  if (p && p.age === 63 && m.pInc) m.pInc *= 0.45;
  if (!s.f.married) m.pSet = false;

  if (independent(s)) {
    const own = s.f.job || s.f.retired ? m.income : 0;
    if (own) { pay(s, own, s.f.retired ? 'บำนาญ' : 'รายได้จากงาน'); m.earned += own; }
    if (m.pInc) pay(s, m.pInc, 'รายได้ของคู่ชีวิต');
    const inc = own + m.pInc;
    // ไม่มีรายได้แต่ลูกโตแล้ว — ลูกช่วยส่งเงิน
    if (!own && a >= 55 && s.st.rel > 35 && s.fam.some(k => k.role === 'child' && k.alive && k.age >= 22)) pay(s, needOf(s) * 0.7, 'ลูก ๆ ส่งเงินมาช่วย');
    const L = pick(LIFESTYLES, s.life.style), F = pick(FOODS, s.life.food);
    const need = needOf(s);
    pay(s, -(need * L.need * (1 + F.cost) + Math.max(0, inc - need) * L.extra), 'ค่าครองชีพ (อาหาร ที่พัก เดินทาง)');
    const kids = kidsAtHome(s);
    if (kids) pay(s, -(unitCost(s) * 0.35 * kids * L.need + Math.max(0, inc - need) * 0.05 * kids), `ค่าเลี้ยงดูลูก ${kids} คน`);
    const I = pick(INSURANCE, s.life.ins), G = pick(GIFTS, s.life.gift);
    if (I.prem) pay(s, -need * I.prem, 'เบี้ยประกันสุขภาพ');
    if (G.cost && a >= 20) pay(s, -need * G.cost, 'ซองงานแต่ง งานบวช งานศพ');
    if (s.life.parents && parentsAlive(s)) { pay(s, -need * 0.1, 'เงินที่ส่งให้พ่อแม่'); applyFx(s, { rel: 1, happy: 0.5 }); }
    if (s.life.pvd && s.f.job) pay(s, own * 0.05, 'เงินสมทบกองทุนสำรองเลี้ยงชีพ');
    if (m.loan > 0) { const pmt = Math.min(m.loanPay, m.loan * 1.06); pay(s, -pmt, 'ผ่อนบ้าน'); m.loan = Math.max(0, m.loan * 1.06 - pmt); }
    applyFx(s, L.fx); applyFx(s, F.fx);
    if (a >= 20) applyFx(s, G.fx);
  }
  if (m.house) m.house *= 1.01 + gauss() * 0.03;
  // ผลตอบแทนหรือดอกเบี้ย
  if (m.savings > 0) {
    const P = pick(PLACES, s.life.place);
    pay(s, m.savings * (P.mu + gauss() * P.sd), `ผลตอบแทนจาก${P.th}`);
  } else if (m.savings < 0) pay(s, m.savings * (s.q <= 1 && s.c.gdp < 20 ? 0.15 : 0.08), 'ดอกเบี้ยหนี้');
  // กู้ได้ไม่เกินราวหนึ่งปีครึ่งของรายได้ — เกินนั้นต้องลดค่าใช้จ่าย
  const cap = -1.5 * Math.max(needOf(s), m.income + m.pInc);
  if (m.savings < cap) {
    m.ledger.push(['ลดค่าใช้จ่ายลงเพราะไม่มีใครให้ยืมเพิ่ม', cap - m.savings]);
    m.savings = cap;
    applyFx(s, { happy: -4, health: -2 });
    if (!m.cutAt || a - m.cutAt > 6) { m.cutAt = a; log('ไม่มีใครให้ยืมเงินเพิ่มแล้ว คุณต้องกินน้อยลงและงดทุกอย่างที่ไม่จำเป็น', 'bad'); }
  }
  if (settings.auto && a === 25 && s.life.place === 'cash') s.life.place = 'mixed';
  s.wealth[a] = netWorth(s);
}

// ════════════ UI: แผงการเงิน ════════════
function renderMoney() {
  const s = S, m = s.money, nw = netWorth(s);
  const inc = (s.f.job || s.f.retired ? m.income : 0) + m.pInc;
  const rows = [];
  if (!independent(s)) rows.push(['รายได้ครอบครัว (ต่อคน)', `${fmtBaht(s.famIncome / 12)}/เดือน`]);
  else rows.push(['รายได้ต่อปี', inc ? `${fmtBaht(inc)} <small>(${fmtBaht(inc / 12)}/เดือน)</small>` : 'ไม่มีรายได้']);
  rows.push([m.savings < 0 ? 'หนี้' : `เงินเก็บ · ${pick(PLACES, s.life.place).th}`, `<span class="${m.savings < 0 ? 'neg' : ''}">${fmtBaht(Math.abs(m.savings))}</span>`]);
  if (m.house) rows.push(['บ้าน', fmtBaht(m.house) + (m.loan > 0 ? ` <small>(เหลือผ่อน ${fmtBaht(m.loan)})</small>` : '')]);
  rows.push(['ทรัพย์สินสุทธิ', `<b class="${nw < 0 ? 'neg' : ''}">${nw < 0 ? '−' : ''}${fmtBaht(Math.abs(nw))}</b>`]);
  $('#moneyInfo').innerHTML = rows.map(r => `<div><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');
  const L = [...m.ledger].sort((x, y) => Math.abs(y[1]) - Math.abs(x[1])).slice(0, 7);
  const tot = m.ledger.reduce((t, r) => t + r[1], 0);
  $('#ledger').innerHTML = L.length ? `<p class="muted small">ปีที่ผ่านมา (อายุ ${s.age}) ทรัพย์สินสุทธิ${tot >= 0 ? 'เพิ่มขึ้น' : 'ลดลง'} <b class="${tot < 0 ? 'neg' : 'pos'}">${fmtBaht(Math.abs(tot))}</b></p>
    <ul class="ledger">${L.map(([l, v]) => `<li><span>${esc(l)}</span><b class="${v < 0 ? 'neg' : 'pos'}">${v < 0 ? '−' : '+'}${fmtBaht(Math.abs(v))}</b></li>`).join('')}</ul>`
    : `<p class="muted small">${independent(s) ? 'ยังไม่มีความเคลื่อนไหว' : 'ตอนนี้ครอบครัวเป็นคนจ่ายค่าใช้จ่ายให้คุณ'}</p>`;
  $('#wealthChart').innerHTML = wealthSVG(s.wealth, s.age);
  $('#shopBtn').disabled = !s.alive || s.age < 15;
}

function wealthSVG(w, age, W = 300, H = 90) {
  const xs = [], max = Math.max(1, ...w.filter(v => v != null).map(Math.abs));
  for (let a = 0; a <= age; a++) if (w[a] != null) xs.push([a, w[a]]);
  if (xs.length < 2) return `<text x="${W / 2}" y="${H / 2}" class="tick">ข้อมูลจะเริ่มเมื่อคุณมีรายรับรายจ่ายของตัวเอง</text>`;
  const maxA = Math.max(60, age), y0 = H / 2;
  const P = xs.map(([a, v]) => `${(a / maxA * W).toFixed(1)},${(y0 - v / max * (H / 2 - 4)).toFixed(1)}`);
  return `<line x1="0" y1="${y0}" x2="${W}" y2="${y0}" class="axis"/>
    <polyline points="${xs[0][0] / maxA * W},${y0} ${P.join(' ')} ${xs[xs.length - 1][0] / maxA * W},${y0}" class="area"/>
    <polyline points="${P.join(' ')}" class="line"/>
    <text x="2" y="10" class="tick" style="text-anchor:start">+${fmtBaht(max)}</text>
    <text x="2" y="${H - 2}" class="tick" style="text-anchor:start">−${fmtBaht(max)}</text>
    ${[0, 20, 40, 60, 80, 100].filter(a => a <= maxA).map(a => `<text x="${a / maxA * W}" y="${H + 11}" class="tick">${a}</text>`).join('')}`;
}

// ════════════ UI: ใช้เงิน · ลงทุน ════════════
// สิ่งที่ทำได้ปีละครั้ง: cost = เท่าของค่าครองชีพพื้นฐานหนึ่งปี
const SHOP = [
  { id: 'checkup', th: 'ตรวจสุขภาพประจำปี', d: 'เจอโรคเร็ว รักษาง่ายกว่า', cost: s => medCost(s, 0.06) + unitCost(s) * 0.01, fx: { health: 3 }, ok: s => s.age >= 25, go: s => { s.f.checkedAt = s.age; } },
  { id: 'gym', th: 'สมัครคลาสออกกำลังกาย', d: 'ร่างกายแข็งแรงขึ้น', cost: s => unitCost(s) * 0.04, fx: { health: 4, happy: 1 } },
  { id: 'class', th: 'เรียนกับครูหรือคอร์สออนไลน์', d: 'ความรู้และทักษะเพิ่มขึ้น', cost: s => unitCost(s) * 0.05, fx: { know: 5 } },
  { id: 'trip', th: 'พาคนที่รักไปเที่ยว', d: 'ความทรงจำดี ๆ ร่วมกัน', cost: s => unitCost(s) * (0.12 + 0.04 * household(s).length), fx: { happy: 6, rel: 5 }, ok: s => household(s).length > 0 },
  { id: 'parents', th: 'ให้เงินพ่อแม่ก้อนหนึ่ง', d: 'ตอบแทนคนที่เลี้ยงคุณมา', cost: s => unitCost(s) * 0.12, fx: { rel: 5, happy: 2 }, ok: s => parentsAlive(s) && s.age >= 20 },
  { id: 'date', th: 'ไปเดตกับคนรัก', d: 'ความสัมพันธ์แน่นแฟ้นขึ้น', cost: s => unitCost(s) * 0.03, fx: { rel: 4, happy: 3 }, ok: s => !!s.f.partner },
  { id: 'meet', th: 'ไปงานพบปะหาคู่', d: 'อาจได้เจอใครบางคน', cost: s => unitCost(s) * 0.03, fx: { happy: 1 }, ok: s => !s.f.partner && s.age >= 18 && s.age < 70, go: s => { if (Math.random() < 0.25 + s.st.rel / 400) { const p = famAddPartner(s); applyFx(s, { happy: 6, rel: 5 }); return `คุณได้รู้จักกับ ${p.name} และนัดเจอกันอีก`; } return 'ไม่มีใครถูกใจ แต่ก็ได้ออกไปเจอผู้คน'; } },
  { id: 'treat', th: 'ซื้อของที่อยากได้มานาน', d: 'ความสุขระยะสั้น', cost: s => unitCost(s) * 0.08, fx: { happy: 5 } },
  { id: 'donate', th: 'บริจาคให้คนที่ลำบากกว่า', d: 'ใจฟูขึ้น', cost: s => unitCost(s) * 0.05, fx: { happy: 3, rel: 2 } },
];

function openShop() {
  const prev = paused; paused = true;
  const draw = () => {
    const s = S, m = s.money, adult = independent(s);
    const radio = (key, list, title, help) => `<div class="shopgrp"><h5>${title}</h5>${help ? `<p class="muted small">${help}</p>` : ''}
      ${list.map(o => `<label class="opt${s.life[key] === o.id ? ' on' : ''}"><input type="radio" name="${key}" value="${o.id}"${s.life[key] === o.id ? ' checked' : ''}><span><b>${o.th}</b>${o.d ? `<small>${o.d}</small>` : ''}</span></label>`).join('')}</div>`;
    const acts = SHOP.filter(x => !x.ok || x.ok(s)).map(x => {
      const c = x.cost(s), done = m.did[x.id] === s.age, poor = m.savings < c;
      return `<li><span><b>${x.th}</b><small>${x.d}</small></span><button class="btn sm${done ? ' ghost' : ''}" data-buy="${x.id}"${done || poor || !adult ? ' disabled' : ''}>${done ? 'ทำแล้วปีนี้' : '−' + fmtBaht(c)}</button></li>`;
    }).join('');
    openModal(`<div class="row between"><h3>ใช้เงิน · ลงทุน</h3><button class="btn ghost sm" id="shopX">ปิด</button></div>
      <p class="muted small">อายุ ${s.age} ปี · ${m.savings < 0 ? 'หนี้' : 'เงินเก็บ'} <b>${fmtBaht(Math.abs(m.savings))}</b> · ทรัพย์สินสุทธิ <b>${fmtBaht(netWorth(s))}</b><br>จำนวนเงินเทียบค่าครองชีพในไทย</p>
      <div class="shopbody">
      ${adult ? '' : '<p class="note">ตอนนี้ครอบครัวยังเป็นคนจ่ายค่าใช้จ่ายให้คุณ ตั้งค่าไว้ก่อนได้ จะเริ่มมีผลเมื่อคุณมีรายได้หรือย้ายออกจากบ้าน</p>'}
      <div class="shopgrp"><h5>สิ่งที่ทำได้ตอนนี้ <small class="muted">ปีละครั้ง</small></h5><ul class="shoplist">${acts}</ul></div>
      ${radio('place', PLACES, 'ฝากเงินเก็บไว้ที่ไหน', 'ย้ายเงินไปที่อื่นเสียค่าธรรมเนียม 0.5% · ผลตอบแทนหักเงินเฟ้อแล้ว')}
      ${radio('style', LIFESTYLES, 'ระดับการใช้จ่าย')}
      ${radio('food', FOODS, 'การกิน')}
      ${radio('ins', INSURANCE, 'ประกันสุขภาพ', s.c.gdp >= 35 ? 'ประเทศนี้มีระบบประกันสุขภาพถ้วนหน้าที่ดี จ่ายเองไม่มาก' : s.c.id === 'TH' ? 'มีบัตรทองช่วยค่ารักษาส่วนใหญ่' : s.c.gdp < 15 ? 'ที่นี่ค่ารักษาส่วนใหญ่ต้องจ่ายเอง' : '')}
      ${radio('gift', GIFTS, 'ซองงานแต่ง งานบวช งานศพ')}
      <div class="shopgrp"><h5>เงินประจำ</h5>
        <label class="opt chk"><input type="checkbox" id="optParents"${s.life.parents ? ' checked' : ''}${parentsAlive(s) ? '' : ' disabled'}><span><b>ส่งเงินให้พ่อแม่ทุกปี</b><small>ราว 10% ของค่าครองชีพ ความสัมพันธ์ดีขึ้นทุกปี</small></span></label>
        <label class="opt chk"><input type="checkbox" id="optPvd"${s.life.pvd ? ' checked' : ''}${s.f.job ? '' : ' disabled'}><span><b>กองทุนสำรองเลี้ยงชีพ</b><small>นายจ้างสมทบให้อีก 5% ของเงินเดือน (ต้องมีงานประจำ)</small></span></label>
      </div></div>`);
    $('#shopX').onclick = close;
    $$('.shopbody input[type=radio]').forEach(r => r.onchange = () => {
      if (r.name === 'place' && s.money.savings > 0) pay(s, -s.money.savings * 0.005, 'ค่าธรรมเนียมย้ายเงินลงทุน');
      s.life[r.name] = r.value;
      if (r.name === 'place') log(`คุณย้ายเงินเก็บไปไว้ที่${pick(PLACES, r.value).th}`);
      draw();
    });
    $('#optParents').onchange = e => { s.life.parents = e.target.checked; if (e.target.checked) log('คุณเริ่มส่งเงินให้พ่อแม่ทุกปี', 'good'); };
    $('#optPvd').onchange = e => { s.life.pvd = e.target.checked; };
    $$('[data-buy]').forEach(b => b.onclick = () => {
      const x = SHOP.find(y => y.id === b.dataset.buy), c = x.cost(s);
      pay(s, -c, x.th); m.did[x.id] = s.age; m.spent += c;
      applyFx(s, x.fx);
      const r = x.go ? x.go(s) : null;
      log(`${x.th} (−${fmtBaht(c)})${r ? ' — ' + r : ''}`, 'good');
      render(); draw();
    });
  };
  const close = () => { closeModal(); paused = prev; lastT = 0; render(); };
  draw();
}

// สรุปชีวิตหนึ่งประโยคสำหรับหน้าอนุสรณ์
function lifeSummary(s) {
  const nw = netWorth(s), rich = nw > unitCost(s) * 15, lonely = household(s).length === 0;
  const close = s.st.rel >= 60, sick = s.st.health < 35;
  const a = rich ? 'สะสมทรัพย์สินไว้ได้มากมาย' : nw < 0 ? 'จากไปพร้อมหนี้ที่ยังใช้ไม่หมด' : 'ไม่ได้มีทรัพย์สินมากมาย';
  const b = lonely ? 'ในปีสุดท้ายไม่มีใครอยู่ด้วย' : close ? (s.f.kids ? `มีลูก ${s.f.kids} คนอยู่ใกล้ชิดจนวาระสุดท้าย` : 'มีคนที่รักอยู่เคียงข้างจนวาระสุดท้าย') : sick ? 'สุขภาพทรุดลงมากในช่วงท้าย' : 'ใช้ชีวิตไปตามจังหวะของตัวเอง';
  const good = !lonely && (close || !sick);
  return `${a} ${(rich && !good) || (!rich && good) ? 'แต่' : 'และ'}${b}`;
}
