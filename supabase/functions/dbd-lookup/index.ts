// CONSERTECH — ค้นหาข้อมูลนิติบุคคล (DBD/กรมพัฒนาธุรกิจการค้า) สำหรับ autofill เพิ่มลูกค้าใน CRM
// ลำดับแหล่งข้อมูล:
//   1) DGA GDX  — ใช้ถ้าตั้ง secret DBD_GDX_KEY (ทางการ เสถียรที่สุด; สมัคร key ฟรีที่ api.egov.go.th)
//   2) DBD DataWarehouse+ — ข้อมูลสาธารณะ ค้นด้วยชื่อ/เลข (best-effort; อาจโดน anti-bot บล็อกจาก IP คลาวด์)
//   3) MOC dataapi — ค้นด้วยเลขทะเบียน 13 หลัก (ไม่ต้อง key; บริการอาจขัดข้องเป็นช่วง)
// คืนค่า: {ok, source, results:[{tax_id,name_th,name_en,type,status,register_date,capital,address,subdistrict,district,province,postcode}]}
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function json(o: unknown, status = 200) {
  return new Response(JSON.stringify(o), { status, headers: { ...cors, "content-type": "application/json" } });
}
function b64u(s: string) { s = s.replace(/-/g, "+").replace(/_/g, "/"); while (s.length % 4) s += "="; return Uint8Array.from(atob(s), (c) => c.charCodeAt(0)); }
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";
const prov = (s: string) => (s || "").replace(/^(จังหวัด|จ\.)\s*/, "").trim();
const amp = (s: string) => (s || "").replace(/^(อำเภอ|เขต|อ\.)\s*/, "").trim();
const tam = (s: string) => (s || "").replace(/^(ตำบล|แขวง|ต\.)\s*/, "").trim();

