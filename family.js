'use strict';
// ════════════ ครอบครัวและตัวการ์ตูน ════════════

// ชื่อตามภูมิภาค (ถอดเสียงเป็นไทย)
const NAMES = {
  SA: { M: ['อาร์จุน', 'ราหุล', 'อามีร์', 'โมฮัมหมัด', 'ราวี', 'อาลี', 'สันจัย', 'ฮัสซัน', 'วิกรม', 'ซาฮิด'], F: ['ปรียา', 'อนิตา', 'ฟาติมา', 'ไอชา', 'ลักษมี', 'นิชา', 'ราธา', 'ซีมา', 'ดีปา', 'รูบินา'] },
  EA: { M: ['เหว่ย', 'หมิง', 'ฮิโรชิ', 'จุนโฮ', 'เฮาหราน', 'ทากุมิ', 'มินจุน', 'เจี้ยน', 'เคนจิ', 'ซองมิน'], F: ['ลี่น่า', 'เหม่ยหลิง', 'ยูกิ', 'ซากุระ', 'จีอู', 'ซูอิน', 'ฮานะ', 'เสี่ยวหลาน', 'มิโอะ', 'ฮายุน'] },
  SEA: { M: ['บูดี', 'เหงียน', 'ฮวน', 'อาหมัด', 'มินอ่อง', 'ดารา', 'ราฟาเอล', 'ฮาฟิซ', 'บุญมี', 'มาร์โก'], F: ['ซิตี', 'หลินห์', 'มาเรีย', 'ปุตรี', 'ซูซู', 'อันห์', 'นูรุล', 'ดาลิน', 'ไอรีน', 'คำแพง'] },
  AF: { M: ['ชีดี', 'โควฟี', 'อาบู', 'เตโวดรอส', 'บาการี', 'ไอแซก', 'มูซา', 'เคลวิน', 'จูมา', 'ทาโบ'], F: ['อามินา', 'ชิโอมา', 'อาเบบา', 'ฟาตู', 'เกรซ', 'นาเลดี', 'อาไย', 'ซาลามา', 'เอ็นโคซี', 'อิมานี'] },
  ME: { M: ['โอมาร์', 'ยูซุฟ', 'เอมีร์', 'คาริม', 'ฮามิด', 'มุสตาฟา', 'ซาอีด', 'ตาริก', 'เมห์เม็ต', 'อาร์ยา'], F: ['ไลลา', 'ซาฮรา', 'เอลิฟ', 'นูร์', 'ยัสมิน', 'มารยัม', 'ซารา', 'ฮูดา', 'ซัยเนบ', 'ดาเนีย'] },
  EU: { M: ['ลูคัส', 'ลีออน', 'ลูก้า', 'อีวาน', 'ออสการ์', 'ฮูโก้', 'มาเตโอ', 'เจมส์', 'ยาคุบ', 'เฟลิกซ์'], F: ['เอ็มมา', 'โซเฟีย', 'แอนนา', 'มีอา', 'โอลิเวีย', 'เอลซ่า', 'ลอร่า', 'ยูเลีย', 'คลารา', 'อเล็กซานดรา'] },
  NA: { M: ['เลียม', 'โนอาห์', 'อีธาน', 'แจ็ค', 'ไมเคิล', 'ดาเนียล', 'เบน', 'ไรอัน', 'โจชัว', 'ไทเลอร์'], F: ['เอมิลี่', 'เอวา', 'โคลอี้', 'แกรซ', 'ซอฟี', 'ลิลลี่', 'แฮร์เปอร์', 'มายา', 'เจสซิกา', 'ซาราห์'] },
  LA: { M: ['ซานติอาโก', 'ดิเอโก', 'กาเบรียล', 'ฮวน', 'เปโดร', 'หลุยส์', 'มิเกล', 'ฌอง', 'ราฟาเอล', 'เฟร์นันโด'], F: ['วาเลนตินา', 'คามิลา', 'อิซาเบลา', 'ลูเซีย', 'ซอฟีอา', 'อานา', 'การ์เมน', 'มาเรียนา', 'ดาเนียลา', 'โรซา'] },
};
NAMES.OC = NAMES.NA;
const NAMES_BY_COUNTRY = {
  TH: { M: ['ภูมิ', 'ณัฐ', 'ต้นกล้า', 'กิตติ', 'วีระ', 'ธนา', 'ปกรณ์', 'สมชาย', 'ก้องภพ', 'ชัยวัฒน์'], F: ['มาลี', 'ณิชา', 'ใบเฟิร์น', 'กัญญา', 'พิมพ์', 'ศิริพร', 'ดาว', 'น้ำฝน', 'ปิยะนุช', 'อรุณี'] },
  JP: { M: ['ฮิโรชิ', 'ทากุมิ', 'เคนจิ', 'ฮารุโตะ', 'ยูโตะ', 'โซตะ', 'ริคุ', 'ไดกิ', 'ชุน', 'เร็น'], F: ['ยูกิ', 'ซากุระ', 'ฮานะ', 'มิโอะ', 'อาโออิ', 'ยุย', 'ริน', 'เมย์', 'นานะ', 'เอมิ'] },
  KR: { M: ['มินจุน', 'จุนโฮ', 'ซองมิน', 'จีฮุน', 'โดยุน', 'ฮยอนอู', 'แทยัง', 'ซอจุน', 'อูจิน', 'ยองโฮ'], F: ['จีอู', 'ฮายุน', 'ซอยอน', 'มินจี', 'ซูอา', 'เยจิน', 'ดาอึน', 'ยูนา', 'ฮเยริน', 'จีมิน'] },
};

