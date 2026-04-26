import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2, MessageSquarePlus, Send, AlertTriangle, Lock, Globe, Sparkles } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["open", "pending", "resolved", "closed"];
const PRIORITY = ["low", "medium", "high", "urgent"];

const priorityColor = (p) => ({ low: "text-inkSecondary", medium: "text-ink", high: "text-warn", urgent: "text-bad" }[p] || "text-ink");
const statusColor = (s) => ({ open: "bg-bad text-white", pending: "bg-warn text-ink", resolved: "bg-ok text-white", closed: "bg-ink text-white" }[s] || "bg-bg");

const slaState = (t) => {
    if (!t || t.status === "resolved" || t.status === "closed") return null;
    const now = new Date();
    const fr = t.first_response_due_at ? new Date(t.first_response_due_at) : null;
    const res = t.resolution_due_at ? new Date(t.resolution_due_at) : null;
    if (!t.first_responded_at && fr) {
        if (now > fr) return { kind: "breach-fr", label: "FR breached" };
        const mins = Math.round((fr - now) / 60000);
        return { kind: "fr", label: `FR ${mins}m` };
    }
    if (res) {
        if (now > res) return { kind: "breach-res", label: "RES breached" };
        const mins = Math.round((res - now) / 60000);
        return { kind: "res", label: `RES ${mins}m` };
    }
    return null;
};

const empty = { subject: "", description: "", contact_id: "", status: "open", priority: "medium", channel: "internal", custom: {} };

