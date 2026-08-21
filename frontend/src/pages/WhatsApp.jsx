import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
    MessageCircle, Send, Search, Phone, RefreshCw, 
    Loader2, User, Clock, CheckCheck, AlertCircle,
    Settings as SettingsIcon, X, Plus, Circle, BookTemplate,
    Zap, Copy, Check, Info, UserPlus, Ticket, Users, UserCheck
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
    const [mediaUrl, setMediaUrl] = useState("");
    const [mediaType, setMediaType] = useState("image");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [integrations, setIntegrations] = useState({});
    const [integrationsLoaded, setIntegrationsLoaded] = useState(false);
    const [newPhone, setNewPhone] = useState("");
    const [showNewConv, setShowNewConv] = useState(false);

    // Templates and Canned Responses
    const [templates, setTemplates] = useState([]);
    const [cannedResponses, setCannedResponses] = useState([]);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showCannedPicker, setShowCannedPicker] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateParams, setTemplateParams] = useState([]);

    // Team presence + assignment
    const [team, setTeam] = useState([]);
    const [showAssign, setShowAssign] = useState(false);
    const [autoAssigning, setAutoAssigning] = useState(false);

    // Sync contact modal
    const [showSyncContact, setShowSyncContact] = useState(false);
    const [contactForm, setContactForm] = useState({ name: "", email: "", company: "", notes: "" });
    const [syncing, setSyncing] = useState(false);

    // Create ticket modal
    const [showCreateTicket, setShowCreateTicket] = useState(false);
    const [ticketForm, setTicketForm] = useState({ subject: "", description: "", priority: "medium", include_last_messages: 5 });
    const [creatingTicket, setCreatingTicket] = useState(false);

    const threadEndRef = useRef(null);
    const pollRef = useRef(null);

    const loadIntegrations = async () => {
        try {
            const { data } = await api.get("/integrations");
            setIntegrations(data || {});
            setIntegrationsLoaded(true);
        } catch (e) {
            // If user doesn't have permission to view integrations (e.g., agents),
            // assume WhatsApp is configured to avoid showing config prompts
            if (e.response?.status === 403) {
                setIntegrations({ whatsapp_business: { configured: true } });
            }
            setIntegrationsLoaded(true);
        }
    };

    const loadTemplates = async () => {
        try {
            const { data } = await api.get("/whatsapp/templates");
            setTemplates(data || []);
        } catch (e) {
            console.error('Failed to load templates:', e);
            // Silent failure for non-critical data
        }
    };

    const loadCannedResponses = async () => {
        try {
            const { data } = await api.get("/canned-responses");
            setCannedResponses(data || []);
        } catch (e) {
            console.error('Failed to load canned responses:', e);
            // Silent failure for non-critical data
        }
    };

    const loadTeam = async () => {
        try {
            const { data } = await api.get("/presence");
            setTeam(data || []);
        } catch (e) {
            console.error('Failed to load team presence:', e);
            // Silent failure for non-critical data
        }
    };

    const loadConversations = async () => {
        try {
            const { data } = await api.get("/whatsapp/conversations-v2");
            setConversations(data || []);
        } catch (e) {
            console.error('Failed to load conversations:', e);
            // Don't show error to user during polling
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
        // Load critical data first for faster initial render
        const loadInitialData = async () => {
            setLoading(true);
            try {
                // Load integrations first to determine test mode status quickly
                await loadIntegrations();
                
                // Load conversations immediately for better UX
                await loadConversations();
                
                // Load other data in background (non-blocking)
                setTimeout(() => {
                    Promise.all([
                        loadTemplates(),
                        loadCannedResponses(),
                        loadTeam()
                    ]).catch(console.error);
                }, 100);
                
            } catch (error) {
                console.error('Failed to load initial data:', error);
            } finally {
                setLoading(false);
            }
        };
        loadInitialData();
    }, []);

    // Refresh team presence every 30s (reduced frequency)
    useEffect(() => {
        const iv = setInterval(loadTeam, 30000);
        return () => clearInterval(iv);
    }, []);

    // Poll conversations + active thread (reduced frequency for better performance)
    useEffect(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        
        // Longer polling interval for better performance
        const pollInterval = 8000; // 8 seconds instead of 5
        
        pollRef.current = setInterval(() => {
            // Only poll if component is visible and user is active
            if (document.visibilityState === 'visible') {
                loadConversations();
                if (selectedPhone) loadThread(selectedPhone);
            }
        }, pollInterval);
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
        // Don't show test mode banner until integrations are loaded
        if (!integrationsLoaded) {
            return true; // Assume configured while loading to avoid flickering test mode banner
        }
        return (
            integrations?.whatsapp_business?.configured ||
            integrations?.twilio?.configured
        );
    }, [integrations, integrationsLoaded]);

    // 24-hour window: true if the most recent INBOUND message was within 24h
    const in24hWindow = useMemo(() => {
        const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
        if (!lastInbound) return false;
        const ts = lastInbound.received_at || lastInbound.sent_at;
        if (!ts) return false;
        return (Date.now() - new Date(ts).getTime()) < 24 * 60 * 60 * 1000;
    }, [messages]);

    const hasAnyInbound = useMemo(() => messages.some((m) => m.direction === "inbound"), [messages]);

    const onlineCount = useMemo(() => team.filter((t) => t.online).length, [team]);

    const send = async () => {
        if ((!reply.trim() && !mediaUrl.trim()) || !selectedPhone) return;
        setSending(true);
        try {
            const { data } = await api.post("/whatsapp/send", {
                to: selectedPhone,
                body: reply.trim(),
                media_url: mediaUrl.trim() || null,
                media_type: mediaUrl.trim() ? mediaType : null,
                provider: "auto",
                contact_id: selectedConv?.contact_id || null,
            });
            setReply("");
            setMediaUrl("");
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

    // Template functions
    const openTemplatePicker = () => {
        loadTemplates();
        setSelectedTemplate(null);
        setTemplateParams([]);
        setShowTemplatePicker(true);
    };

    const pickTemplate = (tpl) => {
        setSelectedTemplate(tpl);
        const n = tpl.param_count || 0;
        setTemplateParams(Array(n).fill(""));
    };

    const sendTemplate = async () => {
        if (!selectedTemplate || !selectedPhone) return;
        const params = templateParams.map((p) => (p || "").trim());
        if (params.some((p) => !p)) {
            toast.error("Fill all template parameters");
            return;
        }
        setSending(true);
        try {
            const { data } = await api.post("/whatsapp/send-template", {
                to: selectedPhone,
                template_id: selectedTemplate.id,
                params,
                language: selectedTemplate.language || "en_US",
                provider: "auto",
                contact_id: selectedConv?.contact_id || null,
            });
            setShowTemplatePicker(false);
            setSelectedTemplate(null);
            setTemplateParams([]);
            setMessages((prev) => [...prev, data]);
            loadConversations();
            if (data.status === "queued") {
                toast.warning("Template queued (test mode). Configure WhatsApp Business API for real delivery.");
            } else {
                toast.success(`Template "${selectedTemplate.name}" sent`);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || "Template send failed");
        } finally {
            setSending(false);
        }
    };

    // Canned response functions
    const openCannedPicker = () => {
        loadCannedResponses();
        setShowCannedPicker(true);
    };

    const insertCannedResponse = (cannedResponse) => {
        setReply(cannedResponse.body);
        setShowCannedPicker(false);
        toast.success("Canned response inserted");
    };

    // Assignment functions
    const assignTo = async (uid) => {
        if (!selectedPhone) return;
        try {
            const { data } = await api.post(
                `/whatsapp/conversations/${encodeURIComponent(selectedPhone)}/assign`,
                { user_id: uid }
            );
            toast.success(uid ? `Assigned to ${data.assigned_to_name || "agent"}` : "Unassigned");
            setShowAssign(false);
            loadConversations();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Assign failed");
        }
    };

    const autoAssign = async () => {
        if (!selectedPhone) return;
        setAutoAssigning(true);
        try {
            const { data } = await api.post(
                `/whatsapp/conversations/${encodeURIComponent(selectedPhone)}/auto-assign`
            );
            toast.success(`Auto-assigned to ${data.assigned_to_name} (${data.candidates_online} online)`);
            setShowAssign(false);
            loadConversations();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Auto-assign failed — is anyone online?");
        } finally {
            setAutoAssigning(false);
        }
    };

    // Sync contact functions
    const openSyncContact = () => {
        setContactForm({
            name: selectedConv?.contact_name || "",
            email: selectedConv?.contact_email || "",
            company: "",
            notes: "",
        });
        setShowSyncContact(true);
    };

    const syncContact = async () => {
        if (!selectedPhone) return;
        setSyncing(true);
        try {
            const { data } = await api.post(
                `/whatsapp/conversations/${encodeURIComponent(selectedPhone)}/sync-contact`,
                {
                    name: contactForm.name || null,
                    email: contactForm.email || null,
                    company: contactForm.company || null,
                    notes: contactForm.notes || null,
                }
            );
            toast.success(data.created ? `Lead created: ${data.contact?.name}` : `Contact updated: ${data.contact?.name}`);
            setShowSyncContact(false);
            loadConversations();
            // Refresh thread to pick up contact linkage
            loadThread(selectedPhone);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Sync failed");
        } finally {
            setSyncing(false);
        }
    };

    // Create ticket functions
    const openCreateTicket = () => {
        // Default subject from last inbound
        const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
        const defaultSubject = lastInbound
            ? `WhatsApp: ${(lastInbound.body || "").slice(0, 60)}`
            : `WhatsApp conversation with ${selectedConv?.contact_name || selectedPhone}`;
        setTicketForm({
            subject: defaultSubject,
            description: "",
            priority: "medium",
            include_last_messages: 5,
        });
        setShowCreateTicket(true);
    };

    const createTicketFromChat = async () => {
        if (!selectedPhone) return;
        if (!ticketForm.subject.trim()) {
            toast.error("Subject is required");
            return;
        }
        setCreatingTicket(true);
        try {
            const { data } = await api.post(
                `/whatsapp/conversations/${encodeURIComponent(selectedPhone)}/create-ticket`,
                {
                    subject: ticketForm.subject.trim(),
                    description: ticketForm.description || null,
                    priority: ticketForm.priority,
                    include_last_messages: Number(ticketForm.include_last_messages) || 5,
                }
            );
            toast.success(`Ticket created: ${data.ticket?.subject}`);
            setShowCreateTicket(false);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Create ticket failed");
        } finally {
            setCreatingTicket(false);
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
        <div className="flex h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Left Sidebar - Conversations - Responsive */}
            <div className={`${selectedPhone ? 'hidden lg:block' : 'block'} w-full lg:w-80 bg-white border-r border-gray-200 flex flex-col shadow-md`}>
                {/* Header */}
                <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-gradient-to-br from-green-600 to-emerald-600 rounded-lg flex items-center justify-center shadow-lg">
                                <MessageCircle className="w-6 h-6 text-white" />
                            </div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                WhatsApp
                            </h1>
                        </div>
                        {totalUnread > 0 && (
                            <span className="flex items-center gap-1.5 bg-gradient-to-r from-green-500 to-green-600 text-white px-3 py-1.5 rounded-full shadow-lg animate-pulse">
                                <span className="font-bold">{totalUnread}</span>
                                <span className="font-medium text-xs">Unread</span>
                            </span>
                        )}
                    </div>
                    
                    {/* Stats Badges */}
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                        <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-green-200 hover:shadow-md transition-shadow">
                            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                            <span className="font-semibold text-green-700">{conversations.length}</span>
                            <span className="text-green-600 text-xs">Chats</span>
                        </span>
                        {onlineCount > 0 && (
                            <span className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-full shadow-sm border border-blue-200 hover:shadow-md transition-shadow">
                                <Users className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-semibold text-blue-700">{onlineCount}</span>
                                <span className="text-blue-600 text-xs">Online</span>
                            </span>
                        )}
                    </div>
                    
                    {/* Status Banner - Only show after integrations are loaded */}
                    {integrationsLoaded && !anyConfigured && (
                        <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-lg p-3 mb-3 shadow-sm">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <div className="font-semibold text-yellow-800">Test Mode</div>
                                    <div className="text-yellow-700 text-xs mt-1">
                                        Configure WhatsApp Business API in Settings for real messaging.
                                    </div>
                                    <Link 
                                        to="/app/settings" 
                                        className="text-yellow-800 text-xs font-semibold hover:underline mt-1 inline-block"
                                    >
                                        Go to Settings →
                                    </Link>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Search */}
                    <div className="relative">
                        <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search conversations..."
                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-3 py-3 pl-10 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent shadow-sm hover:border-gray-300 transition-colors"
                        />
                    </div>
                </div>

                {/* Actions */}
                <div className="p-4 border-b border-gray-200 bg-white">
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowNewConv(true)}
                            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-3 py-2.5 rounded-lg text-sm font-semibold hover:from-green-700 hover:to-emerald-700 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <Plus className="w-4 h-4" />
                            New Chat
                        </button>
                        <button
                            onClick={loadConversations}
                            className="bg-white border-2 border-gray-200 px-3 py-2.5 rounded-lg text-sm font-medium hover:shadow-md transition-all"
                        >
                            <RefreshCw className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Conversations List */}
                <div className="flex-1 overflow-y-auto">
                    {loading ? (
                        <div className="p-6 text-center">
                            <div className="flex flex-col items-center gap-3">
                                <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                                <div className="text-sm text-gray-600">Loading conversations...</div>
                            </div>
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="flex flex-col items-center justify-center p-8 text-center">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
                                <MessageCircle className="w-10 h-10 text-green-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">
                                {search ? "No Conversations Found" : "No Conversations Yet"}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4">
                                {search ? "Try adjusting your search" : "Start a new chat to begin messaging"}
                            </p>
                            {!search && (
                                <button
                                    onClick={() => setShowNewConv(true)}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    New Chat
                                </button>
                            )}
                        </div>
                    ) : (
                        filtered.map((c) => {
                            const active = c.phone === selectedPhone;
                            return (
                                <button
                                    key={c.phone}
                                    onClick={() => setSelectedPhone(c.phone)}
                                    className={`w-full text-left p-4 border-b border-gray-100 hover:bg-gradient-to-r hover:from-green-50 hover:to-emerald-50 transition-all duration-200 group ${
                                        active ? "bg-gradient-to-r from-green-100 to-emerald-100 border-l-4 border-l-green-600 shadow-md" : ""
                                    }`}
                                >
                                    <div className="flex items-start gap-3">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold shadow-sm ${
                                            active ? "bg-gradient-to-br from-green-600 to-emerald-600 text-white shadow-lg" : "bg-gray-200 text-gray-600 group-hover:bg-gray-300"
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
                                                    <span className="bg-gradient-to-r from-green-500 to-green-600 text-white px-2 py-0.5 rounded-full text-xs font-bold flex-shrink-0 shadow-md">
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

            {/* Right Side - Chat Area - Responsive */}
            <div className={`${selectedPhone ? 'block' : 'hidden lg:block'} flex-1 flex flex-col`}>
                {!selectedPhone ? (
                    <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                        <div className="text-center max-w-md p-8">
                            <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-green-100 to-emerald-200 rounded-2xl flex items-center justify-center shadow-lg">
                                <MessageCircle className="w-12 h-12 text-green-600" />
                            </div>
                            <h2 className="text-3xl font-bold text-gray-900 mb-3">
                                WhatsApp Business
                            </h2>
                            <p className="text-gray-600 mb-6 text-lg">
                                Select a conversation to start messaging, or create a new chat.
                            </p>
                            {integrationsLoaded && !anyConfigured && (
                                <Link
                                    to="/app/settings"
                                    className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-green-700 hover:to-emerald-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    <SettingsIcon className="w-5 h-5" />
                                    Configure WhatsApp
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Mobile Back Button */}
                        <div className="lg:hidden px-4 py-3 border-b border-gray-200 bg-gray-50">
                            <button
                                onClick={() => setSelectedPhone(null)}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
                            >
                                <X className="w-4 h-4 rotate-180" />
                                <span className="text-sm font-medium">Back to conversations</span>
                            </button>
                        </div>

                        {/* Chat Header */}
                        <div className="bg-white border-b border-gray-200 p-4 shadow-sm">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center text-sm font-medium text-green-700">
                                        {initials(selectedConv?.contact_name, selectedPhone)}
                                    </div>
                                    <div>
                                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                                            {selectedConv?.contact_name || selectedPhone}
                                            {selectedConv?.assigned_to_name && (
                                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full flex items-center gap-1">
                                                    <UserCheck className="w-3 h-3" />
                                                    {selectedConv.assigned_to_name}
                                                </span>
                                            )}
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
                                            <span className="flex items-center gap-1">
                                                <Circle className={`w-2 h-2 ${onlineCount > 0 ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`} />
                                                {onlineCount} agent{onlineCount === 1 ? "" : "s"} online
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Action Buttons */}
                                <div className="flex flex-wrap items-center gap-2">
                                    <button
                                        onClick={openSyncContact}
                                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                        title={selectedConv?.contact_id ? "Update contact" : "Sync as lead"}
                                    >
                                        <UserPlus className="w-4 h-4" />
                                        <span className="hidden sm:inline">{selectedConv?.contact_id ? "Contact" : "Sync Lead"}</span>
                                    </button>
                                    <button
                                        onClick={openCreateTicket}
                                        className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                                        title="Create a support ticket from this conversation"
                                    >
                                        <Ticket className="w-4 h-4" />
                                        <span className="hidden sm:inline">Ticket</span>
                                    </button>
                                    <div className="relative">
                                        <button
                                            onClick={() => { loadTeam(); setShowAssign(!showAssign); }}
                                            className={`px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                                                selectedConv?.assigned_to_name 
                                                    ? "bg-green-600 text-white hover:bg-green-700" 
                                                    : "bg-gray-600 text-white hover:bg-gray-700"
                                            }`}
                                        >
                                            <Users className="w-4 h-4" />
                                            <span className="hidden sm:inline">{selectedConv?.assigned_to_name ? "Reassign" : "Assign"}</span>
                                        </button>
                                        {showAssign && (
                                            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg w-72 z-40">
                                                <button
                                                    onClick={autoAssign}
                                                    disabled={autoAssigning || onlineCount === 0}
                                                    className="w-full text-left px-4 py-3 border-b border-gray-200 bg-blue-50 hover:bg-blue-100 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                                                >
                                                    {autoAssigning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                                    Auto-assign · online only ({onlineCount})
                                                </button>
                                                <div className="max-h-64 overflow-y-auto">
                                                    {team.length === 0 ? (
                                                        <div className="p-4 text-sm text-gray-500 text-center">No team members</div>
                                                    ) : (
                                                        team.map((t) => (
                                                            <button
                                                                key={t.id}
                                                                onClick={() => assignTo(t.id)}
                                                                className="w-full text-left px-4 py-3 hover:bg-gray-50 flex items-center gap-3 border-b border-gray-100"
                                                            >
                                                                <Circle className={`w-3 h-3 ${t.online ? "fill-green-500 text-green-500" : "fill-gray-400 text-gray-400"}`} />
                                                                <div className="flex-1 min-w-0">
                                                                    <div className="text-sm font-medium truncate">{t.name || t.email}</div>
                                                                    <div className="text-xs text-gray-500">
                                                                        {t.role} · {t.online ? "online" : "offline"}
                                                                    </div>
                                                                </div>
                                                                {selectedConv?.assigned_to === t.id && (
                                                                    <Check className="w-4 h-4 text-green-600" />
                                                                )}
                                                            </button>
                                                        ))
                                                    )}
                                                </div>
                                                {selectedConv?.assigned_to_name && (
                                                    <button
                                                        onClick={() => assignTo(null)}
                                                        className="w-full px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 text-sm font-medium border-t border-gray-200"
                                                    >
                                                        Unassign
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
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
                                                    {m.media_url && (m.message_type === "image" || /\.(jpg|jpeg|png|webp)(\?|$)/i.test(m.media_url)) && (
                                                        <img src={m.media_url} alt="WhatsApp attachment" className="max-w-full rounded mb-2" />
                                                    )}
                                                    {m.media_url && (m.message_type === "video" || /\.(mp4|mov|webm)(\?|$)/i.test(m.media_url)) && (
                                                        <video src={m.media_url} controls className="max-w-full rounded mb-2" />
                                                    )}
                                                    <div className="text-sm whitespace-pre-wrap break-words">
                                                        {m.body}
                                                    </div>
                                                    {m.media_id && !m.media_url && (
                                                        <div className="text-xs opacity-75">Media attachment ({m.message_type || "file"})</div>
                                                    )}
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
                            {/* 24-hour window indicator */}
                            {hasAnyInbound && (
                                <div className={`max-w-4xl mx-auto mb-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
                                    in24hWindow
                                        ? "bg-green-50 border border-green-200 text-green-800"
                                        : "bg-yellow-50 border border-yellow-200 text-yellow-800"
                                }`}>
                                    <Info className="w-4 h-4 flex-shrink-0" />
                                    {in24hWindow ? (
                                        <span>Within 24-hour window - free-form replies allowed</span>
                                    ) : (
                                        <span>Outside 24-hour window - use approved templates to message</span>
                                    )}
                                </div>
                            )}
                            
                            <div className="max-w-4xl mx-auto">
                                {/* Quick Actions */}
                                <div className="flex gap-2 mb-3">
                                    <button
                                        onClick={openTemplatePicker}
                                        className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center gap-2"
                                    >
                                        <BookTemplate className="w-4 h-4" />
                                        <span className="hidden sm:inline">Template</span>
                                    </button>
                                    <button
                                        onClick={openCannedPicker}
                                        className="bg-purple-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-purple-700 flex items-center gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        <span className="hidden sm:inline">Quick Reply</span>
                                    </button>
                                </div>
                                
                                {/* Message Input */}
                                <div className="flex gap-3 flex-wrap">
                                    <select
                                        value={mediaType}
                                        onChange={(e) => setMediaType(e.target.value)}
                                        className="border border-gray-200 rounded-lg px-2 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                                        title="Media type"
                                    >
                                        <option value="image">Image</option>
                                        <option value="video">Video</option>
                                    </select>
                                    <input
                                        value={mediaUrl}
                                        onChange={(e) => setMediaUrl(e.target.value)}
                                        placeholder="Image/video URL (optional)"
                                        className="w-48 border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-green-500"
                                    />
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
                                        disabled={sending || (!reply.trim() && !mediaUrl.trim())}
                                        className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        <span className="hidden sm:inline">Send</span>
                                    </button>
                                </div>
                            </div>
                            {integrationsLoaded && !anyConfigured && (
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

            {/* Template Picker Modal */}
            {showTemplatePicker && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-900">Send Template Message</h3>
                            <button 
                                onClick={() => setShowTemplatePicker(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        {!selectedTemplate ? (
                            <div>
                                <p className="text-sm text-gray-600 mb-4">
                                    Select an approved template to send. Templates are required for messaging outside the 24-hour window.
                                </p>
                                
                                {templates.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BookTemplate className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                        <p className="text-gray-500 mb-4">No templates available</p>
                                        <Link 
                                            to="/app/settings"
                                            className="text-blue-600 hover:underline"
                                        >
                                            Create templates in Settings →
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-2 max-h-96 overflow-y-auto">
                                        {templates.map((template) => (
                                            <button
                                                key={template.id}
                                                onClick={() => pickTemplate(template)}
                                                className="w-full text-left p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex-1">
                                                        <div className="font-medium text-gray-900 mb-1">
                                                            {template.name}
                                                        </div>
                                                        <div className="text-sm text-gray-600 mb-2">
                                                            {template.body}
                                                        </div>
                                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                                            <span className="bg-gray-100 px-2 py-1 rounded">
                                                                {template.category}
                                                            </span>
                                                            {template.param_count > 0 && (
                                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                                                    {template.param_count} parameters
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div>
                                <div className="mb-4">
                                    <h4 className="font-medium text-gray-900 mb-2">{selectedTemplate.name}</h4>
                                    <p className="text-sm text-gray-600 mb-3">{selectedTemplate.body}</p>
                                </div>
                                
                                {selectedTemplate.param_count > 0 && (
                                    <div className="mb-4">
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Template Parameters
                                        </label>
                                        <div className="space-y-2">
                                            {templateParams.map((param, index) => (
                                                <input
                                                    key={index}
                                                    value={param}
                                                    onChange={(e) => {
                                                        const newParams = [...templateParams];
                                                        newParams[index] = e.target.value;
                                                        setTemplateParams(newParams);
                                                    }}
                                                    placeholder={`Parameter ${index + 1}`}
                                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}
                                
                                <div className="flex gap-3 justify-end">
                                    <button 
                                        onClick={() => setSelectedTemplate(null)}
                                        className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                                    >
                                        Back
                                    </button>
                                    <button
                                        onClick={sendTemplate}
                                        disabled={sending || (selectedTemplate.param_count > 0 && templateParams.some(p => !p.trim()))}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                        {sending ? (
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4" />
                                        )}
                                        Send Template
                                    </button>
                                </div>
                            </div>
                        )}
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
                            Select a pre-written response to insert into your message.
                        </p>
                        
                        {cannedResponses.length === 0 ? (
                            <div className="text-center py-8">
                                <Zap className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                                <p className="text-gray-500 mb-4">No quick replies available</p>
                                <Link 
                                    to="/app/settings"
                                    className="text-purple-600 hover:underline"
                                >
                                    Create quick replies in Settings →
                                </Link>
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

            {/* Sync Contact Modal */}
            {showSyncContact && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {selectedConv?.contact_id ? "Update Contact" : "Sync as Lead"}
                                </h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Phone {selectedPhone} will be tagged as WhatsApp lead
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowSyncContact(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                                <input
                                    autoFocus
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    placeholder="Alex Parker"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        placeholder="alex@company.com"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                                    <input
                                        value={contactForm.company}
                                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                                        placeholder="Acme Corp"
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                <textarea
                                    value={contactForm.notes}
                                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                                    placeholder="Additional notes about this contact..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end mt-6">
                            <button 
                                onClick={() => setShowSyncContact(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={syncContact}
                                disabled={syncing}
                                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {syncing ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <UserPlus className="w-4 h-4" />
                                )}
                                {selectedConv?.contact_id ? "Update" : "Sync Lead"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {showCreateTicket && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 w-full max-w-lg">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900">Create Support Ticket</h3>
                                <p className="text-sm text-gray-600 mt-1">
                                    Create a ticket from this WhatsApp conversation
                                </p>
                            </div>
                            <button 
                                onClick={() => setShowCreateTicket(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Subject *</label>
                                <input
                                    autoFocus
                                    value={ticketForm.subject}
                                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                    placeholder="Brief description of the issue"
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <textarea
                                    value={ticketForm.description}
                                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                    placeholder="Additional details about the issue..."
                                    rows={3}
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                                    <select
                                        value={ticketForm.priority}
                                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Include Messages</label>
                                    <select
                                        value={ticketForm.include_last_messages}
                                        onChange={(e) => setTicketForm({ ...ticketForm, include_last_messages: e.target.value })}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                    >
                                        <option value="0">None</option>
                                        <option value="3">Last 3</option>
                                        <option value="5">Last 5</option>
                                        <option value="10">Last 10</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        
                        <div className="flex gap-3 justify-end mt-6">
                            <button 
                                onClick={() => setShowCreateTicket(false)}
                                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={createTicketFromChat}
                                disabled={creatingTicket || !ticketForm.subject.trim()}
                                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                            >
                                {creatingTicket ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <Ticket className="w-4 h-4" />
                                )}
                                Create Ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WhatsAppInbox;