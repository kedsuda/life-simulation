// เหตุการณ์ในชีวิต — แต่ละเหตุการณ์เกิดได้ "ครั้งเดียว" ต่อหนึ่งชีวิต (ไม่ซ้ำ)
// a = [อายุต่ำสุด, สูงสุด], w = น้ำหนักโอกาส, cond = เงื่อนไข, heavy = เนื้อหาหนัก (ปิดได้)
// fx: health / happy / know / rel = เปลี่ยนค่าสถานะ, cash = เท่าของรายได้ต่อปี
// force = เกิดแน่นอนเมื่อเข้าเงื่อนไข (เหตุการณ์สำคัญของชีวิต)
// choices = การตัดสินใจ, tag = ใช้กับโหมดอัตโนมัติตามจุดเน้น (study/work/love/health/balance)

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
        s.money.savings -= s.base() * 1.2;
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
        s.money.savings *= 0.2; s.add({ happy: -10 }); return 'ธุรกิจล้มเหลว เงินเก็บเกือบทั้งหมดหายไป แต่คุณได้บทเรียนราคาแพง';
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
    id: 'house', a: [27, 60], w: 3, cond: s => s.money.savings > s.base() * 1.5 && !s.f.house, t: 'คุณมีเงินพอจะดาวน์บ้านเป็นของตัวเอง',
    choices: [
      { l: 'ซื้อบ้าน', tag: 'love', t: 'คุณได้กุญแจบ้านหลังแรก', fx: { happy: 8, cash: -1.5 }, apply: s => { s.f.house = true; } },
      { l: 'เช่าต่อไป', tag: 'work', t: 'คุณเลือกเก็บเงินไว้ลงทุน', fx: {} },
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
      { l: 'ปรับการกินอย่างจริงจัง', tag: 'health', t: 'คุณเลิกน้ำหวาน ค่าน้ำตาลเริ่มคงที่', fx: { health: 4, happy: -2 } },
      { l: 'ช่างมัน', tag: 'balance', t: 'คุณกินเหมือนเดิม', fx: { health: -8, happy: 2 } },
    ],
  },
  { id: 'heart', a: [42, 85], w: 2, t: 'คุณเจ็บหน้าอกกลางดึกจนต้องรีบไปโรงพยาบาล', fx: { health: -12, happy: -3 } },
  {
    id: 'cancer', a: [40, 90], w: 1.5, heavy: true, t: 'ผลตรวจพบว่าคุณเป็นมะเร็ง',
    choices: [
      { l: 'รักษาเต็มที่', tag: 'health', t: null, apply: s => {
        s.money.savings -= s.base() * (s.c.gdp > 35 ? 0.3 : 1.2);
        const ok = Math.random() < 0.25 + s.c.gdp / 140 + s.q * 0.06;
        if (ok) { s.add({ health: -8 }); return 'การรักษายาวนานและเหนื่อยล้า แต่คุณหายดี'; }
        s.add({ health: -25 }); return 'คุณรักษาเต็มที่ แต่โรคยังลุกลาม';
      } },
      { l: 'รักษาแบบประคับประคอง', tag: 'love', t: 'คุณเลือกใช้เวลาที่เหลือกับคนที่รัก', fx: { health: -22, rel: 6, happy: 2 } },
    ],
  },
  { id: 'grandkid', fam: 1, a: [42, 85], w: 4, cond: s => s.fam.some(m => m.role === 'child' && m.alive && m.age >= 20), t: '', fx: { happy: 10, rel: 6 }, apply: s => { const g = famAddGrandchild(s); return `คุณได้เป็นปู่ย่าตายายแล้ว! หลานคนแรกชื่อ ${g.name}`; } },
  { id: 'kidgrad', a: [38, 70], w: 3, cond: s => s.c.gdp > 6 && s.fam.some(m => m.role === 'child' && m.alive && m.age >= 21), t: s => `${s.fam.find(m => m.role === 'child' && m.alive && m.age >= 21).name} ลูกของคุณเรียนจบ คุณยิ้มอยู่หลังห้องประชุมทั้งวัน`, fx: { happy: 8 } },
  { id: 'retire', a: [58, 68], w: 1, force: true, cond: s => working(s) && s.c.gdp > 15 && !s.f.retired, t: 'คุณเกษียณจากงาน — เป็นครั้งแรกในรอบหลายสิบปีที่ไม่ต้องตั้งนาฬิกาปลุก', fx: { happy: 4 }, apply: s => { s.f.retired = true; s.f.job = null; s.money.income = s.money.income * 0.4; } },
  { id: 'oldwork', a: [62, 85], w: 4, cond: s => s.c.gdp < 12 && s.q <= 2 && !s.f.retired, t: 'แม้อายุมากแล้ว คุณยังต้องทำงานเลี้ยงชีพ เพราะไม่มีบำนาญ', fx: { health: -4, happy: -3 } },
  { id: 'lonely', a: [65, 105], w: 3, cond: s => s.st.rel < 40, t: 'หลายวันผ่านไปโดยไม่มีใครโทรมาหาคุณเลย', fx: { happy: -7 } },
  { id: 'memory', a: [70, 105], w: 2, t: 'คุณเริ่มลืมชื่อคนรู้จักบ่อยขึ้น', fx: { know: -6, happy: -2 } },
  { id: 'garden', a: [58, 100], w: 2, t: 'คุณเริ่มปลูกต้นไม้หน้าบ้าน เฝ้าดูมันโตทุกเช้า', fx: { happy: 5, health: 2 } },
  { id: 'tellstory', a: [62, 100], w: 2, cond: s => s.f.kids > 0, t: 'หลานขอให้คุณเล่าเรื่องสมัยก่อน คุณเล่าจนพระอาทิตย์ตก', fx: { happy: 6, rel: 4 } },
  { id: 'friendgone', a: [60, 100], w: 2, heavy: true, t: 'เพื่อนสนิทตั้งแต่สมัยเด็กเสียชีวิต', fx: { rel: -5, happy: -7 } },
  { id: 'fall', a: [70, 105], w: 2, t: 'คุณหกล้มในห้องน้ำ สะโพกร้าว', fx: { health: -12 } },

  // ───── ได้ทุกวัย / สภาพแวดล้อม ─────
  { id: 'goodcare', a: [0, 100], w: 1.5, cond: richC, t: 'ระบบประกันสุขภาพของประเทศช่วยให้คุณได้รับการรักษาทันเวลา', fx: { health: 6 } },
  { id: 'farclinic', a: [0, 100], w: 2, cond: s => s.c.gdp < 6, t: 'โรงพยาบาลที่ใกล้ที่สุดห่างไปหลายชั่วโมง อาการป่วยเล็กๆ เลยลากยาว', fx: { health: -6 } },
  { id: 'flood', a: [0, 95], w: 2, cond: s => s.c.flood, t: 'น้ำท่วมใหญ่ บ้านเสียหาย ข้าวของลอยไปกับน้ำ', fx: { happy: -6, cash: -0.3 } },
  { id: 'drought', a: [0, 95], w: 2.5, cond: s => s.c.drought, t: 'ภัยแล้งยาวนาน พืชผลเสียหาย อาหารแพงขึ้น', fx: { happy: -5, health: -4, cash: -0.2 } },
  { id: 'quake', a: [0, 95], w: 1.5, cond: s => s.c.quake, t: 'แผ่นดินไหวรุนแรง บ้านร้าว ทุกคนนอนนอกบ้านหลายคืน', fx: { happy: -6, cash: -0.3 } },
  { id: 'conflict', a: [0, 85], w: 3, heavy: true, cond: s => s.c.conflict, t: 'ความขัดแย้งปะทุขึ้นในพื้นที่ ครอบครัวต้องอพยพออกจากบ้าน', fx: { happy: -12, health: -6, cash: -0.5, rel: -3 } },
  { id: 'heatwave', a: [0, 100], w: 1.5, t: 'คลื่นความร้อนรุนแรงที่สุดเท่าที่เคยบันทึกไว้', fx: { health: -4 } },
  { id: 'pandemic', a: [0, 100], w: 1, t: 'โรคระบาดใหม่แพร่ไปทั่วโลก ทุกคนต้องอยู่บ้านหลายเดือน', fx: { health: -4, happy: -5, rel: -3 } },
  { id: 'crash', a: [22, 90], w: 3, cond: s => s.money.invest > 0, t: 'ตลาดหุ้นร่วงหนัก เงินลงทุนของคุณหายไปเกือบครึ่ง', fx: { happy: -5 }, apply: s => { s.money.invest *= 0.55; } },
  { id: 'kindness', a: [4, 100], w: 1.5, t: 'คนแปลกหน้ายื่นมือมาช่วยคุณในวันที่แย่ที่สุด คุณจำมันได้ตลอดชีวิต', fx: { happy: 5, rel: 2 } },
];
