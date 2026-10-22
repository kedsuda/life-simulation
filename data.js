// ข้อมูลประเทศ (ปัดเศษ/ประมาณการจาก UN WPP, World Bank) — เพื่อการเรียนรู้ ไม่ใช่ตัวเลขทางการ
// births = เด็กเกิดต่อปี (ล้านคน), pop = ประชากร (ล้านคน), le = [อายุคาดเฉลี่ยชาย, หญิง]
// gdp = GDP ต่อหัว PPP (พัน $), gini = ค่าความเหลื่อมล้ำ, reg = ภูมิภาค
const COUNTRIES = [
  { id: 'IN', th: 'อินเดีย', flag: '🇮🇳', births: 23.0, pop: 1450, le: [70, 73], gdp: 9.5, gini: 35, reg: 'SA' },
  { id: 'CN', th: 'จีน', flag: '🇨🇳', births: 9.0, pop: 1410, le: [75, 81], gdp: 23, gini: 37, reg: 'EA' },
  { id: 'NG', th: 'ไนจีเรีย', flag: '🇳🇬', births: 7.5, pop: 230, le: [53, 55], gdp: 5.8, gini: 35, reg: 'AF' },
  { id: 'PK', th: 'ปากีสถาน', flag: '🇵🇰', births: 6.3, pop: 250, le: [65, 69], gdp: 6.2, gini: 30, reg: 'SA' },
  { id: 'ID', th: 'อินโดนีเซีย', flag: '🇮🇩', births: 4.4, pop: 280, le: [69, 74], gdp: 15, gini: 38, reg: 'SEA', quake: 1 },
  { id: 'CD', th: 'คองโก (DR)', flag: '🇨🇩', births: 4.5, pop: 110, le: [58, 62], gdp: 1.4, gini: 42, reg: 'AF', conflict: 1 },
  { id: 'ET', th: 'เอธิโอเปีย', flag: '🇪🇹', births: 3.9, pop: 130, le: [64, 69], gdp: 3.0, gini: 35, reg: 'AF' },
  { id: 'US', th: 'สหรัฐอเมริกา', flag: '🇺🇸', births: 3.6, pop: 340, le: [75, 81], gdp: 82, gini: 41, reg: 'NA' },
  { id: 'BD', th: 'บังกลาเทศ', flag: '🇧🇩', births: 3.0, pop: 173, le: [71, 75], gdp: 8.5, gini: 32, reg: 'SA', flood: 1 },
  { id: 'BR', th: 'บราซิล', flag: '🇧🇷', births: 2.5, pop: 212, le: [72, 79], gdp: 20, gini: 52, reg: 'LA' },
  { id: 'PH', th: 'ฟิลิปปินส์', flag: '🇵🇭', births: 2.0, pop: 116, le: [68, 74], gdp: 11, gini: 41, reg: 'SEA', quake: 1, flood: 1 },
  { id: 'EG', th: 'อียิปต์', flag: '🇪🇬', births: 2.1, pop: 115, le: [69, 74], gdp: 17, gini: 32, reg: 'ME' },
  { id: 'MX', th: 'เม็กซิโก', flag: '🇲🇽', births: 1.8, pop: 130, le: [72, 78], gdp: 23, gini: 45, reg: 'LA', quake: 1 },
  { id: 'TZ', th: 'แทนซาเนีย', flag: '🇹🇿', births: 2.2, pop: 68, le: [65, 68], gdp: 3.3, gini: 40, reg: 'AF' },
  { id: 'UG', th: 'ยูกันดา', flag: '🇺🇬', births: 1.6, pop: 50, le: [61, 66], gdp: 3.0, gini: 43, reg: 'AF' },
  { id: 'AF', th: 'อัฟกานิสถาน', flag: '🇦🇫', births: 1.4, pop: 42, le: [60, 66], gdp: 2.0, gini: 30, reg: 'SA', conflict: 1, quake: 1 },
  { id: 'KE', th: 'เคนยา', flag: '🇰🇪', births: 1.5, pop: 56, le: [60, 65], gdp: 6.0, gini: 39, reg: 'AF' },
  { id: 'VN', th: 'เวียดนาม', flag: '🇻🇳', births: 1.4, pop: 100, le: [70, 79], gdp: 14, gini: 36, reg: 'SEA', flood: 1 },
  { id: 'RU', th: 'รัสเซีย', flag: '🇷🇺', births: 1.3, pop: 144, le: [66, 77], gdp: 40, gini: 36, reg: 'EU' },
  { id: 'JP', th: 'ญี่ปุ่น', flag: '🇯🇵', births: 0.75, pop: 124, le: [81, 87], gdp: 48, gini: 33, reg: 'EA', quake: 1 },
  { id: 'TH', th: 'ไทย', flag: '🇹🇭', births: 0.5, pop: 71, le: [73, 81], gdp: 22, gini: 35, reg: 'SEA', flood: 1 },
  { id: 'MM', th: 'เมียนมา', flag: '🇲🇲', births: 0.9, pop: 54, le: [64, 70], gdp: 5.5, gini: 31, reg: 'SEA', conflict: 1, flood: 1 },
  { id: 'IR', th: 'อิหร่าน', flag: '🇮🇷', births: 1.1, pop: 91, le: [74, 79], gdp: 17, gini: 40, reg: 'ME', quake: 1 },
  { id: 'TR', th: 'ตุรกี', flag: '🇹🇷', births: 1.0, pop: 86, le: [75, 81], gdp: 40, gini: 44, reg: 'ME', quake: 1 },
  { id: 'DE', th: 'เยอรมนี', flag: '🇩🇪', births: 0.7, pop: 84, le: [79, 84], gdp: 66, gini: 32, reg: 'EU' },
  { id: 'GB', th: 'สหราชอาณาจักร', flag: '🇬🇧', births: 0.68, pop: 69, le: [79, 83], gdp: 55, gini: 33, reg: 'EU' },
  { id: 'FR', th: 'ฝรั่งเศส', flag: '🇫🇷', births: 0.68, pop: 66, le: [80, 86], gdp: 58, gini: 31, reg: 'EU' },
  { id: 'IT', th: 'อิตาลี', flag: '🇮🇹', births: 0.38, pop: 59, le: [81, 85], gdp: 55, gini: 35, reg: 'EU', quake: 1 },
  { id: 'ES', th: 'สเปน', flag: '🇪🇸', births: 0.32, pop: 48, le: [81, 86], gdp: 50, gini: 33, reg: 'EU' },
  { id: 'PL', th: 'โปแลนด์', flag: '🇵🇱', births: 0.27, pop: 37, le: [75, 82], gdp: 45, gini: 29, reg: 'EU' },
  { id: 'UA', th: 'ยูเครน', flag: '🇺🇦', births: 0.2, pop: 37, le: [66, 76], gdp: 16, gini: 26, reg: 'EU', conflict: 1 },
  { id: 'KR', th: 'เกาหลีใต้', flag: '🇰🇷', births: 0.23, pop: 52, le: [80, 86], gdp: 55, gini: 31, reg: 'EA' },
  { id: 'SD', th: 'ซูดาน', flag: '🇸🇩', births: 1.4, pop: 50, le: [63, 68], gdp: 3.5, gini: 34, reg: 'AF', conflict: 1, drought: 1 },
  { id: 'MZ', th: 'โมซัมบิก', flag: '🇲🇿', births: 1.2, pop: 34, le: [57, 63], gdp: 1.5, gini: 54, reg: 'AF', flood: 1 },
  { id: 'MG', th: 'มาดากัสการ์', flag: '🇲🇬', births: 0.9, pop: 31, le: [63, 67], gdp: 1.7, gini: 43, reg: 'AF', drought: 1 },
  { id: 'AO', th: 'แองโกลา', flag: '🇦🇴', births: 1.3, pop: 37, le: [60, 65], gdp: 7.0, gini: 51, reg: 'AF' },
  { id: 'GH', th: 'กานา', flag: '🇬🇭', births: 0.85, pop: 34, le: [62, 66], gdp: 7.0, gini: 43, reg: 'AF' },
  { id: 'NE', th: 'ไนเจอร์', flag: '🇳🇪', births: 1.1, pop: 27, le: [61, 63], gdp: 1.5, gini: 33, reg: 'AF', drought: 1, conflict: 1 },
  { id: 'ML', th: 'มาลี', flag: '🇲🇱', births: 0.85, pop: 24, le: [59, 61], gdp: 2.5, gini: 36, reg: 'AF', drought: 1, conflict: 1 },
  { id: 'ZA', th: 'แอฟริกาใต้', flag: '🇿🇦', births: 1.0, pop: 63, le: [60, 66], gdp: 15, gini: 63, reg: 'AF' },
  { id: 'MA', th: 'โมร็อกโก', flag: '🇲🇦', births: 0.65, pop: 38, le: [73, 77], gdp: 10, gini: 40, reg: 'ME', drought: 1 },
  { id: 'DZ', th: 'แอลจีเรีย', flag: '🇩🇿', births: 0.85, pop: 46, le: [75, 78], gdp: 15, gini: 28, reg: 'ME', drought: 1 },
  { id: 'SA', th: 'ซาอุดีอาระเบีย', flag: '🇸🇦', births: 0.55, pop: 33, le: [76, 79], gdp: 65, gini: 45, reg: 'ME' },
  { id: 'IQ', th: 'อิรัก', flag: '🇮🇶', births: 1.1, pop: 46, le: [70, 74], gdp: 11, gini: 30, reg: 'ME', conflict: 1 },
  { id: 'YE', th: 'เยเมน', flag: '🇾🇪', births: 0.85, pop: 40, le: [63, 68], gdp: 2.0, gini: 37, reg: 'ME', conflict: 1, drought: 1 },
  { id: 'CO', th: 'โคลอมเบีย', flag: '🇨🇴', births: 0.6, pop: 53, le: [74, 80], gdp: 20, gini: 54, reg: 'LA' },
  { id: 'AR', th: 'อาร์เจนตินา', flag: '🇦🇷', births: 0.5, pop: 46, le: [74, 80], gdp: 28, gini: 42, reg: 'LA' },
  { id: 'PE', th: 'เปรู', flag: '🇵🇪', births: 0.5, pop: 34, le: [74, 79], gdp: 16, gini: 40, reg: 'LA', quake: 1 },
  { id: 'HT', th: 'เฮติ', flag: '🇭🇹', births: 0.27, pop: 12, le: [61, 66], gdp: 3.3, gini: 41, reg: 'LA', conflict: 1, quake: 1 },
  { id: 'MY', th: 'มาเลเซีย', flag: '🇲🇾', births: 0.45, pop: 35, le: [74, 78], gdp: 35, gini: 41, reg: 'SEA', flood: 1 },
  { id: 'KH', th: 'กัมพูชา', flag: '🇰🇭', births: 0.36, pop: 17, le: [68, 73], gdp: 5.5, gini: 33, reg: 'SEA', flood: 1 },
  { id: 'LA', th: 'ลาว', flag: '🇱🇦', births: 0.17, pop: 7.7, le: [66, 70], gdp: 9.0, gini: 39, reg: 'SEA' },
  { id: 'SG', th: 'สิงคโปร์', flag: '🇸🇬', births: 0.03, pop: 6, le: [82, 86], gdp: 130, gini: 41, reg: 'SEA' },
  { id: 'NP', th: 'เนปาล', flag: '🇳🇵', births: 0.55, pop: 30, le: [69, 72], gdp: 5.0, gini: 33, reg: 'SA', quake: 1 },
  { id: 'LK', th: 'ศรีลังกา', flag: '🇱🇰', births: 0.3, pop: 22, le: [74, 80], gdp: 15, gini: 38, reg: 'SA' },
  { id: 'CA', th: 'แคนาดา', flag: '🇨🇦', births: 0.36, pop: 40, le: [80, 84], gdp: 60, gini: 33, reg: 'NA' },
  { id: 'AU', th: 'ออสเตรเลีย', flag: '🇦🇺', births: 0.3, pop: 27, le: [82, 85], gdp: 65, gini: 34, reg: 'OC' },
  { id: 'SE', th: 'สวีเดน', flag: '🇸🇪', births: 0.1, pop: 10.5, le: [82, 85], gdp: 66, gini: 29, reg: 'EU' },
];

