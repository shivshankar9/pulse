import { useEffect, useState, useCallback } from "react";
import api from "../lib/api";
import { Plus, X, Trash2, TrendingUp, DollarSign, Target, Users } from "lucide-react";
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
            setOpenCreate(false); 
            setForm(emptyDeal);
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const onDrop = async (stage) => {
        if (!draggingId) return;
        const deal = deals.find((d) => d.id === draggingId);
        if (!deal || deal.stage === stage) { 
            setDraggingId(null); 
            setOverStage(null); 
            return; 
        }
        setDeals((prev) => prev.map((d) => d.id === draggingId ? { ...d, stage } : d));
        setDraggingId(null); 
        setOverStage(null);
        try {
            await api.patch(`/deals/${deal.id}/stage`, { stage });
        } catch {
            toast.error("Update failed");
            load();
        }
    };

    const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

    // Calculate stats
    const totalValue = deals.reduce((sum, d) => sum + (d.value || 0), 0);
    const wonDeals = deals.filter(d => d.stage === 'won');
    const wonValue = wonDeals.reduce((sum, d) => sum + (d.value || 0), 0);
    const activeDeals = deals.filter(d => !['won', 'lost'].includes(d.stage));

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="page-content p-4 sm:p-6 lg:p-10" data-testid="pipeline-page">
                {/* Enhanced Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-teal-50 to-cyan-50 rounded-t-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-teal-600 to-cyan-600 rounded-lg flex items-center justify-center shadow-lg">
                                            <TrendingUp className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            Sales Pipeline
                                        </h1>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-15">
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-teal-200 hover:shadow-md transition-shadow">
                                            <DollarSign className="w-3.5 h-3.5 text-teal-600" />
                                            <span className="font-semibold text-teal-700 text-xs sm:text-sm">{fmt(totalValue)}</span>
                                            <span className="text-teal-600 text-xs">Total</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                                            <Target className="w-3.5 h-3.5 text-green-600" />
                                            <span className="font-semibold text-green-700 text-xs sm:text-sm">{fmt(wonValue)}</span>
                                            <span className="text-green-600 text-xs">Won</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                                            <Users className="w-3.5 h-3.5 text-blue-600" />
                                            <span className="font-semibold text-blue-700 text-xs sm:text-sm">{activeDeals.length}</span>
                                            <span className="text-blue-600 text-xs">Active</span>
                                        </span>
                                    </div>
                                </div>
                                <button
                                    data-testid="pipeline-new-btn"
                                    onClick={() => { setForm(emptyDeal); setOpenCreate(true); }}
                                    className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Deal</span>
                                    <span className="sm:hidden">New</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile-First Kanban Board */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4" data-testid="pipeline-board">
                    {STAGES.map((s) => {
                        const stageDeals = deals.filter((d) => d.stage === s.id);
                        const stageValue = stageDeals.reduce((sum, d) => sum + (d.value || 0), 0);
                        
                        const stageColors = {
                            lead: "from-gray-50 to-gray-100 border-gray-300",
                            qualified: "from-blue-50 to-blue-100 border-blue-300",
                            proposal: "from-purple-50 to-purple-100 border-purple-300",
                            negotiation: "from-yellow-50 to-yellow-100 border-yellow-300",
                            won: "from-green-50 to-green-100 border-green-300",
                            lost: "from-red-50 to-red-100 border-red-300"
                        };

                        return (
                            <div
                                key={s.id}
                                data-testid={`pipeline-column-${s.id}`}
                                onDragOver={(e) => { e.preventDefault(); setOverStage(s.id); }}
                                onDragLeave={() => setOverStage(null)}
                                onDrop={() => onDrop(s.id)}
                                className={`bg-white border-2 rounded-xl min-h-[300px] sm:min-h-[400px] flex flex-col shadow-md hover:shadow-lg transition-all ${
                                    overStage === s.id ? "border-teal-500 bg-gradient-to-r from-teal-50 to-cyan-50 shadow-lg" : stageColors[s.id]
                                }`}
                            >
                                <div className="border-b border-gray-200 p-3 sm:p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-t-xl">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-gray-700">{s.label}</span>
                                        <span className="bg-white px-2 py-1 rounded-full text-xs font-semibold text-gray-600 border border-gray-200 shadow-sm">
                                            {stageDeals.length}
                                        </span>
                                    </div>
                                    <div className="text-xs sm:text-sm font-bold text-gray-800">{fmt(stageValue)}</div>
                                </div>
                                <div className="p-2 sm:p-3 flex-1 space-y-2 sm:space-y-3">
                                    {stageDeals.map((d) => (
                                        <div
                                            key={d.id}
                                            draggable
                                            onDragStart={() => setDraggingId(d.id)}
                                            onDragEnd={() => { setDraggingId(null); setOverStage(null); }}
                                            onClick={() => setDrawerDeal(d)}
                                            data-testid={`deal-card-${d.id}`}
                                            className={`bg-white border-2 border-gray-200 rounded-lg p-3 cursor-pointer hover:shadow-md transition-all hover:border-gray-300 ${
                                                draggingId === d.id ? "opacity-40 scale-95" : "hover:scale-[1.02]"
                                            }`}
                                        >
                                            <div className="font-semibold text-sm leading-tight mb-2 text-gray-900">{d.title}</div>
                                            {d.company && (
                                                <div className="text-xs text-gray-600 mb-2 bg-gray-50 px-2 py-1 rounded-md inline-block">
                                                    {d.company}
                                                </div>
                                            )}
                                            <div className="font-bold text-sm text-teal-700">{fmt(d.value)}</div>
                                        </div>
                                    ))}
                                    {stageDeals.length === 0 && (
                                        <div className="text-center py-8 text-gray-500">
                                            <div className="text-xs">No deals in {s.label.toLowerCase()}</div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Mobile-Responsive Create Deal Modal */}
                {openCreate && (
                    <div className="fixed inset-0 bg-black/40 z-40 flex items-end sm:items-center justify-center p-4" data-testid="deal-create-drawer">
                        <div className="w-full max-w-md bg-white rounded-t-xl sm:rounded-xl shadow-2xl max-h-[90vh] overflow-y-auto">
                            <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 rounded-t-xl">
                                <div className="flex items-center justify-between">
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">New Deal</h2>
                                    <button 
                                        data-testid="deal-create-close" 
                                        onClick={() => setOpenCreate(false)} 
                                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-600" />
                                    </button>
                                </div>
                            </div>
                            <form onSubmit={save} className="p-4 sm:p-6 space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Deal Title *</label>
                                    <input 
                                        data-testid="deal-input-title" 
                                        required 
                                        value={form.title} 
                                        onChange={(e) => setForm({ ...form, title: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                        placeholder="Enter deal title"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                                    <select 
                                        data-testid="deal-input-contact" 
                                        value={form.contact_id || ""} 
                                        onChange={(e) => setForm({ ...form, contact_id: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm hover:border-gray-300 transition-colors"
                                    >
                                        <option value="">Select contact (optional)</option>
                                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Company</label>
                                    <input 
                                        data-testid="deal-input-company" 
                                        value={form.company || ""} 
                                        onChange={(e) => setForm({ ...form, company: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                        placeholder="Company name"
                                    />
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Value (USD)</label>
                                        <input 
                                            data-testid="deal-input-value" 
                                            type="number" 
                                            min="0" 
                                            value={form.value} 
                                            onChange={(e) => setForm({ ...form, value: e.target.value })} 
                                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                            placeholder="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">Stage</label>
                                        <select 
                                            data-testid="deal-input-stage" 
                                            value={form.stage} 
                                            onChange={(e) => setForm({ ...form, stage: e.target.value })} 
                                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 text-sm shadow-sm hover:border-gray-300 transition-colors"
                                        >
                                            {STAGES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Notes</label>
                                    <textarea 
                                        data-testid="deal-input-notes" 
                                        rows={3} 
                                        value={form.notes || ""} 
                                        onChange={(e) => setForm({ ...form, notes: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors resize-none"
                                        placeholder="Additional notes..."
                                    />
                                </div>
                                <button 
                                    data-testid="deal-save-btn" 
                                    type="submit" 
                                    className="w-full bg-gradient-to-r from-teal-600 to-cyan-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-teal-700 hover:to-cyan-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    Create Deal
                                </button>
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
        </div>
    );
};

export default Pipeline;
