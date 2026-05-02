import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { Send, Sparkles, RefreshCw, Search, Filter, User, Calendar, Zap, X, Plus } from "lucide-react";
import { toast } from "sonner";

const Emails = () => {
    const [emails, setEmails] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [cannedResponses, setCannedResponses] = useState([]);
    const [form, setForm] = useState({ contact_id: "", to: "", subject: "", body: "" });
    const [drafting, setDrafting] = useState(false);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [intent, setIntent] = useState("");
    const [search, setSearch] = useState("");
    const [contactFilter, setContactFilter] = useState("all");
    const [showTemplates, setShowTemplates] = useState(false);
    const [showCanned, setShowCanned] = useState(false);

    const load = useCallback(async () => {
        try {
            const [e, c, t, cr] = await Promise.all([
                api.get("/emails"), 
                api.get("/contacts"),
                api.get("/email-templates").catch(() => ({ data: [] })),
                api.get("/canned-responses").catch(() => ({ data: [] }))
            ]);
            setEmails(e.data || []); 
            setContacts(c.data || []);
            setTemplates(t.data || []);
            setCannedResponses(cr.data || []);
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load emails");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { 
        load(); 
        // Auto-refresh every 2 minutes
        const interval = setInterval(load, 120000);
        return () => clearInterval(interval);
    }, [load]);

    // Filter emails
    const filteredEmails = useMemo(() => {
        if (!emails || emails.length === 0) return [];
        return emails.filter(email => {
            if (!email) return false;
            
            const matchesSearch = !search || 
                (email.subject && email.subject.toLowerCase().includes(search.toLowerCase())) ||
                (email.to && email.to.toLowerCase().includes(search.toLowerCase())) ||
                (email.body && email.body.toLowerCase().includes(search.toLowerCase()));
            
            const matchesContact = contactFilter === "all" || 
                email.contact_id === contactFilter;
            
            return matchesSearch && matchesContact;
        });
    }, [emails, search, contactFilter]);

    const onSelectContact = (id) => {
        const c = contacts.find((x) => x.id === id);
        setForm({ ...form, contact_id: id, to: c?.email || form.to });
    };

    const draft = async () => {
        if (!intent) { toast.error("Describe the intent first"); return; }
        setDrafting(true);
        try {
            const { data } = await api.post("/ai/draft-email", { contact_id: form.contact_id || null, intent });
            setForm({ ...form, subject: data.subject, body: data.body });
            toast.success("Draft generated");
        } catch (err) {
            toast.error("Draft failed: " + (err.response?.data?.detail || ""));
        }
        setDrafting(false);
    };

    const send = async (e) => {
        e.preventDefault();
        if (!form.to.trim() || !form.subject.trim() || !form.body.trim()) {
            toast.error("Please fill in all required fields");
            return;
        }
        
        setSending(true);
        try {
            await api.post("/emails", { ...form, contact_id: form.contact_id || null });
            toast.success("Email logged successfully");
            setForm({ contact_id: "", to: "", subject: "", body: "" });
            setIntent("");
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to send email");
        } finally {
            setSending(false);
        }
    };

    const applyTemplate = (template) => {
        setForm({ ...form, subject: template.subject, body: template.body });
        setShowTemplates(false);
        toast.success("Template applied");
    };

    const applyCannedResponse = (canned) => {
        setForm({ ...form, body: canned.body });
        setShowCanned(false);
        toast.success("Quick response applied");
    };

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Email Outreach</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {filteredEmails.length} of {emails.length} emails
                        </p>
                    </div>
                    <button
                        onClick={() => load(false)}
                        className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-200 flex items-center gap-2"
                    >
                        <RefreshCw className="w-4 h-4" />
                        Refresh
                    </button>
                </div>

                {/* Filters */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                    <div className="relative flex-1 min-w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search emails, subjects, or recipients..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={contactFilter}
                            onChange={(e) => setContactFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">All Contacts</option>
                            {contacts.map(contact => (
                                <option key={contact.id} value={contact.id}>{contact.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Composer */}
                <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
                    <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Compose Email</h2>
                        
                        <form onSubmit={send} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Contact</label>
                                <select 
                                    value={form.contact_id} 
                                    onChange={(e) => onSelectContact(e.target.value)} 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="">Select contact (optional)</option>
                                    {contacts.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">To *</label>
                                <input 
                                    type="email" 
                                    required 
                                    value={form.to} 
                                    onChange={(e) => setForm({ ...form, to: e.target.value })} 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="recipient@example.com"
                                />
                            </div>

                            {/* AI Drafting */}
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    <span className="text-sm font-medium text-blue-900">AI Assistant</span>
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        placeholder="Describe your intent: e.g., follow up after demo" 
                                        value={intent} 
                                        onChange={(e) => setIntent(e.target.value)} 
                                        className="flex-1 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    />
                                    <button 
                                        type="button" 
                                        onClick={draft} 
                                        disabled={drafting || !intent.trim()} 
                                        className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {drafting ? "Drafting..." : "Draft"}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplates(true)}
                                    className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                                >
                                    <User className="w-4 h-4" />
                                    Templates
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCanned(true)}
                                    className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                                >
                                    <Zap className="w-4 h-4" />
                                    Quick Text
                                </button>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                <input 
                                    required 
                                    value={form.subject} 
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                    placeholder="Email subject"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Body *</label>
                                <textarea 
                                    required 
                                    rows={12} 
                                    value={form.body} 
                                    onChange={(e) => setForm({ ...form, body: e.target.value })} 
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm resize-none"
                                    placeholder="Email content..."
                                />
                            </div>

                            <button 
                                type="submit" 
                                disabled={sending}
                                className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {sending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        Sending...
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-4 h-4" />
                                        Log Email
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </div>

                {/* Email Log */}
                <div className="w-1/2 bg-white overflow-y-auto">
                    <div className="p-6 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Email History</h2>
                    </div>
                    <div className="divide-y divide-gray-200">
                        {filteredEmails.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">
                                <Send className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>No emails found</p>
                            </div>
                        ) : (
                            filteredEmails.map((email) => (
                                <div key={email.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <div className="font-medium text-gray-900 truncate flex-1 mr-3">
                                            {email.subject}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 flex-shrink-0">
                                            <Calendar className="w-3 h-3" />
                                            {new Date(email.sent_at).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                        To: {email.to}
                                    </div>
                                    <div className="text-sm text-gray-500 line-clamp-3">
                                        {email.body}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Template Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
                            <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {templates.length === 0 ? (
                            <div className="text-center py-8">
                                <User className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No templates available</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => applyTemplate(template)}
                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900 mb-1">{template.name}</div>
                                        <div className="text-sm text-gray-600 mb-1">{template.subject}</div>
                                        <div className="text-xs text-gray-500 line-clamp-2">{template.body}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Canned Response Modal */}
            {showCanned && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Quick Text</h3>
                            <button onClick={() => setShowCanned(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {cannedResponses.length === 0 ? (
                            <div className="text-center py-8">
                                <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500">No quick text available</p>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                {cannedResponses.map((canned) => (
                                    <button
                                        key={canned.id}
                                        onClick={() => applyCannedResponse(canned)}
                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900 mb-1">{canned.name}</div>
                                        <div className="text-sm text-gray-600">{canned.body}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Emails;
