import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowDownLeft, ArrowUpRight, Disc3, NotebookPen, Phone, PhoneOff, RefreshCw, Ticket } from "lucide-react";
import api from "../../lib/api";
import { dialNumber } from "../../lib/dialer";
import { CallNotesPanel } from "./CallNotesPanel";

const fmt = (s) => (s == null ? "—" : `${Math.floor(s / 60)}m ${s % 60}s`);
const when = (v) => (v ? new Date(v).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—");
const tone = { completed: "bg-emerald-100 text-emerald-700", connected: "bg-blue-100 text-blue-700", ringing: "bg-amber-100 text-amber-700", queued: "bg-violet-100 text-violet-700", failed: "bg-red-100 text-red-700", no_answer: "bg-slate-100 text-slate-600" };

export function LiveCalls({ providerReady, flows = [], contacts = [], onCallsChanged }) {
  const [calls, setCalls] = useState([]);
  const [to, setTo] = useState("");
  const [mode, setMode] = useState("agent");
  const [flowId, setFlowId] = useState("");
  const [busy, setBusy] = useState(false);
  const [notesFor, setNotesFor] = useState(null);

  const load = async () => { try { const { data } = await api.get("/voice/calls"); setCalls(data.filter((c) => c.provider !== "self_hosted_simulator")); } catch { /* silent poll */ } };
  useEffect(() => { load(); const t = setInterval(load, 5000); return () => clearInterval(t); }, []);

  const place = async () => {
    if (!to.trim()) return toast.error("Enter a destination number");
    setBusy(true);
    try {
      if (mode === "agent") await dialNumber({ to, name: to });
      else { await api.post("/voice/dial", { to, mode: "flow", flow_id: flowId || null }); toast.success("Outbound IVR call started"); }
      await load();
    } catch (error) { toast.error(error.response?.data?.detail || "Could not place the call"); }
    setBusy(false);
  };
  const hangup = async (id) => { try { await api.post(`/voice/calls/${id}/hangup`); toast.success("Call ended"); await load(); } catch (error) { toast.error(error.response?.data?.detail || "Could not end call"); } };
  const active = calls.filter((c) => ["queued", "ringing", "connected"].includes(c.status));

  return <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]" data-testid="live-calls">
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-7">
      <div className="flex items-center justify-between gap-3"><div><h2 className="font-heading text-2xl font-black">Live calls & history</h2><p className="mt-1 text-xs text-inkSecondary">Real carrier traffic only. Refreshes every 5 seconds.</p></div><button onClick={load} className="icon-button" aria-label="Refresh calls" data-testid="live-calls-refresh"><RefreshCw className="size-4" /></button></div>
      {active.length > 0 && <div className="mt-5 grid gap-2">{active.map((c) => <div key={c.id} className="flex flex-col gap-3 rounded-2xl border border-brand/30 bg-brand/5 p-4 sm:flex-row sm:items-center sm:justify-between" data-testid={`active-call-${c.id}`}><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-brand text-white">{c.direction === "inbound" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}</span><div><p className="text-sm font-bold">{c.contact_name || (c.direction === "inbound" ? c.from : c.to)}</p><p className="mt-0.5 text-[11px] text-inkSecondary">{c.direction} · {c.provider} · {(c.ivr_path || []).slice(-1)[0] || c.status}</p></div></div><div className="flex items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone[c.status]}`}>{c.status}</span><button onClick={() => setNotesFor(c.id)} className="btn-secondary" data-testid={`notes-${c.id}`}><NotebookPen className="size-4" />Notes</button><button onClick={() => hangup(c.id)} className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-3 py-2 text-xs font-bold text-white" data-testid={`hangup-${c.id}`}><PhoneOff className="size-4" />End</button></div></div>)}</div>}
      <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[720px] text-left"><thead><tr className="border-b border-border text-[10px] uppercase tracking-wider text-inkSecondary"><th className="px-2 py-3 font-bold">Direction</th><th className="px-2 py-3 font-bold">Who</th><th className="px-2 py-3 font-bold">IVR path</th><th className="px-2 py-3 font-bold">Status</th><th className="px-2 py-3 font-bold">Duration</th><th className="px-2 py-3 font-bold">Recording</th><th className="px-2 py-3 font-bold">When</th><th className="px-2 py-3 font-bold">Notes</th></tr></thead><tbody>
        {calls.map((c) => <tr key={c.id} className="border-b border-border/70 last:border-0" data-testid={`call-row-${c.id}`}><td className="px-2 py-3 text-xs font-semibold"><span className="inline-flex items-center gap-2">{c.direction === "inbound" ? <ArrowDownLeft className="size-3 text-emerald-600" /> : <ArrowUpRight className="size-3 text-blue-600" />}{c.direction}</span></td><td className="px-2 py-3"><p className="text-xs font-semibold">{c.contact_name || "Unknown"}</p><p className="font-mono text-[11px] text-inkSecondary">{c.direction === "inbound" ? c.from : c.to}</p></td><td className="max-w-[220px] truncate px-2 py-3 text-xs text-inkSecondary" title={(c.ivr_path || []).join(" → ")}>{(c.ivr_path || []).join(" → ") || c.disposition || "—"}</td><td className="px-2 py-3"><span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${tone[c.status] || "bg-slate-100 text-slate-600"}`}>{(c.status || "").replace("_", " ")}</span></td><td className="px-2 py-3 text-xs">{fmt(c.duration_seconds)}</td><td className="px-2 py-3">{c.recording_urls?.length ? <a href={c.recording_urls[0].url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-brand"><Disc3 className="size-3" />Play</a> : <span className="text-xs text-inkSecondary">—</span>}</td><td className="px-2 py-3 text-xs text-inkSecondary">{when(c.started_at || c.initiated_at)}</td><td className="px-2 py-3"><button onClick={() => setNotesFor(c.id)} className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-bold ${c.notes || c.ticket_id ? "border-brand/40 text-brand" : "border-border text-inkSecondary"}`} data-testid={`row-notes-${c.id}`}>{c.ticket_id ? <Ticket className="size-3" /> : <NotebookPen className="size-3" />}{c.ticket_id ? "Ticket" : c.notes ? "Notes" : "Add"}</button></td></tr>)}
        {!calls.length && <tr><td colSpan="8" className="py-12 text-center text-sm text-inkSecondary">{providerReady ? "No carrier calls yet. Dial a number on the right or call your inbound number." : "Connect a carrier in the Telephony tab to see real calls here."}</td></tr>}
      </tbody></table></div>
    </div>
    <aside className="space-y-4">{notesFor && <CallNotesPanel call={calls.find((c) => c.id === notesFor)} onClose={() => setNotesFor(null)} onSaved={(updated) => { setCalls((cs) => cs.map((c) => (c.id === updated.id ? { ...c, ...updated } : c))); onCallsChanged?.(); }} />}<div className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex items-center gap-2"><Phone className="size-4 text-brand" /><p className="text-sm font-bold">Place a real call</p></div>
      <p className="mt-1 text-xs leading-5 text-inkSecondary">{providerReady ? "Calls go out from your carrier number." : "Connect a carrier first — this panel places live PSTN calls."}</p>
      <label className="mt-4 block text-xs font-bold text-inkSecondary">Destination<input value={to} onChange={(e) => setTo(e.target.value)} className="field mt-1 font-mono" placeholder="+14155550123" list="contact-phones" data-testid="dial-number-input" /></label>
      <datalist id="contact-phones">{contacts.filter((c) => c.phone).map((c) => <option key={c.id} value={c.phone}>{c.name}</option>)}</datalist>
      <div className="mt-3 grid grid-cols-2 gap-2">{[["agent", "Talk to me"], ["flow", "Run IVR flow"]].map(([id, label]) => <button key={id} onClick={() => setMode(id)} className={`rounded-xl border px-3 py-2 text-xs font-bold ${mode === id ? "border-brand bg-brand/5 text-brand" : "border-border"}`} data-testid={`dial-mode-${id}`}>{label}</button>)}</div>
      {mode === "flow" && <label className="mt-3 block text-xs font-bold text-inkSecondary">Flow<select value={flowId} onChange={(e) => setFlowId(e.target.value)} className="field mt-1" data-testid="dial-flow-select"><option value="">Published flow</option>{flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>}
      <button onClick={place} disabled={busy || !providerReady} className="mt-4 btn-primary w-full disabled:opacity-40" data-testid="dial-call-btn"><Phone className="size-4" />{mode === "agent" ? "Call now" : "Start IVR call"}</button>
      <p className="mt-3 text-[11px] leading-5 text-inkSecondary">“Talk to me” connects through your browser softphone when it is online, otherwise the carrier rings the customer and bridges your fallback number.</p>
    </div></aside>
  </section>;
}
