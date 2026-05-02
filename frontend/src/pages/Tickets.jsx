import { useEffect, useState, useCallback, useMemo } from "react";
import api from "../lib/api";
import { 
    Plus, Search, Clock, User, MessageSquare, 
    CheckCircle, AlertCircle, Circle, Send, Loader2,
    ArrowUp, ArrowDown, Minus, X, Eye, Zap, Filter,
    RefreshCw, Archive, Edit3
} from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
    open: { label: "Open", color: "bg-red-100 text-red-800", icon: Circle },
    pending: { label: "Pending", color: "bg-yellow-100 text-yellow-800", icon: Clock },
    resolved: { label: "Resolved", color: "bg-green-100 text-green-800", icon: CheckCircle },
    closed: { label: "Closed", color: "bg-gray-100 text-gray-800", icon: CheckCircle }
};

const PRIORITY_CONFIG = {
    low: { label: "Low", color: "text-gray-500", icon: ArrowDown },
    medium: { label: "Medium", color: "text-blue-500", icon: Minus },
    high: { label: "High", color: "text-orange-500", icon: ArrowUp },
    urgent: { label: "Urgent", color: "text-red-500", icon: AlertCircle }
};

const formatTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

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
    
    // Filters and search
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [priorityFilter, setPriorityFilter] = useState("all");
    const [assigneeFilter, setAssigneeFilter] = useState("all");
    
    // Forms
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [newTicket, setNewTicket] = useState({
        subject: "",
        description: "",
        priority: "medium",
        contact_id: ""
    });
    const [comment, setComment] = useState("");
    const [showCannedPicker, setShowCannedPicker] = useState(false);

    // Load data with better error handling and performance
    const loadData = useCallback(async (showLoading = true) => {
        if (showLoading) setLoading(true);
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
            if (showLoading) setLoading(false);
        }
    }, [selectedTicket]);

    useEffect(() => {
        loadData();
        // Auto-refresh every 60 seconds (increased from 30s for better performance)
        const interval = setInterval(() => loadData(false), 60000);
        return () => clearInterval(interval);
    }, [loadData]);

    // Filter and search tickets
    const filteredTickets = useMemo(() => {
        return tickets.filter(ticket => {
            const matchesSearch = !search || 
                ticket.subject.toLowerCase().includes(search.toLowerCase()) ||
                ticket.description?.toLowerCase().includes(search.toLowerCase()) ||
                ticket.requester_name?.toLowerCase().includes(search.toLowerCase());
            
            const matchesStatus = statusFilter === "all" || ticket.status === statusFilter;
            const matchesPriority = priorityFilter === "all" || ticket.priority === priorityFilter;
            const matchesAssignee = assigneeFilter === "all" || 
                (assigneeFilter === "unassigned" && !ticket.assignee_id) ||
                ticket.assignee_id === assigneeFilter;
            
            return matchesSearch && matchesStatus && matchesPriority && matchesAssignee;
        });
    }, [tickets, search, statusFilter, priorityFilter, assigneeFilter]);

    // Create new ticket
    const createTicket = async (e) => {
        e.preventDefault();
        if (!newTicket.subject.trim()) {
            toast.error("Subject is required");
            return;
        }
        
        setCreating(true);
        try {
            await api.post("/tickets", {
                ...newTicket,
                contact_id: newTicket.contact_id || null,
                status: "open",
                channel: "internal"
            });
            
            toast.success("Ticket created successfully");
            setNewTicket({ subject: "", description: "", priority: "medium", contact_id: "" });
            setShowCreateForm(false);
            loadData();
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to create ticket");
        } finally {
            setCreating(false);
        }
    };

    // Update ticket field
    const updateTicket = async (ticketId, updates) => {
        try {
            await api.put(`/tickets/${ticketId}`, { ...selectedTicket, ...updates });
            toast.success("Ticket updated");
            loadData();
        } catch (error) {
            toast.error("Failed to update ticket");
        }
    };

    // Add comment
    const addComment = async () => {
        if (!comment.trim() || !selectedTicket) return;
        
        setCommenting(true);
        try {
            await api.post(`/tickets/${selectedTicket.id}/comments`, {
                body: comment.trim(),
                internal: false
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

    // Get user name by ID
    const getUserName = (userId) => {
        const user = users.find(u => u.id === userId);
        return user ? user.name : "Unassigned";
    };

    // Get contact name by ID
    const getContactName = (contactId) => {
        const contact = contacts.find(c => c.id === contactId);
        return contact ? contact.name : null;
    };

    // Canned response functions
    const insertCannedResponse = (cannedResponse) => {
        setComment(cannedResponse.body);
        setShowCannedPicker(false);
        toast.success("Quick reply inserted");
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold text-gray-900">Support Tickets</h1>
                        <p className="text-sm text-gray-600 mt-1">
                            {filteredTickets.length} of {tickets.length} tickets
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => loadData(false)}
                            className="bg-gray-100 text-gray-700 px-3 py-2 rounded-lg font-medium hover:bg-gray-200 flex items-center gap-2"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Refresh
                        </button>
                        <button
                            onClick={() => setShowCreateForm(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Ticket
                        </button>
                    </div>
                </div>

                {/* Enhanced Filters */}
                <div className="flex items-center gap-4 mt-4 flex-wrap">
                    <div className="relative flex-1 min-w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search tickets, descriptions, or contacts..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <Filter className="w-4 h-4 text-gray-500" />
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">All Status</option>
                            {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>

                        <select
                            value={priorityFilter}
                            onChange={(e) => setPriorityFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">All Priority</option>
                            {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                <option key={key} value={key}>{config.label}</option>
                            ))}
                        </select>

                        <select
                            value={assigneeFilter}
                            onChange={(e) => setAssigneeFilter(e.target.value)}
                            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                        >
                            <option value="all">All Assignees</option>
                            <option value="unassigned">Unassigned</option>
                            {users.map(user => (
                                <option key={user.id} value={user.id}>{user.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Tickets List */}
                <div className="w-1/2 border-r border-gray-200 bg-white overflow-y-auto">
                    {filteredTickets.length === 0 ? (
                        <div className="p-8 text-center text-gray-500">
                            <MessageSquare className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                            <p>No tickets found</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-200">
                            {filteredTickets.map((ticket) => {
                                const StatusIcon = STATUS_CONFIG[ticket.status]?.icon || Circle;
                                const PriorityIcon = PRIORITY_CONFIG[ticket.priority]?.icon || Minus;
                                const isSelected = selectedTicket?.id === ticket.id;
                                
                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                                            isSelected ? "bg-blue-50 border-l-4 border-l-blue-600" : ""
                                        }`}
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${STATUS_CONFIG[ticket.status]?.color}`}>
                                                        <StatusIcon className="w-3 h-3" />
                                                        {STATUS_CONFIG[ticket.status]?.label}
                                                    </span>
                                                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${PRIORITY_CONFIG[ticket.priority]?.color}`}>
                                                        <PriorityIcon className="w-3 h-3" />
                                                        {PRIORITY_CONFIG[ticket.priority]?.label}
                                                    </span>
                                                </div>
                                                
                                                <h3 className="font-medium text-gray-900 truncate mb-1">
                                                    {ticket.subject}
                                                </h3>
                                                
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                                    {ticket.description}
                                                </p>
                                                
                                                <div className="flex items-center gap-4 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1">
                                                        <User className="w-3 h-3" />
                                                        {ticket.assignee_id ? getUserName(ticket.assignee_id) : "Unassigned"}
                                                    </span>
                                                    <span className="flex items-center gap-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatTime(ticket.created_at)}
                                                    </span>
                                                    {ticket.comments && ticket.comments.length > 0 && (
                                                        <span className="flex items-center gap-1">
                                                            <MessageSquare className="w-3 h-3" />
                                                            {ticket.comments.length}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Ticket Details */}
                <div className="w-1/2 bg-white overflow-y-auto">
                    {selectedTicket ? (
                        <div className="p-6">
                            {/* Ticket Header */}
                            <div className="border-b border-gray-200 pb-4 mb-6">
                                <div className="flex items-start justify-between gap-4 mb-4">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {selectedTicket.subject}
                                    </h2>
                                    <button
                                        onClick={() => setSelectedTicket(null)}
                                        className="text-gray-400 hover:text-gray-600"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>
                                </div>
                                
                                <p className="text-gray-700 mb-4 whitespace-pre-wrap">
                                    {selectedTicket.description}
                                </p>

                                {/* Quick Actions */}
                                <div className="grid grid-cols-2 gap-3">
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => updateTicket(selectedTicket.id, { status: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Object.entries(STATUS_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={selectedTicket.priority}
                                        onChange={(e) => updateTicket(selectedTicket.id, { priority: e.target.value })}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>

                                    <select
                                        value={selectedTicket.assignee_id || ""}
                                        onChange={(e) => updateTicket(selectedTicket.id, { assignee_id: e.target.value || null })}
                                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 col-span-2"
                                    >
                                        <option value="">Unassigned</option>
                                        {users.map(user => (
                                            <option key={user.id} value={user.id}>{user.name}</option>
                                        ))}
                                    </select>
                                </div>

                                {/* Ticket Meta */}
                                <div className="mt-4 text-sm text-gray-600 space-y-1">
                                    <div>Created: {new Date(selectedTicket.created_at).toLocaleString()}</div>
                                    {selectedTicket.requester_name && (
                                        <div>Requester: {selectedTicket.requester_name}</div>
                                    )}
                                    {selectedTicket.contact_id && (
                                        <div>Contact: {getContactName(selectedTicket.contact_id)}</div>
                                    )}
                                </div>
                            </div>

                            {/* Comments */}
                            <div className="space-y-4">
                                <h3 className="font-medium text-gray-900">Comments</h3>
                                
                                <div className="space-y-3 max-h-96 overflow-y-auto">
                                    {selectedTicket.comments && selectedTicket.comments.length > 0 ? (
                                        selectedTicket.comments.map((comment) => (
                                            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                                                <div className="flex items-center justify-between mb-2">
                                                    <span className="font-medium text-sm text-gray-900">
                                                        {comment.author}
                                                    </span>
                                                    <span className="text-xs text-gray-500">
                                                        {new Date(comment.created_at).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {comment.body}
                                                </p>
                                                {comment.internal && (
                                                    <span className="inline-block mt-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">
                                                        Internal Note
                                                    </span>
                                                )}
                                            </div>
                                        ))
                                    ) : (
                                        <p className="text-gray-500 text-sm">No comments yet</p>
                                    )}
                                </div>

                                {/* Add Comment */}
                                <div className="border-t border-gray-200 pt-4">
                                    <div className="flex gap-2 mb-2">
                                        <button
                                            onClick={() => setShowCannedPicker(true)}
                                            className="bg-purple-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                                        >
                                            <Zap className="w-4 h-4" />
                                            Quick Reply
                                        </button>
                                    </div>
                                    <textarea
                                        value={comment}
                                        onChange={(e) => setComment(e.target.value)}
                                        placeholder="Add a comment..."
                                        rows={3}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    />
                                    <div className="flex justify-end mt-2">
                                        <button
                                            onClick={addComment}
                                            disabled={commenting || !comment.trim()}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                        >
                                            {commenting ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Send className="w-4 h-4" />
                                            )}
                                            Add Comment
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <div className="text-center">
                                <Eye className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                <p>Select a ticket to view details</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Create Ticket Modal */}
            {showCreateForm && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Create New Ticket</h3>
                            <button
                                onClick={() => setShowCreateForm(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <form onSubmit={createTicket} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Subject *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={newTicket.subject}
                                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="Brief description of the issue"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    Description
                                </label>
                                <textarea
                                    value={newTicket.description}
                                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                                    placeholder="Detailed description of the issue"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Priority
                                    </label>
                                    <select
                                        value={newTicket.priority}
                                        onChange={(e) => setNewTicket({ ...newTicket, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        {Object.entries(PRIORITY_CONFIG).map(([key, config]) => (
                                            <option key={key} value={key}>{config.label}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">
                                        Contact
                                    </label>
                                    <select
                                        value={newTicket.contact_id}
                                        onChange={(e) => setNewTicket({ ...newTicket, contact_id: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="">No contact</option>
                                        {contacts.map(contact => (
                                            <option key={contact.id} value={contact.id}>{contact.name}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end pt-4">
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
                                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
            )}

            {/* Canned Response Picker Modal */}
            {showCannedPicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Quick Replies</h3>
                            <button 
                                onClick={() => setShowCannedPicker(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <p className="text-sm text-gray-600 mb-4">
                            Select a pre-written response to insert into your comment.
                        </p>
                        
                        {cannedResponses.length === 0 ? (
                            <div className="text-center py-8">
                                <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 mb-4">No quick replies available</p>
                                <a 
                                    href="/app/settings"
                                    className="text-purple-600 hover:underline"
                                >
                                    Create quick replies in Settings →
                                </a>
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {cannedResponses.map((canned) => (
                                    <button
                                        key={canned.id}
                                        onClick={() => insertCannedResponse(canned)}
                                        className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        <div className="font-medium text-gray-900 mb-1">
                                            {canned.name}
                                        </div>
                                        <div className="text-sm text-gray-600">
                                            {canned.body}
                                        </div>
                                        {canned.shortcut && (
                                            <div className="text-xs text-gray-500 mt-1">
                                                Shortcut: {canned.shortcut}
                                            </div>
                                        )}
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

export default Tickets;