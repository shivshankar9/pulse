import { useEffect, useRef, useState } from "react";
import { Device } from "@twilio/voice-sdk";
import { toast } from "sonner";
import { Mic, MicOff, Phone, PhoneIncoming, PhoneOff, Headphones, ChevronDown, ChevronUp, NotebookPen } from "lucide-react";
import { toast as notify } from "sonner";
import api from "../../lib/api";
import { setSoftphoneReady } from "../../lib/dialer";

const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

export function SoftphoneDock() {
  const device = useRef(null);
  const call = useRef(null);
  const [state, setState] = useState("offline");
  const [enabled, setEnabled] = useState(false);
  const [to, setTo] = useState("");
  const [label, setLabel] = useState("");
  const [muted, setMuted] = useState(false);
  const [open, setOpen] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [available, setAvailable] = useState(true);
  const [note, setNote] = useState("");
  const availableRef = useRef(true);
  const enabledRef = useRef(false);

  const heartbeat = async (status) => { try { await api.post("/voice/presence", { status: status || (availableRef.current ? "online" : "away"), softphone: enabledRef.current }); } catch { /* silent */ } };

  const bind = (c, name) => {
    call.current = c;
    setLabel(name || c.parameters?.From || "");
    c.on("accept", () => { setState("connected"); setSeconds(0); });
    c.on("disconnect", () => { setState("ready"); call.current = null; setMuted(false); });
    c.on("cancel", () => { setState("ready"); call.current = null; });
    c.on("reject", () => { setState("ready"); call.current = null; });
    c.on("error", (e) => { toast.error(e.message || "Call error"); setState("ready"); });
  };

  useEffect(() => {
    let alive = true;
    const getToken = async () => (await api.get("/voice/token")).data.token;
    (async () => {
      try {
        const { data } = await api.get("/voice/settings");
        if (!data.softphone_ready) return;
        const d = new Device(await getToken(), { tokenRefreshMs: 30000, closeProtection: true });
        device.current = d;
        d.on("registered", () => { if (!alive) return; setState("ready"); setEnabled(true); enabledRef.current = true; setSoftphoneReady(true); heartbeat("online"); });
        d.on("unregistered", () => { if (alive) { setState("offline"); heartbeat("offline"); } });
        d.on("error", (e) => { console.error(e); if (alive) setState("error"); });
        d.on("tokenWillExpire", async () => d.updateToken(await getToken()));
        d.on("incoming", (c) => { bind(c, c.parameters?.From); setState("incoming"); setOpen(true); });
        await d.register();
      } catch (e) { console.warn("softphone unavailable", e?.message); }
    })();
    const onDial = (evt) => { setOpen(true); setTo(evt.detail.to); dial(evt.detail.to, evt.detail.name); };
    window.addEventListener("pulse:dial", onDial);
    const beat = setInterval(() => enabledRef.current && heartbeat(), 30000);
    const bye = () => enabledRef.current && heartbeat("offline");
    window.addEventListener("beforeunload", bye);
    return () => { alive = false; clearInterval(beat); window.removeEventListener("beforeunload", bye); window.removeEventListener("pulse:dial", onDial); bye(); setSoftphoneReady(false); device.current?.destroy(); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleAvailable = async () => { const next = !available; setAvailable(next); availableRef.current = next; await heartbeat(next ? "online" : "away"); notify.success(next ? "You are available for queue calls" : "You are away — queues will skip you"); };
  const saveNote = async () => { if (!note.trim()) return; try { const { data } = await api.get("/voice/calls/live"); const target = data[0]; if (!target) return notify.error("No live call to attach the note to"); await api.patch(`/voice/calls/${target.id}/notes`, { notes: `${target.notes ? target.notes + "\n" : ""}${note.trim()}` }); setNote(""); notify.success("Note saved to the call"); } catch (e) { notify.error(e.response?.data?.detail || "Could not save note"); } };

  useEffect(() => {
    if (state !== "connected") return;
    const t = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [state]);

  const dial = async (number, name) => {
    if (!device.current || !number) return;
    try {
      setState("calling");
      const c = await device.current.connect({ params: { To: number } });
      bind(c, name || number);
    } catch (e) { toast.error(e.message || "Unable to start call"); setState("ready"); }
  };
  const hangup = () => { call.current?.disconnect(); call.current?.reject?.(); };
  const accept = () => call.current?.accept();
  const toggleMute = () => { if (!call.current) return; call.current.mute(!muted); setMuted(!muted); };
  const sendDigit = (d) => call.current?.sendDigits(d);

  if (!enabled) return null;
  const busy = ["calling", "connected", "incoming"].includes(state);
  const tone = { ready: "bg-emerald-500", connected: "bg-emerald-500 animate-pulse", calling: "bg-amber-500 animate-pulse", incoming: "bg-blue-500 animate-pulse", offline: "bg-slate-400", error: "bg-red-500" }[state];

  return <div className="fixed bottom-20 right-4 z-50 w-[300px] md:bottom-5" data-testid="softphone-dock">
    <div className="overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between px-4 py-3" data-testid="softphone-toggle">
        <span className="flex items-center gap-2 text-xs font-bold"><Headphones className="size-4 text-brand" />Softphone<span className={`size-2 rounded-full ${tone}`} /><span className="text-[10px] font-semibold uppercase tracking-wider text-inkSecondary">{state}</span></span>
        {open ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
      </button>
      {open && <div className="border-t border-border p-4">
        <button onClick={toggleAvailable} className={`mb-3 flex w-full items-center justify-between rounded-xl border px-3 py-2 text-xs font-bold ${available ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-700"}`} data-testid="softphone-availability"><span>{available ? "Available for queue calls" : "Away — queues skip me"}</span><span className={`size-2.5 rounded-full ${available ? "bg-emerald-500" : "bg-amber-400"}`} /></button>
        {state === "incoming" && <div className="mb-3 rounded-xl bg-blue-50 p-3"><p className="flex items-center gap-2 text-xs font-bold text-blue-700"><PhoneIncoming className="size-4" />Incoming call</p><p className="mt-1 font-mono text-sm">{label}</p><div className="mt-3 flex gap-2"><button onClick={accept} className="btn-primary flex-1" data-testid="softphone-accept"><Phone className="size-4" />Answer</button><button onClick={hangup} className="rounded-xl bg-red-600 px-4 text-xs font-bold text-white" data-testid="softphone-reject">Reject</button></div></div>}
        {busy && state !== "incoming" && <div className="mb-3 rounded-xl bg-bg p-3"><p className="truncate text-sm font-bold">{label || to}</p><p className="font-mono text-[11px] text-inkSecondary">{state === "connected" ? `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}` : "Connecting…"}</p></div>}
        {!busy && <div className="flex gap-2"><input value={to} onChange={(e) => setTo(e.target.value)} placeholder="+14155550123" className="field flex-1 font-mono" data-testid="softphone-number-input" /><button onClick={() => dial(to)} className="btn-primary" data-testid="softphone-call-btn"><Phone className="size-4" /></button></div>}
        {state === "connected" && <div className="mt-3 grid grid-cols-3 gap-1.5">{keys.map((k) => <button key={k} onClick={() => sendDigit(k)} className="rounded-lg border border-border py-2 text-sm font-bold hover:border-brand hover:text-brand">{k}</button>)}</div>}
        {state === "connected" && <div className="mt-3 flex gap-2"><input value={note} onChange={(e) => setNote(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveNote()} placeholder="Quick note for this call…" className="field flex-1" data-testid="softphone-note-input" /><button onClick={saveNote} className="btn-secondary" aria-label="Save note" data-testid="softphone-note-save"><NotebookPen className="size-4" /></button></div>}
        {busy && state !== "incoming" && <div className="mt-3 flex gap-2"><button onClick={toggleMute} className="btn-secondary flex-1" data-testid="softphone-mute">{muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}{muted ? "Unmute" : "Mute"}</button><button onClick={hangup} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white" data-testid="softphone-hangup"><PhoneOff className="size-4" />Hang up</button></div>}
      </div>}
    </div>
  </div>;
}
