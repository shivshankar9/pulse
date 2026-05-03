import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { 
    Send, Sparkles, RefreshCw, Search, Filter, User, Calendar, Zap, X, Plus,
    Mail, MailOpen, Inbox, Reply, Forward, Archive, Trash2, Star, StarOff,
    Clock, AlertCircle, CheckCircle, Eye, Edit, Paperclip, Download, MoreHorizontal,
    ChevronDown, Settings, Tag, Users, FileText, Phone, MessageSquare, Ticket
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
    const [selectedEmails, setSelectedEmails] = useState(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [emailTickets, setEmailTickets] = useState(new Map()); // Store email-ticket relationships

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
            
            // Load ticket information for inbound emails
            const ticketMap = new Map();
            for (const email of combined.filter(e => e.direction === 'inbound')) {
                try {
                    const ticketResponse = await api.get(`/emails/${email.id}/ticket`);
                    ticketMap.set(email.id, ticketResponse.data);
                } catch (error) {
                    // No ticket exists for this email, which is fine
                }
            }
            setEmailTickets(ticketMap);
            
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

    const toggleEmailSelection = (emailId) => {
        const newSelected = new Set(selectedEmails);
        if (newSelected.has(emailId)) {
            newSelected.delete(emailId);
        } else {
            newSelected.add(emailId);
        }
        setSelectedEmails(newSelected);
    };

    const selectAllEmails = () => {
        if (selectedEmails.size === filteredEmails.length && filteredEmails.length > 0) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(filteredEmails.map(e => e.id)));
        }
    };

    const createTicketFromEmail = async (email) => {
        try {
            const response = await api.post(`/emails/${email.id}/create-ticket`);
            toast.success("Ticket created successfully");
            
            // Update the email tickets map
            const newTicketMap = new Map(emailTickets);
            newTicketMap.set(email.id, response.data.ticket);
            setEmailTickets(newTicketMap);
            
            return response.data.ticket;
        } catch (error) {
            if (error.response?.status === 400) {
                toast.error("Ticket already exists for this email");
            } else {
                toast.error("Failed to create ticket: " + (error.response?.data?.detail || ""));
            }
        }
    };

    const viewTicket = (ticketId) => {
        // Navigate to ticket view - you can implement this based on your routing
        window.open(`/tickets?id=${ticketId}`, '_blank');
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading emails...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Freshdesk-style Header */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                {/* Top Navigation Bar */}
                <div className="px-6 py-3 border-b border-gray-100">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <h1 className="text-xl font-semibold text-gray-800">Email Management</h1>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                                <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {stats.inbound} Received
                                </span>
                                <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {stats.outbound} Sent
                                </span>
                                <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-full text-xs font-medium">
                                    {stats.today} Today
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={load}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100 transition-colors ${showFilters ? 'bg-gray-100 text-gray-700' : ''}`}
                                title="Filters"
                            >
                                <Filter className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowComposer(true)}
                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 transition-colors"
                            >
                                <Plus className="w-4 h-4" />
                                New Email
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Filters Bar */}
                <div className="px-6 py-3">
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-md">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search emails..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                            />
                        </div>
                        
                        {showFilters && (
                            <div className="flex items-center gap-3">
                                <select
                                    value={directionFilter}
                                    onChange={(e) => setDirectionFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="all">All Emails</option>
                                    <option value="inbound">Received</option>
                                    <option value="outbound">Sent</option>
                                </select>

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
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedEmails.size > 0 && (
                    <div className="px-6 py-2 bg-blue-50 border-t border-blue-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-blue-700 font-medium">
                                    {selectedEmails.size} email{selectedEmails.size > 1 ? 's' : ''} selected
                                </span>
                                <button
                                    onClick={() => setSelectedEmails(new Set())}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    Clear selection
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button className="text-gray-600 hover:text-gray-800 p-1 rounded">
                                    <Archive className="w-4 h-4" />
                                </button>
                                <button className="text-gray-600 hover:text-gray-800 p-1 rounded">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                                <button className="text-gray-600 hover:text-gray-800 p-1 rounded">
                                    <Tag className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Email List Panel */}
                <div className="w-2/5 bg-white border-r border-gray-200 flex flex-col">
                    {/* List Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center gap-3">
                            <input
                                type="checkbox"
                                checked={selectedEmails.size === filteredEmails.length && filteredEmails.length > 0}
                                onChange={selectAllEmails}
                                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm font-medium text-gray-700">
                                {filteredEmails.length} emails
                            </span>
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredEmails.length === 0 ? (
                            <div className="p-8 text-center">
                                <Mail className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 mb-4">No emails found</p>
                                <button
                                    onClick={() => setShowComposer(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700"
                                >
                                    Send your first email
                                </button>
                            </div>
                        ) : (
                            <div>
                                {filteredEmails.map((email) => {
                                    const isSelected = selectedEmails.has(email.id);
                                    const isEmailSelected = selectedEmail?.id === email.id;
                                    const isInbound = email.direction === 'inbound';
                                    
                                    return (
                                        <div
                                            key={email.id}
                                            className={`border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                                                isEmailSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                                            } ${isSelected ? "bg-blue-25" : ""}`}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isSelected}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleEmailSelection(email.id);
                                                        }}
                                                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    
                                                    <div 
                                                        className="flex-1 min-w-0"
                                                        onClick={() => setSelectedEmail(email)}
                                                    >
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <div className={`w-2 h-2 rounded-full ${
                                                                isInbound ? "bg-blue-500" : "bg-green-500"
                                                            }`}></div>
                                                            <span className="text-sm font-medium text-gray-900 truncate">
                                                                {isInbound ? email.from_email : email.to}
                                                            </span>
                                                            <span className="text-xs text-gray-500 ml-auto">
                                                                {formatTime(email.sent_at || email.received_at || email.created_at)}
                                                            </span>
                                                        </div>
                                                        
                                                        <div className="text-sm font-medium text-gray-800 mb-1 truncate">
                                                            {email.subject || "(No Subject)"}
                                                        </div>
                                                        
                                                        <div className="text-sm text-gray-600 line-clamp-2">
                                                            {email.body}
                                                        </div>
                                                        
                                                        <div className="flex items-center gap-2 mt-2">
                                                            {email.attachments && email.attachments.length > 0 && (
                                                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                                                    <Paperclip className="w-3 h-3" />
                                                                    {email.attachments.length}
                                                                </div>
                                                            )}
                                                            
                                                            {/* Ticket Status Indicator */}
                                                            {isInbound && emailTickets.has(email.id) && (
                                                                <div className="flex items-center gap-1 text-xs text-green-600">
                                                                    <Ticket className="w-3 h-3" />
                                                                    Ticket Created
                                                                </div>
                                                            )}
                                                            
                                                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                isInbound 
                                                                    ? "bg-blue-100 text-blue-700" 
                                                                    : "bg-green-100 text-green-700"
                                                            }`}>
                                                                {isInbound ? 'Received' : 'Sent'}
                                                            </span>
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
                </div>

                {/* Email Detail Panel */}
                <div className="flex-1 bg-white flex flex-col">
                    {selectedEmail ? (
                        <>
                            {/* Email Header */}
                            <div className="px-6 py-4 border-b border-gray-200">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex-1">
                                        <h2 className="text-lg font-semibold text-gray-900 mb-2">
                                            {selectedEmail.subject || "(No Subject)"}
                                        </h2>
                                        <div className="flex items-center gap-4 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                                    selectedEmail.direction === 'inbound' 
                                                        ? "bg-blue-100 text-blue-600" 
                                                        : "bg-green-100 text-green-600"
                                                }`}>
                                                    {selectedEmail.direction === 'inbound' ? 
                                                        <Inbox className="w-4 h-4" /> : 
                                                        <Send className="w-4 h-4" />
                                                    }
                                                </div>
                                                <div>
                                                    <div className="font-medium">
                                                        {selectedEmail.direction === 'inbound' ? 
                                                            selectedEmail.from_email : 
                                                            selectedEmail.to
                                                        }
                                                    </div>
                                                    <div className="text-xs text-gray-500">
                                                        {new Date(selectedEmail.sent_at || selectedEmail.received_at || selectedEmail.created_at).toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    
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
                                            className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100"
                                        >
                                            <Forward className="w-4 h-4" />
                                        </button>
                                        
                                        {/* Ticket Actions for Inbound Emails */}
                                        {selectedEmail.direction === 'inbound' && (
                                            <>
                                                {emailTickets.has(selectedEmail.id) ? (
                                                    <button
                                                        onClick={() => viewTicket(emailTickets.get(selectedEmail.id).id)}
                                                        className="bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                                                        title="View Ticket"
                                                    >
                                                        <Ticket className="w-4 h-4" />
                                                        View Ticket
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => createTicketFromEmail(selectedEmail)}
                                                        className="bg-orange-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2"
                                                        title="Create Ticket"
                                                    >
                                                        <Ticket className="w-4 h-4" />
                                                        Create Ticket
                                                    </button>
                                                )}
                                            </>
                                        )}
                                        
                                        <button className="text-gray-600 hover:text-gray-800 p-2 rounded-lg hover:bg-gray-100">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedEmail(null)}
                                            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Email Content */}
                            <div className="flex-1 overflow-y-auto p-6">
                                <div className="max-w-none">
                                    {selectedEmail.html_body ? (
                                        <div 
                                            dangerouslySetInnerHTML={{ __html: selectedEmail.html_body }}
                                            className="prose prose-sm max-w-none"
                                        />
                                    ) : (
                                        <div className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                                            {selectedEmail.body || '(No content)'}
                                        </div>
                                    )}
                                </div>

                                {/* Ticket Information */}
                                {selectedEmail.direction === 'inbound' && emailTickets.has(selectedEmail.id) && (
                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                            <div className="flex items-center gap-2 mb-2">
                                                <Ticket className="w-5 h-5 text-green-600" />
                                                <h3 className="font-medium text-green-900">Support Ticket Created</h3>
                                            </div>
                                            <div className="text-sm text-green-700 mb-3">
                                                A support ticket has been automatically created from this email.
                                            </div>
                                            <div className="flex items-center gap-4 text-sm">
                                                <div>
                                                    <span className="font-medium text-green-900">Ticket ID:</span>
                                                    <span className="ml-1 text-green-700">{emailTickets.get(selectedEmail.id)?.id}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-green-900">Status:</span>
                                                    <span className="ml-1 text-green-700 capitalize">{emailTickets.get(selectedEmail.id)?.status}</span>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-green-900">Priority:</span>
                                                    <span className="ml-1 text-green-700 capitalize">{emailTickets.get(selectedEmail.id)?.priority}</span>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => viewTicket(emailTickets.get(selectedEmail.id).id)}
                                                className="mt-3 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center gap-2"
                                            >
                                                <Eye className="w-4 h-4" />
                                                View Full Ticket
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Attachments */}
                                {selectedEmail.attachments && selectedEmail.attachments.length > 0 && (
                                    <div className="mt-6 pt-4 border-t border-gray-200">
                                        <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                                            <Paperclip className="w-4 h-4" />
                                            Attachments ({selectedEmail.attachments.length})
                                        </h3>
                                        <div className="grid grid-cols-1 gap-2">
                                            {selectedEmail.attachments.map((attachment, index) => (
                                                <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                                                    <FileText className="w-5 h-5 text-gray-500" />
                                                    <span className="flex-1 text-sm text-gray-700">
                                                        {attachment.filename || `Attachment ${index + 1}`}
                                                    </span>
                                                    <button className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1">
                                                        <Download className="w-4 h-4" />
                                                        Download
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <Mail className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Select an email</h3>
                                <p className="text-gray-500">Choose an email from the list to view its contents</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            {/* Freshdesk-style Compose Modal */}
            {showComposer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">New Email</h3>
                                <button 
                                    onClick={() => setShowComposer(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <form onSubmit={send} className="space-y-4">
                                {/* Recipient Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact</label>
                                        <select 
                                            value={form.contact_id} 
                                            onChange={(e) => onSelectContact(e.target.value)} 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        >
                                            <option value="">Select contact (optional)</option>
                                            {contacts.map((c) => (
                                                <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">To *</label>
                                        <input 
                                            type="email" 
                                            required 
                                            value={form.to} 
                                            onChange={(e) => setForm({ ...form, to: e.target.value })} 
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                            placeholder="recipient@example.com"
                                        />
                                    </div>
                                </div>

                                {/* AI Assistant */}
                                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                                    <div className="flex items-center gap-2 mb-3">
                                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                            <Sparkles className="w-4 h-4 text-white" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-blue-900">AI Writing Assistant</span>
                                            <p className="text-xs text-blue-700">Describe what you want to write and I'll help you draft it</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <input 
                                            placeholder="e.g., Follow up on our demo meeting yesterday" 
                                            value={intent} 
                                            onChange={(e) => setIntent(e.target.value)} 
                                            className="flex-1 border border-blue-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-white"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={draft} 
                                            disabled={drafting || !intent.trim()} 
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {drafting ? (
                                                <>
                                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    Drafting...
                                                </>
                                            ) : (
                                                <>
                                                    <Sparkles className="w-4 h-4" />
                                                    Generate
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowTemplates(true)}
                                        className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <FileText className="w-4 h-4" />
                                        Templates
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setShowCanned(true)}
                                        className="bg-white border border-gray-300 text-gray-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 flex items-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        Quick Responses
                                    </button>
                                </div>

                                {/* Subject */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Subject *</label>
                                    <input 
                                        required 
                                        value={form.subject} 
                                        onChange={(e) => setForm({ ...form, subject: e.target.value })} 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                        placeholder="Email subject"
                                    />
                                </div>

                                {/* Message Body */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Message *</label>
                                    <textarea 
                                        required 
                                        rows={12} 
                                        value={form.body} 
                                        onChange={(e) => setForm({ ...form, body: e.target.value })} 
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm resize-none"
                                        placeholder="Type your message here..."
                                    />
                                </div>

                                {/* Action Buttons */}
                                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
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
                                        className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Email Templates</h3>
                                <button onClick={() => setShowTemplates(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            {templates.length === 0 ? (
                                <div className="text-center py-12">
                                    <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No templates yet</h4>
                                    <p className="text-gray-500">Create email templates to save time on common responses</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <button
                                            key={template.id}
                                            onClick={() => applyTemplate(template)}
                                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 mb-1 group-hover:text-blue-700">
                                                        {template.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600 mb-2">
                                                        Subject: {template.subject}
                                                    </div>
                                                    <div className="text-xs text-gray-500 line-clamp-2">
                                                        {template.body}
                                                    </div>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-blue-500 transform rotate-[-90deg]" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Quick Responses Modal */}
            {showCanned && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Quick Responses</h3>
                                <button onClick={() => setShowCanned(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded">
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            {cannedResponses.length === 0 ? (
                                <div className="text-center py-12">
                                    <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No quick responses yet</h4>
                                    <p className="text-gray-500">Create quick responses for faster email replies</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cannedResponses.map((canned) => (
                                        <button
                                            key={canned.id}
                                            onClick={() => applyCannedResponse(canned)}
                                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 mb-2 group-hover:text-green-700">
                                                        {canned.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600">
                                                        {canned.body}
                                                    </div>
                                                </div>
                                                <ChevronDown className="w-4 h-4 text-gray-400 group-hover:text-green-500 transform rotate-[-90deg]" />
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Emails;