const Tickets = () => {
    const [tickets, setTickets] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [users, setUsers] = useState([]);
    const [groups, setGroups] = useState([]);
    const [fields, setFields] = useState([]);
    const [canned, setCanned] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [selected, setSelected] = useState(null);
    const [comment, setComment] = useState("");
    const [internal, setInternal] = useState(false);
    const [showCanned, setShowCanned] = useState(false);
    const [aiBusy, setAiBusy] = useState(false);

    const load = async () => {
        const [t, c, u, g, f, cn] = await Promise.all([
            api.get("/tickets"), api.get("/contacts"),
            api.get("/users").catch(() => ({ data: [] })),
            api.get("/groups").catch(() => ({ data: [] })),
            api.get("/ticket-fields").catch(() => ({ data: [] })),
            api.get("/canned-responses").catch(() => ({ data: [] })),
        ]);
        setTickets(t.data); setContacts(c.data); setUsers(u.data); setGroups(g.data); setFields(f.data); setCanned(cn.data);
        if (selected) {
            const upd = t.data.find(x => x.id === selected.id);
            if (upd) setSelected(upd);
        }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            await api.post("/tickets", { ...form, contact_id: form.contact_id || null });
            toast.success("Ticket created");
            setForm(empty); setOpen(false); load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const updateField = async (t, patch) => {
        await api.put(`/tickets/${t.id}`, { ...t, ...patch });
        load();
    };

    const assign = async (t, patch) => {
        await api.patch(`/tickets/${t.id}/assign`, patch);
        load();
    };

    const remove = async (id) => {
        if (!window.confirm("Delete?")) return;
        await api.delete(`/tickets/${id}`);
        if (selected?.id === id) setSelected(null);
        load();
    };

    const addComment = async () => {
        if (!comment.trim() || !selected) return;
        await api.post(`/tickets/${selected.id}/comments`, { body: comment, internal });
        setComment(""); setInternal(false);
        load();
    };

    const aiDraft = async () => {
        if (!selected) return;
        setAiBusy(true);
        try {
            const ctx = `Ticket: ${selected.subject}\nDescription: ${selected.description}\nChannel: ${selected.channel}`;
            const { data } = await api.post("/ai/summarize", { text: `Draft a friendly first reply for this ticket:\n${ctx}` });
            setComment(data.summary);
            toast.success("AI draft ready");
        } catch (err) {
            toast.error("AI failed");
        }
        setAiBusy(false);
    };

    const userById = (id) => users.find((u) => u.id === id);

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="tickets-page">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// support.queue</div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Tickets</h1>
                </div>
                <button data-testid="ticket-new-btn" onClick={() => setOpen(!open)} className="bg-brand text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-ink transition-all">
                    <Plus className="w-4 h-4" /> New ticket
                </button>
            </div>

            {open && (
                <form onSubmit={save} className="bg-white border-2 border-ink p-5 mb-6 grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="ticket-form">
                    <input data-testid="ticket-input-subject" required placeholder="Subject" value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    <textarea data-testid="ticket-input-description" rows={3} placeholder="Describe…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                    <select data-testid="ticket-input-contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none text-sm">
                        <option value="">— linked contact —</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select data-testid="ticket-input-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none text-sm">
                        {PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {/* Custom fields in form */}
                    {fields.map((f) => (
                        <div key={f.id} className="md:col-span-1">
                            <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">{f.label}{f.required && " *"}</label>
                            {f.type === "select" ? (
                                <select data-testid={`ticket-cf-${f.key}`} required={f.required} value={form.custom[f.key] || ""} onChange={(e) => setForm({ ...form, custom: { ...form.custom, [f.key]: e.target.value } })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none text-sm">
                                    <option value="">—</option>
                                    {(f.options || []).map((o) => <option key={o} value={o}>{o}</option>)}
                                </select>
                            ) : f.type === "checkbox" ? (
                                <input data-testid={`ticket-cf-${f.key}`} type="checkbox" checked={!!form.custom[f.key]} onChange={(e) => setForm({ ...form, custom: { ...form.custom, [f.key]: e.target.checked } })} className="w-4 h-4 accent-brand" />
                            ) : (
                                <input data-testid={`ticket-cf-${f.key}`} type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"} required={f.required} value={form.custom[f.key] || ""} onChange={(e) => setForm({ ...form, custom: { ...form.custom, [f.key]: e.target.value } })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none text-sm" />
                            )}
                        </div>
                    ))}
                    <button data-testid="ticket-save-btn" type="submit" className="md:col-span-2 bg-ink text-white px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-brand">Create ticket</button>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border-2 border-ink overflow-hidden">
                    {tickets.length === 0 ? (
                        <div className="p-12 text-center text-inkSecondary">No tickets yet.</div>
                    ) : tickets.map((t) => {
                        const sla = slaState(t);
                        const owner = userById(t.assignee_id);
                        return (
                            <div key={t.id} data-testid={`ticket-row-${t.id}`} onClick={() => setSelected(t)} className={`border-b border-line last:border-b-0 p-4 cursor-pointer hover:bg-bg ${selected?.id === t.id ? "bg-brand/5 border-l-4 border-l-brand" : ""}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center flex-wrap gap-2 mb-1">
                                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusColor(t.status)}`}>{t.status}</span>
                                            <span className={`text-[10px] font-mono uppercase tracking-widest ${priorityColor(t.priority)}`}>● {t.priority}</span>
                                            {t.channel && t.channel !== "internal" && <span className="text-[10px] font-mono uppercase tracking-widest border border-ink px-1.5">{t.channel}</span>}
                                            {sla && (
                                                <span className={`text-[10px] font-mono uppercase tracking-widest px-1.5 flex items-center gap-1 ${sla.kind.startsWith("breach") ? "bg-bad text-white" : "border border-warn text-warn"}`}>
                                                    {sla.kind.startsWith("breach") && <AlertTriangle className="w-3 h-3" />} {sla.label}
                                                </span>
                                            )}
                                            {owner && <span className="text-[10px] font-mono uppercase tracking-widest text-brand">@{owner.name.split(" ")[0]}</span>}
                                        </div>
                                        <div className="font-bold text-sm truncate">{t.subject}</div>
                                        <div className="text-xs text-inkSecondary mt-1 line-clamp-2">{t.description}</div>
                                    </div>
                                    <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} data-testid={`ticket-delete-${t.id}`} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3.5 h-3.5" /></button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="bg-white border-2 border-ink p-5 sticky top-6 h-fit">
                    {selected ? (
                        <>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mb-2">// ticket detail</div>
                            <h3 className="font-heading font-black text-xl tracking-tighter mb-3">{selected.subject}</h3>
                            <p className="text-sm text-inkSecondary mb-4 whitespace-pre-wrap">{selected.description}</p>

                            <div className="grid grid-cols-2 gap-2 mb-3">
                                <select data-testid="ticket-detail-status" value={selected.status} onChange={(e) => updateField(selected, { status: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs">
                                    {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select data-testid="ticket-detail-priority" value={selected.priority} onChange={(e) => updateField(selected, { priority: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs">
                                    {PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                                <select data-testid="ticket-detail-assignee" value={selected.assignee_id || ""} onChange={(e) => assign(selected, { assignee_id: e.target.value || null })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs col-span-2">
                                    <option value="">— assign agent —</option>
                                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                                <select data-testid="ticket-detail-group" value={selected.group_id || ""} onChange={(e) => assign(selected, { group_id: e.target.value || null })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs col-span-2">
                                    <option value="">— group —</option>
                                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                                </select>
                            </div>

                            {/* Custom fields display */}
                            {fields.length > 0 && (
                                <div className="bg-bg border-l-2 border-brand p-2 mb-3 space-y-1">
                                    {fields.map((f) => (
                                        <div key={f.id} className="text-xs flex justify-between">
                                            <span className="text-inkSecondary uppercase tracking-widest text-[10px]">{f.label}:</span>
                                            <span className="font-mono">{String(selected.custom?.[f.key] ?? "—")}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {selected.requester_email && (
                                <div className="text-xs text-inkSecondary mb-3 font-mono">From: {selected.requester_name} ({selected.requester_email})</div>
                            )}

                            <div className="border-t border-line pt-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary mb-2 flex items-center gap-1">
                                    <MessageSquarePlus className="w-3 h-3" /> Comments
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                                    {(selected.comments || []).map((c) => (
                                        <div key={c.id} className={`border-l-2 p-2 ${c.internal ? "bg-warn/10 border-warn" : "bg-bg border-brand"}`}>
                                            <div className="text-[10px] font-mono uppercase text-inkSecondary flex items-center gap-2">
                                                {c.internal ? <Lock className="w-3 h-3 text-warn" /> : <Globe className="w-3 h-3 text-brand" />}
                                                {c.author} · {new Date(c.created_at).toLocaleString()}
                                                {c.internal && <span className="text-warn">internal</span>}
                                            </div>
                                            <div className="text-xs mt-1 whitespace-pre-wrap">{c.body}</div>
                                        </div>
                                    ))}
                                    {(selected.comments || []).length === 0 && <div className="text-xs text-inkSecondary">No comments yet.</div>}
                                </div>

                                {/* Composer */}
                                <div className="space-y-2">
                                    <div className="flex gap-1 flex-wrap">
                                        <button data-testid="comment-toggle-internal" onClick={() => setInternal(!internal)} className={`text-[10px] font-bold uppercase tracking-widest border-2 px-2 py-1 flex items-center gap-1 ${internal ? "bg-warn text-ink border-warn" : "border-ink text-ink hover:bg-ink hover:text-white"}`}>
                                            {internal ? <Lock className="w-3 h-3" /> : <Globe className="w-3 h-3" />} {internal ? "Internal" : "Public"}
                                        </button>
                                        <button data-testid="comment-canned-toggle" onClick={() => setShowCanned(!showCanned)} className="text-[10px] font-bold uppercase tracking-widest border-2 border-ink px-2 py-1 hover:bg-ink hover:text-white">Canned ({canned.length})</button>
                                        <button data-testid="comment-ai-draft" onClick={aiDraft} disabled={aiBusy} className="text-[10px] font-bold uppercase tracking-widest border-2 border-brand px-2 py-1 text-brand hover:bg-brand hover:text-white flex items-center gap-1 disabled:opacity-50">
                                            <Sparkles className="w-3 h-3" /> {aiBusy ? "…" : "AI draft"}
                                        </button>
                                    </div>
                                    {showCanned && (
                                        <div className="bg-bg border border-ink p-2 max-h-40 overflow-y-auto" data-testid="canned-picker">
                                            {canned.length === 0 && <div className="text-xs text-inkSecondary">Add canned responses in Settings → Helpdesk.</div>}
                                            {canned.map((c) => (
                                                <button key={c.id} data-testid={`canned-pick-${c.id}`} onClick={() => { setComment(c.body); setShowCanned(false); }} className="block w-full text-left text-xs border-b border-line py-2 hover:bg-white px-2">
                                                    <span className="font-bold">{c.name}</span> {c.shortcut && <span className="font-mono text-brand text-[10px]">{c.shortcut}</span>}
                                                    <div className="text-inkSecondary line-clamp-1">{c.body}</div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                    <textarea data-testid="ticket-comment-input" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder={internal ? "Internal note (only your team sees this)…" : "Public reply…"} className="w-full bg-bg border-2 border-ink px-2 py-1.5 text-xs outline-none focus:border-brand resize-none" />
                                    <button data-testid="ticket-comment-send" onClick={addComment} className="w-full bg-brand text-white px-3 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink flex items-center justify-center gap-2">
                                        <Send className="w-3 h-3" /> {internal ? "Add note" : "Send reply"}
                                    </button>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-sm text-inkSecondary text-center py-8">Select a ticket to view details</div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Tickets;
