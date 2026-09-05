import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { GitBranch, Headphones, LayoutGrid, MessageSquare, Mic, PhoneForwarded, PhoneOff, Plus, Trash2, Users, X, Flag } from "lucide-react";

export const NODE_TYPES = {
  greeting: { label: "Greeting", icon: MessageSquare, tone: "bg-brand/10 text-brand", outputs: (n) => [{ key: "next", label: "next", target: n.config?.next }] },
  play: { label: "Play message", icon: Mic, tone: "bg-sky-100 text-sky-700", outputs: (n) => [{ key: "next", label: "next", target: n.config?.next }] },
  menu: { label: "Keypad menu", icon: LayoutGrid, tone: "bg-violet-100 text-violet-700", outputs: (n) => Object.entries(n.config?.routes || {}).map(([k, v]) => ({ key: k, label: `key ${k}`, target: v })) },
  queue: { label: "Call queue", icon: Users, tone: "bg-emerald-100 text-emerald-700", outputs: (n) => [{ key: "fallback", label: "no answer", target: n.config?.fallback }] },
  transfer: { label: "Transfer", icon: PhoneForwarded, tone: "bg-amber-100 text-amber-700", outputs: (n) => [{ key: "fallback", label: "no answer", target: n.config?.fallback }] },
  voicemail: { label: "Voicemail", icon: Headphones, tone: "bg-rose-100 text-rose-700", outputs: () => [] },
  hangup: { label: "End call", icon: PhoneOff, tone: "bg-slate-200 text-slate-700", outputs: () => [] },
};
const W = 224;

export const autoLayout = (nodes) => {
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const level = {}; const queue = nodes[0] ? [[nodes[0].id, 0]] : [];
  while (queue.length) { const [id, d] = queue.shift(); if (level[id] != null || !byId[id]) continue; level[id] = d; NODE_TYPES[byId[id].type]?.outputs(byId[id]).forEach((o) => o.target && queue.push([o.target, d + 1])); }
  nodes.forEach((n) => { if (level[n.id] == null) level[n.id] = Math.max(0, ...Object.values(level)) + 1; });
  const cols = {};
  return nodes.map((n) => { const d = level[n.id]; cols[d] = (cols[d] || 0); const pos = { x: 40 + cols[d] * (W + 60), y: 40 + d * 190 }; cols[d] += 1; return { ...n, config: { ...n.config, pos } }; });
};

const setLink = (node, key, target) => {
  if (node.type === "menu") return { ...node, config: { ...node.config, routes: { ...(node.config?.routes || {}), [key]: target } } };
  if (["greeting", "play"].includes(node.type)) return { ...node, config: { ...node.config, next: target } };
  return { ...node, config: { ...node.config, fallback: target } };
};

