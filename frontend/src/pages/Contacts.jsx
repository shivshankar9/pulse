import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const emptyForm = { name: "", email: "", phone: "", company: "", title: "", status: "lead", source: "", notes: "", tags: [] };

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [scoringId, setScoringId] = useState(null);

    const load = async () => {
        const { data } = await api.get("/contacts");
        setContacts(data);
    };
    useEffect(() => { load(); }, []);

    const save = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/contacts/${editingId}`, form);
                toast.success("Contact updated");
            } else {
                await api.post("/contacts", form);
                toast.success("Contact created");
            }
            setOpen(false); setForm(emptyForm); setEditingId(null);
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const edit = (c) => {
        setForm({ ...emptyForm, ...c, tags: c.tags || [] });
        setEditingId(c.id);
        setOpen(true);
    };

    const remove = async (id) => {
        if (!window.confirm("Delete this contact?")) return;
        await api.delete(`/contacts/${id}`);
        toast.success("Deleted");
        load();
    };

    const scoreLead = async (id) => {
        setScoringId(id);
        try {
            await api.post("/ai/lead-score", { contact_id: id });
            toast.success("Lead scored");
            load();
        } catch (err) {
            toast.error("Scoring failed: " + (err.response?.data?.detail || ""));
        }
        setScoringId(null);
    };

    const scoreColor = (s) => {
        if (s == null) return "text-inkSecondary";
        if (s >= 70) return "text-brand";
        if (s >= 40) return "text-warn";
        return "text-inkSecondary";
    };

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="contacts-page">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// contacts.db</div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Contacts</h1>
                </div>
                <button
                    data-testid="contacts-new-btn"
                    onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}
                    className="bg-brand text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-ink transition-all"
                >
                    <Plus className="w-4 h-4" /> New contact
                </button>
            </div>

            <div className="bg-white border-2 border-ink overflow-x-auto">
                <table className="w-full text-sm" data-testid="contacts-table">
                    <thead>
                        <tr className="border-b-2 border-ink">
                            {["Name", "Company", "Title", "Status", "Score", "Actions"].map((h) => (
                                <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-inkSecondary">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {contacts.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-12 text-center text-inkSecondary">No contacts yet. Click "New contact" to get started.</td></tr>
                        )}
                        {contacts.map((c) => (
                            <tr key={c.id} className="border-b border-line hover:bg-bg" data-testid={`contact-row-${c.id}`}>
                                <td className="px-4 py-3 font-bold cursor-pointer" onClick={() => edit(c)}>
                                    {c.name}
                                    <div className="text-xs font-normal text-inkSecondary font-mono">{c.email}</div>
                                </td>
                                <td className="px-4 py-3">{c.company || "—"}</td>
                                <td className="px-4 py-3 text-inkSecondary">{c.title || "—"}</td>
                                <td className="px-4 py-3">
                                    <span className="inline-block border border-ink px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">{c.status}</span>
                                </td>
                                <td className={`px-4 py-3 font-mono font-bold ${scoreColor(c.score)}`}>
                                    {c.score != null ? c.score : "—"}
                                </td>
                                <td className="px-4 py-3">
                                    <div className="flex gap-2">
                                        <button
                                            data-testid={`contact-score-btn-${c.id}`}
                                            onClick={() => scoreLead(c.id)}
                                            disabled={scoringId === c.id}
                                            className="border-2 border-ink px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-brand hover:text-white hover:border-brand transition-colors flex items-center gap-1 disabled:opacity-50"
                                        >
                                            <Sparkles className="w-3 h-3" /> {scoringId === c.id ? "…" : "Score"}
                                        </button>
                                        <button
                                            data-testid={`contact-delete-btn-${c.id}`}
                                            onClick={() => remove(c.id)}
                                            className="border-2 border-ink px-2 py-1 text-[10px] hover:bg-bad hover:text-white hover:border-bad transition-colors"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Drawer */}
            {open && (
                <div className="fixed inset-0 bg-ink/40 z-40 flex justify-end" data-testid="contact-drawer">
                    <div className="w-full max-w-md bg-white border-l-2 border-ink p-6 overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading font-black text-2xl tracking-tighter">{editingId ? "Edit contact" : "New contact"}</h2>
                            <button data-testid="contact-drawer-close" onClick={() => setOpen(false)} className="border-2 border-ink p-1 hover:bg-ink hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={save} className="space-y-4">
                            {[
                                { k: "name", label: "Name *", required: true },
                                { k: "email", label: "Email", type: "email" },
                                { k: "phone", label: "Phone" },
                                { k: "company", label: "Company" },
                                { k: "title", label: "Title" },
                                { k: "source", label: "Source" },
                            ].map(({ k, label, type, required }) => (
                                <div key={k}>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">{label}</label>
                                    <input
                                        data-testid={`contact-input-${k}`}
                                        type={type || "text"} required={required}
                                        value={form[k] || ""} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                                        className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm"
                                    />
                                </div>
                            ))}
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Status</label>
                                <select
                                    data-testid="contact-input-status"
                                    value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                                    className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm"
                                >
                                    {["lead", "qualified", "customer", "lost"].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Notes</label>
                                <textarea
                                    data-testid="contact-input-notes"
                                    value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                                    rows={4}
                                    className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none"
                                />
                            </div>
                            <button
                                data-testid="contact-save-btn"
                                type="submit"
                                className="w-full bg-brand text-white px-5 py-3 font-bold uppercase tracking-widest text-sm brutal-shadow hover:bg-ink transition-all"
                            >
                                {editingId ? "Update" : "Create"}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contacts;