// สีผิว / ผม ตามภูมิภาค (เพื่อความหลากหลายของภาพ)
const SKINS = ['#f6d7c3', '#eac09f', '#d9a37c', '#c08559', '#9c6640', '#7a4a2b', '#5a361f'];
const SKIN_W = {
  AF: [0, 0, 0, 0.05, 0.25, 0.4, 0.3], SA: [0, 0.05, 0.25, 0.4, 0.25, 0.05, 0], ME: [0.05, 0.3, 0.4, 0.2, 0.05, 0, 0],
  EA: [0.45, 0.45, 0.1, 0, 0, 0, 0], SEA: [0.1, 0.35, 0.4, 0.15, 0, 0, 0], EU: [0.6, 0.3, 0.07, 0.02, 0.01, 0, 0],
  NA: [0.45, 0.2, 0.12, 0.1, 0.08, 0.05, 0], OC: [0.55, 0.25, 0.1, 0.05, 0.05, 0, 0], LA: [0.15, 0.3, 0.3, 0.15, 0.07, 0.03, 0],
};
const HAIRS = { dark: '#2b2220', brown: '#6b4428', blond: '#d8b25a', red: '#a8502a' };
const HAIR_W = { EU: { dark: 0.3, brown: 0.4, blond: 0.22, red: 0.08 }, NA: { dark: 0.45, brown: 0.35, blond: 0.15, red: 0.05 }, OC: { dark: 0.35, brown: 0.35, blond: 0.25, red: 0.05 }, LA: { dark: 0.75, brown: 0.22, blond: 0.03, red: 0 } };
const SHIRTS = ['#e76f51', '#2a9d8f', '#e9c46a', '#457b9d', '#8d6cab', '#f4a261', '#6a994e', '#d1495b', '#3d5a80', '#ee964b', '#5fa8d3', '#c77dff'];

const pickArr = a => a[Math.floor(Math.random() * a.length)];
const pickIdx = w => { let r = Math.random() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < w.length; i++) { r -= w[i]; if (r <= 0) return i; } return w.length - 1; };
function regionLook(reg) {
  const skin = SKINS[pickIdx(SKIN_W[reg] || SKIN_W.SEA)];
  const hw = HAIR_W[reg]; let hair = HAIRS.dark;
  if (hw) { const ks = Object.keys(hw); hair = HAIRS[ks[pickIdx(ks.map(k => hw[k]))]]; }
  return { skin, hair };
}
function pickName(s, g) {
  const pool = (NAMES_BY_COUNTRY[s.c.id] || NAMES[s.c.reg] || NAMES.SEA)[g];
  const taken = new Set((s.fam || []).map(m => m.name).concat(s.name || []));
  const free = pool.filter(n => !taken.has(n));
  return pickArr(free.length ? free : pool);
}

