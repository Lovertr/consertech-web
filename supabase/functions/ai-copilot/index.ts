// CONSERTECH — AI Copilot (Claude + Gemini) — ข้อความ/รูป/เสียง
// v15.1: ใช้ claude-sonnet-4-6 กับงานข้อความทุกประเภท (ภาษาไทยดีกว่า Haiku)
// v15: โหลด "ฐานความรู้บริษัท" จากตาราง ai_knowledge (แก้ได้ในหน้า Master → ความรู้ AI) มาใส่ system prompt
//      → AI รู้จักโซลูชันทั้ง 6 หมวด สินค้า/แบรนด์ที่จำหน่าย (Siemens, Omron, Mitsubishi, SICK, Loongain, RFID ฯลฯ) ไม่เน้นแค่ AGV
// v14: แยก "บริษัทในเครือ" (affiliates) ออกจากสาขา — รองรับนามบัตรที่ด้านหลังเป็นรายชื่อบริษัทในเครือ/ต่างประเทศ
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, 'content-type': 'application/json' } });
}
type Img = { data: string; mime?: string };
const SYSTEM_BASE = 'คุณคือผู้ช่วย AI ของบริษัท CONSERTECH CO., LTD. (ที่ปรึกษาและผู้ให้บริการระบบอัตโนมัติอุตสาหกรรมครบวงจร + ตัวแทนจำหน่ายอุปกรณ์อัตโนมัติหลายแบรนด์) ตอบภาษาไทย กระชับ ชัดเจน ใช้ได้จริง อิงจากข้อมูลที่ให้และฐานความรู้บริษัทด้านล่าง';
const SYSTEM_MIN = 'คุณคือผู้ช่วย AI ของบริษัท CONSERTECH ตอบตามคำสั่งอย่างเคร่งครัด';
// action ที่ไม่ต้องใช้ฐานความรู้ (OCR/ถอดเสียง) — ประหยัดโทเคน
const NO_KB = new Set(['ocr_card', 'ocr_receipt', 'transcribe_meeting']);

