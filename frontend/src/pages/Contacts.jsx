import { useEffect, useState, useMemo } from "react";
import api from "../lib/api";
import { Plus, Sparkles, Trash2, X, Upload, Search, Save, Bookmark, Users, Phone } from "lucide-react";
import { dialNumber } from "../lib/dialer";
import { toast } from "sonner";

const emptyForm = { name: "", email: "", phone: "", company: "", title: "", status: "lead", source: "", notes: "", tags: [] };

const Contacts = () => {
    const [contacts, setContacts] = useState([]);
    const [open, setOpen] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [scoringId, setScoringId] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [views, setViews] = useState([]);
    const [showSaveView, setShowSaveView] = useState(false);
    const [viewName, setViewName] = useState("");
    const [importing, setImporting] = useState(false);

    const load = async () => {
        const [c, v] = await Promise.all([api.get("/contacts"), api.get("/views")]);
        setContacts(c.data);
        setViews(v.data.filter((x) => x.entity === "contacts"));
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

    const onImport = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setImporting(true);
        try {
            const fd = new FormData();
            fd.append("file", file);
            const { data } = await api.post("/contacts/import", fd, { headers: { "Content-Type": "multipart/form-data" } });
            toast.success(`Imported ${data.created} contacts${data.errors.length ? ` (${data.errors.length} errors)` : ""}`);
            load();
        } catch (err) {
            toast.error("Import failed: " + (err.response?.data?.detail || ""));
        }
        setImporting(false);
        e.target.value = "";
    };

    const saveView = async () => {
        if (!viewName.trim()) return;
        try {
            await api.post("/views", { name: viewName, entity: "contacts", filters: { search, statusFilter } });
            toast.success("View saved");
            setViewName(""); setShowSaveView(false);
            load();
        } catch (err) {
            toast.error("Save failed");
        }
    };

    const applyView = (v) => {
        setSearch(v.filters?.search || "");
        setStatusFilter(v.filters?.statusFilter || "all");
    };

    const deleteView = async (id) => {
        await api.delete(`/views/${id}`);
        load();
    };

    const filtered = useMemo(() => {
        return contacts.filter((c) => {
            if (statusFilter !== "all" && c.status !== statusFilter) return false;
            if (search) {
                const q = search.toLowerCase();
                return [c.name, c.email, c.company, c.title].some((f) => (f || "").toLowerCase().includes(q));
            }
            return true;
        });
    }, [contacts, search, statusFilter]);

    const scoreColor = (s) => {
        if (s == null) return "text-gray-500";
        if (s >= 70) return "text-green-600 font-bold";
        if (s >= 40) return "text-yellow-600 font-semibold";
        return "text-gray-500";
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="page-content p-4 sm:p-6 lg:p-10" data-testid="contacts-page">
                {/* Enhanced Header */}
                <div className="mb-6">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-6 py-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                                            <Users className="w-7 h-7 text-white" />
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            Contacts
                                        </h1>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 ml-15">
                                        <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
                                            <Users className="w-3.5 h-3.5 text-purple-600" />
                                            <span className="font-semibold text-purple-700">{contacts.length}</span>
                                            <span className="text-purple-600 text-xs">Total</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                                            <span className="font-semibold text-blue-700">{filtered.length}</span>
                                            <span className="text-blue-600 text-xs">Filtered</span>
                                        </span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    <label data-testid="contacts-import-btn" className="bg-white border-2 border-gray-200 px-4 py-2.5 rounded-lg font-semibold flex items-center gap-2 cursor-pointer hover:shadow-md transition-all text-sm">
                                        <Upload className="w-4 h-4" /> {importing ? "Importing..." : "Import CSV"}
                                        <input type="file" accept=".csv" className="hidden" onChange={onImport} disabled={importing} />
                                    </label>
                                    <button
                                        data-testid="contacts-new-btn"
                                        onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}
                                        className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2.5 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all text-sm"
                                    >
                                        <Plus className="w-4 h-4" /> New Contact
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            {/* Filters bar */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-4 mb-4 shadow-sm" data-testid="contacts-filter-bar">
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input 
                            data-testid="contacts-search" 
                            placeholder="Search name, email, company..." 
                            value={search} 
                            onChange={(e) => setSearch(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                        />
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                        <select 
                            data-testid="contacts-status-filter" 
                            value={statusFilter} 
                            onChange={(e) => setStatusFilter(e.target.value)} 
                            className="bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium shadow-sm hover:border-gray-300 transition-colors"
                        >
                            <option value="all">All Status</option>
                            {["lead", "qualified", "customer", "lost"].map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                        </select>

                        {views.map((v) => (
                            <button 
                                key={v.id} 
                                data-testid={`view-apply-${v.id}`} 
                                onClick={() => applyView(v)} 
                                className="border-2 border-purple-200 bg-purple-50 px-4 py-3 rounded-lg text-sm font-semibold hover:bg-purple-100 hover:border-purple-300 flex items-center gap-2 transition-all shadow-sm"
                            >
                                <Bookmark className="w-4 h-4 text-purple-600" /> {v.name}
                                <X 
                                    data-testid={`view-delete-${v.id}`} 
                                    onClick={(e) => { e.stopPropagation(); deleteView(v.id); }} 
                                    className="w-4 h-4 ml-1 hover:text-red-600 transition-colors" 
                                />
                            </button>
                        ))}
                        
                        <button 
                            data-testid="contacts-save-view-btn" 
                            onClick={() => setShowSaveView(!showSaveView)} 
                            className="border-2 border-gray-200 bg-white px-4 py-3 rounded-lg text-sm font-semibold hover:shadow-md transition-all flex items-center gap-2"
                        >
                            <Save className="w-4 h-4" /> Save View
                        </button>
                    </div>
                </div>
                
                {showSaveView && (
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-200">
                        <input 
                            data-testid="view-name-input" 
                            placeholder="View name" 
                            value={viewName} 
                            onChange={(e) => setViewName(e.target.value)} 
                            className="flex-1 bg-white border-2 border-gray-200 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm"
                        />
                        <button 
                            data-testid="view-save-confirm" 
                            onClick={saveView} 
                            className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-md hover:shadow-lg transition-all"
                        >
                            Save
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white rounded-xl border-2 border-gray-200 overflow-hidden shadow-md">
                <table className="w-full text-sm" data-testid="contacts-table">
                    <thead>
                        <tr className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-gray-200">
                            {["Name", "Company", "Title", "Status", "Score", "Actions"].map((h) => (
                                <th key={h} className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-700">{h}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 && (
                            <tr>
                                <td colSpan={6} className="px-6 py-16">
                                    <div className="flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-pink-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                            <Users className="w-10 h-10 text-purple-600" />
                                        </div>
                                        <h3 className="text-lg font-bold text-gray-900 mb-2">No Contacts Found</h3>
                                        <p className="text-gray-600 mb-4">
                                            {search || statusFilter !== "all" 
                                                ? "Try adjusting your filters" 
                                                : "Add your first contact to get started"}
                                        </p>
                                        {!search && statusFilter === "all" && (
                                            <button
                                                onClick={() => { setForm(emptyForm); setEditingId(null); setOpen(true); }}
                                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                            >
                                                <Plus className="w-5 h-5" />
                                                Add Contact
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                        {filtered.map((c) => (
                            <tr key={c.id} className="border-b border-gray-100 hover:bg-gradient-to-r hover:from-purple-50 hover:to-pink-50 transition-all duration-200" data-testid={`contact-row-${c.id}`}>
                                <td className="px-6 py-4 font-semibold cursor-pointer" onClick={() => edit(c)}>
                                    {c.name}
                                    <div className="text-xs font-normal text-gray-600">{c.email}</div>
                                </td>
                                <td className="px-6 py-4 text-gray-700">{c.company || "—"}</td>
                                <td className="px-6 py-4 text-gray-600">{c.title || "—"}</td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border-2 bg-gradient-to-r from-gray-50 to-gray-100 border-gray-300 text-gray-700">
                                        {c.status}
                                    </span>
                                </td>
                                <td className={`px-6 py-4 text-lg ${scoreColor(c.score)}`}>
                                    {c.score != null ? c.score : "—"}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex gap-2">
                                        {c.phone && <button data-testid={`contact-call-btn-${c.id}`} onClick={() => dialNumber({ to: c.phone, contactId: c.id, name: c.name })} title={`Call ${c.phone}`} className="p-2 rounded-lg border-2 border-emerald-500 text-emerald-600 hover:bg-emerald-50 transition-colors"><Phone className="w-4 h-4" /></button>}
                                        <button
                                            data-testid={`contact-score-btn-${c.id}`}
                                            onClick={() => scoreLead(c.id)}
                                            disabled={scoringId === c.id}
                                            className="border-2 border-purple-200 bg-purple-50 px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-purple-100 hover:border-purple-300 transition-all flex items-center gap-1.5 disabled:opacity-50 shadow-sm"
                                        >
                                            <Sparkles className="w-3.5 h-3.5 text-purple-600" /> {scoringId === c.id ? "..." : "Score"}
                                        </button>
                                        <button
                                            data-testid={`contact-delete-btn-${c.id}`}
                                            onClick={() => remove(c.id)}
                                            className="border-2 border-red-200 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 hover:border-red-300 transition-all shadow-sm"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 text-red-600" />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

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
    </div>
    );
};

export default Contacts;