let MEMBER_ID = 0;
function makeMember(s, role, g, age, look) {
  const m = {
    id: ++MEMBER_ID, role, g, age, alive: true, name: pickName(s, g),
    skin: look.skin, hair: look.hair, shirt: pickArr(SHIRTS), hairStyle: Math.floor(Math.random() * 3),
    lt: lifeTable(s.c, g), since: s.age, glasses: Math.random() < 0.25,
  };
  return m;
}
const inherit = (...parents) => { const p = parents.filter(Boolean); const a = pickArr(p); return { skin: a.skin, hair: pickArr(p).hair }; };

// สร้างครอบครัวตอนเกิด
function createFamily(s) {
  s.fam = [];
  const reg = s.c.reg, ftype = s.f.family;
  const motherLook = regionLook(reg), fatherLook = Math.random() < 0.85 ? { ...regionLook(reg), skin: motherLook.skin } : regionLook(reg);
  // พี่ (เกิดก่อนคุณ)
  const sibAges = []; let a = 0;
  for (let i = 0; i < s.f.sibs; i++) { a += 1 + Math.floor(Math.random() * 3); sibAges.push(a); }
  const eldest = sibAges.length ? sibAges[sibAges.length - 1] : 0;
  const momAge = Math.max(eldest + 17 + Math.floor(Math.random() * 4), Math.round(s.c.gdp < 8 ? rnd(18, 32) : rnd(24, 37)));
  const mom = makeMember(s, 'mother', 'F', momAge, motherLook);
  const dad = makeMember(s, 'father', 'M', momAge + Math.floor(rnd(0, 7)), fatherLook);
  const self = { ...inherit(mom, dad) };
  s.look = { skin: self.skin, hair: self.hair, shirt: pickArr(SHIRTS), hairStyle: Math.floor(Math.random() * 3), glasses: Math.random() < 0.25 };
  s.name = pickName(s, s.g);
  if (ftype !== 'grand') { s.fam.push(mom); if (ftype !== 'single') s.fam.push(dad); }
  if (ftype === 'grand' || ftype === 'extended') {
    const gAge = momAge + Math.round(rnd(20, 30));
    s.fam.push(makeMember(s, 'grandma', 'F', gAge, { skin: motherLook.skin, hair: motherLook.hair }));
    if (Math.random() < (ftype === 'grand' ? 0.7 : 0.6)) s.fam.push(makeMember(s, 'grandpa', 'M', gAge + Math.round(rnd(0, 6)), { skin: fatherLook.skin, hair: fatherLook.hair }));
  }
  if (ftype === 'single') s.fam.find(m => m.role === 'mother').note = 'เลี้ยงคุณมาคนเดียว';
  for (const age of sibAges) s.fam.push(makeMember(s, 'sibling', Math.random() < 0.5 ? 'M' : 'F', age, inherit(mom, dad)));
  s.parentsLook = [mom, dad];
}

function roleLabel(s, m) {
  switch (m.role) {
    case 'mother': return 'แม่';
    case 'father': return 'พ่อ';
    case 'grandma': return 'ยาย';
    case 'grandpa': return 'ตา';
    case 'sibling': return (m.age > s.age ? 'พี่' : 'น้อง') + (m.g === 'M' ? 'ชาย' : 'สาว');
    case 'partner': return s.f.married ? (m.g === 'M' ? 'สามี' : 'ภรรยา') : 'แฟน';
    case 'child': return m.g === 'M' ? 'ลูกชาย' : 'ลูกสาว';
    case 'grandchild': return 'หลาน';
    default: return '';
  }
}

// ── การเปลี่ยนแปลงในครอบครัว (เรียกจาก events.js) ──
function famAddSibling(s) {
  const [mom, dad] = s.parentsLook;
  const m = makeMember(s, 'sibling', Math.random() < 0.5 ? 'M' : 'F', 0, inherit(mom, dad));
  s.fam.push(m); return m;
}
function famAddPartner(s, ageGap = rnd(-3, 5)) {
  const g = s.g === 'M' ? 'F' : 'M';
  const m = makeMember(s, 'partner', g, Math.max(16, Math.round(s.age + (s.g === 'M' ? -Math.abs(ageGap) : Math.abs(ageGap)))), regionLook(s.c.reg));
  s.fam.push(m); s.f.partner = true; return m;
}
function famPartner(s) { return s.fam.find(m => m.role === 'partner' && m.alive && !m.left); }
function famRemovePartner(s) { const p = famPartner(s); if (p) { p.left = true; } s.f.partner = false; s.f.married = false; return p; }
function famAddChild(s) {
  const p = famPartner(s);
  const m = makeMember(s, 'child', Math.random() < 0.51 ? 'M' : 'F', 0, inherit(s.look, p || s.look));
  s.fam.push(m); s.f.kids++; return m;
}
function famAddGrandchild(s) {
  const kid = s.fam.find(m => m.role === 'child' && m.alive) || s.look;
  const m = makeMember(s, 'grandchild', Math.random() < 0.5 ? 'M' : 'F', 0, inherit(kid));
  s.fam.push(m); return m;
}

