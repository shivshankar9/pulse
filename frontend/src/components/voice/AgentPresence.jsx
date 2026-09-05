import { useEffect, useState } from "react";
import { Headphones, Users } from "lucide-react";
import api from "../../lib/api";

export function usePresence(intervalMs = 15000) {
  const [agents, setAgents] = useState([]);
  useEffect(() => {
    let alive = true;
    const load = async () => { try { const { data } = await api.get("/voice/presence"); if (alive) setAgents(data); } catch { /* silent */ } };
    load(); const t = setInterval(load, intervalMs);
    return () => { alive = false; clearInterval(t); };
  }, [intervalMs]);
  return agents;
}

export const presenceTone = (a) => (a?.online ? "bg-emerald-500" : a?.status === "away" ? "bg-amber-400" : "bg-slate-300");

export function AgentPresence({ compact = false }) {
  const agents = usePresence();
  const online = agents.filter((a) => a.online);
  return <div className="rounded-2xl border border-border bg-surface p-5" data-testid="agent-presence">
    <div className="flex items-center justify-between"><div><p className="text-sm font-bold">Agents online</p><p className="mt-1 text-xs text-inkSecondary">Queues only ring available agents; offline agents are skipped.</p></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-bold text-emerald-700" data-testid="agents-online-count"><Users className="size-3" />{online.length}/{agents.length}</span></div>
    <div className={`mt-4 grid gap-2 ${compact ? "" : "sm:grid-cols-2"}`}>{agents.slice(0, compact ? 6 : 12).map((a) => <div key={a.id} className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2" data-testid={`presence-${a.id}`}><span className={`size-2.5 rounded-full ${presenceTone(a)}`} /><div className="min-w-0 flex-1"><p className="truncate text-xs font-bold">{a.name}</p><p className="truncate text-[10px] text-inkSecondary">{a.online ? (a.softphone ? "Available · softphone" : "Available") : a.status === "away" ? "Away" : "Offline"}</p></div>{a.softphone && a.online && <Headphones className="size-3.5 text-emerald-600" />}</div>)}{!agents.length && <p className="text-xs text-inkSecondary">No team members yet.</p>}</div>
  </div>;
}
