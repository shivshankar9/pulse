import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { 
    Send, Sparkles, RefreshCw, Search, Filter, User, Calendar, Zap, X, Plus,
    Mail, MailOpen, Inbox, Reply, Forward, Archive, Trash2,
    Clock, AlertCircle, CheckCircle, Eye, Edit, Paperclip, Download
} from "lucide-react";
import { toast } from "sonner";

const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
};

const Emails = () => {
    const [allEmails, setAllEmails] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [cannedResponses, setCannedResponses] = useState([]);
    const [selectedEmail, setSelectedEmail] = useState(null);
    const [form, setForm] = useState({ contact_id: "", to: "", subject: "", body: "" });
    const [drafting, setDrafting] = useState(false);
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [intent, setIntent] = useState("");
    const [search, setSearch] = useState("");
    const [directionFilter, setDirectionFilter] = useState("all");
    const [contactFilter, setContactFilter] = useState("all");
    const [showComposer, setShowComposer] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showCanned, setShowCanned] = useState(false);

    const load = useCallback(async () => {
        try {
            const [outbound, inbound, c, t, cr] = await Promise.all([
                api.get("/emails"), // Sent emails
                api.get("/emails/inbound").catch(() => ({ data: [] })), // Received emails
                api.get("/contacts"),
                api.get("/email-templates").catch(() => ({ data: [] })),
                api.get("/canned-responses").catch(() => ({ data: [] }))
            ]);
            
            // Combine and sort all emails by date
            const combined = [
                ...(outbound.data || []).map(e => ({ ...e, direction: 'outbound' })),
                ...(inbound.data || []).map(e => ({ ...e, direction: 'inbound' }))
            ].sort((a, b) => {
                const dateA = new Date(a.sent_at || a.received_at || a.created_at);
                const dateB = new Date(b.sent_at || b.received_at || b.created_at);
                return dateB - dateA; // Most recent first
            });
            
            setAllEmails(combined);
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
        // Auto-refresh every 30 seconds for real-time email updates
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    // Filter emails
    const filteredEmails = useMemo(() => {
        if (!allEmails || allEmails.length === 0) return [];
        return allEmails.filter(email => {
            if (!email) return false;
            
            const matchesSearch = !search || 
                (email.subject && email.subject.toLowerCase().includes(search.toLowerCase())) ||
                (email.to && email.to.toLowerCase().includes(search.toLowerCase())) ||
                (email.from_email && email.from_email.toLowerCase().includes(search.toLowerCase())) ||
                (email.body && email.body.toLowerCase().includes(search.toLowerCase()));
            
            const matchesDirection = directionFilter === "all" || email.direction === directionFilter;
            
            const matchesContact = contactFilter === "all" || 
                email.contact_id === contactFilter;
            
            return matchesSearch && matchesDirection && matchesContact;
        });
    }, [allEmails, search, directionFilter, contactFilter]);

    // Email stats
    const stats = useMemo(() => {
        const total = allEmails.length;
        const inbound = allEmails.filter(e => e.direction === 'inbound').length;
        const outbound = allEmails.filter(e => e.direction === 'outbound').length;
        const today = new Date().toDateString();
        const todayEmails = allEmails.filter(e => {
            const emailDate = new Date(e.sent_at || e.received_at || e.created_at).toDateString();
            return emailDate === today;
        }).length;
        return { total, inbound, outbound, today: todayEmails };
    }, [allEmails]);

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
            toast.success("Email sent successfully");
            setForm({ contact_id: "", to: "", subject: "", body: "" });
            setIntent("");
            setShowComposer(false);
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

    const replyToEmail = (email) => {
        const replySubject = email.subject.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
        const replyTo = email.direction === 'inbound' ? email.from_email : email.to;
        
        setForm({
            contact_id: email.contact_id || "",
            to: replyTo,
            subject: replySubject,
            body: `\n\n--- Original Message ---\nFrom: ${email.from_email || email.to}\nSubject: ${email.subject}\n\n${email.body}`
        });
        setShowComposer(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Mail className="w-8 h-8 animate-pulse text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Enhanced Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">Email Center</h1>
                        <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span className="flex items-center gap-1">
                                <Inbox className="w-4 h-4 text-blue-500" />
                                {stats.inbound} Received
                            </span>
                            <span className="flex items-center gap-1">
                                <Send className="w-4 h-4 text-green-500" />
                                {stats.outbound} Sent
                            </span>
                            <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4 text-purple-500" />
                                {stats.today} Today
                            </span>
                            <span className="text-gray-500">
                                {filteredEmails.length} of {stats.total} total
                            </span>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={load}
                            className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg font-medium hover:bg-gray-200 flex items-center gap-2 transition-colors"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowComposer(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                        >
                            <Plus className="w-4 h-4" />
                            Compose
                        </button>
                    </div>
                </div>

                {/* Enhanced Filters */}
                <div className="flex items-center gap-4 flex-wrap">
                    <div className="relative flex-1 min-w-80">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search emails, subjects, senders, or content..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={directionFilter}
                            onChange={(e) => setDirectionFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-32"
                        >
                            <option value="all">All Emails</option>
                            <option value="inbound">Received</option>
                            <option value="outbound">Sent</option>
                        </select>

                        <select
                            value={contactFilter}
                            onChange={(e) => setContactFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm min-w-36"
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
                {/* Email List */}
                <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
                    {filteredEmails.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <p>No emails found</p>
                            <button
                                onClick={() => setShowComposer(true)}
                                className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                            >
                                Send your first email
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredEmails.map((email) => {
                                const isSelected = selectedEmail?.id === email.id;
                                const isInbound = email.direction === 'inbound';
                                
                                return (
                                    <div
                                        key={email.id}
                                        onClick={() => setSelectedEmail(email)}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                    isInbound ? "bg-blue-100 text-blue-600" : "bg-green-100 text-green-600"
                                                }`}>
                                                    {isInbound ? <Inbox className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between gap-2 mb-1">
                                                        <div className="font-medium text-gray-900 truncate">
                                                            {email.subject || "(No Subject)"}
                                                        </div>
                                                        <div className="text-xs text-gray-500 flex-shrink-0">
                                                            {formatTime(email.sent_at || email.received_at || email.created_at)}
                                                        </div>
                                                    </div>
                                                    <div className="text-sm text-gray-600 mb-1">
                                                        {isInbound ? `From: ${email.from_email}` : `To: ${email.to}`}
                                                    </div>
                                                    <div className="text-sm text-gray-500 line-clamp-2">
                                                        {email.body}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Email Details */}
                <div className="w-1/2 bg-white overflow-y-auto">
                    {selectedEmail ? (
                        <div className="p-6">
                            {/* Email Header */}
                            <div className="border-b border-gray-200 pb-4 mb-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold text-gray-900 mb-2">
                                            {selectedEmail.subject || "(No Subject)"}
                                        </h2>
                                        <div className="space-y-1 text-sm text-gray-600">
                                            {selectedEmail.direction === 'inbound' ? (
                                                <>
                                                    <div><strong>From:</strong> {selectedEmail.from_email}</div>
                                                    <div><strong>To:</strong> {selectedEmail.to_email}</div>
                                                </>
                                            ) : (
                                                <>
                                                    <div><strong>To:</strong> {selectedEmail.to}</div>
                                                    <div><strong>From:</strong> You</div>
                                                </>
                                            )}
                                            <div><strong>Date:</strong> {new Date(selectedEmail.sent_at || selectedEmail.received_at || selectedEmail.created_at).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                            selectedEmail.direction === 'inbound' 
                                                ? "bg-blue-100 text-blue-800" 
                                                : "bg-green-100 text-green-800"
                                        }`}>
                                            {selectedEmail.direction === 'inbound' ? 'Received' : 'Sent'}
                                        </span>
                                        <button
                                            onClick={() => setSelectedEmail(null)}
                                            className="text-gray-400 hover:text-gray-600"
                                        >
                                            <X className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => replyToEmail(selectedEmail)}
                                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <Reply className="w-4 h-4" />
                                        Reply
                                    </button>
                                    <button
                                        onClick={() => {
                                            const forwardSubject = selectedEmail.subject.startsWith('Fwd:') ? selectedEmail.subject : `Fwd: ${selectedEmail.subject}`;
                                            setForm({
                                                contact_id: "",
                                                to: "",
                                                subject: forwardSubject,
                                                body: `\n\n--- Forwarded Message ---\nFrom: ${selectedEmail.from_email || 'You'}\nTo: ${selectedEmail.to || selectedEmail.to_email}\nSubject: ${selectedEmail.subject}\n\n${selectedEmail.body}`
                                            });
                                            setShowComposer(true);
                                        }}
                                        className="bg-gray-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-2"
                                    >
                                        <Forward className="w-4 h-4" />
                                        Forward
                                    </button>
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="prose max-w-none">
                                <div className="bg-gray-50 rounded-lg p-4 whitespace-pre-wrap text-sm text-gray-700">
                                    {selectedEmail.body}
                                </div>
                                {selectedEmail.html_body && (
                                    <div className="mt-4">
                                        <div className="text-sm font-medium text-gray-700 mb-2">HTML Version:</div>
                                        <div 
                                            className="bg-white border rounded-lg p-4 text-sm"
                                            dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                                        />
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Eye className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p>Select an email to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Compose Email Modal */}
            {showComposer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Compose Email</h3>
                            <button 
                                onClick={() => setShowComposer(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <form onSubmit={send} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
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

                            <div className="flex gap-3 justify-end pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowComposer(false)}
                                    className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit" 
                                    disabled={sending}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Sending...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="w-4 h-4" />
                                            Send Email
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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