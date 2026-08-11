"use client";

// ลายเซ็นพนักงาน — วาดเซ็นบนจอ (เมาส์/นิ้ว) หรือแนบรูปลายเซ็น
// บันทึกลง Storage + employees.signature_url ใช้ซ้ำได้ทุกเอกสาร

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function SignaturePad({
  empId, onSaved, onCancel,
}: {
  empId: string;
  onSaved: (url: string) => void;
  onCancel: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const drawing = useRef(false);
  const [hasInk, setHasInk] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = "#12212E";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = canvasRef.current!;
    const r = c.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * c.width, y: ((e.clientY - r.top) / r.height) * c.height };
  };

  const down = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    drawing.current = true;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
  };
  const move = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current) return;
    e.preventDefault();
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = pos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
    setHasInk(true);
  };
  const up = () => { drawing.current = false; };

  const clear = () => {
    const c = canvasRef.current!;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, c.width, c.height);
    setHasInk(false);
  };

  const uploadBlob = async (blob: Blob, ext: string, mime: string) => {
    if (!supabase) throw new Error("ยังไม่ได้เชื่อมต่อฐานข้อมูล");
    const path = `signatures/${empId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("attachments").upload(path, blob, { contentType: mime });
    if (error) throw error;
    const { data } = supabase.storage.from("attachments").getPublicUrl(path);
    await supabase.from("employees").update({ signature_url: data.publicUrl }).eq("id", empId);
    return data.publicUrl;
  };

  const saveDrawn = async () => {
    if (!hasInk) { setErr("ยังไม่ได้เซ็น — วาดลายเซ็นในกรอบก่อน"); return; }
    setSaving(true); setErr("");
    try {
      const blob = await new Promise<Blob>((res, rej) =>
        canvasRef.current!.toBlob((b) => (b ? res(b) : rej(new Error("แปลงรูปไม่สำเร็จ"))), "image/png"));
      onSaved(await uploadBlob(blob, "png", "image/png"));
    } catch (e) {
      setErr(String((e as Error).message ?? e));
      setSaving(false);
    }
  };

  const saveFile = async (f: File) => {
    setSaving(true); setErr("");
    try {
      const ext = f.name.split(".").pop() ?? "png";
      onSaved(await uploadBlob(f, ext, f.type || "image/png"));
    } catch (e) {
      setErr(String((e as Error).message ?? e));
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-navy/40 flex items-center justify-center p-4" onClick={onCancel}>
      <div className="bg-white rounded-2xl p-5 w-full max-w-[480px] shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="font-bold text-navy text-[15px]">🖊 สร้างลายเซ็นของฉัน</p>
        <p className="text-[12px] text-muted mt-0.5">เซ็นในกรอบด้านล่าง (เมาส์หรือนิ้วบนจอสัมผัส) หรือแนบรูปลายเซ็น — บันทึกครั้งเดียวใช้ได้ทุกเอกสาร</p>
        <canvas
          ref={canvasRef} width={640} height={240}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-ice touch-none cursor-crosshair bg-white"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
        />
        {err && <p className="mt-2 text-[12.5px] text-[#D94141]">⚠ {err}</p>}
        <div className="mt-3 flex flex-wrap gap-2">
          <button onClick={saveDrawn} disabled={saving} className="btn btn-primary text-[13px] py-2 px-4 disabled:opacity-50">
            {saving ? "กำลังบันทึก..." : "บันทึกลายเซ็นนี้"}
          </button>
          <button onClick={clear} disabled={saving} className="btn btn-outline text-[13px] py-2 px-3">ล้าง</button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) saveFile(f); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} disabled={saving}
            className="text-[12.5px] font-semibold text-sky hover:text-brand px-2">📎 หรือแนบรูปลายเซ็น</button>
          <button onClick={onCancel} className="ml-auto text-[12.5px] font-semibold text-muted hover:text-navy px-2">ปิด</button>
        </div>
      </div>
    </div>
  );
}
