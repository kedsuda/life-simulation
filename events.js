// เหตุการณ์ในชีวิต — แต่ละเหตุการณ์เกิดได้ "ครั้งเดียว" ต่อหนึ่งชีวิต (ไม่ซ้ำ)
// a = [อายุต่ำสุด, สูงสุด], w = น้ำหนักโอกาส, cond = เงื่อนไข, heavy = เนื้อหาหนัก (ปิดได้)
// fx: health / happy / know / rel = เปลี่ยนค่าสถานะ, cash = เท่าของรายได้ต่อปี
// force = เกิดแน่นอนเมื่อเข้าเงื่อนไข (เหตุการณ์สำคัญของชีวิต)
// choices = การตัดสินใจ, tag = ใช้กับโหมดอัตโนมัติตามจุดเน้น (study/work/love/health/balance)
// ask = คำถามสั้นที่แสดงเป็นหัวข้อ (t จะกลายเป็นบริบทด้านบน)
// ในแต่ละทางเลือก: cost = s => จำนวนเงินที่จ่าย (PPP$/ปี) แสดงบนปุ่ม, need = s => เลือกได้ไหม, h = คำใบ้เพิ่มเติม, money = ชื่อในบันทึกการเงิน

const poorC = s => s.c.gdp < 8;
const richC = s => s.c.gdp >= 35;
const working = s => !!s.f.job;

