import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
    MessageCircle, Send, Search, Phone, RefreshCw, 
    Loader2, User, Clock, CheckCheck, AlertCircle,
    Settings as SettingsIcon, X, Plus, Circle
} from "lucide-react";
import { Link } from "react-router-dom";

const POLL_MS = 5000;

const fmtTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    const today = new Date();
    const isToday = d.toDateString() === today.toDateString();
    if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    const yest = new Date(); yest.setDate(yest.getDate() - 1);
    if (d.toDateString() === yest.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
};

const fmtFullTime = (iso) => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
};

const initials = (name, phone) => {
    if (name) return name.split(" ").map((s) => s[0]).slice(0, 2).join("").toUpperCase();
    if (phone) return phone.slice(-2);
    return "??";
};

const StatusIcon = ({ status }) => {
    if (status === "queued") return <Clock className="w-3 h-3 text-gray-400" />;
    if (status === "sent") return <CheckCheck className="w-3 h-3 text-gray-400" />;
    if (status === "delivered") return <CheckCheck className="w-3 h-3 text-blue-500" />;
    if (status === "read") return <CheckCheck className="w-3 h-3 text-green-500" />;
    if (status === "failed") return <AlertCircle className="w-3 h-3 text-red-500" />;
    return null;
};

const WhatsAppInbox = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [messages, setMessages] = useState([]);
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [integrations, setIntegrations] = useState({});
    const [newPhone, setNewPhone] = useState("");
    const [showNewConv, setShowNewConv] = useState(false);

    const threadEndRef = useRef(null);
    const pollRef = useRef(null);

    const loadIntegrations = async () => {
        try {
            const { data } = await api.get("/integrations");
            setIntegrations(data || {});
        } catch (e) {
            // silent
        }
    };

    const loadConversations = async () => {
        try {
            const { data } = await api.get("/whatsapp/conversations-v2");
            setConversations(data || []);
        } catch (e) {
            // silent during polling
        } finally {
            setLoading(false);
        }
    };

    const loadThread = async (phone) => {
        if (!phone) return;
        try {
            const { data } = await api.get(`/whatsapp/conversations/${encodeURIComponent(phone)}/messages`);
            setMessages(data || []);
            // Mark as read
            api.post(`/whatsapp/conversations/${encodeURIComponent(phone)}/read`).catch(() => {});
        } catch (e) {
            // silent
        }
    };

    useEffect(() => {
        loadIntegrations();
        loadConversations();
    }, []);

    // Poll conversations + active thread
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(() => {
            loadConversations();
            if (selectedPhone) loadThread(selectedPhone);
        }, POLL_MS);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [selectedPhone]);

    useEffect(() => {
        if (selectedPhone) loadThread(selectedPhone);
    }, [selectedPhone]);

    useEffect(() => {
        if (threadEndRef.current) threadEndRef.current.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const filtered = useMemo(() => {
        if (!search.trim()) return conversations;
        const q = search.toLowerCase();
        return conversations.filter((c) =>
            (c.phone || "").toLowerCase().includes(q) ||
            (c.contact_name || "").toLowerCase().includes(q) ||
            (c.last_message || "").toLowerCase().includes(q)
        );
    }, [conversations, search]);

    const selectedConv = useMemo(
        () => conversations.find((c) => c.phone === selectedPhone),
        [conversations, selectedPhone]
    );

    const totalUnread = useMemo(
        () => conversations.reduce((a, c) => a + (c.unread || 0), 0),
        [conversations]
    );

    const anyConfigured = useMemo(() => {
        return (
            integrations?.whatsapp_business?.configured ||
            integrations?.twilio?.configured
        );
    }, [integrations]);

    const send = async () => {
        if (!reply.trim() || !selectedPhone) return;
        setSending(true);
        try {
            const { data } = await api.post("/whatsapp/send", {
                to: selectedPhone,
                body: reply.trim(),
                provider: "auto",
                contact_id: selectedConv?.contact_id || null,
            });
            setReply("");
            setMessages((prev) => [...prev, data]);
            loadConversations();
            if (data.status === "queued") {
                toast.warning("Message queued (test mode). Configure WhatsApp Business API for real delivery.");
            } else {
                toast.success(`Message sent via ${data.provider || "WhatsApp"}`);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to send message");
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
        }
    };

    const startNewConversation = async () => {
        const phone = newPhone.trim();
        if (!phone.startsWith("+") || phone.length < 8) {
            toast.error("Enter a valid phone number like +14155551234");
            return;
        }
        setSelectedPhone(phone);
        setShowNewConv(false);
        setNewPhone("");
        await loadConversations();
    };

    return (
        <div className="flex h-screen bg-gray-50">
            {/* Left Sidebar - Conversations */}
            <div className="w-80 bg-white border-r border-gray-200 flex flex-col">
                {/* Header */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center justify-between mb-3">
                        <h1 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                            <MessageCircle className="w-5 h-5 text-green-600" />
                            WhatsApp
                        </h1>
                        {totalUnread > 0 && (
                            <span className="bg-green-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                                {totalUnread}
                            </span>
                        )}
                    </div>
                    
                    {/* Status Banner */}
                    {!anyConfigured && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <div className="font-medium text-yellow-800">Test Mode</div>
                                    <div className="text-yellow-700 text-xs mt-1">
                                        Configure WhatsApp Business API in Settings for real messaging.
                                    </div>
                                    <Link 
                                        to="/app/settings" 
                                        className="text-yellow-800 text-xs font-medium hover:underline mt-1 inline-block"
                                    >
                                        Go to Settings →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-gray-200">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowNewConv(true)}
                            className="flex-1 bg-green-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-green-700 flex items-center justify-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                        <button
                            onClick={loadConversations}
                            className="border border-gray-200 px-3 py-2 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-6 text-center">
                            <Loader2 className="w-5 h-5 mx-auto animate-spin text-gray-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-6 text-center">
                            <MessageCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                            <div className="text-sm text-gray-500">
                                {search ? "No conversations found" : "No conversations yet"}
                            </div>
                        </div>
                    ) : (
                        filtered.map((c) => {
                            const active = c.phone === selectedPhone;
                            return (
                                <button
                                    key={c.phone}
                                    onClick={() => setSelectedPhone(c.phone)}
                                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                        active ? "bg-green-50 border-l-4 border-l-green-600" : ""
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                                            active ? "bg-green-600 text-white" : "bg-gray-200 text-gray-600"
                                        }`}>
                                            {initials(c.contact_name, c.phone)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2 mb-1">
                                                <div className="font-medium text-gray-900 truncate">
                                                    {c.contact_name || c.phone}
                                                </div>
                                                <div className="text-xs text-gray-500 flex-shrink-0">
                                                    {fmtTime(c.last_ts)}
                                                </div>
                                            </div>
                                            {c.contact_name && (
                                                <div className="text-xs text-gray-500 mb-1">
                                                    {c.phone}
                                                </div>
                                            )}
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="text-sm text-gray-600 truncate">
                                                    {c.last_direction === "outbound" && <span className="mr-1">→</span>}
                                                    {c.last_message || "No messages"}
                                                </div>
                                                {c.unread > 0 && (
                                                    <span className="bg-green-600 text-white px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0">
                                                        {c.unread}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Side - Chat Area */}
            <div className="flex-1 flex flex-col">
                {!selectedPhone ? (
                    <div className="flex-1 flex items-center justify-center bg-gray-50">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                                WhatsApp Business
                            </h2>
                            <p className="text-gray-600 mb-4">
                                Select a conversation to start messaging, or create a new chat.
                            </p>
                            {!anyConfigured && (
                                <Link
                                    to="/app/settings"
                                    className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700"
                                >
                                    <SettingsIcon className="w-4 h-4" />
                                    Configure WhatsApp
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Chat Header */}
                        <div className="bg-white border-b border-gray-200 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">
                                        {initials(selectedConv?.contact_name, selectedPhone)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900">
                                            {selectedConv?.contact_name || selectedPhone}
                                        </div>
                                        <div className="text-sm text-gray-500 flex items-center gap-2">
                                            <Phone className="w-3 h-3" />
                                            {selectedPhone}
                                            {selectedConv?.contact_id && (
                                                <Link
                                                    to="/app/contacts"
                                                    className="text-green-600 hover:underline flex items-center gap-1"
                                                >
                                                    <User className="w-3 h-3" />
                                                    View Contact
                                                </Link>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Circle className="w-2 h-2 fill-green-500 text-green-500" />
                                    <span className="text-sm text-gray-600">Online</span>
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
                            {messages.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    No messages yet. Send the first message below.
                                </div>
                            ) : (
                                <div className="max-w-4xl mx-auto space-y-4">
                                    {messages.map((m) => {
                                        const outbound = m.direction === "outbound";
                                        const ts = m.sent_at || m.received_at;
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                                            >
                                                <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                                                    outbound
                                                        ? "bg-green-600 text-white"
                                                        : "bg-white text-gray-900 border border-gray-200"
                                                }`}>
                                                    <div className="text-sm whitespace-pre-wrap break-words">
                                                        {m.body}
                                                    </div>
                                                    <div className={`flex items-center gap-1 text-xs mt-1 ${
                                                        outbound ? "text-green-100 justify-end" : "text-gray-500"
                                                    }`}>
                                                        <span>{fmtFullTime(ts)}</span>
                                                        {outbound && (
                                                            <>
                                                                <StatusIcon status={m.status} />
                                                            </>
                                                        )}
                                                    </div>
                                                    {m.status === "failed" && m.error && (
                                                        <div className="text-xs mt-1 text-red-200 bg-red-500/20 px-2 py-1 rounded">
                                                            {m.error}
                                                        </div>
                                                    )}
                                                    {m.status === "queued" && (
                                                        <div className="text-xs mt-1 text-yellow-200 bg-yellow-500/20 px-2 py-1 rounded">
                                                            Queued (test mode)
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div ref={threadEndRef} />
                                </div>
                            )}
                        </div>

                        {/* Message Input */}
                        <div className="bg-white border-t border-gray-200 p-4">
                            <div className="max-w-4xl mx-auto flex gap-3">
                                <textarea
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                    placeholder="Type a message... (Enter to send, Shift+Enter for new line)"
                                    className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent resize-none max-h-32"
                                />
                                <button
                                    onClick={send}
                                    disabled={sending || !reply.trim()}
                                    className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    {sending ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Send className="w-4 h-4" />
                                    )}
                                    Send
                                </button>
                            </div>
                            {!anyConfigured && (
                                <div className="max-w-4xl mx-auto mt-2 text-xs text-gray-500 text-center">
                                    Test mode: Messages will be queued and a simulated reply will arrive shortly
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>

            {/* New Conversation Modal */}
            {showNewConv && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">New Conversation</h3>
                            <button 
                                onClick={() => setShowNewConv(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Phone Number
                            </label>
                            <input
                                autoFocus
                                value={newPhone}
                                onChange={(e) => setNewPhone(e.target.value)}
                                placeholder="+1 (555) 123-4567"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                onKeyDown={(e) => e.key === "Enter" && startNewConversation()}
                            />
                            <p className="text-xs text-gray-500 mt-1">
                                Enter phone number in international format (e.g., +14155551234)
                            </p>
                        </div>

                        <div className="flex gap-3 justify-end">
                            <button 
                                onClick={() => setShowNewConv(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={startNewConversation}
                                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                            >
                                Start Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppInbox;