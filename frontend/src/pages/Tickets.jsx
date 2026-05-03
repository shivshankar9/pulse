import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { 
    Plus, Search, Clock, User, MessageSquare, 
    CheckCircle, AlertCircle, Circle, Send, Loader2,
    ArrowUp, ArrowDown, Minus, X, Eye, Zap, Filter,
    RefreshCw, Edit, Trash2, MoreHorizontal, Tag,
    Calendar, FileText, Phone, Mail, Users, Settings,
    ChevronDown, ChevronRight, Star, StarOff, Archive,
    Paperclip, ExternalLink, Copy, Share2
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
    open: { 
        label: "Open", 
        color: "bg-gradient-to-r from-red-50 to-red-100 text-red-700 border-2 border-red-300", 
        icon: Circle, 
        bgColor: "bg-red-500",
        dotColor: "bg-red-500"
    },
    pending: { 
        label: "Pending", 
        color: "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-2 border-yellow-300", 
        icon: Clock, 
        bgColor: "bg-yellow-500",
        dotColor: "bg-yellow-500"
    },
    resolved: { 
        label: "Resolved", 
        color: "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-2 border-green-300", 
        icon: CheckCircle, 
        bgColor: "bg-green-500",
        dotColor: "bg-green-500"
    },
    closed: { 
        label: "Closed", 
        color: "bg-gradient-to-r from-gray-50 to-gray-100 text-gray-700 border-2 border-gray-300", 
        icon: CheckCircle, 
        bgColor: "bg-gray-500",
        dotColor: "bg-gray-500"
    }
};

const PRIORITY_CONFIG = {
    low: { 
        label: "Low", 
        color: "text-gray-600", 
        icon: ArrowDown, 
        bgColor: "bg-gray-400",
        badgeColor: "bg-gray-100 text-gray-700 border border-gray-300"
    },
    medium: { 
        label: "Medium", 
        color: "text-blue-600", 
        icon: Minus, 
        bgColor: "bg-blue-500",
        badgeColor: "bg-blue-100 text-blue-700 border border-blue-300"
    },
    high: { 
        label: "High", 
        color: "text-orange-600", 
        icon: ArrowUp, 
        bgColor: "bg-orange-500",
        badgeColor: "bg-orange-100 text-orange-700 border border-orange-300"
    },
    urgent: { 
        label: "Urgent", 
        color: "text-red-600", 
        icon: AlertCircle, 
        bgColor: "bg-red-600",
        badgeColor: "bg-red-100 text-red-700 border-2 border-red-400"
    }
};

const CATEGORY_CONFIG = {
    general: { label: "General", color: "bg-gray-50 text-gray-700 border border-gray-300", icon: FileText },
    bug: { label: "Bug Report", color: "bg-red-50 text-red-700 border border-red-300", icon: AlertCircle },
    feature_request: { label: "Feature Request", color: "bg-blue-50 text-blue-700 border border-blue-300", icon: Zap },
    billing: { label: "Billing", color: "bg-green-50 text-green-700 border border-green-300", icon: FileText },
    account: { label: "Account", color: "bg-purple-50 text-purple-700 border border-purple-300", icon: User },
    technical: { label: "Technical", color: "bg-orange-50 text-orange-700 border border-orange-300", icon: Settings }
};

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

const Tickets = () => {
    const [tickets, setTickets] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [users, setUsers] = useState([]);
    const [cannedResponses, setCannedResponses] = useState([]);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [commenting, setCommenting] = useState(false);
    const [updating, setUpdating] = useState(false);
    
    // Enhanced filters and search
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [dateFilter, setDateFilter] = useState("all");
    const [showFilters, setShowFilters] = useState(false);
    
    // UI state
    const [selectedTickets, setSelectedTickets] = useState(new Set());
    const [viewMode, setViewMode] = useState("split"); // split, list, card
    const [sortBy, setSortBy] = useState("created_at");
    const [sortOrder, setSortOrder] = useState("desc");
    
    // Forms
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: "",
        description: "",
        priority: "medium",
        category: "general",
        contact_id: ""
    });
    const [comment, setComment] = useState("");
    const [showCannedPicker, setShowCannedPicker] = useState(false);
    const [commentType, setCommentType] = useState("public"); // public, internal

    // Load data with better performance and error handling
    const loadData = useCallback(async () => {
        try {
            const [ticketsRes, contactsRes, usersRes, cannedRes] = await Promise.all([
                api.get("/tickets"),
                api.get("/contacts"),
                api.get("/users").catch(() => ({ data: [] })),
                api.get("/canned-responses").catch(() => ({ data: [] }))
            ]);
            
            setTickets(ticketsRes.data || []);
            setContacts(contactsRes.data || []);
            setUsers(usersRes.data || []);
            setCannedResponses(cannedRes.data || []);
            
            // Update selected ticket if it exists
            if (selectedTicket) {
                const updated = ticketsRes.data.find(t => t.id === selectedTicket.id);
                if (updated) setSelectedTicket(updated);
            }
        } catch (error) {
            console.error("Failed to load data:", error);
            toast.error("Failed to load tickets");
        } finally {
            setLoading(false);
        }
    }, [selectedTicket]);

    useEffect(() => {
        loadData();
        // Auto-refresh every 30 seconds for real-time updates
        const interval = setInterval(loadData, 30000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Enhanced filtering with better performance
    const filteredAndSortedTickets = useMemo(() => {
        if (!tickets || tickets.length === 0) return [];
        
        let filtered = tickets.filter(ticket => {
            if (!ticket) return false;
            
            const matchesSearch = !search || 
                (ticket.subject && ticket.subject.toLowerCase().includes(search.toLowerCase())) ||
                (ticket.description && ticket.description.toLowerCase().includes(search.toLowerCase())) ||
                (ticket.requester_name && ticket.requester_name.toLowerCase().includes(search.toLowerCase())) ||
                (ticket.requester_email && ticket.requester_email.toLowerCase().includes(search.toLowerCase()));
            
            const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
            const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
            const matchesCategory = categoryFilter === "all" || ticket.category === categoryFilter;
            const matchesAssignee = assigneeFilter === "all" || 
                (assigneeFilter === "unassigned" && !ticket.assignee_id) ||
                ticket.assignee_id === assigneeFilter;
            
            // Date filtering
            let matchesDate = true;
            if (dateFilter !== "all") {
                const ticketDate = new Date(ticket.created_at);
                const now = new Date();
                const diffDays = Math.floor((now - ticketDate) / (1000 * 60 * 60 * 24));
                
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
            
            return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesAssignee && matchesDate;
        });

        // Sorting
        filtered.sort((a, b) => {
            let aValue = a[sortBy];
            let bValue = b[sortBy];
            
            if (sortBy === "created_at" || sortBy === "updated_at") {
                aValue = new Date(aValue);
                bValue = new Date(bValue);
            }
            
            if (sortOrder === "asc") {
                return aValue > bValue ? 1 : -1;
            } else {
                return aValue < bValue ? 1 : -1;
            }
        });

        return filtered;
    }, [tickets, search, statusFilter, priorityFilter, categoryFilter, assigneeFilter, dateFilter, sortBy, sortOrder]);

    // Enhanced stats
    const stats = useMemo(() => {
        const total = tickets.length;
        const open = tickets.filter(t => t.status === 'open').length;
        const pending = tickets.filter(t => t.status === 'pending').length;
        const resolved = tickets.filter(t => t.status === 'resolved').length;
        const unassigned = tickets.filter(t => !t.assignee_id).length;
        const urgent = tickets.filter(t => t.priority === 'urgent').length;
        const overdue = tickets.filter(t => {
            if (t.status === 'resolved' || t.status === 'closed') return false;
            const created = new Date(t.created_at);
            const now = new Date();
            const diffHours = (now - created) / (1000 * 60 * 60);
            return diffHours > 24; // Consider overdue after 24 hours
        }).length;
        
        return { total, open, pending, resolved, unassigned, urgent, overdue };
    }, [tickets]);

    // Bulk operations
    const toggleTicketSelection = (ticketId) => {
        const newSelected = new Set(selectedTickets);
        if (newSelected.has(ticketId)) {
            newSelected.delete(ticketId);
        } else {
            newSelected.add(ticketId);
        }
        setSelectedTickets(newSelected);
    };

    const selectAllTickets = () => {
        if (selectedTickets.size === filteredAndSortedTickets.length) {
            setSelectedTickets(new Set());
        } else {
            setSelectedTickets(new Set(filteredAndSortedTickets.map(t => t.id)));
        }
    };

    const bulkUpdateStatus = async (status) => {
        if (selectedTickets.size === 0) return;
        
        try {
            await Promise.all(
                Array.from(selectedTickets).map(ticketId =>
                    api.put(`/tickets/${ticketId}`, { status })
                )
            );
            toast.success(`Updated ${selectedTickets.size} tickets`);
            setSelectedTickets(new Set());
            loadData();
        } catch (error) {
            toast.error("Failed to update tickets");
        }
    };

    // Create new ticket
    const createTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject.trim()) {
            toast.error("Subject is required");
            return;
        }
        
        setCreating(true);
        try {
            const response = await api.post("/tickets", {
                ...newTicket,
                contact_id: newTicket.contact_id || null,
                status: "open",
                channel: "internal"
            });
            
            toast.success("Ticket created successfully");
            setNewTicket({ 
                subject: "", 
                description: "", 
                priority: "medium", 
                category: "general", 
                contact_id: "" 
            });
            setShowCreateForm(false);
            loadData();
            
            // Auto-select the new ticket
            if (response.data) {
                setSelectedTicket(response.data);
            }
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to create ticket");
        } finally {
            setCreating(false);
        }
    };

    // Update ticket field
    const updateTicket = async (ticketId, updates) => {
        setUpdating(true);
        try {
            await api.put(`/tickets/${ticketId}`, { ...selectedTicket, ...updates });
            toast.success("Ticket updated");
            loadData();
        } catch (error) {
            toast.error("Failed to update ticket");
        } finally {
            setUpdating(false);
        }
    };

    // Add comment
    const addComment = async () => {
        if (!comment.trim() || !selectedTicket) return;
        
        setCommenting(true);
        try {
            await api.post(`/tickets/${selectedTicket.id}/comments`, {
                body: comment.trim(),
                internal: commentType === "internal"
            });
            
            setComment("");
            toast.success("Comment added");
            loadData();
        } catch (error) {
            toast.error("Failed to add comment");
        } finally {
            setCommenting(false);
        }
    };

    // Helper functions
    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : "Unassigned";
    };

    const getContactName = (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        return contact ? contact.name : null;
    };

    const insertCannedResponse = (cannedResponse) => {
        setComment(cannedResponse.body);
        setShowCannedPicker(false);
        toast.success("Quick reply inserted");
    };

    const copyTicketUrl = (ticketId) => {
        const url = `${window.location.origin}/tickets?id=${ticketId}`;
        navigator.clipboard.writeText(url);
        toast.success("Ticket URL copied to clipboard");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
                    <span className="text-gray-600">Loading tickets...</span>
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
                                    <MessageSquare className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Support Tickets
                                </h1>
                            </div>
                            <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-red-200 hover:shadow-md transition-shadow">
                                    <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                    <span className="font-semibold text-red-700">{stats.open}</span>
                                    <span className="text-red-600">Open</span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-yellow-200 hover:shadow-md transition-shadow">
                                    <Clock className="w-3.5 h-3.5 text-yellow-600" />
                                    <span className="font-semibold text-yellow-700">{stats.pending}</span>
                                    <span className="text-yellow-600">Pending</span>
                                </span>
                                <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                                    <CheckCircle className="w-3.5 h-3.5 text-green-600" />
                                    <span className="font-semibold text-green-700">{stats.resolved}</span>
                                    <span className="text-green-600">Resolved</span>
                                </span>
                                {stats.urgent > 0 && (
                                    <span className="flex items-center gap-1.5 bg-gradient-to-r from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                        <AlertCircle className="w-3.5 h-3.5" />
                                        <span className="font-bold">{stats.urgent}</span>
                                        <span className="font-medium">Urgent</span>
                                    </span>
                                )}
                                {stats.overdue > 0 && (
                                    <span className="flex items-center gap-1.5 bg-orange-100 text-orange-700 px-3 py-1.5 rounded-full border border-orange-300 shadow-sm">
                                        <Clock className="w-3.5 h-3.5" />
                                        <span className="font-semibold">{stats.overdue}</span>
                                        <span>Overdue</span>
                                    </span>
                                )}
                                <span className="text-gray-600 hidden lg:inline font-medium">
                                    {filteredAndSortedTickets.length} of {stats.total} tickets
                                </span>
                            </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
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
                                onClick={loadData}
                                className="bg-white text-gray-600 hover:text-gray-900 p-2.5 rounded-lg hover:shadow-md transition-all border border-gray-200"
                                title="Refresh"
                            >
                                <RefreshCw className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => setShowCreateForm(true)}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 sm:px-6 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 flex items-center gap-2 transition-all shadow-lg hover:shadow-xl text-sm"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="hidden sm:inline">New Ticket</span>
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
                                placeholder="Search tickets by subject, description, or requester..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                            />
                        </div>
                        
                        {showFilters && (
                            <div className="flex flex-wrap gap-2">
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm hover:border-gray-300 transition-colors"
                                >
                                    <option value="all">All Status</option>
                                    {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={priorityFilter}
                                    onChange={(e) => setPriorityFilter(e.target.value)}
                                    className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm hover:border-gray-300 transition-colors"
                                >
                                    <option value="all">All Priority</option>
                                    {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                        <option key={key} value={key}>{config.label}</option>
                                    ))}
                                </select>

                                <select
                                    value={assigneeFilter}
                                    onChange={(e) => setAssigneeFilter(e.target.value)}
                                    className="border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium shadow-sm hover:border-gray-300 transition-colors"
                                >
                                    <option value="all">All Assignees</option>
                                    <option value="unassigned">Unassigned</option>
                                    {users.map(user => (
                                        <option key={user.id} value={user.id}>{user.name}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bulk Actions */}
                {selectedTickets.size > 0 && (
                    <div className="px-4 sm:px-6 py-2 bg-blue-50 border-t border-blue-100">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <span className="text-sm text-blue-700 font-medium">
                                    {selectedTickets.size} ticket{selectedTickets.size > 1 ? 's' : ''} selected
                                </span>
                                <button
                                    onClick={() => setSelectedTickets(new Set())}
                                    className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                    Clear selection
                                </button>
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => bulkUpdateStatus('pending')}
                                    className="bg-yellow-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-yellow-700"
                                >
                                    Mark Pending
                                </button>
                                <button
                                    onClick={() => bulkUpdateStatus('resolved')}
                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
                                >
                                    Mark Resolved
                                </button>
                                <button className="text-gray-600 hover:text-gray-800 p-1.5 rounded">
                                    <Archive className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Responsive Main Content */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
                {/* Tickets List - Responsive */}
                <div className={`${selectedTicket ? 'hidden lg:block' : 'block'} w-full lg:w-2/5 xl:w-1/3 border-r border-gray-200 bg-white flex flex-col`}>
                    {/* List Header */}
                    <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <input
                                    type="checkbox"
                                    checked={selectedTickets.size === filteredAndSortedTickets.length && filteredAndSortedTickets.length > 0}
                                    onChange={selectAllTickets}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm font-medium text-gray-700">
                                    {filteredAndSortedTickets.length} tickets
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value)}
                                    className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                >
                                    <option value="created_at">Created</option>
                                    <option value="updated_at">Updated</option>
                                    <option value="priority">Priority</option>
                                    <option value="status">Status</option>
                                </select>
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="text-gray-500 hover:text-gray-700 p-1"
                                >
                                    {sortOrder === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tickets List */}
                    <div className="flex-1 overflow-y-auto">
                        {filteredAndSortedTickets.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-12 text-center">
                                <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                                    <MessageSquare className="w-12 h-12 text-blue-600" />
                                </div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">No Tickets Found</h3>
                                <p className="text-gray-600 mb-6 max-w-md">
                                    {search || statusFilter !== 'all' || priorityFilter !== 'all' 
                                        ? "Try adjusting your filters to see more tickets"
                                        : "Create your first support ticket to get started with customer support management"
                                    }
                                </p>
                                <button
                                    onClick={() => setShowCreateForm(true)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-5 h-5" />
                                    Create Your First Ticket
                                </button>
                            </div>
                        ) : (
                            <div>
                                {filteredAndSortedTickets.map((ticket) => {
                                    const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || Circle;
                                    const PriorityIcon = PRIORITY_CONFIG[ticket.priority]?.icon || Minus;
                                    const isSelected = selectedTicket?.id === ticket.id;
                                    const isChecked = selectedTickets.has(ticket.id);
                                    
                                    return (
                                        <div
                                            key={ticket.id}
                                            className={`border-b border-gray-100 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all duration-200 cursor-pointer group ${
                                                isSelected ? "bg-gradient-to-r from-blue-100 to-indigo-100 border-l-4 border-l-blue-600 shadow-md" : ""
                                            } ${isChecked ? "bg-blue-50" : ""}`}
                                        >
                                            <div className="p-4">
                                                <div className="flex items-start gap-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={isChecked}
                                                        onChange={(e) => {
                                                            e.stopPropagation();
                                                            toggleTicketSelection(ticket.id);
                                                        }}
                                                        className="mt-1.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                                                    />
                                                    
                                                    <div 
                                                        className="flex-1 min-w-0"
                                                        onClick={() => setSelectedTicket(ticket)}
                                                    >
                                                        {/* Priority and Status Indicators with Better Design */}
                                                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                                                            {/* Priority Dot with Animation for Urgent */}
                                                            {ticket.priority === 'urgent' ? (
                                                                <span className="relative flex h-3 w-3">
                                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                                                                </span>
                                                            ) : (
                                                                <div className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[ticket.priority]?.bgColor} shadow-sm`}></div>
                                                            )}
                                                            
                                                            <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_CONFIG[ticket.status]?.color} shadow-sm`}>
                                                                <StatusIcon className="w-3.5 h-3.5" />
                                                                {STATUS_CONFIG[ticket.status]?.label}
                                                            </span>
                                                            
                                                            {ticket.priority && (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${PRIORITY_CONFIG[ticket.priority]?.badgeColor} shadow-sm`}>
                                                                    <PriorityIcon className="w-3 h-3" />
                                                                    {PRIORITY_CONFIG[ticket.priority]?.label}
                                                                </span>
                                                            )}
                                                            
                                                            {ticket.category && ticket.category !== 'general' && (
                                                                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${CATEGORY_CONFIG[ticket.category]?.color || 'bg-gray-100 text-gray-700'} shadow-sm`}>
                                                                    {CATEGORY_CONFIG[ticket.category]?.label || ticket.category}
                                                                </span>
                                                            )}
                                                        </div>
                                                        
                                                        {/* Ticket Title with Better Typography */}
                                                        <h3 className="font-semibold text-gray-900 mb-1.5 line-clamp-2 text-base group-hover:text-blue-700 transition-colors">
                                                            {ticket.subject}
                                                        </h3>
                                                        
                                                        {/* Ticket Description with Better Styling */}
                                                        <p className="text-sm text-gray-600 line-clamp-2 mb-3 leading-relaxed">
                                                            {ticket.description}
                                                        </p>
                                                        
                                                        {/* Ticket Meta with Icons and Better Layout */}
                                                        <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500">
                                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                                                <User className="w-3.5 h-3.5 text-gray-400" />
                                                                <span className="font-medium">{ticket.assignee_id ? getUserName(ticket.assignee_id) : "Unassigned"}</span>
                                                            </span>
                                                            <span className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-md">
                                                                <Clock className="w-3.5 h-3.5 text-gray-400" />
                                                                <span className="font-medium">{formatTime(ticket.created_at)}</span>
                                                            </span>
                                                            {ticket.requester_name && (
                                                                <span className="flex items-center gap-1.5 bg-blue-50 px-2 py-1 rounded-md">
                                                                    <Mail className="w-3.5 h-3.5 text-blue-500" />
                                                                    <span className="font-medium text-blue-700">{ticket.requester_name}</span>
                                                                </span>
                                                            )}
                                                            {ticket.comments && ticket.comments.length > 0 && (
                                                                <span className="flex items-center gap-1.5 bg-green-50 px-2 py-1 rounded-md">
                                                                    <MessageSquare className="w-3.5 h-3.5 text-green-500" />
                                                                    <span className="font-medium text-green-700">{ticket.comments.length}</span>
                                                                </span>
                                                            )}
                                                            {ticket.source_email_id && (
                                                                <span className="flex items-center gap-1.5 bg-purple-50 px-2 py-1 rounded-md">
                                                                    <Mail className="w-3.5 h-3.5 text-purple-500" />
                                                                    <span className="font-medium text-purple-700">From Email</span>
                                                                </span>
                                                            )}
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

                {/* Ticket Details - Responsive */}
                <div className={`${selectedTicket ? 'block' : 'hidden lg:block'} flex-1 bg-white flex flex-col`}>
                    {selectedTicket ? (
                        <>
                            {/* Mobile Back Button */}
                            <div className="lg:hidden px-4 py-3 border-b border-gray-200 bg-gray-50">
                                <button
                                    onClick={() => setSelectedTicket(null)}
                                    className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                                >
                                    <ChevronDown className="w-4 h-4 rotate-90" />
                                    Back to tickets
                                </button>
                            </div>

                            {/* Ticket Header */}
                            <div className="px-4 sm:px-6 py-4 border-b border-gray-200">
                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className={`w-3 h-3 rounded-full ${PRIORITY_CONFIG[selectedTicket.priority]?.bgColor}`}></div>
                                            <span className="text-sm font-medium text-gray-600">
                                                #{selectedTicket.id?.slice(-8) || 'Unknown'}
                                            </span>
                                            {selectedTicket.source_email_id && (
                                                <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full text-xs font-medium">
                                                    From Email
                                                </span>
                                            )}
                                        </div>
                                        <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">
                                            {selectedTicket.subject}
                                        </h2>
                                        <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                                            <span>Created {new Date(selectedTicket.created_at).toLocaleDateString()}</span>
                                            {selectedTicket.requester_name && (
                                                <span>by {selectedTicket.requester_name}</span>
                                            )}
                                            {selectedTicket.requester_email && (
                                                <span className="text-blue-600">{selectedTicket.requester_email}</span>
                                            )}
                                        </div>
                                    </div>
                                    
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => copyTicketUrl(selectedTicket.id)}
                                            className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100"
                                            title="Copy ticket URL"
                                        >
                                            <Copy className="w-4 h-4" />
                                        </button>
                                        <button className="text-gray-500 hover:text-gray-700 p-2 rounded-lg hover:bg-gray-100">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setSelectedTicket(null)}
                                            className="text-gray-400 hover:text-gray-600 p-2 rounded-lg hover:bg-gray-100 hidden lg:block"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                                
                                {/* Ticket Description */}
                                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                                    <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                                        {selectedTicket.description}
                                    </p>
                                </div>

                                {/* Quick Actions - Responsive Grid */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                                        <select
                                            value={selectedTicket.status}
                                            onChange={(e) => updateTicket(selectedTicket.id, { status: e.target.value })}
                                            disabled={updating}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        >
                                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Priority</label>
                                        <select
                                            value={selectedTicket.priority}
                                            onChange={(e) => updateTicket(selectedTicket.id, { priority: e.target.value })}
                                            disabled={updating}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        >
                                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                                        <select
                                            value={selectedTicket.category || 'general'}
                                            onChange={(e) => updateTicket(selectedTicket.id, { category: e.target.value })}
                                            disabled={updating}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        >
                                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-medium text-gray-700 mb-1">Assignee</label>
                                        <select
                                            value={selectedTicket.assignee_id || ""}
                                            onChange={(e) => updateTicket(selectedTicket.id, { assignee_id: e.target.value || null })}
                                            disabled={updating}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        >
                                            <option value="">Unassigned</option>
                                            {users.map(user => (
                                                <option key={user.id} value={user.id}>{user.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                {/* Additional Ticket Info */}
                                {(selectedTicket.contact_id || selectedTicket.tags) && (
                                    <div className="mt-4 pt-4 border-t border-gray-200">
                                        <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                                            {selectedTicket.contact_id && (
                                                <div>
                                                    <span className="font-medium">Contact:</span> {getContactName(selectedTicket.contact_id)}
                                                </div>
                                            )}
                                            {selectedTicket.tags && selectedTicket.tags.length > 0 && (
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium">Tags:</span>
                                                    {selectedTicket.tags.map((tag, index) => (
                                                        <span key={index} className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full text-xs">
                                                            {tag}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Comments Section */}
                            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-medium text-gray-900">Activity & Comments</h3>
                                        <span className="text-sm text-gray-500">
                                            {selectedTicket.comments?.length || 0} comments
                                        </span>
                                    </div>
                                    
                                    {/* Comments List */}
                                    <div className="space-y-4">
                                        {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                                            selectedTicket.comments.map((comment) => (
                                                <div key={comment.id} className={`rounded-lg p-4 ${
                                                    comment.internal 
                                                        ? "bg-yellow-50 border border-yellow-200" 
                                                        : "bg-gray-50 border border-gray-200"
                                                }`}>
                                                    <div className="flex items-start justify-between mb-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                                                                <span className="text-white text-sm font-medium">
                                                                    {comment.author?.charAt(0)?.toUpperCase() || 'U'}
                                                                </span>
                                                            </div>
                                                            <div>
                                                                <span className="font-medium text-sm text-gray-900">
                                                                    {comment.author || 'Unknown'}
                                                                </span>
                                                                {comment.internal && (
                                                                    <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                                        Internal Note
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-gray-500">
                                                            {new Date(comment.created_at).toLocaleString()}
                                                        </span>
                                                    </div>
                                                    <div className="ml-10">
                                                        <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">
                                                            {comment.body}
                                                        </p>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="text-center py-8">
                                                <MessageSquare className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                                                <p className="text-gray-500 text-sm">No comments yet</p>
                                                <p className="text-gray-400 text-xs">Be the first to add a comment</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Add Comment Section */}
                            <div className="border-t border-gray-200 px-4 sm:px-6 py-4 bg-gray-50">
                                <div className="space-y-3">
                                    {/* Comment Type Toggle */}
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                id="public"
                                                name="commentType"
                                                value="public"
                                                checked={commentType === "public"}
                                                onChange={(e) => setCommentType(e.target.value)}
                                                className="text-blue-600 focus:ring-blue-500"
                                            />
                                            <label htmlFor="public" className="text-sm font-medium text-gray-700">
                                                Public Reply
                                            </label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="radio"
                                                id="internal"
                                                name="commentType"
                                                value="internal"
                                                checked={commentType === "internal"}
                                                onChange={(e) => setCommentType(e.target.value)}
                                                className="text-yellow-600 focus:ring-yellow-500"
                                            />
                                            <label htmlFor="internal" className="text-sm font-medium text-gray-700">
                                                Internal Note
                                            </label>
                                        </div>
                                    </div>

                                    {/* Quick Actions */}
                                    <div className="flex flex-wrap gap-2">
                                        <button
                                            onClick={() => setShowCannedPicker(true)}
                                            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Quick Reply
                                        </button>
                                        {commentType === "public" && (
                                            <>
                                                <button
                                                    onClick={() => {
                                                        setComment("Thank you for contacting us. We have received your request and will get back to you shortly.");
                                                    }}
                                                    className="bg-green-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-green-700"
                                                >
                                                    Acknowledge
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        updateTicket(selectedTicket.id, { status: 'resolved' });
                                                        setComment("This issue has been resolved. Please let us know if you need any further assistance.");
                                                    }}
                                                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-700"
                                                >
                                                    Resolve & Reply
                                                </button>
                                            </>
                                        )}
                                    </div>

                                    {/* Comment Input */}
                                    <div className="relative">
                                        <textarea
                                            value={comment}
                                            onChange={(e) => setComment(e.target.value)}
                                            placeholder={commentType === "internal" ? "Add an internal note..." : "Type your reply..."}
                                            rows={4}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                        />
                                        <div className="absolute bottom-2 right-2">
                                            <button
                                                onClick={addComment}
                                                disabled={commenting || !comment.trim()}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 text-sm"
                                            >
                                                {commenting ? (
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                ) : (
                                                    <Send className="w-4 h-4" />
                                                )}
                                                {commentType === "internal" ? "Add Note" : "Send Reply"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="flex-1 flex items-center justify-center text-gray-500">
                            <div className="text-center">
                                <MessageSquare className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                                <h3 className="text-lg font-medium text-gray-900 mb-2">Select a ticket</h3>
                                <p className="text-gray-500 max-w-sm">
                                    Choose a ticket from the list to view its details and manage the conversation
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Enhanced Create Ticket Modal - Responsive */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
                        {/* Modal Header */}
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Create New Ticket</h3>
                                <button
                                    onClick={() => setShowCreateForm(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {/* Modal Content */}
                        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                            <form onSubmit={createTicket} className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Subject *
                                    </label>
                                    <input
                                        type="text"
                                        required
                                        value={newTicket.subject}
                                        onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        placeholder="Brief description of the issue"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={newTicket.description}
                                        onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                        rows={4}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                                        placeholder="Detailed description of the issue"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Priority
                                        </label>
                                        <select
                                            value={newTicket.priority}
                                            onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Category
                                        </label>
                                        <select
                                            value={newTicket.category}
                                            onChange={(e) => setNewTicket({ ...newTicket, category: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            {Object.entries(CATEGORY_CONFIG).map(([key, config]) => (
                                                <option key={key} value={key}>{config.label}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Contact
                                        </label>
                                        <select
                                            value={newTicket.contact_id}
                                            onChange={(e) => setNewTicket({ ...newTicket, contact_id: e.target.value })}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                        >
                                            <option value="">No contact</option>
                                            {contacts.map(contact => (
                                                <option key={contact.id} value={contact.id}>{contact.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex gap-3 justify-end pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateForm(false)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={creating}
                                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {creating ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Plus className="w-4 h-4" />
                                        )}
                                        Create Ticket
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Enhanced Canned Response Modal - Responsive */}
            {showCannedPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden">
                        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-gray-900">Quick Replies</h3>
                                <button 
                                    onClick={() => setShowCannedPicker(false)}
                                    className="text-gray-400 hover:text-gray-600 p-1 rounded"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                        
                        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
                            <p className="text-sm text-gray-600 mb-4">
                                Select a pre-written response to insert into your comment.
                            </p>
                            
                            {cannedResponses.length === 0 ? (
                                <div className="text-center py-12">
                                    <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                    <h4 className="text-lg font-medium text-gray-900 mb-2">No quick replies yet</h4>
                                    <p className="text-gray-500 mb-4">Create quick replies to save time on common responses</p>
                                    <a 
                                        href="/settings"
                                        className="text-purple-600 hover:underline font-medium"
                                    >
                                        Create quick replies in Settings →
                                    </a>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {cannedResponses.map((canned) => (
                                        <button
                                            key={canned.id}
                                            onClick={() => insertCannedResponse(canned)}
                                            className="w-full text-left p-4 border border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-colors group"
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="font-medium text-gray-900 mb-1 group-hover:text-purple-700">
                                                        {canned.name}
                                                    </div>
                                                    <div className="text-sm text-gray-600 line-clamp-3">
                                                        {canned.body}
                                                    </div>
                                                    {canned.shortcut && (
                                                        <div className="text-xs text-gray-500 mt-2 font-mono bg-gray-100 px-2 py-1 rounded inline-block">
                                                            {canned.shortcut}
                                                        </div>
                                                    )}
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-purple-500 ml-2" />
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

export default Tickets;