export function FlowCanvas({ nodes, onChange, selectedId, onSelect }) {
  const canvasRef = useRef(null);
  const [sizes, setSizes] = useState({});
  const [drag, setDrag] = useState(null);
  const [linking, setLinking] = useState(null);
  const [newKey, setNewKey] = useState({});

  useEffect(() => { if (nodes.some((n) => !n.config?.pos)) onChange(autoLayout(nodes)); }, [nodes.length]); // eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(() => {
    const next = {}; canvasRef.current?.querySelectorAll("[data-node]").forEach((el) => { next[el.dataset.node] = { w: el.offsetWidth, h: el.offsetHeight }; });
    setSizes(next);
  }, [nodes]);

  const pos = (n) => n.config?.pos || { x: 40, y: 40 };
  const update = (id, fn) => onChange(nodes.map((n) => (n.id === id ? fn(n) : n)));
  const startDrag = (e, n) => { const rect = canvasRef.current.getBoundingClientRect(); const p = pos(n); setDrag({ id: n.id, dx: e.clientX - rect.left + canvasRef.current.scrollLeft - p.x, dy: e.clientY - rect.top + canvasRef.current.scrollTop - p.y }); onSelect(n.id); };
  const move = (e) => { if (!drag) return; const rect = canvasRef.current.getBoundingClientRect(); const x = Math.max(0, e.clientX - rect.left + canvasRef.current.scrollLeft - drag.dx); const y = Math.max(0, e.clientY - rect.top + canvasRef.current.scrollTop - drag.dy); update(drag.id, (n) => ({ ...n, config: { ...n.config, pos: { x, y } } })); };
  const clickNode = (n) => { if (linking) { if (linking.from !== n.id) update(linking.from, (src) => setLink(src, linking.key, n.id)); setLinking(null); return; } onSelect(n.id); };
  const removeLink = (fromId, key) => update(fromId, (n) => { if (n.type === "menu") { const routes = { ...(n.config?.routes || {}) }; delete routes[key]; return { ...n, config: { ...n.config, routes } }; } const config = { ...n.config }; delete config[key === "next" ? "next" : "fallback"]; return { ...n, config }; });
  const addKey = (n) => { const k = (newKey[n.id] || "").trim(); if (!k) return; update(n.id, (x) => ({ ...x, config: { ...x.config, routes: { ...(x.config?.routes || {}), [k]: x.config?.routes?.[k] || "" } } })); setNewKey({ ...newKey, [n.id]: "" }); setLinking({ from: n.id, key: k }); };

  const edges = [];
  nodes.forEach((n) => NODE_TYPES[n.type]?.outputs(n).forEach((o, i, arr) => { const t = nodes.find((x) => x.id === o.target); if (!t) return; const s = sizes[n.id] || { w: W, h: 120 }; const p = pos(n); const tp = pos(t); const x1 = p.x + (s.w / (arr.length + 1)) * (i + 1); const y1 = p.y + s.h; const x2 = tp.x + (sizes[t.id]?.w || W) / 2; const y2 = tp.y; edges.push({ id: `${n.id}-${o.key}`, from: n.id, key: o.key, label: o.label, d: `M${x1},${y1} C${x1},${y1 + 60} ${x2},${y2 - 60} ${x2},${y2}`, lx: (x1 + x2) / 2, ly: (y1 + y2) / 2 }); }));
  const extent = nodes.reduce((m, n) => ({ w: Math.max(m.w, pos(n).x + W + 80), h: Math.max(m.h, pos(n).y + (sizes[n.id]?.h || 140) + 80) }), { w: 900, h: 560 });

  return <div className="relative">
    {linking && <div className="absolute left-3 top-3 z-20 flex items-center gap-2 rounded-xl bg-ink px-3 py-2 text-xs font-bold text-white shadow-lg" data-testid="linking-banner">Click a step to connect “{linking.label || linking.key}” <button onClick={() => setLinking(null)} className="rounded-md bg-white/15 p-1" aria-label="Cancel linking"><X className="size-3" /></button></div>}
    <div ref={canvasRef} onPointerMove={move} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} onClick={(e) => { if (e.target === canvasRef.current) { onSelect(null); setLinking(null); } }} className="relative h-[600px] overflow-auto rounded-2xl border border-border bg-[radial-gradient(circle,rgba(15,23,42,.10)_1px,transparent_1px)] bg-[size:22px_22px] bg-bg" data-testid="flow-canvas" style={{ cursor: drag ? "grabbing" : linking ? "crosshair" : "default" }}>
      <svg className="pointer-events-none absolute left-0 top-0" width={extent.w} height={extent.h}>
        <defs><marker id="arrow" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M0,0 L10,5 L0,10 z" className="fill-ink/60" /></marker></defs>
        {edges.map((e) => <path key={e.id} d={e.d} fill="none" className="stroke-ink/50" strokeWidth="2" markerEnd="url(#arrow)" />)}
      </svg>
      {edges.map((e) => <button key={`${e.id}-label`} onClick={() => removeLink(e.from, e.key)} title="Remove connection" className="absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-border bg-surface px-2 py-0.5 text-[10px] font-bold text-inkSecondary hover:border-red-300 hover:text-red-600" style={{ left: e.lx, top: e.ly }} data-testid={`edge-${e.id}`}>{e.label} ×</button>)}
      {nodes.map((n, index) => { const meta = NODE_TYPES[n.type] || NODE_TYPES.play; const Icon = meta.icon; const outputs = meta.outputs(n); const p = pos(n); const selected = selectedId === n.id; return <div key={n.id} data-node={n.id} data-testid={`canvas-node-${n.id}`} onClick={(e) => { e.stopPropagation(); clickNode(n); }} className={`absolute select-none rounded-2xl border bg-surface shadow-sm transition-shadow ${selected ? "border-brand ring-2 ring-brand/30" : "border-border"} ${linking && linking.from !== n.id ? "ring-2 ring-emerald-300" : ""}`} style={{ left: p.x, top: p.y, width: W }}>
        <div onPointerDown={(e) => startDrag(e, n)} className="flex cursor-grab items-center gap-2 rounded-t-2xl border-b border-border px-3 py-2 active:cursor-grabbing"><span className={`grid size-7 shrink-0 place-items-center rounded-lg ${meta.tone}`}><Icon className="size-3.5" /></span><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{n.label || "Untitled"}</p><p className="text-[10px] uppercase tracking-wider text-inkSecondary">{meta.label}</p></div>{index === 0 && <span className="inline-flex items-center gap-1 rounded-full bg-ink px-2 py-0.5 text-[9px] font-bold uppercase text-white"><Flag className="size-2.5" />start</span>}</div>
        <p className="line-clamp-2 px-3 py-2 text-[11px] leading-4 text-inkSecondary">{n.prompt || (n.type === "queue" ? `Queue: ${n.config?.queue || n.config?.destination || n.label}` : n.type === "transfer" ? `To: ${n.config?.destination || "—"}` : "No prompt yet")}</p>
        {(outputs.length > 0 || n.type === "menu") && <div className="flex flex-wrap items-center gap-1 border-t border-border px-2 py-2">{outputs.map((o) => <button key={o.key} onClick={(e) => { e.stopPropagation(); setLinking({ from: n.id, key: o.key, label: o.label }); }} className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${o.target ? "border-ink/30 bg-bg" : "border-dashed border-amber-400 bg-amber-50 text-amber-700"} ${linking?.from === n.id && linking.key === o.key ? "ring-2 ring-brand" : ""}`} title={o.target ? "Re-connect" : "Not connected — click to connect"} data-testid={`port-${n.id}-${o.key}`}>{o.label}{o.target ? "" : " ?"}</button>)}{n.type === "menu" && <span className="ml-auto flex items-center gap-1"><input value={newKey[n.id] || ""} onChange={(e) => setNewKey({ ...newKey, [n.id]: e.target.value })} onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.key === "Enter" && addKey(n)} maxLength={1} placeholder="key" className="w-10 rounded-md border border-border bg-bg px-1 py-0.5 text-center text-[10px]" data-testid={`add-key-input-${n.id}`} /><button onClick={(e) => { e.stopPropagation(); addKey(n); }} className="rounded-md border border-border p-0.5" aria-label="Add key" data-testid={`add-key-btn-${n.id}`}><Plus className="size-3" /></button></span>}</div>}
      </div>; })}
      {!nodes.length && <div className="absolute inset-0 grid place-items-center text-center text-sm text-inkSecondary"><div><GitBranch className="mx-auto size-8 text-brand" /><p className="mt-3 font-bold text-ink">Empty canvas</p><p className="mt-1 text-xs">Add a greeting step to begin.</p></div></div>}
    </div>
  </div>;
}

export function NodeInspector({ node, nodes, queues = [], onChange, onRemove, onMakeStart }) {
  if (!node) return <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-inkSecondary"><GitBranch className="mx-auto size-7 text-brand" /><p className="mt-3 font-bold text-ink">Select a step</p><p className="mt-1 text-xs leading-5">Drag steps to arrange them. Click an output chip, then a step, to connect them.</p></div>;
  const meta = NODE_TYPES[node.type] || NODE_TYPES.play;
  const set = (patch) => onChange({ ...node, ...patch });
  const setCfg = (patch) => onChange({ ...node, config: { ...node.config, ...patch } });
  const isStart = nodes[0]?.id === node.id;
  return <div className="rounded-2xl border border-border bg-surface p-5" data-testid="node-inspector">
    <div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-lg ${meta.tone}`}><meta.icon className="size-4" /></span><h3 className="text-sm font-bold">{node.label || "Untitled step"}</h3></div><button onClick={onRemove} className="icon-button text-red-600" aria-label="Delete step" data-testid="inspector-delete"><Trash2 className="size-4" /></button></div>
    <label className="mt-4 block text-xs font-bold text-inkSecondary">Step name<input value={node.label || ""} onChange={(e) => set({ label: e.target.value })} className="field mt-1" data-testid="inspector-label" /></label>
    <label className="mt-3 block text-xs font-bold text-inkSecondary">Step type<select value={node.type} onChange={(e) => set({ type: e.target.value })} className="field mt-1" data-testid="inspector-type">{Object.entries(NODE_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}</select></label>
    <label className="mt-3 block text-xs font-bold text-inkSecondary">What the caller hears<textarea rows="3" value={node.prompt || ""} onChange={(e) => set({ prompt: e.target.value })} className="field mt-1 resize-none" placeholder="Text-to-speech prompt" data-testid="inspector-prompt" /></label>
    {node.type === "queue" && <label className="mt-3 block text-xs font-bold text-inkSecondary">Queue<select value={node.config?.queue || ""} onChange={(e) => setCfg({ queue: e.target.value })} className="field mt-1" data-testid="inspector-queue"><option value="">Match by step name ({node.label})</option>{queues.map((q) => <option key={q.id} value={q.name}>{q.name} · {q.members?.length || 0} members</option>)}</select></label>}
    {node.type === "transfer" && <label className="mt-3 block text-xs font-bold text-inkSecondary">Destination<input value={node.config?.destination || ""} onChange={(e) => setCfg({ destination: e.target.value })} className="field mt-1 font-mono" placeholder="+14155550123, 204 or sip:…" data-testid="inspector-destination" /></label>}
    {["queue", "transfer"].includes(node.type) && <label className="mt-3 block text-xs font-bold text-inkSecondary">Ring timeout (seconds)<input type="number" min="10" max="120" value={node.config?.timeout || 30} onChange={(e) => setCfg({ timeout: Number(e.target.value) })} className="field mt-1" /></label>}
    {node.type === "voicemail" && <label className="mt-3 block text-xs font-bold text-inkSecondary">Max message length (seconds)<input type="number" min="15" max="600" value={node.config?.max_seconds || 120} onChange={(e) => setCfg({ max_seconds: Number(e.target.value) })} className="field mt-1" /></label>}
    {node.type === "menu" && <div className="mt-3 rounded-xl border border-border bg-bg p-3"><p className="text-xs font-bold text-inkSecondary">Key routes</p>{Object.entries(node.config?.routes || {}).map(([k, v]) => <div key={k} className="mt-2 flex items-center gap-2 text-xs"><span className="grid size-6 place-items-center rounded-md bg-ink font-mono text-[11px] font-bold text-white">{k}</span><select value={v || ""} onChange={(e) => setCfg({ routes: { ...node.config.routes, [k]: e.target.value } })} className="field flex-1" data-testid={`route-select-${k}`}><option value="">Not connected</option>{nodes.filter((n) => n.id !== node.id).map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}</select></div>)}{!Object.keys(node.config?.routes || {}).length && <p className="mt-2 text-[11px] text-inkSecondary">Add a key on the canvas (e.g. 1, 2, 0).</p>}</div>}
    {!isStart && <button onClick={onMakeStart} className="mt-4 btn-secondary w-full" data-testid="inspector-make-start"><Flag className="size-4" />Make this the first step</button>}
  </div>;
}
