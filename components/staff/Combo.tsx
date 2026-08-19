"use client";
import { useEffect, useMemo, useRef, useState } from "react";

// ช่องพิมพ์ค้นหา + รายการให้เลือก (แทน <datalist> ที่บนมือถือ iOS/Android กดแล้วไม่ขึ้นรายการ)
export type ComboOpt = { value: string; label?: string; sub?: string };

export default function Combo({
  value, onChange, options, placeholder, className = "", disabled, onBlur, onFocus, maxItems = 60, inputRef,
}: {
  value: string;
  onChange: (v: string) => void;
  options: (string | ComboOpt)[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
  maxItems?: number;
  inputRef?: React.RefObject<HTMLInputElement | null>;
}) {
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const wrap = useRef<HTMLDivElement>(null);
  const localRef = useRef<HTMLInputElement>(null);
  const ref = inputRef ?? localRef;

  const opts = useMemo<ComboOpt[]>(() => {
    const seen = new Set<string>();
    const out: ComboOpt[] = [];
    for (const o of options) {
      const it = typeof o === "string" ? { value: o } : o;
      if (!it.value || seen.has(it.value)) continue;
      seen.add(it.value); out.push(it);
    }
    return out;
  }, [options]);

  const q = value.trim().toLowerCase();
  const list = useMemo(() => {
    const exact = opts.some((o) => o.value === value);
    const src = !q || exact ? opts : opts.filter((o) => (o.value + " " + (o.label ?? "") + " " + (o.sub ?? "")).toLowerCase().includes(q));
    return src.slice(0, maxItems);
  }, [opts, q, value, maxItems]);

  // ปิดเมื่อแตะนอกกล่อง (รองรับ touch)
  useEffect(() => {
    if (!open) return;
    const h = (e: PointerEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) { setOpen(false); onBlur?.(); } };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open, onBlur]);

  const pick = (v: string) => { onChange(v); setOpen(false); setHi(-1); onBlur?.(); };

  return (
    <div ref={wrap} className="relative">
      <input
        ref={ref}
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => { onChange(e.target.value); setOpen(true); setHi(-1); }}
        onFocus={() => { setOpen(true); onFocus?.(); }}
        onKeyDown={(e) => {
          if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) { setOpen(true); return; }
          if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, list.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
          else if (e.key === "Enter" && open && hi >= 0 && list[hi]) { e.preventDefault(); pick(list[hi].value); }
          else if (e.key === "Escape") { setOpen(false); }
          else if (e.key === "Tab") { setOpen(false); onBlur?.(); }
        }}
        className={className}
      />
      {open && !disabled && list.length > 0 && (
        <ul role="listbox" className="absolute z-40 left-0 right-0 mt-1 max-h-[260px] overflow-auto rounded-xl border border-ice bg-white shadow-xl py-1 text-[13px]">
          {list.map((o, i) => (
            <li
              key={o.value}
              role="option"
              aria-selected={o.value === value}
              onPointerDown={(e) => { e.preventDefault(); pick(o.value); }}
              onMouseEnter={() => setHi(i)}
              className={`px-3 py-2.5 cursor-pointer leading-snug ${i === hi ? "bg-ice" : o.value === value ? "bg-ice/50" : ""} hover:bg-ice`}
            >
              <span className="text-ink">{o.value}</span>
              {(o.label || o.sub) && <span className="ml-1.5 text-[11.5px] text-muted">{o.label ?? o.sub}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
