import { useEffect, useState } from "react";
import api from "../lib/api";
import { Plus, Trash2, Check, X, Calendar, CheckCircle, Clock, User, Building } from "lucide-react";
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

    // Calculate stats
    const completedTasks = items.filter(a => a.completed).length;
    const pendingTasks = items.filter(a => !a.completed).length;
    const overdueTasks = items.filter(a => !a.completed && a.due_date && new Date(a.due_date) < new Date()).length;
    const todayTasks = items.filter(a => {
        if (!a.due_date) return false;
        const today = new Date().toDateString();
        return new Date(a.due_date).toDateString() === today;
    }).length;

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="p-4 sm:p-6 md:p-10 max-w-[1400px]" data-testid="activities-page">
                {/* Enhanced Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-orange-600 to-amber-600 rounded-lg flex items-center justify-center shadow-lg">
                                            <CheckCircle className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            Activities
                                        </h1>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-15">
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-orange-200 hover:shadow-md transition-shadow">
                                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                                            <span className="font-semibold text-orange-700 text-xs sm:text-sm">{pendingTasks}</span>
                                            <span className="text-orange-600 text-xs">Pending</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                                            <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                            <span className="font-semibold text-green-700 text-xs sm:text-sm">{completedTasks}</span>
                                            <span className="text-green-600 text-xs">Done</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                                            <Calendar className="w-3.5 h-3.5 text-blue-600" />
                                            <span className="font-semibold text-blue-700 text-xs sm:text-sm">{todayTasks}</span>
                                            <span className="text-blue-600 text-xs">Today</span>
                                        </span>
                                        {overdueTasks > 0 && (
                                            <span className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white px-2 sm:px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                                <span className="font-bold text-xs sm:text-sm">{overdueTasks}</span>
                                                <span className="font-medium text-xs">Overdue</span>
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <button 
                                    data-testid="activity-new-btn" 
                                    onClick={() => setOpen(!open)} 
                                    className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">New Task</span>
                                    <span className="sm:hidden">New</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile-Responsive Create Form */}
                {open && (
                    <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 mb-6 shadow-md" data-testid="activity-form">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-gray-900">Create New Task</h3>
                            <button 
                                onClick={() => setOpen(false)}
                                className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                            >
                                <X className="w-4 h-4 text-gray-600" />
                            </button>
                        </div>
                        <form onSubmit={save} className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Task Title *</label>
                                    <input 
                                        data-testid="activity-input-title" 
                                        required 
                                        placeholder="Enter task title" 
                                        value={form.title} 
                                        onChange={(e) => setForm({ ...form, title: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Type</label>
                                    <select 
                                        data-testid="activity-input-type" 
                                        value={form.type} 
                                        onChange={(e) => setForm({ ...form, type: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm shadow-sm hover:border-gray-300 transition-colors"
                                    >
                                        <option value="task">Task</option>
                                        <option value="call">Call</option>
                                        <option value="meeting">Meeting</option>
                                        <option value="email">Email</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Due Date</label>
                                    <input 
                                        data-testid="activity-input-due" 
                                        type="date" 
                                        value={form.due_date || ""} 
                                        onChange={(e) => setForm({ ...form, due_date: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                    />
                                </div>
                                <div className="sm:col-span-2">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Contact</label>
                                    <select 
                                        data-testid="activity-input-contact" 
                                        value={form.contact_id || ""} 
                                        onChange={(e) => setForm({ ...form, contact_id: e.target.value })} 
                                        className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm shadow-sm hover:border-gray-300 transition-colors"
                                    >
                                        <option value="">Select contact (optional)</option>
                                        {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <button 
                                data-testid="activity-save-btn" 
                                type="submit" 
                                className="w-full sm:w-auto bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all"
                            >
                                Create Task
                            </button>
                        </form>
                    </div>
                )}

                {/* Mobile-Responsive Task List */}
                <div className="bg-white border-2 border-gray-200 rounded-xl shadow-md overflow-hidden">
                    {items.length === 0 ? (
                        <div className="p-8 sm:p-12 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-amber-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <CheckCircle className="w-10 h-10 text-orange-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No Tasks Yet</h3>
                            <p className="text-gray-600 mb-4">Create your first task to get started with activity tracking</p>
                            <button
                                onClick={() => setOpen(true)}
                                className="bg-gradient-to-r from-orange-600 to-amber-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-orange-700 hover:to-amber-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 mx-auto"
                            >
                                <Plus className="w-5 h-5" />
                                Create Task
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {items.map((a) => {
                                const contact = contacts.find((c) => c.id === a.contact_id);
                                const deal = deals.find((d) => d.id === a.deal_id);
                                const isOverdue = !a.completed && a.due_date && new Date(a.due_date) < new Date();
                                const isToday = a.due_date && new Date(a.due_date).toDateString() === new Date().toDateString();
                                
                                return (
                                    <div 
                                        key={a.id} 
                                        data-testid={`activity-row-${a.id}`} 
                                        className={`p-4 sm:p-6 hover:bg-gradient-to-r hover:from-orange-50 hover:to-amber-50 transition-all duration-200 ${
                                            a.completed ? "opacity-60" : ""
                                        } ${isOverdue ? "bg-red-50 border-l-4 border-l-red-500" : ""}`}
                                    >
                                        <div className="flex items-start gap-3 sm:gap-4">
                                            <button 
                                                data-testid={`activity-toggle-${a.id}`} 
                                                onClick={() => toggle(a)} 
                                                className={`w-5 h-5 sm:w-6 sm:h-6 border-2 rounded-lg flex items-center justify-center transition-all flex-shrink-0 mt-0.5 ${
                                                    a.completed 
                                                        ? "bg-gradient-to-br from-green-600 to-green-700 border-green-600 text-white shadow-md" 
                                                        : "border-gray-300 hover:border-orange-500 hover:bg-orange-50"
                                                }`}
                                            >
                                                {a.completed && <Check className="w-3 h-3 sm:w-4 sm:h-4" strokeWidth={3} />}
                                            </button>
                                            <div className="flex-1 min-w-0">
                                                <div className={`font-semibold text-sm sm:text-base text-gray-900 mb-1 ${a.completed ? "line-through" : ""}`}>
                                                    {a.title}
                                                </div>
                                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-semibold ${
                                                        a.type === 'call' ? 'bg-blue-100 text-blue-700' :
                                                        a.type === 'meeting' ? 'bg-purple-100 text-purple-700' :
                                                        a.type === 'email' ? 'bg-green-100 text-green-700' :
                                                        'bg-gray-100 text-gray-700'
                                                    }`}>
                                                        {a.type.charAt(0).toUpperCase() + a.type.slice(1)}
                                                    </span>
                                                    {contact && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                                            <User className="w-3 h-3" />
                                                            {contact.name}
                                                        </span>
                                                    )}
                                                    {deal && (
                                                        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-gray-100 text-gray-700">
                                                            <Building className="w-3 h-3" />
                                                            {deal.title}
                                                        </span>
                                                    )}
                                                </div>
                                                {a.due_date && (
                                                    <div className={`text-xs flex items-center gap-1 ${
                                                        isOverdue ? 'text-red-600 font-semibold' :
                                                        isToday ? 'text-orange-600 font-semibold' :
                                                        'text-gray-500'
                                                    }`}>
                                                        <Calendar className="w-3 h-3" />
                                                        Due: {new Date(a.due_date).toLocaleDateString()}
                                                        {isOverdue && <span className="text-red-600 font-bold ml-1">(Overdue)</span>}
                                                        {isToday && <span className="text-orange-600 font-bold ml-1">(Today)</span>}
                                                    </div>
                                                )}
                                            </div>
                                            <button 
                                                data-testid={`activity-delete-${a.id}`} 
                                                onClick={() => remove(a.id)} 
                                                className="text-gray-400 hover:text-red-600 p-1 rounded transition-colors flex-shrink-0"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Activities;
