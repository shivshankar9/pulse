import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { Plus, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import DealDrawer from "../components/app/DealDrawer";

const STAGES = [
    { id: "lead", label: "Lead" },
    { id: "qualified", label: "Qualified" },
    { id: "proposal", label: "Proposal" },
    { id: "negotiation", label: "Negotiation" },
    { id: "won", label: "Won" },
    { id: "lost", label: "Lost" },
];

const emptyDeal = { title: "", contact_id: "", company: "", value: 0, currency: "USD", stage: "lead", expected_close: "", notes: "", probability: 20 };

const Pipeline = () => {
    const [deals, setDeals] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [openCreate, setOpenCreate] = useState(false);
    const [form, setForm] = useState(emptyDeal);
    const [draggingId, setDraggingId] = useState(null);
    const [overStage, setOverStage] = useState(null);
    const [drawerDeal, setDrawerDeal] = useState(null);

    const load = useCallback(async () => {
        const [d, c] = await Promise.all([api.get("/deals"), api.get("/contacts")]);
        setDeals(d.data);
        setContacts(c.data);
        if (drawerDeal) {
            const updated = d.data.find((x) => x.id === drawerDeal.id);
            if (updated) setDrawerDeal(updated);
        }
    }, [drawerDeal]);
    useEffect(() => { load(); }, [load]);

    const save = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...form, value: Number(form.value) || 0, probability: Number(form.probability) || 0, contact_id: form.contact_id || null };
            await api.post("/deals", payload);
            toast.success("Deal created");
            setOpenCreate(false); setForm(emptyDeal);
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const onDrop = async (stage) => {
        if (!draggingId) return;
        const deal = deals.find((d) => d.id === draggingId);
        if (!deal || deal.stage === stage) { setDraggingId(null); setOverStage(null); return; }
        setDeals((prev) => prev.map((d) => d.id === draggingId ? { ...d, stage } : d));
        setDraggingId(null); setOverStage(null);
        try {
            await api.patch(`/deals/${deal.id}/stage`, { stage });
        } catch {
            toast.error("Update failed");
            load();
        }
    };

    const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

    return (
        <div className="p-6 md:p-10" data-testid="pipeline-page">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// pipeline.kanban</div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Pipeline</h1>
                </div>
                <button
                    data-testid="pipeline-new-btn"
                    onClick={() => { setForm(emptyDeal); setOpenCreate(true); }}
                    className="bg-brand text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-ink transition-all"
                >
                    <Plus className="w-4 h-4" /> New deal
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4" data-testid="pipeline-board">
                {STAGES.map((s) => {
                    const stageDeals = deals.filter((d) => d.stage === s.id);
                    const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                    return (
                        <div
                            key={s.id}
                            data-testid={`pipeline-column-${s.id}`}
                            onDragOver={(e) => { e.preventDefault(); setOverStage(s.id); }}
                            onDragLeave={() => setOverStage(null)}
                            onDrop={() => onDrop(s.id)}
                            className={`bg-white border-2 border-ink min-h-[400px] flex flex-col ${overStage === s.id ? "border-brand bg-brand/5" : ""}`}
                        >
                            <div className="border-b-2 border-ink p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{s.label}</span>
                                    <span className="font-mono text-xs text-inkSecondary">{stageDeals.length}</span>
                                </div>
                                <div className="font-mono text-xs text-inkSecondary mt-1">{fmt(stageValue)}</div>
                            </div>
                            <div className="p-2 flex-1 space-y-2">
                                {stageDeals.map((d) => (
                                    <div
                                        key={d.id}
                                        draggable
                                        onDragStart={() => setDraggingId(d.id)}
                                        onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                                        onClick={() => setDrawerDeal(d)}
                                        data-testid={`deal-card-${d.id}`}
                                        className={`bg-bg border-2 border-ink p-3 cursor-grab active:cursor-grabbing brutal-hover ${draggingId === d.id ? "opacity-40" : ""}`}
                                    >
                                        <div className="font-bold text-sm leading-tight mb-1">{d.title}</div>
                                        {d.company && <div className="text-xs text-inkSecondary">{d.company}</div>}
                                        <div className="font-mono text-sm font-bold mt-2">{fmt(d.value)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {openCreate && (
                <div className="fixed inset-0 bg-ink/40 z-40 flex justify-end" data-testid="deal-create-drawer">
                    <div className="w-full max-w-md bg-white border-l-2 border-ink p-6 overflow-y-auto animate-fade-in">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="font-heading font-black text-2xl tracking-tighter">New deal</h2>
                            <button data-testid="deal-create-close" onClick={() => setOpenCreate(false)} className="border-2 border-ink p-1 hover:bg-ink hover:text-white"><X className="w-4 h-4" /></button>
                        </div>
                        <form onSubmit={save} className="space-y-4">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Title *</label>
                                <input data-testid="deal-input-title" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Contact</label>
                                <select data-testid="deal-input-contact" value={form.contact_id || ""} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                                    <option value="">— none —</option>
                                    {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Company</label>
                                <input data-testid="deal-input-company" value={form.company || ""} onChange={(e) => setForm({ ...form, company: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Value (USD)</label>
                                    <input data-testid="deal-input-value" type="number" min="0" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Stage</label>
                                    <select data-testid="deal-input-stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                                        {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Notes</label>
                                <textarea data-testid="deal-input-notes" rows={3} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                            </div>
                            <button data-testid="deal-save-btn" type="submit" className="w-full bg-brand text-white px-5 py-3 font-bold uppercase tracking-widest text-sm brutal-shadow hover:bg-ink transition-all">Create</button>
                        </form>
                    </div>
                </div>
            )}

            {drawerDeal && (
                <DealDrawer
                    deal={drawerDeal}
                    contacts={contacts}
                    onClose={() => setDrawerDeal(null)}
                    onUpdate={() => load()}
                    onDelete={() => { setDrawerDeal(null); load(); }}
                />
            )}
        </div>
    );
};

export default Pipeline;
