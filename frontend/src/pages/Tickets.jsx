import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2, MessageSquarePlus, Send } from "lucide-react";
import { toast } from "sonner";

const STATUS = ["open", "pending", "resolved", "closed"];
const PRIORITY = ["low", "medium", "high", "urgent"];

const priorityColor = (p) => ({
    low: "text-inkSecondary",
    medium: "text-ink",
    high: "text-warn",
    urgent: "text-bad",
}[p] || "text-ink");

const statusColor = (s) => ({
    open: "bg-bad text-white",
    pending: "bg-warn text-ink",
    resolved: "bg-ok text-white",
    closed: "bg-ink text-white",
}[s] || "bg-bg");

const empty = { subject: "", description: "", contact_id: "", status: "open", priority: "medium" };

const Tickets = () => {
    const [tickets, setTickets] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(empty);
    const [selected, setSelected] = useState(null);
    const [comment, setComment] = useState("");

    const load = async () => {
        const [t, c] = await Promise.all([api.get("/tickets"), api.get("/contacts")]);
        setTickets(t.data); setContacts(c.data);
        if (selected) {
            const updated = t.data.find((x) => x.id === selected.id);
            if (updated) setSelected(updated);
        }
    };
    useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, contact_id: form.contact_id || null };
            await api.post("/tickets", payload);
            toast.success("Ticket created");
            setForm(empty); setOpen(false); load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const updateStatus = async (t, status) => {
        await api.put(`/tickets/${t.id}`, { ...t, status });
        load();
    };

    const updatePriority = async (t, priority) => {
        await api.put(`/tickets/${t.id}`, { ...t, priority });
        load();
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this ticket?")) return;
        await api.delete(`/tickets/${id}`);
        if (selected?.id === id) setSelected(null);
        load();
    };

    const addComment = async () => {
        if (!comment.trim() || !selected) return;
        await api.post(`/tickets/${selected.id}/comments`, { body: comment });
        setComment("");
        load();
    };

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
                    <textarea data-testid="ticket-input-description" rows={3} placeholder="Describe the issue…" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                    <select data-testid="ticket-input-contact" value={form.contact_id} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                        <option value="">— linked contact —</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <select data-testid="ticket-input-priority" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                        {PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <button data-testid="ticket-save-btn" type="submit" className="md:col-span-2 bg-ink text-white px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-brand transition-colors">Create ticket</button>
                </form>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white border-2 border-ink overflow-hidden">
                    {tickets.length === 0 ? (
                        <div className="p-12 text-center text-inkSecondary">No tickets yet.</div>
                    ) : tickets.map((t) => (
                        <div
                            key={t.id} data-testid={`ticket-row-${t.id}`}
                            onClick={() => setSelected(t)}
                            className={`border-b border-line last:border-b-0 p-4 cursor-pointer hover:bg-bg ${selected?.id === t.id ? "bg-brand/5 border-l-4 border-l-brand" : ""}`}
                        >
                            <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${statusColor(t.status)}`}>{t.status}</span>
                                        <span className={`text-[10px] font-mono uppercase tracking-widest ${priorityColor(t.priority)}`}>● {t.priority}</span>
                                        {t.channel && t.channel !== "internal" && <span className="text-[10px] font-mono uppercase tracking-widest border border-ink px-1.5">{t.channel}</span>}
                                    </div>
                                    <div className="font-bold text-sm truncate">{t.subject}</div>
                                    <div className="text-xs text-inkSecondary mt-1 line-clamp-2">{t.description}</div>
                                </div>
                                <button onClick={(e) => { e.stopPropagation(); remove(t.id); }} data-testid={`ticket-delete-${t.id}`} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="bg-white border-2 border-ink p-5 sticky top-6 h-fit">
                    {selected ? (
                        <>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mb-2">// ticket detail</div>
                            <h3 className="font-heading font-black text-xl tracking-tighter mb-3">{selected.subject}</h3>
                            <p className="text-sm text-inkSecondary mb-4 whitespace-pre-wrap">{selected.description}</p>
                            <div className="grid grid-cols-2 gap-2 mb-4">
                                <select data-testid="ticket-detail-status" value={selected.status} onChange={(e) => updateStatus(selected, e.target.value)} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs">
                                    {STATUS.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                                <select data-testid="ticket-detail-priority" value={selected.priority} onChange={(e) => updatePriority(selected, e.target.value)} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs">
                                    {PRIORITY.map((p) => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                            {selected.requester_email && (
                                <div className="text-xs text-inkSecondary mb-3 font-mono">From: {selected.requester_name} ({selected.requester_email})</div>
                            )}
                            <div className="border-t border-line pt-3 mb-3">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary mb-2 flex items-center gap-1">
                                    <MessageSquarePlus className="w-3 h-3" /> Comments
                                </div>
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-3">
                                    {(selected.comments || []).map((c) => (
                                        <div key={c.id} className="bg-bg border-l-2 border-brand p-2">
                                            <div className="text-[10px] font-mono uppercase text-inkSecondary">{c.author} · {new Date(c.created_at).toLocaleString()}</div>
                                            <div className="text-xs mt-1 whitespace-pre-wrap">{c.body}</div>
                                        </div>
                                    ))}
                                    {(selected.comments || []).length === 0 && <div className="text-xs text-inkSecondary">No comments yet.</div>}
                                </div>
                                <div className="flex gap-2">
                                    <input data-testid="ticket-comment-input" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment…" className="flex-1 bg-bg border-2 border-ink px-2 py-1.5 text-xs outline-none focus:border-brand" />
                                    <button data-testid="ticket-comment-send" onClick={addComment} className="bg-ink text-white px-3 hover:bg-brand"><Send className="w-3.5 h-3.5" /></button>
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