async function gunzip(u: Uint8Array) { const s = new Blob([u]).stream().pipeThrough(new DecompressionStream("gzip")); return new Response(s).text(); }
async function dwDecrypt(env: any, encKey: string, aad: string) {
  const info = new TextEncoder().encode(aad);
  const m = await crypto.subtle.importKey("raw", b64u(encKey), { name: "HKDF" }, false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt: b64u(env.salt), info }, m, 256);
  const key = await crypto.subtle.importKey("raw", bits, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const pt = new Uint8Array(await crypto.subtle.decrypt({ name: "AES-GCM", iv: b64u(env.iv), additionalData: info }, key, b64u(env.ct)));
  return (pt[0] === 0x1f && pt[1] === 0x8b) ? gunzip(pt) : new TextDecoder().decode(pt);
}
async function fromDW(keyword: string) {
  const base = "https://datawarehouse.dbd.go.th";
  const jar: string[] = []; const merge = (h: Headers) => { const c = h.get("set-cookie"); if (c) jar.push(...c.split(/,(?=[^ ;]+=)/).map((s) => s.split(";")[0])); };
  const cookie = () => jar.join("; ");
  const common = { "User-Agent": UA, "Accept-Language": "th,en;q=0.9", "Origin": base };
  await fetch(base + "/juristic/searchInfo?keyword=" + encodeURIComponent(keyword), { headers: { "User-Agent": UA } }).then((r) => merge(r.headers));
  const r1 = await fetch(base + "/api/refresh", { method: "POST", headers: { ...common, Accept: "application/json", Cookie: cookie(), Referer: base + "/juristic/searchInfo" } }); merge(r1.headers);
  const idToken = JSON.parse(await r1.text()).idToken;
  const encKey = JSON.parse(new TextDecoder().decode(b64u(idToken.split(".")[1]))).encKey;
  const path = "/v1/company-profiles/infos";
  const body = { reportType: "JURISTIC_INFOS", isTh: "Y", customFilter: { keyword, type: "", sortBy: "jpName", currentPage: 1, itemsPerPage: 20, pvCodeList: [], jpStatusList: [], jpTypeList: [], businessSizeList: [] } };
  const r = await fetch(base + "/api" + path, { method: "POST", headers: { ...common, Accept: "application/json", "Content-Type": "application/json", Cookie: cookie(), Referer: base + "/juristic/searchInfo", Authorization: "Bearer " + idToken }, body: JSON.stringify(body) });
  const env = JSON.parse(await r.text());
  if (!env.ct) throw new Error("DW error " + (env.code || r.status));
  const data = JSON.parse(await dwDecrypt(env, encKey, `bdw|v${env.kid}|/api${path}`));
  const contents = data?.contents || data?.data?.contents || [];
  return contents.map((c: any) => ({
    tax_id: c.juristicId || c.jpNumber || "", name_th: c.jpNameTh || c.jpName || "", name_en: c.jpNameEn || "",
    type: c.jpTypeName || "", status: c.jpStatusName || c.jpStatus || "", register_date: c.registerDate || "",
    capital: c.registerCapital || c.capital || "", address: [c.jpAddress].filter(Boolean).join(" "),
    subdistrict: tam(c.tumbol || c.subDistrict || ""), district: amp(c.amphur || c.district || ""), province: prov(c.province || ""), postcode: c.postCode || c.postalCode || "",
  }));
}
async function fromMOC(id: string) {
  const r = await fetch(`https://dataapi.moc.go.th/juristic?juristic_id=${id}`, { headers: { Accept: "application/json", "User-Agent": UA, Referer: "https://data.moc.go.th/" } });
  const ct = r.headers.get("content-type") || "";
  if (!r.ok || !ct.includes("json")) throw new Error("MOC unavailable (" + r.status + ")");
  const d = await r.json();
  const a = (d.addressDetail || [])[0] || {};
  return [{
    tax_id: d.juristicID || id, name_th: d.juristicNameTH || "", name_en: d.juristicNameEN || "", type: d.juristicType || "",
    status: d.juristicStatus || "", register_date: d.registerDate || "", capital: d.registerCapital || "",
    address: [a.houseNumber && ("เลขที่ " + a.houseNumber), a.moo && ("หมู่ " + a.moo), a.buildingName, a.roomNo && ("ห้อง " + a.roomNo), a.floor && ("ชั้น " + a.floor), a.soi && ("ซอย " + a.soi), a.street && ("ถนน " + a.street)].filter(Boolean).join(" "),
    subdistrict: tam(a.subDistrict || ""), district: amp(a.district || ""), province: prov(a.province || ""), postcode: a.postalCode || "",
  }];
}
async function fromGDX(id: string, key: string) {
  const r = await fetch(`https://api.egov.go.th/ws/dbd/juristic/v4/profile?JuristicID=${id}`, { headers: { "Consumer-Key": key, Accept: "application/json" } });
  if (!r.ok) throw new Error("GDX " + r.status);
  const d = await r.json();
  const p = d.data?.[0] || d;
  return [{
    tax_id: p.JuristicID || id, name_th: p.JuristicNameTH || "", name_en: p.JuristicNameEN || "", type: p.JuristicType || "",
    status: p.JuristicStatus || "", register_date: p.RegisterDate || "", capital: p.JuristicCapital || "",
    address: p.AddressOffice || "", subdistrict: tam(p.SubDistrict || ""), district: amp(p.District || ""), province: prov(p.Province || ""), postcode: p.PostCode || "",
  }];
}
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  let body: any = {}; try { body = await req.json(); } catch { /* */ }
  const keyword = String(body.keyword || "").trim();
  if (!keyword) return json({ ok: false, note: "กรอกชื่อหรือเลขทะเบียน" });
  const digits = keyword.replace(/[^0-9]/g, "");
  const isId = digits.length === 13;
  const gdx = Deno.env.get("DBD_GDX_KEY");
  const tried: string[] = [];
  if (gdx && isId) { try { const r = await fromGDX(digits, gdx); if (r.length) return json({ ok: true, source: "DBD (ทางการ GDX)", results: r }); } catch (e) { tried.push("GDX:" + String(e).slice(0, 40)); } }
  try { const r = await fromDW(keyword); if (r.length) return json({ ok: true, source: "DBD DataWarehouse+", results: r }); tried.push("DW:0 results"); } catch (e) { tried.push("DW:" + String(e).slice(0, 50)); }
  if (isId) { try { const r = await fromMOC(digits); if (r.length && r[0].name_th) return json({ ok: true, source: "กระทรวงพาณิชย์ (MOC)", results: r }); } catch (e) { tried.push("MOC:" + String(e).slice(0, 40)); } }
  return json({ ok: false, note: "ค้นไม่สำเร็จชั่วคราว (บริการภาครัฐขัดข้อง/จำกัดการเข้าถึง) — ลองใหม่อีกครั้ง หรือกรอกเอง", debug: tried });
});
