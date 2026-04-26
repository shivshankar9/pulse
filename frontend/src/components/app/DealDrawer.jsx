import { useState } from "react";
import api from "../../lib/api";
import { X, Sparkles, MessageSquare } from "lucide-react";
import { toast } from "sonner";

const DealDrawer = ({ deal, contacts, onClose, onUpdate, onDelete }) => {
    const [tab, setTab] = useState("details");
    const [form, setForm] = useState({ ...deal });
    const [insight, setInsight] = useState("");
    const [loading, setLoading] = useState(false);

    if (!deal) return null;

    const save = async () => {
        try {
            const payload = { ...form, value: Number(form.value) || 0, probability: Number(form.probability) || 0, contact_id: form.contact_id || null };
            await api.put(`/deals/${deal.id}`, payload);
            toast.success("Deal updated");
            onUpdate();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const runInsight = async () => {
        setLoading(true);
        try {
            const { data } = await api.post("/ai/deal-insight", { deal_id: deal.id });
            setInsight(data.insight);
        } catch (err) {
            toast.error("AI failed: " + (err.response?.data?.detail || ""));
        }
        setLoading(false);
    };

    const remove = async () => {
        if (!window.confirm("Delete this deal?")) return;
        await api.delete(`/deals/${deal.id}`);
        toast.success("Deleted");
        onDelete();
    };

    const STAGES = ["lead", "qualified", "proposal", "negotiation", "won", "lost"];

    return (
        <div className="fixed inset-0 bg-ink/40 z-40 flex justify-end" data-testid="deal-drawer">
            <div className="w-full max-w-lg bg-white border-l-2 border-ink overflow-y-auto animate-fade-in">
                <div className="p-6 border-b-2 border-ink flex items-center justify-between sticky top-0 bg-white z-10">
                    <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary">// deal</div>
                        <h2 className="font-heading font-black text-2xl tracking-tighter">{deal.title}</h2>
                    </div>
                    <button data-testid="deal-drawer-close" onClick={onClose} className="border-2 border-ink p-1 hover:bg-ink hover:text-white"><X className="w-4 h-4" /></button>
                </div>

                <div className="flex gap-px bg-ink border-b-2 border-ink">
                    {[
                        { id: "details", label: "Details" },
                        { id: "ai", label: "AI Insight", icon: Sparkles },
                    ].map((t) => (
                        <button
                            key={t.id}
                            data-testid={`deal-tab-${t.id}`}
                            onClick={() => setTab(t.id)}
                            className={`flex-1 px-4 py-3 text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 ${tab === t.id ? "bg-brand text-white" : "bg-white hover:bg-bg"}`}
                        >
                            {t.icon && <t.icon className="w-3.5 h-3.5" />} {t.label}
                        </button>
                    ))}
                </div>

                {tab === "details" && (
                    <div className="p-6 space-y-4">
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Title</label>
                            <input data-testid="deal-edit-title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Value</label>
                                <input data-testid="deal-edit-value" type="number" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Stage</label>
                                <select data-testid="deal-edit-stage" value={form.stage} onChange={(e) => setForm({ ...form, stage: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                                    {STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Contact</label>
                            <select data-testid="deal-edit-contact" value={form.contact_id || ""} onChange={(e) => setForm({ ...form, contact_id: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                                <option value="">— none —</option>
                                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Notes</label>
                            <textarea data-testid="deal-edit-notes" rows={4} value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                        </div>
                        <div className="flex gap-2">
                            <button data-testid="deal-save-edit" onClick={save} className="flex-1 bg-brand text-white px-4 py-3 font-bold uppercase tracking-widest text-xs brutal-shadow hover:bg-ink transition-all">Save</button>
                            <button data-testid="deal-delete" onClick={remove} className="border-2 border-ink px-4 py-3 font-bold uppercase tracking-widest text-xs hover:bg-bad hover:text-white hover:border-bad">Delete</button>
                        </div>
                    </div>
                )}

                {tab === "ai" && (
                    <div className="p-6">
                        <div className="bg-brand/10 border-2 border-brand p-4 mb-4">
                            <div className="text-[11px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2">
                                <MessageSquare className="w-3 h-3" /> agent_strategist // claude-sonnet-4.5
                            </div>
                            <p className="text-sm text-inkSecondary">Get a strategic readout: risk, win probability, blockers, and the next 3 moves.</p>
                        </div>
                        <button data-testid="deal-run-insight" onClick={runInsight} disabled={loading} className="bg-ink text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-brand transition-all disabled:opacity-50 mb-4">
                            <Sparkles className="w-4 h-4" /> {loading ? "Thinking…" : "Run insight"}
                        </button>
                        {insight && (
                            <pre data-testid="deal-insight-output" className="font-mono text-sm whitespace-pre-wrap leading-relaxed bg-bg border-2 border-ink p-4">{insight}</pre>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default DealDrawer;