const EVENTS = [
  // ───── วัยเด็ก ─────
  { id: 'steps', a: [1, 1], w: 3, t: 'คุณเดินก้าวแรกได้ แล้วล้มลงหัวเราะ', fx: { happy: 3 } },
  { id: 'word', a: [1, 2], w: 3, t: s => `คุณพูดคำแรกได้ — "${s.f.family === 'grand' ? 'ยาย' : 'แม่'}" ทุกคนในบ้านยิ้มกว้าง`, fx: { rel: 4, happy: 3 } },
  { id: 'vaccine', a: [0, 2], w: 4, cond: s => !poorC(s) || s.q >= 2, t: 'คุณได้รับวัคซีนครบตามเกณฑ์', fx: { health: 6 } },
  { id: 'novaccine', a: [0, 2], w: 4, cond: s => poorC(s) && s.q <= 1, t: 'สถานีอนามัยที่ใกล้ที่สุดอยู่ไกลเกินไป คุณได้รับวัคซีนไม่ครบ', fx: { health: -6 } },
  { id: 'fever', a: [0, 5], w: 3, t: 'คุณป่วยเป็นไข้สูงหลายวัน แม่นั่งเฝ้าทั้งคืน', fx: { health: -7, rel: 2 } },
  { id: 'malaria', a: [0, 14], w: 4, cond: s => s.c.reg === 'AF' && s.c.gdp < 10, t: 'ยุงก้นปล่องกัด คุณติดเชื้อมาลาเรีย', fx: { health: -12 } },
  { id: 'diarrhea', a: [0, 4], w: 3, cond: s => poorC(s) && s.q <= 2, t: 'น้ำดื่มไม่สะอาดทำให้คุณท้องร่วงอย่างหนัก', fx: { health: -9 } },
  { id: 'hunger', a: [1, 6], w: 4, cond: s => s.q === 0 && s.c.gdp < 12, t: 'ปีนี้อาหารในบ้านไม่พอ คุณผอมลงและป่วยบ่อย', fx: { health: -10, know: -2 } },
  { id: 'sibling', a: [1, 8], w: 2, cond: s => s.f.sibs < 4 && s.f.family !== 'grand', t: '', fx: { rel: 3 }, apply: s => { s.f.sibs++; const m = famAddSibling(s); return `คุณได้${m.g === 'M' ? 'น้องชาย' : 'น้องสาว'}คนใหม่ชื่อ ${m.name} บ้านแออัดขึ้นอีกนิด แต่ก็อบอุ่นขึ้น`; } },
  { id: 'story', a: [3, 9], w: 2, t: 'ผู้ใหญ่ในบ้านเล่านิทานให้ฟังก่อนนอนทุกคืน', fx: { happy: 4, know: 3 } },
  { id: 'toy', a: [2, 7], w: 2, cond: s => s.q >= 3, t: 'คุณได้ของเล่นชิ้นที่ฝันถึงในวันเกิด', fx: { happy: 4 } },
  { id: 'citymove', a: [3, 14], w: 1.5, cond: s => s.c.gdp < 30, t: 'ครอบครัวย้ายเข้าเมืองเพื่อหางานทำ คุณต้องจากเพื่อนบ้านเก่า', fx: { rel: -4, know: 3 } },
  { id: 'divorce_parents', a: [4, 16], w: 1.5, cond: s => s.f.family === 'both', t: 'พ่อแม่ของคุณแยกทางกัน', fx: { happy: -10, rel: -3 }, apply: s => { s.f.family = 'single'; } },
  { id: 'pet', a: [5, 70], w: 1.5, t: 'คุณรับเลี้ยงลูกหมาจรจัดตัวหนึ่ง มันเดินตามคุณทุกที่', fx: { happy: 6, health: 1 } },

  // ───── วัยเรียน ─────
  { id: 'friend', a: [6, 12], w: 3, t: 'คุณได้เพื่อนสนิทคนแรก', fx: { rel: 8, happy: 5 } },
  { id: 'teacher', a: [6, 16], w: 2.5, cond: s => s.f.school, t: 'ครูคนหนึ่งเห็นแววในตัวคุณ และคอยสอนพิเศษให้ฟรี', fx: { know: 8, happy: 3 } },
  { id: 'library', a: [7, 16], w: 2, cond: s => s.f.school, t: 'คุณค้นพบห้องสมุด และอ่านหนังสือจนลืมเวลา', fx: { know: 6 } },
  { id: 'topclass', a: [9, 17], w: 2, cond: s => s.f.school && s.st.know > 55, t: 'คุณสอบได้ที่หนึ่งของห้อง', fx: { know: 4, happy: 5 } },
  { id: 'childwork', a: [7, 14], w: 4, cond: s => s.q <= 1 && s.c.gdp < 12, t: 'คุณต้องช่วยพ่อแม่ทำงานหาเงินหลังเลิกเรียน (หรือแทนการไปเรียน)', fx: { know: -4, health: -3, cash: 0.05 } },
  { id: 'phone', a: [9, 16], w: 2, cond: s => s.c.gdp > 8 || s.q >= 3, t: 'คุณได้โทรศัพท์มือถือเครื่องแรก โลกทั้งใบอยู่ในมือ', fx: { happy: 3, rel: 2, know: 1 } },
  { id: 'crush', a: [12, 17], w: 2, t: 'คุณแอบชอบใครบางคนเป็นครั้งแรก หัวใจเต้นแรงทุกครั้งที่เดินสวนกัน', fx: { happy: 4 } },
  {
    id: 'bully', a: [7, 15], w: 2, cond: s => s.f.school && s.st.rel < 60, t: 'คุณถูกกลุ่มเพื่อนกลั่นแกล้งที่โรงเรียน',
    choices: [
      { l: 'บอกครูหรือผู้ใหญ่', tag: 'balance', t: 'ผู้ใหญ่เข้ามาช่วย เรื่องค่อยๆ ดีขึ้น', fx: { happy: -2, rel: 2 } },
      { l: 'สู้กลับ', tag: 'health', t: 'คุณสู้กลับ ถูกเรียกพบผู้ปกครอง แต่ไม่มีใครกล้าแกล้งอีก', fx: { happy: -3, rel: -2, health: -2 } },
      { l: 'เงียบและทนไป', tag: 'study', t: 'คุณเก็บทุกอย่างไว้คนเดียว มันหนักกว่าที่คิด', fx: { happy: -9, rel: -4 } },
    ],
  },
  {
    id: 'dropout', a: [11, 15], w: 5, cond: s => s.f.school && s.q <= 1 && s.c.gdp < 18, t: 'ที่บ้านขัดสนเงิน พ่อแม่ถามว่าคุณจะออกจากโรงเรียนมาช่วยทำงานไหม',
    choices: [
      { l: 'ขอเรียนต่อ', tag: 'study', t: 'คุณเรียนต่อ แม้ที่บ้านจะต้องรัดเข็มขัด', fx: { know: 5, happy: -2, cash: -0.05 } },
      { l: 'ออกมาช่วยทำงาน', tag: 'work', t: 'คุณออกจากโรงเรียนและเริ่มทำงาน', fx: { know: -3, cash: 0.1, rel: 3 }, apply: s => { s.f.school = false; s.f.eduEnd = s.age; } },
    ],
  },
  {
    id: 'sport', a: [8, 17], w: 2, t: 'โรงเรียน/ชุมชนเปิดรับสมัครนักกีฬา',
    choices: [
      { l: 'สมัครเลย', tag: 'health', t: 'คุณซ้อมทุกเย็น ร่างกายแข็งแรงขึ้น เพื่อนก็เยอะขึ้น', fx: { health: 6, rel: 4, know: -1 } },
      { l: 'ขอผ่าน', tag: 'study', t: 'คุณใช้เวลานั้นอ่านหนังสือแทน', fx: { know: 2 } },
    ],
  },
  {
    id: 'hobby', a: [10, 19], w: 2, t: 'คุณอยากลองงานอดิเรกใหม่สักอย่าง',
    choices: [
      { l: 'เล่นดนตรี', tag: 'balance', t: 'คุณเริ่มเล่นกีตาร์ นิ้วเจ็บแต่ใจฟู', fx: { happy: 6 } },
      { l: 'วาดรูป', tag: 'love', t: 'สมุดวาดรูปของคุณเต็มเล่มแรก', fx: { happy: 4, know: 2 } },
      { l: 'เขียนโค้ด', tag: 'study', t: 'คุณเขียนโปรแกรมแรกได้สำเร็จ', fx: { know: 6 } },
    ],
  },
  {
    id: 'smoke', a: [13, 22], w: 2, t: 'เพื่อนยื่นบุหรี่ให้คุณลองสูบ',
    choices: [
      { l: 'ลองดู', tag: 'love', t: 'คุณลองสูบ แล้วก็ติดมันไปโดยไม่รู้ตัว', fx: { rel: 2, health: -6 }, apply: s => { s.f.smoker = true; } },
      { l: 'ปฏิเสธ', tag: 'health', t: 'คุณปฏิเสธ เพื่อนแซวนิดหน่อยแต่ก็ไม่ว่าอะไร', fx: { health: 1 } },
    ],
  },
  { id: 'earlymarry', a: [14, 17], w: 6, heavy: true, cond: s => s.g === 'F' && s.c.gdp < 7 && s.q <= 1 && !s.f.married, t: 'ครอบครัวจัดการให้คุณแต่งงานตั้งแต่อายุยังน้อย และคุณต้องออกจากโรงเรียน', fx: { happy: -10, know: -3 }, apply: s => { const p = famAddPartner(s, rnd(5, 15)); s.f.married = true; s.f.leftHome = true; s.f.school = false; s.f.eduEnd = s.f.eduEnd || s.age; return `ครอบครัวจัดการให้คุณแต่งงานกับ ${p.name} ซึ่งอายุ ${p.age} ปี ตั้งแต่คุณยังเด็ก และคุณต้องออกจากโรงเรียน`; } },

  // ───── วัยหนุ่มสาว ─────
  {
    id: 'uni', a: [17, 19], w: 1, force: true, cond: s => s.f.school && s.f.eduLevel >= 2 && !s.f.uniAsked, t: 'คุณเรียนจบมัธยมปลาย ขั้นต่อไปจะเป็นอะไร?',
    apply: s => { s.f.uniAsked = true; },
    choices: [
      { l: 'เรียนมหาวิทยาลัย', tag: 'study', t: null, apply: s => {
        const canAfford = s.q >= 3 || s.c.gdp > 40 || Math.random() < 0.35 + s.st.know / 200;
        s.f.uni = true; s.f.eduEnd = s.age + 4;
        if (canAfford) return 'คุณได้เข้าเรียนมหาวิทยาลัย';
        pay(s, -s.base() * 1.2, 'กู้เงินเรียนมหาวิทยาลัย');
        return 'คุณเข้ามหาวิทยาลัยได้ แต่ต้องกู้เงินเรียน — หนี้ก้อนแรกของชีวิต';
      } },
      { l: 'เริ่มทำงานเลย', tag: 'work', t: 'คุณเลือกเริ่มทำงานหาเงินทันที', fx: { cash: 0.1 }, apply: s => { s.f.school = false; s.f.eduEnd = s.age; } },
    ],
  },
  {
    id: 'love1', fam: 1, a: [17, 32], w: 3, cond: s => !s.f.partner, t: 'คุณได้พบใครบางคนที่ทำให้หัวใจเต้นแรง',
    choices: [
      { l: 'เปิดใจ', tag: 'love', t: '', fx: { happy: 8, rel: 8 }, apply: s => { const p = famAddPartner(s); return `คุณกล้าเดินเข้าไปทัก ${p.name} และเรื่องราวของคุณสองคนก็เริ่มต้น`; } },
      { l: 'เก็บไว้ในใจ', tag: 'study', t: 'คุณเก็บความรู้สึกไว้ แล้วโฟกัสกับเป้าหมายของตัวเอง', fx: { know: 2, happy: -2 } },
    ],
  },
  {
    id: 'love2', fam: 1, a: [24, 48], w: 2, cond: s => !s.f.partner, t: 'เพื่อนแนะนำให้คุณรู้จักกับคนคนหนึ่ง คุยกันถูกคออย่างประหลาด',
    choices: [
      { l: 'นัดเจอกันอีก', tag: 'love', t: '', fx: { happy: 7, rel: 7 }, apply: s => { const p = famAddPartner(s); return `นัดครั้งที่สอง สาม สี่... แล้ว ${p.name} ก็กลายเป็นคนข้างกายของคุณ`; } },
      { l: 'ยังไม่พร้อม', tag: 'work', t: 'คุณบอกตัวเองว่ายังไม่ใช่เวลา', fx: { rel: -2 } },
    ],
  },
  { id: 'breakup', a: [16, 40], w: 2, cond: s => s.f.partner && !s.f.married, t: s => `คุณกับ ${famPartner(s)?.name || 'แฟน'} เลิกกัน คืนนั้นยาวนานกว่าทุกคืน`, fx: { happy: -10, rel: -4 }, apply: s => { famRemovePartner(s); } },
  {
    id: 'marry', fam: 1, a: [19, 50], w: 6, cond: s => s.f.partner && !s.f.married, t: s => `${famPartner(s)?.name || 'คนรัก'} ถามว่า "เราแต่งงานกันไหม?"`,
    choices: [
      { l: 'แต่งงาน', tag: 'love', t: 'คุณแต่งงาน ญาติพี่น้องมากันเต็มงาน', fx: { happy: 10, rel: 8, cash: -0.3 }, apply: s => { s.f.married = true; } },
      { l: 'ยังก่อน', tag: 'work', t: 'คุณขอเวลาอีกสักพัก', fx: { rel: -3 } },
    ],
  },
  {
    id: 'baby1', fam: 1, a: [18, 42], w: 6, cond: s => s.f.married && s.f.kids === 0 && (s.kidTarget > 0 || Math.random() < 0.2), t: 'คุณกับคู่ชีวิตคุยกันเรื่องการมีลูก',
    choices: [
      { l: 'มีลูก', tag: 'love', t: '', fx: { happy: 10, rel: 8, health: -2, cash: -0.2 }, apply: s => { const k = famAddChild(s); return `${k.g === 'M' ? 'ลูกชาย' : 'ลูกสาว'}คนแรกของคุณ ${k.name} ลืมตาดูโลก โลกทั้งใบเปลี่ยนไป`; } },
      { l: 'ยังไม่มี', tag: 'work', t: 'คุณตัดสินใจรอไปก่อน', fx: {} },
    ],
  },
  {
    id: 'baby2', fam: 1, a: [20, 44], w: 5, cond: s => s.f.married && s.f.kids === 1 && (s.kidTarget > 1 || Math.random() < 0.2), t: 'มีลูกอีกคนดีไหม?',
    choices: [
      { l: 'มีอีกคน', tag: 'love', t: '', fx: { happy: 6, rel: 6, cash: -0.2 }, apply: s => { const k = famAddChild(s); return `${k.g === 'M' ? 'ลูกชาย' : 'ลูกสาว'}คนที่สอง ${k.name} เกิดมา บ้านเสียงดังขึ้นเป็นสองเท่า`; } },
      { l: 'พอแล้ว', tag: 'work', t: 'คุณทุ่มเทให้ลูกคนเดียวเต็มที่', fx: {} },
    ],
  },
  { id: 'baby3', fam: 1, a: [22, 45], w: 5, cond: s => s.f.married && s.f.kids >= 2 && s.f.kids < s.kidTarget, t: '', fx: { happy: 4, rel: 4, cash: -0.2 }, apply: s => { const k = famAddChild(s); return `${k.name} ลูกอีกคนเกิดมา — ที่นี่ครอบครัวใหญ่คือเรื่องปกติ`; } },
  { id: 'maternal', a: [18, 42], w: 3, heavy: true, cond: s => s.g === 'F' && s.f.kids > 0 && s.c.gdp < 8, t: 'การคลอดครั้งนั้นมีภาวะแทรกซ้อนรุนแรง คุณรอดมาได้อย่างหวุดหวิด', fx: { health: -15 } },
  {
    id: 'migrate', a: [19, 40], w: 3, cond: s => s.c.gdp < 25 && !s.f.migrant, t: 'มีโอกาสไปทำงานต่างประเทศ รายได้มากกว่าที่บ้านหลายเท่า',
    choices: [
      { l: 'ไป', tag: 'work', t: 'คุณเก็บกระเป๋าไปทำงานต่างแดน คิดถึงบ้านทุกคืน แต่ส่งเงินกลับบ้านได้', fx: { rel: -8, happy: -2 }, apply: s => { s.f.migrant = true; s.f.leftHome = true; if (s.money.income) s.money.income *= 2.5; } },
      { l: 'อยู่ที่บ้าน', tag: 'love', t: 'คุณเลือกอยู่ใกล้คนที่รัก', fx: { rel: 4 } },
    ],
  },
  { id: 'promo', a: [25, 58], w: 3, cond: s => working(s) && s.st.know > 45, t: 'คุณได้เลื่อนตำแหน่ง', fx: { happy: 6 }, apply: s => { s.money.income *= 1.3; } },
  { id: 'laidoff', a: [22, 60], w: 2, cond: working, t: 'บริษัทปลดพนักงาน คุณตกงาน', fx: { happy: -10 }, apply: s => { s.f.job = null; s.money.income = 0; } },
  {
    id: 'startup', a: [24, 50], w: 2, cond: s => s.money.savings > s.base() * 0.5, t: 'คุณมีไอเดียธุรกิจที่คิดว่าใช่ จะลาออกมาทำเองไหม?',
    choices: [
      { l: 'ลุยเลย', tag: 'work', t: null, apply: s => {
        if (Math.random() < 0.35 + s.st.know / 400) { s.money.income = Math.max(s.money.income, s.base()) * 2.2; s.add({ happy: 10 }); s.f.job = 'เจ้าของกิจการ'; return 'ธุรกิจของคุณไปได้สวย คุณกลายเป็นเจ้าของกิจการ'; }
        pay(s, -s.money.savings * 0.8, 'ธุรกิจล้มเหลว'); s.add({ happy: -10 }); return 'ธุรกิจล้มเหลว เงินเก็บเกือบทั้งหมดหายไป แต่คุณได้บทเรียนราคาแพง';
      } },
      { l: 'อยู่ที่เดิม', tag: 'balance', t: 'คุณเลือกความมั่นคง', fx: { happy: -1 } },
    ],
  },
  {
    id: 'burnout', a: [24, 58], w: 2, cond: working, t: 'คุณทำงานหนักจนรู้สึกหมดไฟ',
    choices: [
      { l: 'พักสักระยะ', tag: 'health', t: 'คุณลาพัก กลับมาพร้อมใจที่เบาขึ้น', fx: { health: 5, happy: 5, cash: -0.15 } },
      { l: 'ฝืนต่อไป', tag: 'work', t: 'คุณกัดฟันทำต่อ เงินดีขึ้น แต่ร่างกายเริ่มประท้วง', fx: { health: -7, happy: -4, cash: 0.2 } },
    ],
  },
  {
    id: 'course', a: [20, 60], w: 2, t: 'มีคอร์สเรียนเพิ่มทักษะเปิดรับสมัคร',
    choices: [
      { l: 'สมัครเรียน', tag: 'study', t: 'คุณเรียนจบคอร์สและได้ทักษะใหม่', fx: { know: 7, cash: -0.05 } },
      { l: 'ไว้คราวหน้า', tag: 'balance', t: 'คุณผ่านมันไป', fx: {} },
    ],
  },
  {
    id: 'travel', a: [20, 70], w: 2, cond: s => s.money.savings > s.base() * 0.3, t: 'คุณมีเงินเก็บพอจะไปเที่ยวต่างประเทศครั้งแรก',
    choices: [
      { l: 'ไปเลย', tag: 'love', t: 'คุณได้เห็นโลกกว้าง และกลับมามองบ้านด้วยสายตาใหม่', fx: { happy: 8, know: 2, cash: -0.2 } },
      { l: 'เก็บเงินไว้', tag: 'work', t: 'คุณเลือกเก็บเงินไว้ก่อน', fx: {} },
    ],
  },
  {
    id: 'volunteer', a: [16, 75], w: 1.5, t: 'ชุมชนของคุณต้องการอาสาสมัคร',
    choices: [
      { l: 'ไปช่วย', tag: 'love', t: 'คุณได้ช่วยคนอื่น และได้เพื่อนใหม่หลายคน', fx: { rel: 6, happy: 5 } },
      { l: 'ไม่ว่าง', tag: 'work', t: 'คุณมีเรื่องของตัวเองต้องจัดการ', fx: {} },
    ],
  },
  {
    id: 'house', a: [26, 60], w: 3, cond: s => independent(s) && !s.f.house && s.money.savings > housePrice(s) * 0.15, t: s => `มีบ้านหลังหนึ่งราคา ${fmtBaht(housePrice(s))} เงินเก็บของคุณพอจ่ายเงินดาวน์แล้ว`, ask: 'จะผ่อนซื้อบ้านไหม?',
    choices: [
      { l: 'ดาวน์ 15% แล้วผ่อน 25 ปี', tag: 'love', h: 'ทุกปีต้องผ่อน แต่บ้านเป็นของคุณ', cost: s => housePrice(s) * 0.15, money: 'เงินดาวน์บ้าน', fx: { happy: 8 }, t: null, apply: s => buyHouse(s, 0.85, 25) },
      { l: 'จ่ายสดทั้งหลัง', tag: 'work', need: s => s.money.savings >= housePrice(s), cost: s => housePrice(s), money: 'ซื้อบ้าน (จ่ายสด)', fx: { happy: 9 }, t: null, apply: s => buyHouse(s, 0, 1) },
      { l: 'เช่าต่อไป', tag: 'balance', t: 'คุณเลือกเช่าต่อ และเก็บเงินไว้ลงทุน', fx: {} },
    ],
  },
  { id: 'debt', a: [20, 55], w: 3, cond: s => s.q <= 1, t: 'คุณกู้เงินนอกระบบมาใช้จ่ายในบ้าน ดอกเบี้ยพอกพูนเร็วกว่าที่คิด', fx: { cash: -0.4, happy: -6 } },
  { id: 'lottery', a: [18, 85], w: 1, t: 'คุณถูกลอตเตอรี่รางวัลเล็กๆ', fx: { cash: 0.3, happy: 5 } },
  { id: 'inherit', a: [30, 70], w: 2, cond: s => s.q >= 3, t: 'คุณได้รับมรดกจากญาติผู้ใหญ่', fx: { cash: 2 } },
  { id: 'reunion', a: [25, 75], w: 1.5, t: 'งานเลี้ยงรุ่นทำให้คุณได้เจอเพื่อนเก่าอีกครั้ง', fx: { rel: 5, happy: 4 } },
  { id: 'accident', a: [16, 65], w: 1.5, heavy: true, t: 'คุณประสบอุบัติเหตุทางถนน บาดเจ็บสาหัส', fx: { health: -18, happy: -5 } },
  { id: 'divorce', a: [26, 65], w: 1.5, cond: s => s.f.married, t: s => `คุณกับ ${famPartner(s)?.name || 'คู่ชีวิต'} ตัดสินใจหย่าร้าง`, fx: { happy: -9, rel: -6, cash: -0.5 }, apply: s => { famRemovePartner(s); } },
  {
    id: 'ai', a: [16, 70], w: 1.5, t: 'AI เปลี่ยนวิธีทำงานในอาชีพของคุณไปอย่างสิ้นเชิง',
    choices: [
      { l: 'เรียนรู้และปรับตัว', tag: 'study', t: 'คุณใช้มันเป็นเครื่องมือ และทำงานได้เร็วขึ้น', fx: { know: 5 } },
      { l: 'ต่อต้านมัน', tag: 'balance', t: 'คุณยึดวิธีเดิม รู้สึกว่าโลกหมุนเร็วเกินไป', fx: { happy: -3 } },
    ],
  },
  {
    id: 'exercise', a: [25, 65], w: 2, t: 'หมอแนะนำให้คุณออกกำลังกายสม่ำเสมอ',
    choices: [
      { l: 'เริ่มวิ่งตอนเช้า', tag: 'health', t: 'คุณวิ่งทุกเช้า ร่างกายขอบคุณ', fx: { health: 8, happy: 2 } },
      { l: 'ไว้ก่อนนะ', tag: 'work', t: 'คุณบอกว่าเดี๋ยวค่อยเริ่ม', fx: { health: -2 } },
    ],
  },
  {
    id: 'quitsmoke', a: [28, 65], w: 5, cond: s => s.f.smoker, t: 'คุณเริ่มไอเรื้อรัง หมอบอกให้เลิกบุหรี่',
    choices: [
      { l: 'เลิกให้ได้', tag: 'health', t: 'สามเดือนที่ทรมาน แต่คุณเลิกได้', fx: { health: 8, happy: -3 }, apply: s => { s.f.smoker = false; } },
      { l: 'ยังเลิกไม่ได้', tag: 'balance', t: 'คุณสูบต่อไป', fx: { health: -5 } },
    ],
  },


  { id: 'baby4', fam: 1, a: [24, 46], w: 5, cond: s => s.f.married && s.f.kids >= 3 && s.f.kids < s.kidTarget, t: '', fx: { happy: 3, rel: 3, cash: -0.2, health: -2 }, apply: s => { const k = famAddChild(s); return `${k.name} ลูกคนที่ ${s.f.kids} เกิดมา บ้านไม่เคยเงียบอีกเลย`; } },
  { id: 'baby5', fam: 1, a: [26, 47], w: 5, cond: s => s.f.married && s.f.kids >= 4 && s.f.kids < s.kidTarget, t: '', fx: { happy: 2, rel: 2, cash: -0.2, health: -3 }, apply: s => { const k = famAddChild(s); return `ลูกคนเล็ก ${k.name} มาเติมเต็มบ้านหลังนี้ — ลูกทั้งหมด ${s.f.kids} คน`; } },
  {
    id: 'love3', fam: 1, a: [30, 65], w: 2, cond: s => !s.f.partner, t: 'หลังจากผ่านอะไรมามากมาย คุณได้พบใครบางคนที่ทำให้ใจกลับมาเต้นอีกครั้ง',
    choices: [
      { l: 'ให้โอกาสความรักอีกครั้ง', tag: 'love', t: '', fx: { happy: 8, rel: 6 }, apply: s => { const p = famAddPartner(s); return `คุณกับ ${p.name} เริ่มต้นบทใหม่ด้วยกัน`; } },
      { l: 'อยู่คนเดียวก็มีความสุขได้', tag: 'work', t: 'คุณเลือกใช้ชีวิตในแบบของตัวเอง', fx: { happy: 1 } },
    ],
  },
  { id: 'adopt', fam: 1, a: [30, 50], w: 1, cond: s => s.f.married && s.f.kids === 0 && s.kidTarget > 0, t: '', fx: { happy: 9, rel: 6, cash: -0.3 }, apply: s => { const k = famAddChild(s); k.age = Math.floor(rnd(1, 6)); return `คุณรับ ${k.name} อายุ ${k.age} ขวบ มาเป็นลูกบุญธรรม`; } },
  { id: 'familytrip', a: [28, 70], w: 1.5, cond: s => s.f.kids > 0 && s.money.savings > s.base() * 0.2, t: 'ทั้งครอบครัวไปเที่ยวทะเลด้วยกันเป็นครั้งแรก รูปถ่ายวันนั้นติดอยู่บนตู้เย็นอีกหลายสิบปี', fx: { happy: 7, rel: 6, cash: -0.15 } },
  { id: 'siblingfight', a: [6, 16], w: 1.5, cond: s => s.fam.some(m => m.role === 'sibling' && m.alive), t: s => `คุณทะเลาะกับ${s.fam.find(m => m.role === 'sibling' && m.alive).name}เรื่องรีโมททีวี แล้วก็คืนดีกันก่อนนอน`, fx: { rel: 2, happy: 1 } },
  { id: 'momcook', a: [3, 12], w: 1.5, cond: s => s.fam.some(m => (m.role === 'mother' || m.role === 'grandma') && m.alive), t: s => { const m = s.fam.find(x => (x.role === 'mother' || x.role === 'grandma') && x.alive); return `${roleLabel(s, m)}${m.name}สอนคุณทำอาหารจานแรก รสชาติที่คุณจะคิดถึงไปตลอดชีวิต`; }, fx: { happy: 4, rel: 4, know: 1 } },

  // ───── วัยกลางคน-สูงวัย ─────
  {
    id: 'diabetes', a: [35, 85], w: 2, cond: s => s.st.health < 65, t: 'หมอบอกว่าคุณเป็นเบาหวาน',
    choices: [
      { l: 'ไปหาหมอและปรับการกินอย่างจริงจัง', tag: 'health', cost: s => medCost(s, 0.12), money: 'ค่ารักษาเบาหวาน', t: 'คุณเลิกน้ำหวาน ค่าน้ำตาลเริ่มคงที่', fx: { health: 4, happy: -2 } },
      { l: 'ช่างมัน', tag: 'balance', t: 'คุณกินเหมือนเดิม', fx: { health: -8, happy: 2 } },
    ],
  },
  { id: 'heart', a: [42, 85], w: 2, t: 'คุณเจ็บหน้าอกกลางดึกจนต้องรีบไปโรงพยาบาล', fx: { health: -12, happy: -3 }, apply: s => { pay(s, -medCost(s, 0.5), 'ค่ารักษาฉุกเฉิน'); } },
  {
    id: 'cancer', a: [40, 90], w: 1.5, heavy: true, t: 'ผลตรวจพบว่าคุณเป็นมะเร็ง',
    choices: [
      { l: 'รักษาเต็มที่', tag: 'health', t: null, cost: s => medCost(s, 2.5), money: 'ค่ารักษามะเร็ง', apply: s => {
        const ok = Math.random() < 0.25 + s.c.gdp / 140 + s.q * 0.06 + (s.f.checkedAt >= s.age - 2 ? 0.15 : 0);
        if (ok) { s.add({ health: -8 }); return 'การรักษายาวนานและเหนื่อยล้า แต่คุณหายดี'; }
        s.add({ health: -25 }); return 'คุณรักษาเต็มที่ แต่โรคยังลุกลาม';
      } },
      { l: 'รักษาแบบประคับประคอง', tag: 'love', t: 'คุณเลือกใช้เวลาที่เหลือกับคนที่รัก', fx: { health: -22, rel: 6, happy: 2 } },
    ],
  },
  { id: 'grandkid', fam: 1, a: [42, 85], w: 4, cond: s => s.fam.some(m => m.role === 'child' && m.alive && m.age >= 20), t: '', fx: { happy: 10, rel: 6 }, apply: s => { const g = famAddGrandchild(s); return `คุณได้เป็นปู่ย่าตายายแล้ว! หลานคนแรกชื่อ ${g.name}`; } },
  { id: 'kidgrad', a: [38, 70], w: 3, cond: s => s.c.gdp > 6 && s.fam.some(m => m.role === 'child' && m.alive && m.age >= 21), t: s => `${s.fam.find(m => m.role === 'child' && m.alive && m.age >= 21).name} ลูกของคุณเรียนจบ คุณยิ้มอยู่หลังห้องประชุมทั้งวัน`, fx: { happy: 8 } },
  {
    id: 'retire', a: [60, 68], w: 1, force: true, cond: s => working(s) && s.c.gdp > 15 && !s.f.retired, t: s => `คุณอายุ ${s.age} แล้ว เพื่อนร่วมรุ่นหลายคนเริ่มเกษียณกันไป`, ask: 'เกษียณดีไหม?',
    choices: [
      { l: 'เกษียณเลย', tag: 'health', h: 'รายได้เหลือเป็นบำนาญราว 40%', t: 'เป็นครั้งแรกในรอบหลายสิบปีที่ไม่ต้องตั้งนาฬิกาปลุก', fx: { happy: 5, health: 2 }, apply: s => { s.f.retired = true; s.f.job = null; s.money.income *= 0.4; } },
      { l: 'ทำงานต่ออีกห้าปี', tag: 'work', h: 'ได้เงินเดือนเต็มต่อไป แต่เหนื่อยขึ้น', t: 'คุณขอต่ออายุงาน เก็บเงินได้อีกก้อน', fx: { health: -3, happy: -1 }, apply: s => { s.f.retireAt = s.age + 5; } },
    ],
  },
  { id: 'retire2', a: [65, 75], w: 1, force: true, cond: s => working(s) && s.f.retireAt && s.age >= s.f.retireAt && !s.f.retired, t: 'คุณเกษียณจากงานหลังทำงานมาทั้งชีวิต เพื่อนร่วมงานจัดงานเลี้ยงส่งให้', fx: { happy: 5 }, apply: s => { s.f.retired = true; s.f.job = null; s.money.income *= 0.45; } },
  { id: 'oldwork', a: [62, 85], w: 4, cond: s => s.c.gdp < 12 && s.q <= 2 && !s.f.retired, t: 'แม้อายุมากแล้ว คุณยังต้องทำงานเลี้ยงชีพ เพราะไม่มีบำนาญ', fx: { health: -4, happy: -3 } },
  { id: 'lonely', a: [65, 105], w: 3, cond: s => s.st.rel < 40, t: 'หลายวันผ่านไปโดยไม่มีใครโทรมาหาคุณเลย', fx: { happy: -7 } },
  { id: 'memory', a: [70, 105], w: 2, t: 'คุณเริ่มลืมชื่อคนรู้จักบ่อยขึ้น', fx: { know: -6, happy: -2 } },
  { id: 'garden', a: [58, 100], w: 2, t: 'คุณเริ่มปลูกต้นไม้หน้าบ้าน เฝ้าดูมันโตทุกเช้า', fx: { happy: 5, health: 2 } },
  { id: 'tellstory', a: [62, 100], w: 2, cond: s => s.f.kids > 0, t: 'หลานขอให้คุณเล่าเรื่องสมัยก่อน คุณเล่าจนพระอาทิตย์ตก', fx: { happy: 6, rel: 4 } },
  { id: 'friendgone', a: [60, 100], w: 2, heavy: true, t: 'เพื่อนสนิทตั้งแต่สมัยเด็กเสียชีวิต', fx: { rel: -5, happy: -7 } },
  { id: 'fall', a: [70, 105], w: 2, t: 'คุณหกล้มในห้องน้ำ สะโพกร้าว', fx: { health: -12 } },

  // ───── การตัดสินใจเรื่องเงิน การเรียน การงาน การย้ายที่อยู่ และการรักษา ─────
  {
    id: 'secondary', a: [12, 12], w: 1, force: true, cond: s => s.f.school && s.q <= 2 && s.c.gdp < 20, t: s => `คุณจบประถมแล้ว แต่ค่าเทอม ค่าชุด และค่าเดินทางไปโรงเรียนมัธยมในเมืองรวมกันราว ${fmtBaht(unitCost(s) * 0.15)} ต่อปี`, ask: 'จะเรียนต่อมัธยมไหม?',
    choices: [
      { l: 'เรียนต่อ', tag: 'study', h: 'ครอบครัวต้องรัดเข็มขัด', t: 'คุณได้ใส่ชุดนักเรียนมัธยม ที่บ้านกินกับข้าวน้อยลงหนึ่งอย่าง', fx: { know: 4, happy: 1, cash: -0.1 } },
      { l: 'ออกมาช่วยที่บ้านทำงาน', tag: 'work', t: 'คุณเก็บสมุดเล่มสุดท้ายไว้ในหีบ แล้วออกไปทำงานกับพ่อแม่', fx: { know: -3, rel: 3, cash: 0.08 }, apply: s => { s.f.school = false; s.f.eduEnd = s.age; } },
    ],
  },
  {
    id: 'exchange', a: [15, 21], w: 1.5, cond: s => s.f.school && s.q >= 2 && s.c.gdp > 8, t: 'โรงเรียนประกาศรับสมัครนักเรียนแลกเปลี่ยนไปต่างประเทศหนึ่งปี', ask: 'ไปเป็นนักเรียนแลกเปลี่ยนดีไหม?',
    choices: [
      { l: 'สมัครไป', tag: 'study', cost: s => unitCost(s) * 0.6, money: 'ค่าใช้จ่ายนักเรียนแลกเปลี่ยน', t: 'หนึ่งปีในประเทศที่ไม่รู้จักใคร คุณกลับมาพร้อมภาษาใหม่และเพื่อนจากอีกซีกโลก', fx: { know: 7, happy: 5, rel: -2 } },
      { l: 'อยู่ที่นี่', tag: 'love', t: 'คุณอยู่กับเพื่อนกลุ่มเดิม', fx: { rel: 2 } },
    ],
  },
  {
    id: 'vocational', a: [16, 30], w: 2, cond: s => s.f.eduLevel < 3 && !s.f.uni && !s.f.vocational, t: 'ศูนย์ฝึกอาชีพเปิดคอร์สช่างไฟ ช่างแอร์ และช่างยนต์ เรียนหกเดือน', ask: 'ลองเรียนวิชาช่างดีไหม?',
    choices: [
      { l: 'สมัครเรียน', tag: 'study', cost: s => unitCost(s) * 0.12, money: 'ค่าเรียนวิชาช่าง', h: 'รายได้ในอนาคต ↑', t: 'คุณได้ใบประกาศฝีมือช่าง และรับงานได้มากขึ้น', fx: { know: 5 }, apply: s => { s.f.vocational = true; if (s.money.income) s.money.income *= 1.15; } },
      { l: 'ไม่ล่ะ', tag: 'balance', t: 'คุณทำงานเดิมต่อไป', fx: {} },
    ],
  },
  {
    id: 'masters', a: [23, 38], w: 2, cond: s => s.f.eduLevel >= 3 && !s.f.masters && !s.f.school, t: 'คุณเรียนจบปริญญาตรีมาได้สักพัก เริ่มรู้สึกว่าอยากรู้ลึกกว่านี้', ask: 'จะเรียนต่อปริญญาโทไหม?',
    choices: [
      { l: 'เรียนภาคค่ำ ทำงานไปด้วย', tag: 'study', cost: s => unitCost(s) * 0.8, money: 'ค่าเทอมปริญญาโท', h: 'รายได้ในอนาคต ↑', t: 'สองปีที่แทบไม่ได้นอน แต่คุณได้ปริญญาโท', fx: { know: 9, health: -3, rel: -2 }, apply: s => { s.f.masters = true; if (s.money.income) s.money.income *= 1.2; } },
      { l: 'ขอทุนเรียน', tag: 'study', h: 'ได้ไม่ได้ขึ้นกับความรู้', t: null, apply: s => {
        if (Math.random() < s.st.know / 130) { s.f.masters = true; s.add({ know: 9, happy: 6 }); if (s.money.income) s.money.income *= 1.2; return 'คุณได้ทุนเต็มจำนวน ไม่ต้องจ่ายสักบาท'; }
        s.add({ happy: -3 }); return 'คุณไม่ได้ทุน ปีนี้เลยยังไม่ได้เรียน';
      } },
      { l: 'ไม่เรียนต่อ', tag: 'work', t: 'คุณทุ่มเวลาให้งานแทน', fx: {} },
    ],
  },
  {
    id: 'cityjob', a: [18, 40], w: 2.5, cond: s => s.c.gdp < 40 && !s.f.city && !s.f.migrant, t: 'ญาติที่ไปทำงานในเมืองใหญ่บอกว่าที่นั่นค่าแรงดีกว่ามาก แต่ค่าเช่าห้องก็แพงกว่ามากเหมือนกัน', ask: 'ย้ายไปอยู่ในเมืองดีไหม?',
    choices: [
      { l: 'ย้ายเข้าเมือง', tag: 'work', h: 'รายได้ ↑ ค่าครองชีพ ↑', t: 'คุณเช่าห้องเล็ก ๆ ใกล้ที่ทำงาน ชีวิตเร็วขึ้นทุกอย่าง', fx: { rel: -4, know: 2 }, apply: s => { s.f.city = true; s.f.leftHome = true; if (s.money.income) s.money.income *= 1.4; else findJob(s); } },
      { l: 'อยู่บ้านเกิด', tag: 'love', t: 'คุณอยู่ใกล้ครอบครัวต่อไป', fx: { rel: 3 } },
    ],
  },
  {
    id: 'rural', a: [45, 72], w: 1.5, cond: s => s.f.city || s.f.migrant, t: 'คุณเริ่มเหนื่อยกับรถติดและเสียงดังของเมือง บ้านเก่าที่ต่างจังหวัดยังว่างอยู่', ask: 'ย้ายไปอยู่ชนบทดีไหม?',
    choices: [
      { l: 'ย้ายกลับไป', tag: 'health', h: 'ค่าครองชีพ ↓ รายได้ ↓', t: 'อากาศดีขึ้น เพื่อนบ้านรู้จักชื่อคุณ แต่รายได้ก็น้อยลง', fx: { health: 5, happy: 4, rel: 4 }, apply: s => { s.f.city = false; s.f.rural = true; if (s.f.migrant) { s.f.migrant = false; s.money.income /= 2.5; } else if (s.money.income && !s.f.retired) s.money.income *= 0.75; } },
      { l: 'อยู่ในเมืองต่อ', tag: 'work', t: 'คุณยังไม่พร้อมจะทิ้งงานและความสะดวกสบาย', fx: {} },
    ],
  },
  {
    id: 'sidejob', a: [22, 58], w: 2, cond: s => working(s) && !s.f.sidejob, t: 'เพื่อนชวนรับงานเสริมช่วงเย็นและวันหยุด', ask: 'หางานเพิ่มดีไหม?',
    choices: [
      { l: 'รับงานเสริม', tag: 'work', h: 'รายได้ ↑', t: 'คุณมีรายได้เพิ่ม แต่วันหยุดหายไปเกือบหมด', fx: { health: -3, rel: -3, happy: -1 }, apply: s => { s.f.sidejob = true; s.money.income *= 1.18; } },
      { l: 'เก็บเวลาไว้กับครอบครัว', tag: 'love', t: 'คุณเลือกเวลามากกว่าเงิน', fx: { rel: 3, happy: 2 } },
    ],
  },
  {
    id: 'vehicle', a: [19, 45], w: 2.5, cond: s => independent(s) && !s.f.vehicle, t: 'การเดินทางไปทำงานทุกวันกินเวลาชั่วโมงกว่า ร้านรถแถวบ้านมีโปรผ่อนดาวน์ต่ำ', ask: 'จะผ่อนซื้อรถไหม?',
    choices: [
      { l: 'มอเตอร์ไซค์มือสอง', tag: 'work', cost: s => unitCost(s) * 0.25, money: 'ซื้อมอเตอร์ไซค์', h: 'ไปไหนมาไหนสะดวก แต่เสี่ยงอุบัติเหตุ', t: 'คุณขี่มอเตอร์ไซค์ไปทำงาน ประหยัดเวลาได้วันละชั่วโมง', fx: { happy: 4 }, apply: s => { s.f.vehicle = 'moto'; } },
      { l: 'ผ่อนรถยนต์', tag: 'love', need: s => s.money.savings > unitCost(s) * 0.4, cost: s => unitCost(s) * 1.4, money: 'ค่ารถยนต์และดอกเบี้ย', t: 'คุณขับรถคันแรกของตัวเองพาครอบครัวไปเที่ยว', fx: { happy: 6, rel: 2 }, apply: s => { s.f.vehicle = 'car'; } },
      { l: 'ใช้รถสาธารณะต่อไป', tag: 'balance', t: 'คุณนั่งรถเมล์ต่อไป อ่านหนังสือระหว่างทาง', fx: { know: 1 } },
    ],
  },
  { id: 'motocrash', a: [19, 70], w: 3, heavy: true, cond: s => s.f.vehicle === 'moto', t: 'รถเก๋งเลี้ยวตัดหน้า มอเตอร์ไซค์ของคุณล้มกลางถนน', fx: { health: -14, happy: -4 }, apply: s => { pay(s, -medCost(s, 0.4), 'ค่ารักษาอุบัติเหตุ'); } },
  {
    id: 'lend', a: [24, 70], w: 2, cond: s => s.money.savings > unitCost(s) * 0.3, t: s => `ญาติคนหนึ่งมาขอยืมเงิน ${fmtBaht(unitCost(s) * 0.3)} บอกว่าจะคืนภายในปีหน้า`, ask: 'จะให้ยืมไหม?',
    choices: [
      { l: 'ให้ยืมทั้งหมด', tag: 'love', cost: s => unitCost(s) * 0.3, money: 'ให้ญาติยืมเงิน', t: null, fx: { rel: 4 }, apply: s => { if (Math.random() < 0.45) { pay(s, unitCost(s) * 0.3, 'ญาติคืนเงิน'); return 'ปีต่อมาเขาเอาเงินมาคืนครบ พร้อมขนมหนึ่งถุง'; } return 'เงินก้อนนั้นไม่เคยกลับมา แต่คุณก็ไม่ได้ทวง'; } },
      { l: 'ให้ครึ่งเดียวแบบไม่ต้องคืน', tag: 'balance', cost: s => unitCost(s) * 0.15, money: 'ช่วยเงินญาติ', t: 'คุณบอกว่าไม่ต้องคืน เขาจับมือคุณแน่น', fx: { rel: 3, happy: 1 } },
      { l: 'ปฏิเสธ', tag: 'work', t: 'คุณปฏิเสธไป บรรยากาศในงานรวมญาติครั้งต่อไปอึดอัดนิดหน่อย', fx: { rel: -4 } },
    ],
  },
  {
    id: 'scam', a: [25, 85], w: 2, cond: s => s.money.savings > unitCost(s) * 0.2, t: 'มีคนในกลุ่มไลน์ชวนลงทุน "ผลตอบแทนเดือนละ 10% การันตีไม่ขาดทุน" เพื่อนบางคนบอกว่าได้เงินจริง', ask: 'จะลองลงเงินไหม?',
    choices: [
      { l: 'ลองลงสักก้อน', tag: 'work', cost: s => Math.min(s.money.savings, unitCost(s) * 0.5), money: 'ลงทุนกับแชร์ลูกโซ่', t: 'สองเดือนแรกได้เงินจริง เดือนที่สามกลุ่มไลน์หายไปพร้อมเงินทั้งหมด', fx: { happy: -7 } },
      { l: 'ไม่สนใจ', tag: 'balance', t: 'คุณกดออกจากกลุ่ม ผลตอบแทนที่ดีเกินจริงมักไม่จริง', fx: { know: 1 } },
    ],
  },
  {
    id: 'lotto', a: [18, 85], w: 1.5, t: 'คนขายลอตเตอรี่หน้าตลาดยื่นเลขสวยให้ดู บอกว่างวดนี้ต้องออกแน่', ask: 'ลองซื้อลอตเตอรี่ดีไหม?',
    choices: [
      { l: 'ซื้อสองใบ', tag: 'balance', cost: s => unitCost(s) * 0.01, money: 'ซื้อลอตเตอรี่', t: null, apply: s => { if (Math.random() < 0.04) { pay(s, unitCost(s) * 0.4, 'ถูกลอตเตอรี่'); s.add({ happy: 8 }); return 'ถูกรางวัลเลขท้าย! คุณเลี้ยงข้าวทั้งบ้าน'; } return 'ไม่ถูกสักตัว แต่ก็ได้ลุ้นไปหนึ่งสัปดาห์'; } },
      { l: 'ไม่ซื้อ', tag: 'work', t: 'คุณเดินผ่านไป', fx: {} },
    ],
  },
  {
    id: 'gamble', a: [18, 55], w: 1.5, cond: s => s.st.happy < 55 || s.money.savings < 0, t: 'เพื่อนส่งลิงก์เว็บพนันออนไลน์มาให้ บอกว่าสมัครวันนี้ได้เครดิตฟรี', ask: 'ลองเสี่ยงดวงสักตาไหม?',
    choices: [
      { l: 'ลองดูนิดเดียว', tag: 'balance', t: null, apply: s => { if (Math.random() < 0.35) { pay(s, unitCost(s) * 0.1, 'ได้จากการพนัน'); s.add({ happy: 3 }); return 'คุณได้เงินมาก้อนหนึ่ง แล้วก็เลิกได้ทัน'; } pay(s, -unitCost(s) * 0.45, 'เสียพนัน'); s.add({ happy: -8, rel: -3 }); return 'จากนิดเดียวกลายเป็นหลายครั้ง คุณเสียเงินไปมากกว่าที่กล้าบอกใคร'; } },
      { l: 'ไม่เล่น', tag: 'work', t: 'คุณลบลิงก์ทิ้ง', fx: { happy: 1 } },
    ],
  },
  {
    id: 'pvdoffer', a: [24, 45], w: 2, cond: s => working(s) && s.c.gdp > 10 && !s.life.pvd && !s.f.pvdAsked, apply: s => { s.f.pvdAsked = true; }, t: 'ฝ่ายบุคคลแจ้งว่าบริษัทมีกองทุนสำรองเลี้ยงชีพ ถ้าคุณหักเงินเดือนเก็บ นายจ้างจะสมทบให้อีก 5%', ask: 'จะเข้าร่วมกองทุนไหม?',
    choices: [
      { l: 'เข้าร่วม', tag: 'work', h: 'ทุกปีได้เงินสมทบเพิ่ม', t: 'เงินเดือนที่ได้ถือน้อยลงนิดหน่อย แต่ก้อนเกษียณค่อย ๆ โตขึ้น', fx: {}, apply: s => { s.life.pvd = true; } },
      { l: 'ขอรับเงินเดือนเต็ม', tag: 'balance', t: 'คุณอยากมีเงินใช้ตอนนี้มากกว่า', fx: { happy: 1 } },
    ],
  },
  {
    id: 'sendhome', a: [20, 60], w: 3, cond: s => s.f.migrant && parentsAlive(s) && !s.life.parents, t: 'แม่โทรมาบอกว่าหลังคาบ้านรั่ว และค่ายาของพ่อแพงขึ้นทุกเดือน', ask: 'ส่งเงินกลับบ้านดีไหม?',
    choices: [
      { l: 'ส่งให้ทุกเดือน', tag: 'love', h: 'เงินเก็บโตช้าลง', t: 'คุณส่งเงินกลับบ้านทุกสิ้นเดือน บ้านเกิดได้หลังคาใหม่', fx: { rel: 6, happy: 2 }, apply: s => { s.life.parents = true; } },
      { l: 'ส่งครั้งเดียวพอ', tag: 'work', cost: s => unitCost(s) * 0.15, money: 'ส่งเงินกลับบ้าน', t: 'คุณส่งไปก้อนหนึ่งพอให้ซ่อมหลังคา', fx: { rel: 3 } },
    ],
  },
  {
    id: 'stayhome', a: [22, 42], w: 4, cond: s => working(s) && s.f.kids > 0 && s.fam.some(m => m.role === 'child' && m.alive && m.age === 0) && !s.f.stayAsked, apply: s => { s.f.stayAsked = true; }, t: 'ลูกเพิ่งเกิดได้ไม่กี่เดือน ค่าจ้างพี่เลี้ยงเด็กแพงเกือบเท่าครึ่งหนึ่งของเงินเดือน', ask: 'หลังคลอดจะทำงานต่อไหม?',
    choices: [
      { l: 'ทำงานต่อ จ้างพี่เลี้ยง', tag: 'work', cost: s => s.money.income * 0.3, money: 'ค่าพี่เลี้ยงเด็ก', t: 'คุณกลับไปทำงาน คิดถึงลูกทุกบ่าย', fx: { rel: -2 } },
      { l: 'ฝากปู่ย่าตายายเลี้ยง', tag: 'balance', need: s => s.fam.some(m => ['mother', 'father', 'grandma', 'grandpa'].includes(m.role) && m.alive && m.age < 80), t: 'ปู่ย่าตายายรับเลี้ยงหลานด้วยความเต็มใจ', fx: { rel: 4 } },
      { l: 'ลาออกมาเลี้ยงลูกเอง', tag: 'love', h: 'รายได้หายไปช่วงหนึ่ง', t: 'คุณได้เห็นลูกเดินก้าวแรกด้วยตาตัวเอง', fx: { rel: 8, happy: 4, know: -2 }, apply: s => { s.f.job = null; s.money.income = 0; } },
    ],
  },
  {
    id: 'tbcough', a: [15, 70], w: 2.5, cond: s => s.c.gdp < 12, t: 'คุณไอติดต่อกันมาเกือบเดือน กลางคืนเหงื่อออก น้ำหนักลดลง', ask: 'จะไปตรวจที่สถานีอนามัยไหม?',
    choices: [
      { l: 'ไปตรวจ', tag: 'health', cost: s => medCost(s, 0.1), money: 'ค่าตรวจและยารักษาวัณโรค', t: 'ผลตรวจพบวัณโรคระยะแรก คุณกินยาครบหกเดือนจนหายดี', fx: { health: -2 } },
      { l: 'ซื้อยาแก้ไอกินเอง', tag: 'work', cost: s => unitCost(s) * 0.01, money: 'ยาแก้ไอ', t: 'อาการทุเลาลงช่วงหนึ่ง แล้วก็กลับมาหนักกว่าเดิม', fx: { health: -14 } },
    ],
  },
  {
    id: 'bp', a: [38, 80], w: 2.5, cond: s => s.st.health < 70, t: 'วัดความดันที่ร้านขายยาได้ 165/100 เภสัชกรบอกว่าควรไปพบแพทย์', ask: 'จะเริ่มรักษาไหม?',
    choices: [
      { l: 'หาหมอและกินยาทุกวัน', tag: 'health', cost: s => medCost(s, 0.15), money: 'ค่ารักษาความดันโลหิตสูง', t: 'ความดันลดลงจนเป็นปกติ คุณพกยาติดตัวไปทุกที่', fx: { health: 6 } },
      { l: 'ลดเค็มและเดินทุกเย็นแทน', tag: 'balance', t: 'ความดันลดลงบ้าง แต่ยังสูงกว่าปกติ', fx: { health: 2, happy: -1 } },
      { l: 'ไม่ได้รู้สึกป่วยอะไร', tag: 'work', t: 'คุณใช้ชีวิตตามเดิม ความดันยังสูงอยู่เงียบ ๆ', fx: { health: -8 } },
    ],
  },
  {
    id: 'heartop', a: [45, 88], w: 2, cond: s => s.st.health < 60, t: 'คุณเจ็บแน่นหน้าอกทุกครั้งที่ขึ้นบันได หมอบอกว่าหลอดเลือดหัวใจตีบ ควรทำบอลลูน', ask: 'จะรักษาอย่างไร?',
    choices: [
      { l: 'ทำที่โรงพยาบาลเอกชนทันที', tag: 'health', cost: s => medCost(s, 1.6) / Math.max(coverage(s), 0.5), money: 'ค่าทำบอลลูนหัวใจ (เอกชน)', t: 'อีกสามวันคุณก็เดินขึ้นบันไดได้โดยไม่เหนื่อย', fx: { health: 12 } },
      { l: 'รอคิวโรงพยาบาลรัฐ', tag: 'balance', cost: s => medCost(s, 0.3), money: 'ค่าทำบอลลูนหัวใจ (รัฐ)', h: 'ต้องรอหลายเดือน', t: 'คุณรอคิวเกือบปี ระหว่างนั้นต้องระวังตัวทุกวัน แต่สุดท้ายก็ได้ทำ', fx: { health: 5, happy: -3 } },
      { l: 'ไม่ทำ กินยาไปก่อน', tag: 'work', t: 'คุณกินยาประคองอาการ และหยุดพักบ่อยขึ้นเวลาเดิน', fx: { health: -12 } },
    ],
  },
  {
    id: 'parentcare', a: [35, 70], w: 3, cond: s => s.fam.some(m => (m.role === 'mother' || m.role === 'father') && m.alive && m.age >= 72), t: s => { const p = s.fam.find(m => (m.role === 'mother' || m.role === 'father') && m.alive && m.age >= 72); return `${roleLabel(s, p)}${p.name} หกล้ม ตอนนี้เดินเองไม่ได้แล้วและต้องมีคนดูแลตลอดวัน`; }, ask: 'จะดูแลอย่างไร?',
    choices: [
      { l: 'รับมาดูแลเองที่บ้าน', tag: 'love', h: 'ค่าครองชีพ ↑', t: 'คุณจัดห้องชั้นล่างให้ ทุกเช้าเริ่มด้วยการป้อนข้าว', fx: { rel: 7, happy: -3, health: -2 }, apply: s => { const p = s.fam.find(m => (m.role === 'mother' || m.role === 'father') && m.alive && m.age >= 72); if (p) p.movedIn = true; } },
      { l: 'จ้างผู้ดูแลมาช่วย', tag: 'work', cost: s => unitCost(s) * 0.6, money: 'ค่าจ้างผู้ดูแลพ่อแม่', t: 'คุณจ้างผู้ดูแลมาประจำ แล้วแวะไปหาทุกสุดสัปดาห์', fx: { rel: 3 } },
      { l: 'ให้พี่น้องคนอื่นดูแล', tag: 'balance', need: s => s.fam.some(m => m.role === 'sibling' && m.alive), t: 'พี่น้องรับหน้าที่นี้ไป คุณรู้สึกผิดอยู่ลึก ๆ', fx: { rel: -4 } },
    ],
  },
  {
    id: 'kidtuition', a: [35, 60], w: 4, cond: s => s.c.gdp > 6 && s.fam.some(m => m.role === 'child' && m.alive && m.age === 18), t: s => `${s.fam.find(m => m.role === 'child' && m.alive && m.age === 18).name} สอบเข้ามหาวิทยาลัยได้ ค่าเทอมสี่ปีรวมกันราว ${fmtBaht(unitCost(s) * 1.2)}`, ask: 'จะช่วยค่าเรียนลูกไหม?',
    choices: [
      { l: 'จ่ายให้ทั้งหมด', tag: 'love', cost: s => unitCost(s) * 1.2, money: 'ค่าเทอมลูก', t: 'ลูกเรียนจบโดยไม่มีหนี้สักบาท', fx: { rel: 6, happy: 3 } },
      { l: 'ช่วยครึ่งหนึ่ง ที่เหลือให้ลูกกู้', tag: 'balance', cost: s => unitCost(s) * 0.6, money: 'ค่าเทอมลูก (ครึ่งหนึ่ง)', t: 'ลูกทำงานพิเศษควบคู่ไปกับเรียน', fx: { rel: 3 } },
      { l: 'ให้ลูกกู้เรียนเอง', tag: 'work', t: 'ลูกเข้าใจ แต่ก็เริ่มต้นชีวิตด้วยหนี้ก้อนใหญ่', fx: { rel: -3 } },
    ],
  },
  {
    id: 'grandallow', a: [55, 95], w: 2, cond: s => s.fam.some(m => m.role === 'grandchild' && m.alive && m.age >= 5 && m.age < 18), t: s => `${s.fam.find(m => m.role === 'grandchild' && m.alive && m.age >= 5).name} หลานของคุณมาเยี่ยม ยืนเขิน ๆ อยู่หน้าประตู`, ask: 'ให้ค่าขนมหลานดีไหม?',
    choices: [
      { l: 'ให้ค่าขนม', tag: 'love', cost: s => unitCost(s) * 0.02, money: 'ค่าขนมหลาน', t: 'หลานยิ้มกว้าง แล้วก็มาเยี่ยมบ่อยขึ้นอย่างน่าสงสัย', fx: { rel: 4, happy: 3 } },
      { l: 'ทำกับข้าวให้กินแทน', tag: 'balance', t: 'หลานบอกว่ากับข้าวของคุณอร่อยที่สุดในโลก', fx: { rel: 3, happy: 2 } },
    ],
  },
  {
    id: 'will', a: [60, 95], w: 3, cond: s => netWorth(s) > unitCost(s) * 2 && !s.f.will, t: 'เพื่อนรุ่นเดียวกันเพิ่งจากไป ลูกหลานทะเลาะกันเรื่องมรดกจนไม่มองหน้ากัน', ask: 'จะเขียนพินัยกรรมไหม?',
    choices: [
      { l: 'เขียนให้ชัดเจน', tag: 'love', cost: s => unitCost(s) * 0.02, money: 'ค่าทนายทำพินัยกรรม', t: 'คุณเขียนพินัยกรรมเสร็จ รู้สึกเบาใจอย่างประหลาด', fx: { happy: 2, rel: 2 }, apply: s => { s.f.will = true; } },
      { l: 'ยังไม่อยากคิดเรื่องนี้', tag: 'balance', t: 'คุณบอกว่าอีกนานกว่าจะถึงวันนั้น', fx: {} },
    ],
  },

  // ───── ได้ทุกวัย / สภาพแวดล้อม ─────
  { id: 'goodcare', a: [0, 100], w: 1.5, cond: richC, t: 'ระบบประกันสุขภาพของประเทศช่วยให้คุณได้รับการรักษาทันเวลา', fx: { health: 6 } },
  { id: 'farclinic', a: [0, 100], w: 2, cond: s => s.c.gdp < 6, t: 'โรงพยาบาลที่ใกล้ที่สุดห่างไปหลายชั่วโมง อาการป่วยเล็กๆ เลยลากยาว', fx: { health: -6 } },
  { id: 'flood', a: [0, 95], w: 2, cond: s => s.c.flood, t: 'น้ำท่วมใหญ่ บ้านเสียหาย ข้าวของลอยไปกับน้ำ', fx: { happy: -6, cash: -0.3 } },
  { id: 'drought', a: [0, 95], w: 2.5, cond: s => s.c.drought, t: 'ภัยแล้งยาวนาน พืชผลเสียหาย อาหารแพงขึ้น', fx: { happy: -5, health: -4, cash: -0.2 } },
  { id: 'quake', a: [0, 95], w: 1.5, cond: s => s.c.quake, t: 'แผ่นดินไหวรุนแรง บ้านร้าว ทุกคนนอนนอกบ้านหลายคืน', fx: { happy: -6, cash: -0.3 } },
  { id: 'conflict', a: [0, 85], w: 3, heavy: true, cond: s => s.c.conflict, t: 'ความขัดแย้งปะทุขึ้นในพื้นที่ ครอบครัวต้องอพยพออกจากบ้าน', fx: { happy: -12, health: -6, cash: -0.5, rel: -3 } },
  { id: 'heatwave', a: [0, 100], w: 1.5, t: 'คลื่นความร้อนรุนแรงที่สุดเท่าที่เคยบันทึกไว้', fx: { health: -4 } },
  { id: 'pandemic', a: [0, 100], w: 1, t: 'โรคระบาดใหม่แพร่ไปทั่วโลก ทุกคนต้องอยู่บ้านหลายเดือน', fx: { health: -4, happy: -5, rel: -3 } },
  {
    id: 'crash', a: [22, 90], w: 3, cond: s => s.money.savings > 0 && ['mixed', 'index', 'stock'].includes(s.life.place),
    t: s => `ตลาดหุ้นร่วงหนัก เงินใน${pick(PLACES, s.life.place).th}ของคุณหายไป${s.life.place === 'mixed' ? 'ราวหนึ่งในห้า' : 'เกือบครึ่ง'}`,
    apply: s => { pay(s, -s.money.savings * (s.life.place === 'mixed' ? 0.2 : 0.4), 'ตลาดหุ้นร่วง'); },
    ask: 'จะขายทิ้งหรือถือต่อ?',
    choices: [
      { l: 'ถือต่อไป', tag: 'balance', t: 'คุณกัดฟันถือไว้ — ประวัติศาสตร์บอกว่าตลาดมักฟื้นกลับมา', fx: { happy: -4 }, apply: s => { s.f.rebound = s.age; pay(s, s.money.savings * 0.15, 'ตลาดฟื้นตัว'); } },
      { l: 'ขายทั้งหมด ย้ายไปเงินฝาก', tag: 'health', t: 'คุณขายทิ้งด้วยความกลัว และพลาดช่วงที่ตลาดฟื้น', fx: { happy: 1 }, apply: s => { s.life.place = 'cash'; } },
    ],
  },
  { id: 'kindness', a: [4, 100], w: 1.5, t: 'คนแปลกหน้ายื่นมือมาช่วยคุณในวันที่แย่ที่สุด คุณจำมันได้ตลอดชีวิต', fx: { happy: 5, rel: 2 } },
];

// ราคาบ้านขนาดพอดีครอบครัว: ราวหกปีของค่าครองชีพพื้นฐาน
const housePrice = s => unitCost(s) * 6 * (s.f.city ? 1.4 : 1) * (s.q >= 3 ? 1.3 : 1);
function buyHouse(s, loanPart, years) {
  const price = housePrice(s);
  s.f.house = true; s.money.house = price;
  if (loanPart) {
    s.money.loan = price * loanPart;
    const r = 0.06; s.money.loanPay = s.money.loan * r / (1 - Math.pow(1 + r, -years));
    return `คุณได้กุญแจบ้านหลังแรก และจะต้องผ่อนปีละ ${fmtBaht(s.money.loanPay)} ไปอีก ${years} ปี`;
  }
  return 'คุณซื้อบ้านเงินสด ไม่ต้องผ่อนสักงวด';
}
