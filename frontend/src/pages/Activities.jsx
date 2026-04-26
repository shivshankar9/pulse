import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2, Check } from "lucide-react";
import { toast } from "sonner";

const empty = { title: "", type: "task", contact_id: "", deal_id: "", due_date: "", completed: false, notes: "" };

const Activities = () => {
    const [items, setItems] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [deals, setDeals] = useState([]);
    const [form, setForm] = useState(empty);
    const [open, setOpen] = useState(false);

    const load = async () => {
        const [a, c, d] = await Promise.all([api.get("/activities"), api.get("/contacts"), api.get("/deals")]);
        setItems(a.data); setContacts(c.data); setDeals(d.data);
    };
    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, contact_id: form.contact_id || null, deal_id: form.deal_id || null, due_date: form.due_date || null };
            await api.post("/activities", payload);
            toast.success("Task created");
            setForm(empty); setOpen(false);
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const toggle = async (a) => {
        await api.put(`/activities/${a.id}`, { ...a, completed: !a.completed });
        load();
    };

    const remove = async (id) => {
        await api.delete(`/activities/${id}`);
        load();
    };

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="activities-page">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// tasks.queue</div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Activities</h1>
                </div>
                <button data-testid="activity-new-btn" onClick={() => setOpen(!open)} className="bg-brand text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-ink transition-all">
                    <Plus className="w-4 h-4" /> New task
                </button>
            </div>

            {open && (
                <form onSubmit={save} className="bg-white border-2 border-ink p-5 mb-6 grid grid-cols-1 md:grid-cols-6 gap-3" data-testid="activity-form">
                    <input data-testid="activity-input-title" required placeholder="Task title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    <select data-testid="activity-input-type" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                        {["task", "call", "meeting", "email"].map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input data-testid="activity-input-due" type="date" value={form.due_date || ""} onChange={(e) => setForm({ ...form, due_date: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    <select data-testid="activity-input-contact" value={form.contact_id || ""} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                        <option value="">— contact —</option>
                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                    <button data-testid="activity-save-btn" type="submit" className="bg-ink text-white px-4 py-2 font-bold text-xs uppercase tracking-widest hover:bg-brand transition-colors">Save</button>
                </form>
            )}

            <div className="bg-white border-2 border-ink">
                {items.length === 0 ? (
                    <div className="p-12 text-center text-inkSecondary">No tasks yet.</div>
                ) : items.map((a) => {
                    const contact = contacts.find((c) => c.id === a.contact_id);
                    const deal = deals.find((d) => d.id === a.deal_id);
                    return (
                        <div key={a.id} data-testid={`activity-row-${a.id}`} className={`flex items-center gap-4 px-5 py-3 border-b border-line last:border-b-0 hover:bg-bg ${a.completed ? "opacity-50" : ""}`}>
                            <button data-testid={`activity-toggle-${a.id}`} onClick={() => toggle(a)} className={`w-5 h-5 border-2 border-ink grid place-items-center ${a.completed ? "bg-brand text-white" : ""}`}>
                                {a.completed && <Check className="w-3 h-3" strokeWidth={3} />}
                            </button>
                            <div className="flex-1 min-w-0">
                                <div className={`font-bold text-sm ${a.completed ? "line-through" : ""}`}>{a.title}</div>
                                <div className="text-xs text-inkSecondary font-mono uppercase tracking-widest">
                                    {a.type}{contact ? ` · ${contact.name}` : ""}{deal ? ` · ${deal.title}` : ""}
                                </div>
                            </div>
                            <div className="font-mono text-xs text-inkSecondary">{a.due_date || "—"}</div>
                            <button data-testid={`activity-delete-${a.id}`} onClick={() => remove(a.id)} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Activities;