const GENDERS = [
  { id: 'M', th: 'ชาย', w: 0.512 },
  { id: 'F', th: 'หญิง', w: 0.488 },
];

// กลุ่มรายได้ภายในประเทศ (quintile) — แต่ละกลุ่มมีโอกาสเท่ากัน 20%
const QUINTILES = [
  { th: 'ยากจนที่สุด', short: 'ยากจนมาก', p: [0.0, 0.2] },
  { th: 'ค่อนข้างยากจน', short: 'ยากจน', p: [0.2, 0.4] },
  { th: 'ปานกลาง', short: 'ปานกลาง', p: [0.4, 0.6] },
  { th: 'ค่อนข้างมีฐานะ', short: 'มีฐานะ', p: [0.6, 0.8] },
  { th: 'ร่ำรวยที่สุด', short: 'ร่ำรวย', p: [0.8, 1.0] },
];

const FAMILIES = [
  { id: 'both', th: 'พ่อแม่อยู่พร้อมหน้า', w: 0.62, fx: { rel: 3 }, money: 1 },
  { id: 'single', th: 'แม่เลี้ยงเดี่ยว', w: 0.17, fx: { happy: -3 }, money: 0.75 },
  { id: 'grand', th: 'อยู่กับปู่ย่าตายาย', w: 0.09, fx: { rel: 2, know: -1 }, money: 0.8 },
  { id: 'extended', th: 'ครอบครัวขยายหลายรุ่นใต้หลังคาเดียวกัน', w: 0.12, fx: { rel: 5 }, money: 0.9 },
];