// อายุเพิ่ม + โอกาสเสียชีวิตของสมาชิก (ตามตารางชีพจริงของประเทศ)
function famYear(s, logFn, applyFxFn, safe) {
  for (const m of s.fam) {
    if (!m.alive || m.left) continue;
    m.age++;
    let q = m.lt.q(m.age) * WEALTH_MORT[s.q];
    if (safe && (m.role === 'child' || m.role === 'grandchild' || m.role === 'sibling')) q = 0;
    if (Math.random() < q) {
      m.alive = false; m.diedAt = m.age; m.diedYour = s.age;
      const lbl = roleLabel(s, m);
      const cause = causeOfDeath(s.c, m.g, m.age, true);
      if (m.role === 'partner') {
        s.f.partner = false; s.f.married = false; s.f.widowed = true;
        logFn(`${lbl}ของคุณ ${m.name} จากไปเมื่ออายุ ${m.age} ปี (${cause}) บ้านเงียบลงจนได้ยินเสียงนาฬิกา`, 'bad');
        applyFxFn(s, { happy: -16, rel: -8 });
      } else if (m.role === 'child') {
        s.f.kids = Math.max(0, s.f.kids - 1);
        logFn(`${lbl}ของคุณ ${m.name} จากไปตอนอายุ ${m.age} ปี (${cause}) ไม่มีอะไรเจ็บปวดไปกว่านี้`, 'bad');
        applyFxFn(s, { happy: -22, health: -4 });
      } else {
        const close = m.role === 'mother' || m.role === 'father' || (s.f.family === 'grand' && m.role.startsWith('grand'));
        logFn(`${lbl}ของคุณ ${m.name} จากไปเมื่ออายุ ${m.age} ปี (${cause})`, 'bad');
        applyFxFn(s, close ? { happy: -12, rel: -4 } : { happy: -6, rel: -2 });
      }
    }
  }
}

// ใครอยู่บ้านเดียวกับคุณตอนนี้
function household(s) {
  const out = [];
  const leftHome = s.f.leftHome;
  for (const m of s.fam) {
    if (!m.alive || m.left) continue;
    if (['mother', 'father', 'grandma', 'grandpa'].includes(m.role)) { if (!leftHome || s.f.family === 'extended' || m.movedIn) out.push(m); }
    else if (m.role === 'sibling') { if (!leftHome && m.age < 23) out.push(m); }
    else if (m.role === 'child') { if (m.age < 22 || m.movedIn) out.push(m); }
    else out.push(m);
  }
  return out;
}

// ════════════ วาดตัวการ์ตูน (SVG) ════════════
function stageOf(age) { return age < 2 ? 'baby' : age < 6 ? 'toddler' : age < 13 ? 'child' : age < 20 ? 'teen' : age < 60 ? 'adult' : 'elder'; }
function heightOf(age) { if (age < 2) return 30; if (age < 6) return 42 + age * 3; if (age < 13) return 56 + (age - 6) * 4; if (age < 20) return 84 + (age - 13) * 2.2; if (age < 70) return 100; return 100 - Math.min(8, (age - 70) * 0.5); }
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16); let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  r = Math.round(clamp(r * f, 0, 255)); g = Math.round(clamp(g * f, 0, 255)); b = Math.round(clamp(b * f, 0, 255));
  return '#' + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