// โหลดฐานความรู้จาก DB (cache ในหน่วยความจำ 5 นาที)
let kbCache: { at: number; text: string } | null = null;
async function loadKnowledge(): Promise<string> {
  if (kbCache && Date.now() - kbCache.at < 5 * 60 * 1000) return kbCache.text;
  const url = Deno.env.get('SUPABASE_URL'); const key = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return '';
  try {
    const r = await fetch(`${url}/rest/v1/ai_knowledge?select=category,title,content&enabled=eq.true&order=sort_order.asc,id.asc`, { headers: { apikey: key, authorization: `Bearer ${key}` } });
    if (!r.ok) return kbCache?.text ?? '';
    const rows = (await r.json()) as { category: string; title: string; content: string }[];
    const text = rows.map((k) => `### [${k.category}] ${k.title}\n${k.content}`).join('\n\n').slice(0, 20000);
    kbCache = { at: Date.now(), text };
    return text;
  } catch { return kbCache?.text ?? ''; }
}
function buildPrompt(action: string, payload: string): string {
  switch (action) {
    case 'summarize_deal': return `สรุปดีลนี้สั้นๆ และแนะนำขั้นตอนถัดไป 3 ข้อ (พิจารณาโอกาสขายเพิ่ม/ข้ามสายผลิตภัณฑ์จากฐานความรู้ด้วย):\n\n${payload}`;
    case 'draft_email': return `ร่างข้อความตอบลูกค้าแบบมืออาชีพ สุภาพ กระชับ ภาษาไทย:\n\n${payload}`;
    case 'analyze_pipeline': return `วิเคราะห์ pipeline นี้ ชี้จุดโฟกัส ความเสี่ยง และคำแนะนำ:\n\n${payload}`;
    case 'weekly_report': return `สรุปภาพรวมธุรกิจประจำสัปดาห์สำหรับผู้บริหาร (สั้น กระชับ): ไฮไลต์, สิ่งที่ต้องจับตา, ความเสี่ยง และสิ่งที่ควรสั่งการ 3 ข้อ จากข้อมูลนี้:\n\n${payload}`;
    case 'self_review': return `ช่วยร่างการประเมินตนเอง (Self Review) ภาษาไทย โทนมืออาชีพถ่อมตน จากผลงานจริงนี้ แบ่งเป็น: ผลงานเด่น, สิ่งที่ทำได้ดี, จุดที่อยากพัฒนา, เป้าหมายรอบถัดไป:\n\n${payload}`;
    case 'engineer_qa': return `คุณคือผู้ช่วยวิศวกร AGV/ระบบอัตโนมัติ ตอบคำถามเชิงเทคนิคอย่างเป็นขั้นตอน อ้างอิงความรู้ที่ให้มาก่อน ถ้าไม่มีในความรู้ให้ตอบตามหลักวิศวกรรมทั่วไปพร้อมระบุว่าควรตรวจสอบกับคู่มือจริง:\n\n${payload}`;
    case 'sales_coach': return `คุณคือโค้ชฝ่ายขายของ CONSERTECH ตอบให้เอาไปใช้ได้ทันที (สคริปต์/คำถาม/ข้อโต้แย้ง) โดยยึดฐานความรู้บริษัท: เสนอให้ครบทุกโซลูชันและสินค้าที่เกี่ยวข้องกับปัญหาลูกค้า (ไม่ใช่แค่ AGV) ระบุโอกาสขายเพิ่ม/ข้ามสายผลิตภัณฑ์ที่เป็นไปได้ และปิดด้วยการเสนอสำรวจหน้างานฟรี:\n\n${payload}`;
    case 'ocr_card': return 'อ่านข้อมูลจากรูปนามบัตร (อาจมีหลายรูป = ด้านหน้าและด้านหลังของนามบัตรใบเดียวกัน ให้รวมข้อมูลจากทุกรูปเป็นชุดเดียว) ตอบกลับมาเป็น JSON เท่านั้น ห้ามมีข้อความอื่น รูปแบบ: {"first_name":"","last_name":"","name_en":"","nickname":"","position":"","company":"","company_en":"","branch":"","phone":"","mobile":"","email":"","website":"","address":"","subdistrict":"","district":"","province":"","postcode":"","branches":[{"label":"","address":"","subdistrict":"","district":"","province":"","postcode":""}],"affiliates":[{"name":"","address":"","subdistrict":"","district":"","province":"","postcode":"","country":""}],"tax_id":""}\nกติกาสำคัญ:\n1) ชื่อบริษัทหลัก (company) = บริษัทของเจ้าของนามบัตร (บริษัทที่ชื่อคนและตำแหน่งงานสังกัด) สังเกตจากคำลงท้ายเป็นหลัก เช่น CO.,LTD. / Co., Ltd. / Limited / Corporation / Inc. / จำกัด / จำกัด (มหาชน) / หจก. อาจอยู่ตำแหน่งไหนก็ได้บนการ์ด ขนาด/สีตัวอักษรแบบไหนก็ได้ ต้องหาให้เจอเสมอถ้ามี ส่วนชื่อคนดูจากบริบท: มักมีตำแหน่งงานกำกับใกล้ๆ และไม่มีคำลงท้ายบริษัท ถ้าชื่อบริษัทมีคำระบุสาขาต่อท้าย เช่น (Branch 1), (สาขา 2), (Head Office) ให้ตัดออกแล้วใส่ใน branch แทน\n2) ภาษา: ถ้ามีทั้งไทยและอังกฤษ ให้ first_name/last_name และ company เป็นไทย แล้วใส่ชื่ออังกฤษเต็มใน name_en และ company_en ถ้ามีภาษาเดียวใส่ใน first_name/last_name/company แล้วเว้น name_en/company_en ว่าง (เก็บครบทั้ง 2 ภาษา ห้ามทิ้ง)\n3) ที่อยู่ของบริษัทหลัก: ถ้ามีหลายที่อยู่ของ "บริษัทเดียวกัน" (Factory 1, Factory 2, Head Office ฯลฯ) ให้ใช้สำนักงานใหญ่หรือที่อยู่แรกเป็นหลักใน address/subdistrict/district/province/postcode: address = เลขที่/หมู่/ถนน/อาคาร/นิคมฯ, ตำบล(แขวง)→subdistrict (T. คือ ตำบล), อำเภอ(เขต)→district (A. คือ อำเภอ), จังหวัด→province แปลงเป็นชื่อไทยมาตรฐานเสมอ (เช่น Chonburi → ชลบุรี) ที่อยู่อื่นของบริษัทเดียวกันใส่ใน branches พร้อม label ถ้าไม่มีให้เป็น []\n4) บริษัทในเครือ (สำคัญ อย่าสับสนกับสาขา): ถ้าการ์ด (มักเป็นด้านหลัง) มีรายชื่อ "บริษัทอื่น" ที่ชื่อต่างจากบริษัทหลักและมีคำลงท้ายบริษัทของตัวเอง (เช่น Asahi Tech (Thailand) Co., Ltd., Suzhou Xulong Machinery Co., Ltd.) พร้อมที่อยู่ของแต่ละบริษัท = บริษัทในเครือ ให้ใส่ใน affiliates (ห้ามใส่ใน branches) แยกช่องที่อยู่เหมือนกัน ถ้าอยู่เมืองไทยแยก ตำบล/อำเภอ/จังหวัดไทย และเว้น country ว่าง ถ้าอยู่ต่างประเทศ (เช่นจีน) ให้ใส่ที่อยู่เต็มรวมเมือง/มณฑล/รหัสไปรษณีย์ใน address เว้น subdistrict/district/province ว่าง และใส่ country เช่น China\n5) tax_id: เลขประจำตัวผู้เสียภาษี 13 หลัก ป้ายกำกับอาจเขียนได้หลายแบบ (Tax Id:, TAX ID:, TAX ID no., Tax ID No., เลขประจำตัวผู้เสียภาษี ฯลฯ หรือเลข 13 หลักใกล้คำว่า TAX) ใส่เฉพาะตัวเลข\n6) เบอร์โทร: phone = เบอร์บริษัท/สำนักงาน (ป้าย Tel, โทร) ใส่ได้หลายเบอร์คั่นด้วย ", " (ไม่เอา Fax) ส่วน mobile = เบอร์มือถือของผู้ติดต่อ (ป้าย Mobile, มือถือ, HP หรือเบอร์ขึ้นต้น 08/09 หรือ (66-8)/(66-9)) แปลงรูปแบบสากลเป็นเบอร์ไทย เช่น (66-8) 1878-1975 → 081-878-1975 กติกาสำคัญ: ถ้านามบัตรมีเบอร์ติดต่อเพียงเบอร์เดียว ให้ใส่เบอร์นั้นทั้งใน phone และ mobile\nถ้าไม่มีข้อมูลช่องไหนให้เว้นว่าง แยกชื่อ/นามสกุลถ้าทำได้';
    case 'ocr_receipt': return 'อ่านข้อมูลจากรูปใบเสร็จ/ใบกำกับภาษีนี้ ตอบกลับมาเป็น JSON เท่านั้น รูปแบบ: {"vendor":"","date":"","total":0,"vat":0,"items":[""]} โดย total คือยอดรวมสุทธิเป็นตัวเลข ถ้าอ่านไม่ออกให้เว้นว่าง/0';
    case 'transcribe_meeting': return 'ถอดความไฟล์เสียงการประชุมนี้เป็นภาษาไทย จากนั้นสรุปให้ในรูปแบบ:\n## บทถอดความ\n(เนื้อหาถอดความ)\n## สรุปประเด็นสำคัญ\n- ...\n## มติ/ข้อสรุป\n- ...\n## Action Items\n- [งาน] — [ผู้รับผิดชอบถ้าระบุได้]\nถ้าเสียงไม่ชัดหรือสั้นมาก ให้ถอดเท่าที่ได้ยินจริง ห้ามแต่งเนื้อหาเพิ่มเอง';
    default: return payload;
  }
}
async function callAnthropic(key: string, system: string, prompt: string, imgs: Img[]): Promise<string> {
  // ใช้ Sonnet ทุกงาน (ภาษาไทยลื่นกว่า Haiku ชัดเจน — ปริมาณใช้งานยังต่ำ ค่าใช้จ่ายต่างกันไม่กี่สิบบาท/เดือน)
  const model = 'claude-sonnet-4-6';
  const content: unknown = imgs.length
    ? [{ type: 'text', text: prompt }, ...imgs.map((im) => ({ type: 'image', source: { type: 'base64', media_type: im.mime || 'image/jpeg', data: im.data } }))]
    : prompt;
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model, max_tokens: 2500, system, messages: [{ role: 'user', content }] }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || ('Anthropic ' + r.status));
  return (data?.content || []).map((c: { text?: string }) => c.text || '').join('').trim();
}
async function callGemini(key: string, system: string, prompt: string, imgs: Img[], audio?: string, audioMime?: string): Promise<string> {
  const model = (imgs.length || audio) ? 'gemini-2.5-flash' : 'gemini-2.5-flash-lite';
  const parts: unknown[] = [{ text: prompt }];
  for (const im of imgs) parts.push({ inlineData: { mimeType: im.mime || 'image/jpeg', data: im.data } });
  if (audio) parts.push({ inlineData: { mimeType: audioMime || 'audio/webm', data: audio } });
  const url = 'https://generativelanguage.googleapis.com/v1beta/models/' + model + ':generateContent?key=' + key;
  const r = await fetch(url, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: system }] }, contents: [{ role: 'user', parts }], generationConfig: { temperature: 0.3, maxOutputTokens: 4000 } }),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data?.error?.message || ('Gemini ' + r.status));
  return (data?.candidates?.[0]?.content?.parts || []).map((p: { text?: string }) => p.text || '').join('').trim();
}
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'POST only' }, 405);
  let body: { action?: string; payload?: string; provider?: string; image?: string; mime?: string; images?: Img[]; audio?: string; audioMime?: string };
  try { body = await req.json(); } catch { return json({ error: 'invalid json' }, 400); }
  const action = body.action || 'ask';
  const payload = (body.payload || '').slice(0, 14000);
  const prompt = buildPrompt(action, payload);
  // system prompt: OCR/เสียงใช้แบบสั้น ส่วนงานข้อความใช้ฐานความรู้บริษัทจาก DB
  let system = SYSTEM_MIN;
  if (!NO_KB.has(action)) {
    const kb = await loadKnowledge();
    system = kb ? `${SYSTEM_BASE}\n\n=== ฐานความรู้บริษัท (อัปเดตโดยแอดมิน) ===\n${kb}\n=== จบฐานความรู้ ===` : SYSTEM_BASE;
  }
  // รองรับทั้งรูปเดียว (image) และหลายรูป (images = หน้า+หลังนามบัตร)
  const imgs: Img[] = Array.isArray(body.images) && body.images.length
    ? body.images.filter((im) => im && typeof im.data === 'string').slice(0, 4)
    : (body.image ? [{ data: body.image, mime: body.mime }] : []);
  const audio = body.audio; const audioMime = body.audioMime;
  const aKey = Deno.env.get('ANTHROPIC_API_KEY');
  const gKey = Deno.env.get('GEMINI_API_KEY');
  // เสียงรองรับเฉพาะ Gemini
  if (audio) {
    if (!gKey) return json({ error: 'ถอดเสียงต้องใช้ GEMINI_API_KEY' }, 500);
    try {
      const text = await callGemini(gKey, system, prompt, [], audio, audioMime);
      return json({ text, provider: 'gemini' });
    } catch (e) { return json({ error: 'ถอดเสียงไม่สำเร็จ: ' + String(e) }, 200); }
  }
  const order: Array<[string, string]> = [];
  const geminiFirst = imgs.length > 0 || body.provider === 'gemini';
  if (geminiFirst) { if (gKey) order.push(['gemini', gKey]); if (aKey) order.push(['anthropic', aKey]); }
  else { if (aKey) order.push(['anthropic', aKey]); if (gKey) order.push(['gemini', gKey]); }
  if (!order.length) return json({ error: 'ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY หรือ GEMINI_API_KEY' }, 500);
  let lastErr = '';
  for (const [name, k] of order) {
    try {
      const text = name === 'anthropic' ? await callAnthropic(k, system, prompt, imgs) : await callGemini(k, system, prompt, imgs);
      if (text) return json({ text, provider: name });
      lastErr = name + ': empty';
    } catch (e) { lastErr = String(e); }
  }
  return json({ error: 'AI เรียกไม่สำเร็จ: ' + lastErr }, 200);
});