const SIBLINGS = ['ลูกคนเดียว', 'มีพี่น้อง 1 คน', 'มีพี่น้อง 2 คน', 'มีพี่น้อง 3 คน', 'มีพี่น้อง 4 คนขึ้นไป'];

// คำถามสะท้อนตัวเอง: ชวนเทียบชีวิตของคนคนนี้กับชีวิตจริงของผู้เล่น (ตัวเลือกคำตอบอยู่ใน game.js)
const REFLECT_AGES = {
  5: s => `${s.name} อายุ 5 ขวบแล้ว ${{ both: 'อยู่กับพ่อแม่', single: 'อยู่กับแม่', grand: 'อยู่กับปู่ย่าตายาย', extended: 'อยู่ในบ้านที่มีญาติเต็มบ้าน' }[s.f.family]} — ตอนคุณอายุ 5 ขวบ ชีวิตของคุณเป็นอย่างไร?`,
  15: s => `${s.name} อายุ 15 ปี ${s.f.school ? 'ยังได้เรียนหนังสือ' : 'ไม่ได้เรียนหนังสือแล้ว'} — ตอนอายุ 15 คุณใช้เวลาส่วนใหญ่ไปกับอะไร?`,
  30: s => `อายุ 30 ${s.name} ${s.f.job ? 'ทำงานเป็น' + s.f.job : 'ยังไม่มีงานประจำ'}${s.f.married ? ' และแต่งงานแล้ว' : ''} — ถ้าคุณเป็นคนคนนี้จริง ๆ คุณจะเลือกทางเดินต่างไปจากนี้ไหม?`,
  50: s => `${s.name} อายุ 50 มี${s.money.savings < 0 ? 'หนี้' : 'เงินเก็บ'}ราว ${fmtBaht(Math.abs(s.money.savings))} — คุณคิดว่าเงินมีผลกับความสุขของคนคนนี้แค่ไหน?`,
  70: s => `${s.name} อายุ 70 ปีแล้ว ถ้าได้นั่งคุยกับคนคนนี้สักห้านาที คุณอยากบอกอะไร?`,
};

const JOBS = [
  ['เกษตรกรรายย่อย', 'แรงงานรายวัน', 'คนเก็บของเก่า', 'ลูกจ้างในไร่'],
  ['พนักงานโรงงาน', 'แม่ค้าในตลาด', 'คนขับรถรับจ้าง', 'พนักงานร้านอาหาร'],
  ['ช่างฝีมือ', 'พนักงานขาย', 'พนักงานธุรการ', 'ช่างซ่อมรถ'],
  ['ครู', 'พยาบาล', 'นักบัญชี', 'พนักงานออฟฟิศ'],
  ['วิศวกร', 'โปรแกรมเมอร์', 'แพทย์', 'ผู้จัดการ'],
];

// ค่าเงิน: 1 PPP$ ≈ 12.6 บาท (ตามกำลังซื้อในไทย)
const THB_PER_PPP = 12.6;