// p = { g, age, skin, hair, shirt, hairStyle, glasses, mood (0-100), sick }
function avatarSVG(p) {
  const st = stageOf(p.age), mood = p.mood ?? 65;
  const hair = st === 'elder' ? (p.age > 72 ? '#e8e6e1' : '#a9a49c') : p.hair;
  const skinD = shade(p.skin, 0.85);
  const H = heightOf(p.age);
  // viewBox: 60 wide x 110 tall, ground at y=108
  let body = '';
  if (st === 'baby') {
    const blanket = p.g === 'F' ? '#f7b2bd' : '#a8d5f2';
    body = `
      <ellipse cx="30" cy="96" rx="17" ry="12" fill="${blanket}"/>
      <path d="M14 96 q16 -10 32 0" fill="none" stroke="${shade(blanket, 0.85)}" stroke-width="2"/>
      <circle cx="30" cy="80" r="11" fill="${p.skin}"/>
      <path d="M22 75 q8 -9 16 0" fill="${hair}" opacity=".9"/>
      <path d="M25 81 q2 2 4 0 M31 81 q2 2 4 0" stroke="#3a2a22" stroke-width="1.2" fill="none" stroke-linecap="round"/>
      <circle cx="24.5" cy="84" r="2" fill="#f28b82" opacity=".45"/><circle cx="35.5" cy="84" r="2" fill="#f28b82" opacity=".45"/>
      <path d="M28 86 q2 1.6 4 0" stroke="#7a3b2e" stroke-width="1" fill="none" stroke-linecap="round"/>`;
  } else {
    const kid = st === 'toddler' || st === 'child';
    const headR = kid ? 15 : 14;
    const hy = 8 + headR;                 // head center y
    const torsoTop = hy + headR - 2, torsoBot = kid ? torsoTop + 30 : torsoTop + 36;
    const legBot = 104;
    const shirt = p.shirt, pants = p.g === 'F' && p.hairStyle !== 2 ? null : shade(p.shirt, 0.45);
    const shoe = '#3a3330';
    // ผมด้านหลัง (ผมยาว)
    let back = '';
    if (p.g === 'F' && st !== 'elder') back = `<path d="M${30 - headR - 1} ${hy} q0 ${headR + 14} 6 ${headR + 18} h${2 * headR - 10} q6 -4 6 -${headR + 18} z" fill="${hair}"/>`;
    if (p.g === 'F' && st === 'elder') back = `<circle cx="30" cy="${hy - headR + 1}" r="6" fill="${hair}"/>`;
    // ขา
    let legs;
    if (pants) legs = `<rect x="20" y="${torsoBot - 4}" width="9" height="${legBot - torsoBot + 2}" rx="4" fill="${pants}"/><rect x="31" y="${torsoBot - 4}" width="9" height="${legBot - torsoBot + 2}" rx="4" fill="${pants}"/>`;
    else legs = `<rect x="22" y="${torsoBot}" width="6" height="${legBot - torsoBot}" rx="3" fill="${p.skin}"/><rect x="32" y="${torsoBot}" width="6" height="${legBot - torsoBot}" rx="3" fill="${p.skin}"/>
      <path d="M16 ${torsoBot - 8} L44 ${torsoBot - 8} L48 ${torsoBot + 8} L12 ${torsoBot + 8} Z" fill="${shade(shirt, 0.8)}"/>`;
    const shoes = `<ellipse cx="24" cy="${legBot + 1}" rx="6" ry="3" fill="${shoe}"/><ellipse cx="36" cy="${legBot + 1}" rx="6" ry="3" fill="${shoe}"/>`;
    // ลำตัว + แขน
    const torso = `<rect x="15" y="${torsoTop}" width="30" height="${torsoBot - torsoTop}" rx="10" fill="${shirt}"/>
      <rect x="8" y="${torsoTop + 3}" width="8" height="${(torsoBot - torsoTop) * 0.75}" rx="4" fill="${shirt}" transform="rotate(8 12 ${torsoTop + 3})"/>
      <rect x="44" y="${torsoTop + 3}" width="8" height="${(torsoBot - torsoTop) * 0.75}" rx="4" fill="${shirt}" transform="rotate(-8 48 ${torsoTop + 3})"/>
      <circle cx="${9}" cy="${torsoTop + 4 + (torsoBot - torsoTop) * 0.75}" r="3.6" fill="${p.skin}"/>
      <circle cx="${51}" cy="${torsoTop + 4 + (torsoBot - torsoTop) * 0.75}" r="3.6" fill="${p.skin}"/>`;
    const cane = st === 'elder' && p.age > 75 ? `<path d="M53 ${torsoTop + 22} L55 ${legBot + 2}" stroke="#7b5536" stroke-width="2.4" stroke-linecap="round"/><path d="M53 ${torsoTop + 22} q-1 -5 4 -5" stroke="#7b5536" stroke-width="2.4" fill="none" stroke-linecap="round"/>` : '';
    // หัว
    const head = `<rect x="26" y="${hy + headR - 4}" width="8" height="6" fill="${skinD}"/>
      <circle cx="${30 - headR}" cy="${hy + 2}" r="3" fill="${p.skin}"/><circle cx="${30 + headR}" cy="${hy + 2}" r="3" fill="${p.skin}"/>
      <circle cx="30" cy="${hy}" r="${headR}" fill="${p.skin}"/>`;
    // ผมด้านหน้า
    let front;
    if (st === 'elder' && p.g === 'M' && p.hairStyle === 0) front = `<path d="M${30 - headR + 1} ${hy - 2} q0 -6 4 -8 M${30 + headR - 1} ${hy - 2} q0 -6 -4 -8" stroke="${hair}" stroke-width="4" fill="none" stroke-linecap="round"/>`;
    else if (p.g === 'M') front = p.hairStyle === 1
      ? `<path d="M${30 - headR} ${hy - 1} q-1 -${headR + 3} ${headR} -${headR + 2} q${headR + 2} -1 ${headR} ${headR + 1} q-5 -7 -12 -6 q-6 -4 -${headR + 1} 6z" fill="${hair}"/>`
      : `<path d="M${30 - headR} ${hy} q0 -${headR + 2} ${headR} -${headR + 1} q${headR} 0 ${headR} ${headR + 1} q-4 -5 -${headR - 2} -5 q-${headR - 4} 0 -${headR + 2} 5z" fill="${hair}"/>`;
    else front = p.hairStyle === 0
      ? `<path d="M${30 - headR - 1} ${hy + 2} q-1 -${headR + 4} ${headR + 1} -${headR + 3} q${headR + 2} 0 ${headR + 1} ${headR + 5} q-6 -9 -${headR - 2} -9 q-4 5 -${headR + 1} 9z" fill="${hair}"/>`
      : `<path d="M${30 - headR - 1} ${hy + 2} q0 -${headR + 4} ${headR + 1} -${headR + 3} q${headR + 1} 0 ${headR + 1} ${headR + 5} q-${headR} -3 -${headR * 2 + 2} -2z" fill="${hair}"/>
         ${p.hairStyle === 2 && st !== 'elder' ? `<circle cx="${30 + headR}" cy="${hy - headR + 4}" r="4" fill="${hair}"/><circle cx="${30 - headR}" cy="${hy - headR + 4}" r="4" fill="${hair}"/>` : ''}`;
    // หน้า
    const ey = hy + 1, mx = 30, my = hy + 7;
    const eyes = mood > 80
      ? `<path d="M23 ${ey + 1} q2.5 -3 5 0 M32 ${ey + 1} q2.5 -3 5 0" stroke="#2c211c" stroke-width="1.6" fill="none" stroke-linecap="round"/>`
      : `<ellipse cx="25.5" cy="${ey}" rx="1.8" ry="2.2" fill="#2c211c"/><ellipse cx="34.5" cy="${ey}" rx="1.8" ry="2.2" fill="#2c211c"/><circle cx="26.1" cy="${ey - 0.8}" r=".6" fill="#fff"/><circle cx="35.1" cy="${ey - 0.8}" r=".6" fill="#fff"/>`;
    const brows = mood < 30 ? `<path d="M22.5 ${ey - 5} l5 1.5 M37.5 ${ey - 5} l-5 1.5" stroke="${shade(hair, 0.8)}" stroke-width="1.3" stroke-linecap="round"/>` : '';
    const mouth = mood > 55 ? `<path d="M${mx - 4} ${my - 1} q4 ${mood > 80 ? 5 : 3.5} 8 0" stroke="#7a3b2e" stroke-width="1.5" fill="${mood > 80 ? '#c4554d' : 'none'}" stroke-linecap="round"/>`
      : mood > 30 ? `<path d="M${mx - 3} ${my} h6" stroke="#7a3b2e" stroke-width="1.4" stroke-linecap="round"/>`
        : `<path d="M${mx - 4} ${my + 1.5} q4 -3.5 8 0" stroke="#7a3b2e" stroke-width="1.5" fill="none" stroke-linecap="round"/>`;
    const cheeks = `<circle cx="22" cy="${my - 2}" r="2.6" fill="#f28b82" opacity="${mood > 55 ? 0.45 : 0.15}"/><circle cx="38" cy="${my - 2}" r="2.6" fill="#f28b82" opacity="${mood > 55 ? 0.45 : 0.15}"/>`;
    const glasses = p.glasses && (st === 'adult' || st === 'elder') ? `<g fill="none" stroke="#3a3330" stroke-width="1.1"><circle cx="25.5" cy="${ey}" r="3.8"/><circle cx="34.5" cy="${ey}" r="3.8"/><path d="M29.3 ${ey} h1.4"/></g>` : '';
    const wrinkles = st === 'elder' ? `<path d="M19 ${ey + 3} l-2 1 M41 ${ey + 3} l2 1" stroke="${skinD}" stroke-width="1" stroke-linecap="round"/>` : '';
    const bag = st === 'child' && p.school ? `<rect x="40" y="${torsoTop + 2}" width="10" height="14" rx="3" fill="#e63946"/>` : '';
    body = back + legs + shoes + bag + torso + cane + head + front + eyes + brows + cheeks + mouth + glasses + wrinkles;
  }
  if (p.portrait) return `<svg viewBox="${st === 'baby' ? '8 64 44 40' : '4 3 52 48'}" width="36" height="36" class="av" aria-hidden="true">${body}</svg>`;
  const scale = H / 100 * (p.scale || 1);
  return `<svg viewBox="0 0 60 110" width="${Math.round(60 * scale * (st === 'baby' ? 1.6 : 1))}" height="${Math.round(110 * scale * (st === 'baby' ? 1.6 : 1))}" class="av av-${st}" aria-hidden="true">
    <ellipse cx="30" cy="106" rx="${st === 'baby' ? 16 : 18}" ry="3" fill="#000" opacity=".12"/>${body}</svg>`;
}

