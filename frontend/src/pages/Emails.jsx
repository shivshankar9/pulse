import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { 
    Send, Sparkles, RefreshCw, Search, Filter, User, Calendar, Zap, X, Plus,
    Mail, MailOpen, Inbox, Reply, Forward, Archive, Trash2, Star, StarOff,
    Clock, AlertCircle, CheckCircle, Eye, Edit, Paperclip, Download, MoreHorizontal,
    ChevronDown, ChevronRight, Settings, Tag, Users, FileText, Phone, MessageSquare, 
    Ticket, ExternalLink, Copy, Share2, Flag, Bookmark, Folder, FolderOpen,
    ArrowUp, ArrowDown, Minus, SortAsc, SortDesc, Grid, List, Columns
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
    const [dateFilter, setDateFilter] = useState("all");
    const [showComposer, setShowComposer] = useState(false);
    const [showTemplates, setShowTemplates] = useState(false);
    const [showCanned, setShowCanned] = useState(false);
    const [selectedEmails, setSelectedEmails] = useState(new Set());
    const [showFilters, setShowFilters] = useState(false);
    const [emailTickets, setEmailTickets] = useState(new Map());
    const [starredEmails, setStarredEmails] = useState(new Set());
    const [viewMode, setViewMode] = useState("split"); // split, list, compact
    const [sortBy, setSortBy] = useState("date");
    const [sortOrder, setSortOrder] = useState("desc");
    const [showLabels, setShowLabels] = useState(false);
    const [emailLabels, setEmailLabels] = useState(new Map());

    const load = useCallback(async () => {
        try {
            const [outbound, inbound, c, t, cr] = await Promise.all([
                api.get("/emails"),
                api.get("/emails/inbound").catch(() => ({ data: [] })),
                api.get("/contacts"),
                api.get("/email-templates").catch(() => ({ data: [] })),
                api.get("/canned-responses").catch(() => ({ data: [] }))
            ]);
            
            const combined = [
                ...(outbound.data || []).map(e => ({ ...e, direction: 'outbound' })),
                ...(inbound.data || []).map(e => ({ ...e, direction: 'inbound' }))
            ].sort((a, b) => {
                const dateA = new Date(a.sent_at || a.received_at || a.created_at);
                const dateB = new Date(b.sent_at || b.received_at || b.created_at);
                return dateB - dateA;
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
                    // No ticket exists
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
        const interval = setInterval(load, 30000);
        return () => clearInterval(interval);
    }, [load]);

    // Enhanced filtering and sorting
    const filteredAndSortedEmails = useMemo(() => {
        if (!allEmails || allEmails.length === 0) return [];
        
        let filtered = allEmails.filter(email => {
            if (!email) return false;
            
            const matchesSearch = !search || 
                (email.subject && email.subject.toLowerCase().includes(search.toLowerCase())) ||
                (email.to && email.to.toLowerCase().includes(search.toLowerCase())) ||
                (email.from_email && email.from_email.toLowerCase().includes(search.toLowerCase())) ||
                (email.body && email.body.toLowerCase().includes(search.toLowerCase()));
            
            const matchesDirection = directionFilter === "all" || email.direction === directionFilter;
            const matchesContact = contactFilter === "all" || email.contact_id === contactFilter;
            
            // Date filtering
            let matchesDate = true;
            if (dateFilter !== "all") {
                const emailDate = new Date(email.sent_at || email.received_at || email.created_at);
                const now = new Date();
                const diffDays = Math.floor((now - emailDate) / (1000 * 60 * 60 * 24));
                
                switch (dateFilter) {
                    case "today":
                        matchesDate = diffDays === 0;
                        break;
                    case "week":
                        matchesDate = diffDays <= 7;
                        break;
                    case "month":
                        matchesDate = diffDays <= 30;
                        break;
                    default:
                        matchesDate = true;
                }
            }
            
            return matchesSearch && matchesDirection && matchesContact && matchesDate;
        });

        // Sorting
        filtered.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortBy) {
                case "date":
                    aValue = new Date(a.sent_at || a.received_at || a.created_at);
                    bValue = new Date(b.sent_at || b.received_at || b.created_at);
                    break;
                case "subject":
                    aValue = a.subject || "";
                    bValue = b.subject || "";
                    break;
                case "sender":
                    aValue = a.from_email || a.to || "";
                    bValue = b.from_email || b.to || "";
                    break;
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
            }
            
            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [allEmails, search, directionFilter, contactFilter, dateFilter, sortBy, sortOrder]);

    // Enhanced stats
    const stats = useMemo(() => {
        const total = allEmails.length;
        const inbound = allEmails.filter(e => e.direction === 'inbound').length;
        const outbound = allEmails.filter(e => e.direction === 'outbound').length;
        const today = new Date().toDateString();
        const todayEmails = allEmails.filter(e => {
            const emailDate = new Date(e.sent_at || e.received_at || e.created_at).toDateString();
            return emailDate === today;
        }).length;
        const withTickets = Array.from(emailTickets.keys()).length;
        const starred = starredEmails.size;
        const unread = allEmails.filter(e => e.direction === 'inbound' && !e.read).length;
        
        return { total, inbound, outbound, today: todayEmails, withTickets, starred, unread };
    }, [allEmails, emailTickets, starredEmails]);

    // Bulk operations
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
        if (selectedEmails.size === filteredAndSortedEmails.length && filteredAndSortedEmails.length > 0) {
            setSelectedEmails(new Set());
        } else {
            setSelectedEmails(new Set(filteredAndSortedEmails.map(e => e.id)));
        }
    };

    const bulkArchive = () => {
        toast.success(`Archived ${selectedEmails.size} emails`);
        setSelectedEmails(new Set());
    };

    const bulkDelete = () => {
        if (window.confirm(`Delete ${selectedEmails.size} emails?`)) {
            toast.success(`Deleted ${selectedEmails.size} emails`);
            setSelectedEmails(new Set());
        }
    };

    const toggleStar = (emailId) => {
        const newStarred = new Set(starredEmails);
        if (newStarred.has(emailId)) {
            newStarred.delete(emailId);
            toast.success("Removed from starred");
        } else {
            newStarred.add(emailId);
            toast.success("Added to starred");
        }
        setStarredEmails(newStarred);
    };

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

    const createTicketFromEmail = async (email) => {
        try {
            const response = await api.post(`/emails/${email.id}/create-ticket`);
            toast.success("Ticket created successfully");
            
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
        window.open(`/tickets?id=${ticketId}`, '_blank');
    };

    const copyEmailUrl = (emailId) => {
        const url = `${window.location.origin}/emails?id=${emailId}`;
        navigator.clipboard.writeText(url);
        toast.success("Email URL copied to clipboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600 font-medium">Loading emails...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Enhanced Header with Gradient Background */}
            <div className="bg-white border-b border-gray-200 shadow-md">
                {/* Top Navigation with Better Visual Hierarchy */}
                <div className="px-4 sm:px-6 py-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                                    <Mail className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Email Center
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                                    <Inbox className="w-3.5 h-3.5 text-blue-600" />
                                    <span className="font-semibold text-blue-700">{stats.inbound}</span>
                                    <span className="text-blue-600">Received</span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                                    <Send className="w-3.5 h-3.5 text-green-600" />
                                    <span className="font-semibold text-green-700">{stats.outbound}</span>
                                    <span className="text-green-600">Sent</span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
                                    <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                    <span className="font-semibold text-purple-700">{stats.today}</span>
                                    <span className="text-purple-600">Today</span>
                                </span>
                                {stats.withTickets > 0 && (
                                    <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-orange-200 hover:shadow-md transition-shadow">
                                        <Ticket className="w-3.5 h-3.5 text-orange-600" />
                                        <span className="font-semibold text-orange-700">{stats.withTickets}</span>
                                        <span className="text-orange-600">Tickets</span>
                                    </span>
                                )}
                                {stats.starred > 0 && (
                                    <span className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white px-3 py-1.5 rounded-full shadow-lg">
                                        <Star className="w-3.5 h-3.5 fill-white" />
                                        <span className="font-bold">{stats.starred}</span>
                                        <span className="font-medium">Starred</span>
                                    </span>
                                )}
                                {stats.unread > 0 && (
                                    <span className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                        <MailOpen className="w-3.5 h-3.5" />
                                        <span className="font-bold">{stats.unread}</span>
                                        <span className="font-medium">Unread</span>
                                    </span>
                                )}
                                <span className="text-gray-600 hidden lg:inline font-medium">
                                    {filteredAndSortedEmails.length} of {stats.total} emails
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            {/* View Mode Toggle */}
                            <div className="hidden sm:flex items-center gap-1 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                                <button
                                    onClick={() => setViewMode("split")}
                                    className={`p-1.5 rounded transition-all ${viewMode === "split" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "hover:bg-gray-100"}`}
                                    title="Split View"
                                >
                                    <Columns className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("list")}
                                    className={`p-1.5 rounded transition-all ${viewMode === "list" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "hover:bg-gray-100"}`}
                                    title="List View"
                                >
                                    <List className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setViewMode("compact")}
                                    className={`p-1.5 rounded transition-all ${viewMode === "compact" ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" : "hover:bg-gray-100"}`}
                                    title="Compact View"
                                >
                                    <Grid className="w-4 h-4" />
                                </button>
                            </div>

                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`p-2.5 rounded-lg transition-all shadow-sm ${
                                    showFilters 
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg' 
                                        : 'bg-white text-gray-600 hover:text-gray-900 hover:shadow-md border border-gray-200'
                                }`}
                                title="Toggle Filters"
                            >
                                <Filter className="w-4 h-4" />
                            </button>
                            <button
                                onClick={load}
                                className="bg-white text-gray-600 hover:text-gray-900 p-2.5 rounded-lg hover:shadow-md transition-all border border-gray-200"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowComposer(true)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">Compose</span>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Search and Advanced Filters with Better Design */}
                <div className="px-4 sm:px-6 py-4 bg-white">
                    <div className="flex flex-col sm:flex-row gap-3">
                        <div className="relative flex-1">
                            <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Search emails, subjects, senders, or content..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                            />
                        </div>
                        
                        {showFilters && (
                            <div className="flex flex-wrap gap-2">
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
                                    value={dateFilter}
                                    onChange={(e) => setDateFilter(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="all">All Time</option>
                                    <option value="today">Today</option>
                                    <option value="week">This Week</option>
                                    <option value="month">This Month</option>
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

                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                                >
                                    <option value="date">Sort by Date</option>
                                    <option value="subject">Sort by Subject</option>
                                    <option value="sender">Sort by Sender</option>
                                </select>

                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 text-sm"
                                    title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                                >
                                    {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulk Actions Bar */}
                {selectedEmails.size > 0 && (
                    <div className="px-4 sm:px-6 py-2 bg-blue-50 border-t border-blue-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-blue-700 font-medium">
                                    {selectedEmails.size} email{selectedEmails.size > 1 ? 's' : ''} selected
                                </span>
                                <button
                                    onClick={() => setSelectedEmails(new Set())}
                                    className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                                >
                                    Clear
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={bulkArchive}
                                    className="bg-gray-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-gray-700 flex items-center gap-1"
                                >
                                    <Archive className="w-4 h-4" />
                                    Archive
                                </button>
                                <button
                                    onClick={bulkDelete}
                                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 flex items-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Delete
                                </button>
                                <button className="text-gray-600 hover:text-gray-800 p-1.5 rounded">
                                    <Tag className="w-4 h-4" />
                                </button>
                                <button className="text-gray-600 hover:text-gray-800 p-1.5 rounded">
                                    <Folder className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Responsive Main Content Area */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Email List - Responsive */}
                <div className={`${selectedEmail ? 'hidden lg:block' : 'block'} w-full lg:w-2/5 xl:w-1/3 border-r border-gray-200 bg-white flex flex-col`}>
                    {/* List Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedEmails.size === filteredAndSortedEmails.length && filteredAndSortedEmails.length > 0}
                                    onChange={selectAllEmails}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    {filteredAndSortedEmails.length} emails
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Email List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredAndSortedEmails.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                    <Mail className="w-12 h-12 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Emails Found</h3>
                                <p className="text-gray-600 mb-6 max-w-md">
                                    {search || directionFilter !== 'all' || contactFilter !== 'all' || dateFilter !== 'all'
                                        ? "No emails match your current filters. Try adjusting your search criteria."
                                        : "Send your first email to get started with your email center."}
                                </p>
                                <button
                                    onClick={() => setShowComposer(true)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Compose Email
                                </button>
                            </div>
                        ) : (
                            <div>
                                {filteredAndSortedEmails.map((email) => {
                                    const isSelected = selectedEmail?.id === email.id;
                                    const isChecked = selectedEmails.has(email.id);
                                    const isStarred = starredEmails.has(email.id);
                                    const hasTicket = emailTickets.has(email.id);
                                    const isUnread = email.direction === 'inbound' && !email.read;
                                    
                                    return (
                                        <div
                                            key={email.id}
                                            className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group ${
                                                isSelected ? "bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-l-blue-600 shadow-md" : ""
                                            } ${isChecked ? "bg-blue-25" : ""} ${isUnread ? "font-semibold" : ""}`}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleEmailSelection(email.id);
                                                        }}
                                                        className="mt-1 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                                    />
                                                    
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            toggleStar(email.id);
                                                        }}
                                                        className="mt-1"
                                                    >
                                                        <Star className={`w-4 h-4 ${isStarred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300 hover:text-yellow-400'}`} />
                                                    </button>
                                                    
                                                    <div 
                                                        className="flex-1 min-w-0 cursor-pointer"
                                                        onClick={() => setSelectedEmail(email)}
                                                    >
                                                        {/* Email Header */}
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <div className="flex items-center gap-2 min-w-0 flex-1">
                                                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                    email.direction === 'inbound' 
                                                                        ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                                                        : 'bg-green-100 text-green-700 border border-green-200'
                                                                }`}>
                                                                    {email.direction === 'inbound' ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                                                                    {email.direction === 'inbound' ? 'Received' : 'Sent'}
                                                                </span>
                                                                {hasTicket && (
                                                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                                                        <Ticket className="w-3 h-3" />
                                                                        Ticket
                                                                    </span>
                                                                )}
                                                                {isUnread && (
                                                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                                                )}
                                                            </div>
                                                            <span className="text-xs text-gray-500 whitespace-nowrap">
                                                                {formatTime(email.sent_at || email.received_at || email.created_at)}
                                                            </span>
                                                        </div>

                                                        {/* Email Info */}
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm text-gray-900 truncate">
                                                                    {email.direction === 'inbound' ? email.from_email : email.to}
                                                                </span>
                                                            </div>
                                                            <div className="text-sm text-gray-900 truncate">
                                                                {email.subject || "(No Subject)"}
                                                            </div>
                                                            <div className="text-xs text-gray-500 line-clamp-2">
                                                                {email.body?.substring(0, 100)}...
                                                            </div>
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

                {/* Email Detail Panel - Responsive */}
                <div className={`${selectedEmail ? 'block' : 'hidden lg:block'} flex-1 bg-white flex flex-col`}>
                    {selectedEmail ? (
                        <>
                            {/* Mobile Back Button */}
                            <div className="lg:hidden px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setSelectedEmail(null)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                                >
                                    <ChevronRight className="w-4 h-4 rotate-180" />
                                    <span className="text-sm font-medium">Back to list</span>
                                </button>
                            </div>

                            {/* Email Header */}
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                                                selectedEmail.direction === 'inbound' 
                                                    ? 'bg-blue-100 text-blue-700 border border-blue-200' 
                                                    : 'bg-green-100 text-green-700 border border-green-200'
                                            }`}>
                                                {selectedEmail.direction === 'inbound' ? <Inbox className="w-3 h-3" /> : <Send className="w-3 h-3" />}
                                                {selectedEmail.direction === 'inbound' ? 'Received' : 'Sent'}
                                            </span>
                                            {emailTickets.has(selectedEmail.id) && (
                                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                                                    <Ticket className="w-3 h-3" />
                                                    Ticket #{emailTickets.get(selectedEmail.id).id}
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 mb-2">
                                            {selectedEmail.subject || "(No Subject)"}
                                        </h2>
                                        <div className="flex flex-col gap-1 text-sm text-gray-600">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">From:</span>
                                                <span>{selectedEmail.from_email || selectedEmail.to}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">To:</span>
                                                <span>{selectedEmail.direction === 'inbound' ? 'You' : selectedEmail.to}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">Date:</span>
                                                <span>{new Date(selectedEmail.sent_at || selectedEmail.received_at || selectedEmail.created_at).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => toggleStar(selectedEmail.id)}
                                            className="p-2 text-gray-500 hover:text-yellow-500 hover:bg-gray-100 rounded-lg transition-colors"
                                            title={starredEmails.has(selectedEmail.id) ? "Remove star" : "Add star"}
                                        >
                                            <Star className={`w-5 h-5 ${starredEmails.has(selectedEmail.id) ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => replyToEmail(selectedEmail)}
                                            className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Reply"
                                        >
                                            <MailOpen className="w-5 h-5" />
                                        </button>
                                        {selectedEmail.direction === 'inbound' && !emailTickets.has(selectedEmail.id) && (
                                            <button
                                                onClick={() => createTicketFromEmail(selectedEmail)}
                                                className="px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2 text-sm font-medium"
                                            >
                                                <Ticket className="w-4 h-4" />
                                                Create Ticket
                                            </button>
                                        )}
                                        {emailTickets.has(selectedEmail.id) && (
                                            <button
                                                onClick={() => viewTicket(emailTickets.get(selectedEmail.id).id)}
                                                className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm font-medium"
                                            >
                                                <Ticket className="w-4 h-4" />
                                                View Ticket
                                            </button>
                                        )}
                                        <button
                                            onClick={() => copyEmailUrl(selectedEmail.id)}
                                            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                                            title="Copy link"
                                        >
                                            <Share2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Email Body */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
                                <div className="prose max-w-none">
                                    <div className="whitespace-pre-wrap text-gray-700">
                                        {selectedEmail.body}
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="hidden lg:flex flex-1 items-center justify-center text-gray-400">
                            <div className="text-center">
                                <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                                <p className="text-lg font-medium">Select an email to view</p>
                                <p className="text-sm mt-2">Choose an email from the list to see its contents</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Email Modal */}
            {showComposer && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gradient-to-r from-blue-600 to-blue-700">
                            <h2 className="text-xl font-bold text-white flex items-center gap-2">
                                <Send className="w-5 h-5" />
                                Compose Email
                            </h2>
                            <button
                                onClick={() => setShowComposer(false)}
                                className="text-white hover:bg-blue-800 p-2 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={send} className="flex-1 overflow-y-auto p-6 space-y-4">
                            {/* Contact Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Contact (Optional)
                                </label>
                                <select
                                    value={form.contact_id}
                                    onChange={(e) => onSelectContact(e.target.value)}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="">Select a contact...</option>
                                    {contacts.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.name} ({c.email})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* To Email */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    To <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="email"
                                    value={form.to}
                                    onChange={(e) => setForm({ ...form, to: e.target.value })}
                                    placeholder="recipient@example.com"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* Subject */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Subject <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={form.subject}
                                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                                    placeholder="Email subject"
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    required
                                />
                            </div>

                            {/* AI Draft Intent */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    AI Assistant (Optional)
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={intent}
                                        onChange={(e) => setIntent(e.target.value)}
                                        placeholder="Describe what you want to say..."
                                        className="flex-1 border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                    <button
                                        type="button"
                                        onClick={draft}
                                        disabled={drafting || !intent}
                                        className="bg-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {drafting ? "Drafting..." : "Draft"}
                                    </button>
                                </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setShowTemplates(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    <FileText className="w-4 h-4" />
                                    Use Template
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowCanned(true)}
                                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                >
                                    <Zap className="w-4 h-4" />
                                    Quick Response
                                </button>
                            </div>

                            {/* Body */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    Message <span className="text-red-500">*</span>
                                </label>
                                <textarea
                                    value={form.body}
                                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                                    placeholder="Write your email message..."
                                    rows={12}
                                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    required
                                />
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                                <button
                                    type="button"
                                    onClick={() => setShowComposer(false)}
                                    className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <Send className="w-4 h-4" />
                                    {sending ? "Sending..." : "Send Email"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Templates Modal */}
            {showTemplates && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Email Templates</h2>
                            <button
                                onClick={() => setShowTemplates(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {templates.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No templates available</p>
                            ) : (
                                <div className="space-y-3">
                                    {templates.map((template) => (
                                        <div
                                            key={template.id}
                                            onClick={() => applyTemplate(template)}
                                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                        >
                                            <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
                                            <p className="text-sm text-gray-600 mb-2">{template.subject}</p>
                                            <p className="text-xs text-gray-500 line-clamp-2">{template.body}</p>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Canned Responses Modal */}
            {showCanned && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                            <h2 className="text-xl font-bold text-gray-900">Quick Responses</h2>
                            <button
                                onClick={() => setShowCanned(false)}
                                className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-6">
                            {cannedResponses.length === 0 ? (
                                <p className="text-center text-gray-500 py-8">No quick responses available</p>
                            ) : (
                                <div className="space-y-3">
                                    {cannedResponses.map((canned) => (
                                        <div
                                            key={canned.id}
                                            onClick={() => applyCannedResponse(canned)}
                                            className="p-4 border border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
                                        >
                                            <h3 className="font-semibold text-gray-900 mb-2">{canned.name}</h3>
                                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{canned.body}</p>
                                        </div>
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