// ════════════ ฉากบ้านและท้องฟ้า ════════════
function homeLevel(s) {
  const inc = s.money && s.money.income > 0 && s.f.leftHome ? s.money.income : s.famIncome;
  const w = worldPct(inc);
  const lv = w < 0.25 ? 0 : w < 0.5 ? 1 : w < 0.75 ? 2 : w < 0.92 ? 3 : 4;
  return Math.min(4, lv + (s.f && s.f.house && s.f.leftHome ? 1 : 0));
}
const HOME_NAMES = ['กระท่อมหลังเล็ก', 'บ้านสังกะสี', 'ห้องแถวในเมือง', 'บ้านเดี่ยวมีสวน', 'บ้านหลังใหญ่'];

function skyFor(age) {
  if (age < 13) return ['#ffd9c2', '#bfe3f5', 'morning'];
  if (age < 40) return ['#8fd0f5', '#d8f0fb', 'day'];
  if (age < 65) return ['#f7c873', '#fbe7c2', 'afternoon'];
  return ['#f08a6c', '#a77fc7', 'sunset'];
}

function houseSVG(level) {
  switch (level) {
    case 0: return `<g transform="translate(250 92)">
        <rect x="0" y="30" width="90" height="48" fill="#b98858"/><path d="M0 30 h90" stroke="#8a6040" stroke-width="2"/>
        <path d="M-12 34 L45 -6 L102 34 Z" fill="#d8b56a"/><path d="M-12 34 L45 -6 L102 34" stroke="#a88641" stroke-width="2" fill="none"/>
        ${[0, 1, 2, 3, 4, 5].map(i => `<path d="M${2 + i * 15} 28 l8 -14" stroke="#b8954f" stroke-width="1.5"/>`).join('')}
        <rect x="34" y="46" width="22" height="32" fill="#5e3f26"/></g>`;
    case 1: return `<g transform="translate(240 88)">
        <rect x="0" y="28" width="104" height="54" fill="#d9c7a8"/><path d="M-8 30 L52 0 L112 30 Z" fill="#9aa6ad"/>
        ${[0, 1, 2, 3, 4, 5, 6].map(i => `<path d="M${-4 + i * 17} 30 L${52} 0" stroke="#7e8a91" stroke-width="1" opacity=".6"/>`).join('')}
        <rect x="14" y="44" width="22" height="18" fill="#7fb7d6"/><path d="M25 44 v18 M14 53 h22" stroke="#fff" stroke-width="1.5"/>
        <rect x="62" y="48" width="22" height="34" fill="#6d4c33"/></g>`;
    case 2: return `<g transform="translate(220 52)">
        <rect x="0" y="0" width="70" height="118" fill="#e6b8a2"/><rect x="70" y="14" width="70" height="104" fill="#c9d6df"/>
        ${[0, 1, 2].map(r => [0, 1].map(c => `<rect x="${10 + c * 30}" y="${12 + r * 32}" width="18" height="20" fill="#86bcd9"/>`).join('') + [0, 1].map(c => `<rect x="${80 + c * 30}" y="${26 + r * 30}" width="18" height="18" fill="#86bcd9"/>`).join('')).join('')}
        <rect x="26" y="96" width="18" height="22" fill="#6d4c33"/></g>`;
    case 3: return `<g transform="translate(225 70)">
        <rect x="0" y="34" width="130" height="66" fill="#f4efe6"/><path d="M-10 36 L65 -8 L140 36 Z" fill="#c4553f"/>
        <rect x="16" y="52" width="26" height="22" fill="#86bcd9" stroke="#fff" stroke-width="3"/><rect x="88" y="52" width="26" height="22" fill="#86bcd9" stroke="#fff" stroke-width="3"/>
        <rect x="54" y="62" width="22" height="38" fill="#7b5233"/><circle cx="71" cy="82" r="1.6" fill="#e9c46a"/>
        <circle cx="-14" cy="80" r="16" fill="#6a994e"/><rect x="-16" y="88" width="4" height="12" fill="#7b5536"/>
        <path d="M-30 100 h190" stroke="#fff" stroke-width="3" stroke-dasharray="4 5"/></g>`;
    default: return `<g transform="translate(200 40)">
        <rect x="0" y="40" width="180" height="90" fill="#fbf7f0"/><rect x="60" y="10" width="60" height="40" fill="#fbf7f0"/>
        <path d="M-8 42 h196 l-12 -14 h-172z" fill="#566573"/><path d="M54 12 h72 l-8 -12 h-56z" fill="#566573"/>
        ${[0, 1, 2, 3, 4].map(i => `<rect x="${12 + i * 34}" y="56" width="20" height="26" fill="#86bcd9" stroke="#e5ddd0" stroke-width="2"/><rect x="${12 + i * 34}" y="92" width="20" height="26" fill="#86bcd9" stroke="#e5ddd0" stroke-width="2"/>`).join('')}
        <rect x="76" y="20" width="28" height="20" fill="#86bcd9"/>
        <rect x="78" y="94" width="24" height="36" fill="#6d4c33"/>
        <rect x="-40" y="118" width="40" height="12" fill="#5fa8d3" opacity=".8"/></g>`;
  }
}

function sceneBgSVG(s, level) {
  const [top, bot, phase] = skyFor(s.age);
  const sand = s.c.reg === 'ME' || s.c.drought;
  const ground = sand ? '#e3c58f' : '#9ccf7a', ground2 = sand ? '#d4b277' : '#86bd63';
  const sunTop = { morning: 42, day: 10, afternoon: 24, sunset: 56 }[phase];
  const sunC = phase === 'sunset' ? '#ffcf70' : '#fff2a8';
  return `<svg class="sky" viewBox="0 0 400 200" preserveAspectRatio="none" aria-hidden="true">
      <defs><linearGradient id="skyg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bot}"/></linearGradient></defs>
      <rect width="400" height="200" fill="url(#skyg)"/>
      <g fill="#fff" opacity=".75"><ellipse cx="150" cy="40" rx="26" ry="8"/><ellipse cx="166" cy="34" rx="16" ry="8"/><ellipse cx="330" cy="28" rx="22" ry="6"/><ellipse cx="344" cy="23" rx="12" ry="6"/></g>
      <path d="M0 150 q100 -24 200 -6 t200 -8 V200 H0z" fill="${ground2}" opacity=".7"/>
      <rect x="0" y="170" width="400" height="30" fill="${ground}"/>
    </svg>
    <svg class="sun" viewBox="0 0 40 40" style="top:${sunTop}%" aria-hidden="true"><circle cx="20" cy="20" r="18" fill="${sunC}"/></svg>
    <svg class="house" viewBox="150 20 245 152" aria-hidden="true">${houseSVG(level)}</svg>`;
}
