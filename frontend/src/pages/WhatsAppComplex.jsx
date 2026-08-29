import { useEffect, useMemo, useRef, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import {
    MessageCircle, Send, Search, Phone, RefreshCw, Sparkles, Copy, Check,
    ArrowLeft, ShieldAlert, Loader2, Trash2, User, Clock, CheckCheck, AlertCircle,
    Settings as SettingsIcon, Link as LinkIcon, X, FileText, Plus, Edit2,
    BookTemplate, Info, UserPlus, Ticket, UserCheck, Users, Zap, Circle
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
    if (status === "queued") return <Clock className="w-3 h-3 text-inkSecondary" />;
    if (status === "sent") return <Check className="w-3 h-3 text-inkSecondary" />;
    if (status === "delivered") return <CheckCheck className="w-3 h-3 text-inkSecondary" />;
    if (status === "read") return <CheckCheck className="w-3 h-3 text-brand" />;
    if (status === "failed") return <AlertCircle className="w-3 h-3 text-bad" />;
    return null;
};

const WhatsAppInbox = () => {
    const { user } = useAuth();
    const [conversations, setConversations] = useState([]);
    const [selectedPhone, setSelectedPhone] = useState(null);
    const [messages, setMessages] = useState([]);
    const [mediaBlobUrls, setMediaBlobUrls] = useState({});
    const [reply, setReply] = useState("");
    const [sending, setSending] = useState(false);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [integrations, setIntegrations] = useState({});
    const [provider, setProvider] = useState("auto");
    const [newPhone, setNewPhone] = useState("");
    const [showNewConv, setShowNewConv] = useState(false);
    const [seeding, setSeeding] = useState(false);
    const [showWebhook, setShowWebhook] = useState(false);
    const [copiedField, setCopiedField] = useState(null);

    // Templates
    const [templates, setTemplates] = useState([]);
    const [showTemplatePicker, setShowTemplatePicker] = useState(false);
    const [showTemplateManager, setShowTemplateManager] = useState(false);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [templateParams, setTemplateParams] = useState([]);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [templateForm, setTemplateForm] = useState({ name: "", category: "utility", language: "en_US", body: "", header: "", footer: "", meta_template_name: "" });
    const [metaSubmitting, setMetaSubmitting] = useState(false);
    const [metaSyncing, setMetaSyncing] = useState(false);

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
        } catch (e) {
            // silent
        }
    };

    const loadTemplates = async () => {
        try {
            const { data } = await api.get("/whatsapp/templates");
            setTemplates(data || []);
        } catch (e) {
            // silent
        }
    };

    const loadTeam = async () => {
        try {
            const { data } = await api.get("/presence");
            setTeam(data || []);
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
        loadTemplates();
        loadTeam();
    }, []);

    // Refresh team presence every 20s so online indicators stay fresh
    useEffect(() => {
        const iv = setInterval(loadTeam, 20000);
        return () => clearInterval(iv);
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
        let disposed = false;
        const mediaMessages = messages.filter((m) => m.media_id && (m.message_type === "image" || m.message_type === "video"));
        mediaMessages.forEach(async (m) => {
            if (mediaBlobUrls[m.media_id]) return;
            try {
                const response = await api.get(`/whatsapp/media/${encodeURIComponent(m.media_id)}`, { responseType: "blob" });
                if (!disposed) setMediaBlobUrls((current) => ({ ...current, [m.media_id]: URL.createObjectURL(response.data) }));
            } catch (error) {
                console.warn("[v0] WhatsApp media preview unavailable", m.media_id);
            }
        });
        return () => { disposed = true; };
    }, [messages, mediaBlobUrls]);

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
                provider,
                contact_id: selectedConv?.contact_id || null,
            });
            setReply("");
            setMessages((prev) => [...prev, data]);
            loadConversations();
            if (data.status === "queued") {
                toast.warning("Queued (mock). Connect Meta or Twilio in Settings to deliver for real.");
            } else {
                toast.success(`Sent via ${data.provider || "provider"}`);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || "Send failed");
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

    const seedDemo = async () => {
        if (!window.confirm("Load sample WhatsApp conversations? This creates demo data you can delete later.")) return;
        setSeeding(true);
        try {
            await api.post("/whatsapp/demo/seed", { conversations: 4, messages_per_convo: 6 });
            toast.success("Demo conversations loaded");
            await loadConversations();
        } catch (e) {
            toast.error("Seed failed");
        } finally {
            setSeeding(false);
        }
    };

    const deleteConv = async (phone) => {
        if (!window.confirm(`Delete all messages with ${phone}? This cannot be undone.`)) return;
        try {
            await api.delete(`/whatsapp/conversations/${encodeURIComponent(phone)}`);
            toast.success("Conversation deleted");
            if (selectedPhone === phone) {
                setSelectedPhone(null);
                setMessages([]);
            }
            loadConversations();
        } catch (e) {
            toast.error("Delete failed");
        }
    };

    const startNewConversation = async () => {
        const phone = newPhone.trim();
        if (!phone.startsWith("+") || phone.length < 8) {
            toast.error("Enter an E.164 phone number like +14155551234");
            return;
        }
        setSelectedPhone(phone);
        setShowNewConv(false);
        setNewPhone("");
        // No messages yet — they'll load empty
        await loadConversations();
    };

    const backendUrl = process.env.REACT_APP_BACKEND_URL || "";
    const webhookUrl = `${backendUrl}/api/webhooks/whatsapp-business/${user?.id || "YOUR_OWNER_ID"}`;
    const twilioWebhookUrl = `${backendUrl}/api/webhooks/whatsapp/${user?.id || "YOUR_OWNER_ID"}`;
    const verifyToken = "pulse_crm_verify";

    const copy = (value, field) => {
        navigator.clipboard.writeText(value);
        setCopiedField(field);
        toast.success("Copied");
        setTimeout(() => setCopiedField(null), 1500);
    };

    // ---------- Templates ----------
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
                provider,
                contact_id: selectedConv?.contact_id || null,
            });
            setShowTemplatePicker(false);
            setSelectedTemplate(null);
            setTemplateParams([]);
            setMessages((prev) => [...prev, data]);
            loadConversations();
            if (data.status === "queued") {
                toast.warning("Template queued (mock). Connect Meta for real delivery.");
            } else {
                toast.success(`Template "${selectedTemplate.name}" sent`);
            }
        } catch (e) {
            toast.error(e.response?.data?.detail || "Template send failed");
        } finally {
            setSending(false);
        }
    };

    const submitTemplateToMeta = async () => {
        const { name, category, language, body, header, footer } = templateForm;
        if (!name.trim() || !body.trim()) return toast.error("Name and body are required");
        setMetaSubmitting(true);
        try {
            await api.post("/whatsapp/templates/meta", { name, category: category.toUpperCase(), language, body, header: header || null, footer: footer || null });
            toast.success("Submitted to Meta for approval");
            loadTemplates();
        } catch (e) { toast.error(e.response?.data?.detail || "Meta submission failed"); }
        finally { setMetaSubmitting(false); }
    };

    const syncMetaTemplates = async () => {
        setMetaSyncing(true);
        try { const { data } = await api.post("/whatsapp/templates/meta/sync"); toast.success(`Synced ${data.count} Meta templates`); loadTemplates(); }
        catch (e) { toast.error(e.response?.data?.detail || "Meta sync failed"); }
        finally { setMetaSyncing(false); }
    };

    const saveTemplate = async () => {
        const { name, category, language, body, meta_template_name } = templateForm;
        if (!name.trim() || !body.trim()) {
            toast.error("Name and body are required");
            return;
        }
        try {
            if (editingTemplate) {
                await api.put(`/whatsapp/templates/${editingTemplate.id}`, { name, category, language, body, header: templateForm.header || null, footer: templateForm.footer || null, meta_template_name: meta_template_name || null });
                toast.success("Template updated");
            } else {
                await api.post("/whatsapp/templates", { name, category, language, body, header: templateForm.header || null, footer: templateForm.footer || null, meta_template_name: meta_template_name || null });
                toast.success("Template created");
            }
            setEditingTemplate(null);
            setTemplateForm({ name: "", category: "utility", language: "en_US", body: "", header: "", footer: "", meta_template_name: "" });
            loadTemplates();
        } catch (e) {
            toast.error(e.response?.data?.detail || "Save failed");
        }
    };

    const editTemplate = (t) => {
        setEditingTemplate(t);
        setTemplateForm({
            name: t.name || "",
            category: t.category || "utility",
            language: t.language || "en_US",
            body: t.body || "",
            header: t.header || "",
            footer: t.footer || "",
            meta_template_name: t.meta_template_name || "",
        });
    };

    const deleteTemplate = async (id) => {
        if (!window.confirm("Delete this template?")) return;
        await api.delete(`/whatsapp/templates/${id}`);
        toast.success("Template deleted");
        loadTemplates();
    };

    const seedDefaultTemplates = async () => {
        try {
            const { data } = await api.post("/whatsapp/templates/seed");
            toast.success(`${data.created || 0} starter templates added`);
            loadTemplates();
        } catch (e) {
            toast.error("Seed failed");
        }
    };

    // 24-hour window: true if the most recent INBOUND message was within 24h
    const in24hWindow = useMemo(() => {
        const lastInbound = [...messages].reverse().find((m) => m.direction === "inbound");
        if (!lastInbound) return false;
        const ts = lastInbound.received_at || lastInbound.sent_at;
        if (!ts) return false;
        return (Date.now() - new Date(ts).getTime()) < 24 * 60 * 60 * 1000;
    }, [messages]);

    const hasAnyInbound = useMemo(() => messages.some((m) => m.direction === "inbound"), [messages]);

    // ---------- Assignment ----------
    const onlineCount = useMemo(() => team.filter((t) => t.online).length, [team]);

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

    // ---------- Sync contact ----------
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

    // ---------- Create ticket ----------
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

    return (
        <div className="flex h-[calc(100vh-0px)]" data-testid="whatsapp-page">
            {/* Left pane: conversations list */}
            <aside className={`${selectedPhone ? "hidden md:flex" : "flex"} w-full md:w-[360px] bg-white border-r-2 border-ink flex-col`}>

                <div className="p-5 border-b-2 border-ink">
                    <div className="flex items-center justify-between mb-2">
                        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary">// whatsapp.inbox</div>
                        {totalUnread > 0 && (
                            <span data-testid="wa-unread-total" className="bg-brand text-white px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest">
                                {totalUnread} unread
                            </span>
                        )}
                    </div>
                    <h1 className="font-heading font-black text-2xl tracking-tighter flex items-center gap-2">
                        <MessageCircle className="w-6 h-6 text-brand" /> WhatsApp
                    </h1>
                    <p className="text-[11px] text-inkSecondary mt-1">
                        {conversations.length} conversation{conversations.length === 1 ? "" : "s"}
                    </p>
                </div>

                {/* Status banner */}
                {!anyConfigured && (
                    <div className="m-3 bg-brand/10 border-2 border-brand p-3" data-testid="wa-setup-banner">
                        <div className="flex items-start gap-2">
                            <ShieldAlert className="w-4 h-4 text-brand flex-shrink-0 mt-0.5" />
                            <div className="text-xs">
                                <div className="font-bold uppercase tracking-widest text-[10px] mb-1">No provider connected</div>
                                <div className="text-inkSecondary mb-2">
                                    You can send test messages in mock mode. Connect Meta WhatsApp Business or Twilio to send real messages.
                                </div>
                                <Link to="/app/settings" className="text-ink font-bold text-[10px] uppercase tracking-widest underline hover:text-brand">
                                    → Go to Settings
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

                {/* Search + actions */}
                <div className="p-3 border-b-2 border-ink space-y-2">
                    <div className="relative">
                        <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-inkSecondary" />
                        <input
                            data-testid="wa-search"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            placeholder="Search conversations…"
                            className="w-full bg-bg border-2 border-ink px-3 py-2 pl-9 text-xs outline-none focus:border-brand"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button
                            data-testid="wa-new-conv"
                            onClick={() => setShowNewConv(true)}
                            className="flex-1 bg-ink text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-brand flex items-center justify-center gap-1"
                        >
                            <Phone className="w-3 h-3" /> New
                        </button>
                        <button
                            data-testid="wa-refresh"
                            onClick={loadConversations}
                            className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                        >
                            <RefreshCw className="w-3 h-3" />
                        </button>
                        <button
                            data-testid="wa-webhooks"
                            onClick={() => setShowWebhook(true)}
                            className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                            title="Webhook setup"
                        >
                            <LinkIcon className="w-3 h-3" />
                        </button>
                        <button
                            data-testid="wa-manage-templates"
                            onClick={() => { loadTemplates(); setShowTemplateManager(true); setEditingTemplate(null); setTemplateForm({ name: "", category: "utility", language: "en_US", body: "", header: "", footer: "", meta_template_name: "" }); }}
                            className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                            title="Manage templates"
                        >
                            <BookTemplate className="w-3 h-3" />
                        </button>
                    </div>
                    {conversations.length === 0 && !loading && (
                        <button
                            data-testid="wa-seed-demo"
                            onClick={seedDemo}
                            disabled={seeding}
                            className="w-full bg-brand text-white px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink flex items-center justify-center gap-1 disabled:opacity-50"
                        >
                            <Sparkles className="w-3 h-3" /> {seeding ? "Loading…" : "Load sample data"}
                        </button>
                    )}
                </div>

                {/* Conversations list */}
                <div className="flex-1 overflow-y-auto" data-testid="wa-conv-list">
                    {loading ? (
                        <div className="p-6 text-center text-inkSecondary">
                            <Loader2 className="w-5 h-5 mx-auto animate-spin" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="p-6 text-center">
                            <MessageCircle className="w-10 h-10 mx-auto text-inkSecondary opacity-40 mb-3" />
                            <div className="text-xs text-inkSecondary">
                                {search ? "No matches." : "No conversations yet."}
                            </div>
                        </div>
                    ) : (
                        filtered.map((c) => {
                            const active = c.phone === selectedPhone;
                            return (
                                <button
                                    key={c.phone}
                                    data-testid={`wa-conv-${c.phone}`}
                                    onClick={() => setSelectedPhone(c.phone)}
                                    className={`w-full text-left p-3 border-b border-ink/10 transition-colors flex items-start gap-3 ${
                                        active ? "bg-brand/10 border-l-4 border-l-brand" : "hover:bg-bg"
                                    }`}
                                >
                                    <div className={`w-10 h-10 border-2 border-ink grid place-items-center flex-shrink-0 text-[11px] font-bold ${
                                        active ? "bg-brand text-white border-brand" : "bg-bg"
                                    }`}>
                                        {initials(c.contact_name, c.phone)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between gap-2 mb-0.5">
                                            <div className="font-bold text-sm truncate tracking-tight">
                                                {c.contact_name || c.phone}
                                            </div>
                                            <div className="text-[10px] font-mono text-inkSecondary flex-shrink-0">
                                                {fmtTime(c.last_ts)}
                                            </div>
                                        </div>
                                        {c.contact_name && (
                                            <div className="text-[10px] font-mono text-inkSecondary mb-0.5">
                                                {c.phone}
                                            </div>
                                        )}
                                        {c.assigned_to_name && (
                                            <div className="text-[9px] font-mono uppercase tracking-widest text-brand mb-0.5 flex items-center gap-1">
                                                <UserCheck className="w-2.5 h-2.5" />
                                                {c.assigned_to_name}
                                                {c.auto_assigned && <Zap className="w-2.5 h-2.5" />}
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="text-xs text-inkSecondary truncate">
                                                {c.last_direction === "outbound" && <span className="mr-1">→</span>}
                                                {c.last_message || "…"}
                                            </div>
                                            {c.unread > 0 && (
                                                <span className="bg-brand text-white px-1.5 py-0.5 text-[9px] font-bold rounded-full flex-shrink-0">
                                                    {c.unread}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>
            </aside>

            {/* Right pane: thread */}
            <main className={`${selectedPhone ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-bg`} data-testid="wa-thread-pane">
                {!selectedPhone ? (
                    <div className="flex-1 grid place-items-center p-10">
                        <div className="text-center max-w-md">
                            <div className="w-20 h-20 mx-auto mb-4 grid place-items-center bg-white border-2 border-ink">
                                <MessageCircle className="w-10 h-10 text-brand" />
                            </div>
                            <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">
                                // select a conversation
                            </div>
                            <h2 className="font-heading font-black text-3xl tracking-tighter mb-2">
                                Your WhatsApp inbox
                            </h2>
                            <p className="text-sm text-inkSecondary mb-4">
                                Inbound messages from customers land here automatically and auto-create tickets.
                                Reply directly — or start a new conversation.
                            </p>
                            {!anyConfigured && (
                                <Link
                                    to="/app/settings"
                                    data-testid="wa-goto-settings"
                                    className="inline-flex items-center gap-2 bg-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand"
                                >
                                    <SettingsIcon className="w-3.5 h-3.5" /> Connect a provider
                                </Link>
                            )}
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Thread header */}
                        <div className="bg-white border-b-2 border-ink p-4 flex items-center justify-between gap-3 flex-wrap">
                            <div className="flex items-center gap-3 min-w-0">
                                <button onClick={() => setSelectedPhone(null)} className="md:hidden border-2 border-ink p-2 hover:bg-ink hover:text-white" aria-label="Back to conversations">
                                    <ArrowLeft className="w-4 h-4" />
                                </button>
                                <div className="w-10 h-10 border-2 border-ink grid place-items-center bg-bg text-[11px] font-bold flex-shrink-0">
                                    {initials(selectedConv?.contact_name, selectedPhone)}
                                </div>
                                <div className="min-w-0">
                                    <div className="font-heading font-black text-lg tracking-tighter truncate flex items-center gap-2">
                                        {selectedConv?.contact_name || selectedPhone}
                                        {selectedConv?.assigned_to_name && (
                                            <span
                                                data-testid="wa-assigned-chip"
                                                className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-brand/10 border border-brand text-ink flex items-center gap-1"
                                            >
                                                <UserCheck className="w-3 h-3" />
                                                {selectedConv.assigned_to_name}
                                                {selectedConv.auto_assigned && <Zap className="w-3 h-3" title="Auto-assigned" />}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary flex items-center gap-2 flex-wrap">
                                        <Phone className="w-3 h-3" /> {selectedPhone}
                                        {selectedConv?.contact_id && (
                                            <Link
                                                to="/app/contacts"
                                                className="text-brand hover:underline"
                                                data-testid="wa-open-contact"
                                            >
                                                <User className="w-3 h-3 inline mr-0.5" />
                                                contact
                                            </Link>
                                        )}
                                        <span className="flex items-center gap-1">
                                            <Circle className={`w-2 h-2 ${onlineCount > 0 ? "fill-ok text-ok" : "fill-inkSecondary text-inkSecondary"}`} />
                                            {onlineCount} agent{onlineCount === 1 ? "" : "s"} online
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <button
                                    data-testid="wa-sync-contact-btn"
                                    onClick={openSyncContact}
                                    className="border-2 border-ink bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white flex items-center gap-1"
                                    title={selectedConv?.contact_id ? "Update contact" : "Sync as lead / contact"}
                                >
                                    <UserPlus className="w-3 h-3" />
                                    {selectedConv?.contact_id ? "Contact" : "Sync lead"}
                                </button>
                                <button
                                    data-testid="wa-create-ticket-btn"
                                    onClick={openCreateTicket}
                                    className="border-2 border-ink bg-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white flex items-center gap-1"
                                    title="Create a support ticket from this conversation"
                                >
                                    <Ticket className="w-3 h-3" /> Ticket
                                </button>
                                <div className="relative">
                                    <button
                                        data-testid="wa-assign-btn"
                                        onClick={() => { loadTeam(); setShowAssign(!showAssign); }}
                                        className={`border-2 border-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1 ${
                                            selectedConv?.assigned_to ? "bg-brand text-white border-brand" : "bg-white hover:bg-ink hover:text-white"
                                        }`}
                                    >
                                        <Users className="w-3 h-3" />
                                        {selectedConv?.assigned_to_name ? "Reassign" : "Assign"}
                                    </button>
                                    {showAssign && (
                                        <div
                                            className="absolute right-0 top-full mt-1 bg-white border-2 border-ink shadow-lg w-72 z-40"
                                            data-testid="wa-assign-menu"
                                        >
                                            <button
                                                data-testid="wa-auto-assign"
                                                onClick={autoAssign}
                                                disabled={autoAssigning || onlineCount === 0}
                                                className="w-full text-left px-3 py-2.5 border-b-2 border-ink bg-brand/10 hover:bg-brand hover:text-white text-[11px] font-bold uppercase tracking-widest flex items-center gap-2 disabled:opacity-50"
                                            >
                                                {autoAssigning ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                                                Auto-assign · online only ({onlineCount})
                                            </button>
                                            <div className="max-h-64 overflow-y-auto">
                                                {team.length === 0 ? (
                                                    <div className="p-3 text-xs text-inkSecondary text-center">No team members</div>
                                                ) : (
                                                    team.map((t) => (
                                                        <button
                                                            key={t.id}
                                                            data-testid={`wa-assign-${t.id}`}
                                                            onClick={() => assignTo(t.id)}
                                                            className="w-full text-left px-3 py-2 hover:bg-bg flex items-center gap-2 border-b border-ink/10"
                                                        >
                                                            <Circle className={`w-2.5 h-2.5 ${t.online ? "fill-ok text-ok" : "fill-inkSecondary text-inkSecondary"}`} />
                                                            <div className="flex-1 min-w-0">
                                                                <div className="text-xs font-bold truncate">{t.name || t.email}</div>
                                                                <div className="text-[9px] font-mono uppercase tracking-widest text-inkSecondary">
                                                                    {t.role} · {t.online ? "online" : "offline"}
                                                                </div>
                                                            </div>
                                                            {selectedConv?.assigned_to === t.id && (
                                                                <Check className="w-3 h-3 text-brand" />
                                                            )}
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                            {selectedConv?.assigned_to && (
                                                <button
                                                    data-testid="wa-unassign"
                                                    onClick={() => assignTo(null)}
                                                    className="w-full px-3 py-2 bg-bg hover:bg-bad hover:text-white text-[10px] font-bold uppercase tracking-widest border-t-2 border-ink"
                                                >
                                                    Unassign
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <select
                                    data-testid="wa-provider-select"
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="border-2 border-ink bg-white px-2 py-1.5 text-[10px] font-bold uppercase tracking-widest outline-none focus:border-brand"
                                    title="Send provider"
                                >
                                    <option value="auto">Auto</option>
                                    <option value="whatsapp_business" disabled={!integrations?.whatsapp_business?.configured}>
                                        Meta {integrations?.whatsapp_business?.configured ? "✓" : "—"}
                                    </option>
                                    <option value="twilio" disabled={!integrations?.twilio?.configured}>
                                        Twilio {integrations?.twilio?.configured ? "✓" : "—"}
                                    </option>
                                </select>
                                <button
                                    data-testid="wa-delete-conv"
                                    onClick={() => deleteConv(selectedPhone)}
                                    className="border-2 border-ink p-2 hover:bg-bad hover:text-white hover:border-bad"
                                    title="Delete conversation"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-6" data-testid="wa-messages">
                            {messages.length === 0 ? (
                                <div className="text-center py-10 text-xs text-inkSecondary">
                                    No messages yet. Send the first one below.
                                </div>
                            ) : (
                                <div className="max-w-3xl mx-auto space-y-2">
                                    {messages.map((m) => {
                                        const outbound = m.direction === "outbound";
                                        const ts = m.sent_at || m.received_at;
                                        const mediaType = m.message_type || m.type;
                                        const mediaSrc = (m.media_id && mediaBlobUrls[m.media_id]) || m.media_url;
                                        return (
                                            <div
                                                key={m.id}
                                                className={`flex ${outbound ? "justify-end" : "justify-start"}`}
                                                data-testid={`wa-msg-${m.id}`}
                                            >
                                                <div className={`max-w-[75%] border-2 p-3 ${
                                                    outbound
                                                        ? "bg-brand text-white border-brand"
                                                        : "bg-white text-ink border-ink"
                                                }`}>
                                                    {mediaSrc && mediaType === "image" && (
                                                        <img src={mediaSrc} alt="WhatsApp attachment" className="max-h-72 w-full rounded-lg object-contain bg-black/10" />
                                                    )}
                                                    {mediaSrc && mediaType === "video" && (
                                                        <video src={mediaSrc} controls preload="metadata" className="max-h-72 w-full rounded-lg bg-black/10" aria-label="WhatsApp video attachment" />
                                                    )}
                                                    {m.body && !(/^Received (image|video|audio|document) message$/.test(m.body) && mediaSrc) && (
                                                        <div className="text-sm whitespace-pre-wrap break-words">{m.body}</div>
                                                    )}
                                                    {mediaSrc && (
                                                        <a href={mediaSrc} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-[10px] font-bold uppercase tracking-widest underline underline-offset-2">
                                                            Open attachment
                                                        </a>
                                                    )}
                                                    <div className={`flex items-center gap-1.5 text-[9px] font-mono uppercase tracking-widest mt-1.5 ${
                                                        outbound ? "text-white/70 justify-end" : "text-inkSecondary"
                                                    }`}>
                                                        <span>{fmtFullTime(ts)}</span>
                                                        {outbound && (
                                                            <>
                                                                <span>·</span>
                                                                <span>{m.provider || "?"}</span>
                                                                <StatusIcon status={m.status} />
                                                            </>
                                                        )}
                                                    </div>
                                                    {m.status === "failed" && m.error && (
                                                        <div className="text-[10px] mt-1 text-bad bg-white/20 px-1 py-0.5">
                                                            {m.error}
                                                        </div>
                                                    )}
                                                    {m.status === "queued" && (
                                                        <div className={`text-[10px] mt-1 px-1 py-0.5 ${
                                                            outbound ? "bg-white/20" : "bg-bg"
                                                        }`}>
                                                            queued — no provider connected
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

                        {/* Composer */}
                        <div className="bg-white border-t-2 border-ink p-3">
                            {/* 24-hour window indicator */}
                            {hasAnyInbound && (
                                <div className={`max-w-3xl mx-auto mb-2 px-3 py-1.5 border-2 text-[10px] font-mono uppercase tracking-widest flex items-center gap-2 ${
                                    in24hWindow
                                        ? "bg-ok/10 border-ok text-ok"
                                        : "bg-brand/10 border-brand text-ink"
                                }`}>
                                    <Info className="w-3 h-3" />
                                    {in24hWindow ? (
                                        <span>within 24-hour window — free-form replies allowed</span>
                                    ) : (
                                        <span>outside 24-hour window — use a <b className="font-bold">template</b> to message</span>
                                    )}
                                </div>
                            )}
                            <div className="max-w-3xl mx-auto flex gap-2">
                                <button
                                    data-testid="wa-template-btn"
                                    onClick={openTemplatePicker}
                                    className="border-2 border-ink bg-white px-3 py-2.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white flex items-center gap-1.5"
                                    title="Send a template message"
                                >
                                    <BookTemplate className="w-4 h-4" /> Template
                                </button>
  <div className="flex flex-wrap gap-2 mb-2">
  {templates.filter((t) => t.status === "approved" || t.meta_status === "APPROVED" || t.meta_template_name).slice(0, 4).map((t) => (
  <button key={t.id} type="button" onClick={() => { setSelectedTemplate(t); setTemplateParams(Array(t.param_count || 0).fill("")); setShowTemplatePicker(true); }} className="rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-brand hover:bg-brand hover:text-white">{t.name.replaceAll("_", " ")}</button>
  ))}
  </div>
  <textarea
  data-testid="wa-reply-input"
                                    value={reply}
                                    onChange={(e) => setReply(e.target.value)}
                                    onKeyDown={handleKey}
                                    rows={1}
                                    placeholder="Type a message… (Enter to send, Shift+Enter for newline)"
                                    className="flex-1 border-2 border-ink bg-bg px-3 py-2.5 text-sm outline-none focus:border-brand resize-none max-h-40"
                                />
                                <button
                                    data-testid="wa-send-btn"
                                    onClick={send}
                                    disabled={sending || !reply.trim()}
                                    className="bg-brand text-white px-5 py-2.5 text-xs font-bold uppercase tracking-widest hover:bg-ink disabled:opacity-50 flex items-center gap-1.5"
                                >
                                    {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                    Send
                                </button>
                            </div>
                            {!anyConfigured && (
                                <div className="max-w-3xl mx-auto mt-2 text-[10px] font-mono uppercase tracking-widest text-inkSecondary">
                                    mock mode — messages will be queued + a simulated reply will arrive in ~3s
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>

            {/* New conversation modal */}
            {showNewConv && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowNewConv(false)} data-testid="wa-new-modal">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-md" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// new.thread</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">Start a conversation</h3>
                            </div>
                            <button onClick={() => setShowNewConv(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Phone (E.164)</label>
                        <input
                            data-testid="wa-new-phone"
                            autoFocus
                            value={newPhone}
                            onChange={(e) => setNewPhone(e.target.value)}
                            placeholder="+14155551234"
                            className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand mb-4"
                            onKeyDown={(e) => e.key === "Enter" && startNewConversation()}
                        />
                        <div className="bg-bg border-l-2 border-brand p-3 text-xs text-inkSecondary mb-4">
                            Remember: outside the 24-hour window, only Meta-approved <span className="font-bold">message templates</span> can be sent.
                        </div>
                        <div className="flex gap-2 justify-end flex-wrap">
                            <button onClick={() => setShowNewConv(false)} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">
                                Cancel
                            </button>
                            <button
                                data-testid="wa-start-with-template"
                                onClick={async () => {
                                    const phone = newPhone.trim();
                                    if (!phone.startsWith("+") || phone.length < 8) {
                                        toast.error("Enter an E.164 phone number like +14155551234");
                                        return;
                                    }
                                    setSelectedPhone(phone);
                                    setShowNewConv(false);
                                    setNewPhone("");
                                    await loadConversations();
                                    openTemplatePicker();
                                }}
                                className="border-2 border-ink bg-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white flex items-center gap-1.5"
                            >
                                <BookTemplate className="w-3.5 h-3.5" /> Start with template
                            </button>
                            <button
                                data-testid="wa-start-conv"
                                onClick={startNewConversation}
                                className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink"
                            >
                                Open thread
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Webhook setup modal */}
            {showWebhook && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowWebhook(false)} data-testid="wa-webhook-modal">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-2xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// webhooks.setup</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">Webhook URLs</h3>
                            </div>
                            <button onClick={() => setShowWebhook(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-inkSecondary mb-4">
                            Paste these URLs into your provider's dashboard so inbound messages flow into Pulse.
                        </p>

                        <div className="space-y-4">
                            <div className="bg-bg border-2 border-ink p-4">
                                <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mb-1">Meta WhatsApp Business · Callback URL</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 font-mono text-xs bg-white border border-ink px-2 py-2 break-all">{webhookUrl}</code>
                                    <button
                                        data-testid="wa-copy-meta"
                                        onClick={() => copy(webhookUrl, "meta")}
                                        className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                                    >
                                        {copiedField === "meta" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mt-3 mb-1">Verify Token</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 font-mono text-xs bg-white border border-ink px-2 py-2">{verifyToken}</code>
                                    <button
                                        data-testid="wa-copy-token"
                                        onClick={() => copy(verifyToken, "token")}
                                        className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                                    >
                                        {copiedField === "token" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="text-[11px] text-inkSecondary mt-3 leading-relaxed">
                                    Subscribe to the <code className="bg-white px-1 font-mono">messages</code> webhook field under your WhatsApp Business Account in Meta's App Dashboard.
                                </div>
                            </div>

                            <div className="bg-bg border-2 border-ink p-4">
                                <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mb-1">Twilio WhatsApp · "When a message comes in"</div>
                                <div className="flex items-center gap-2">
                                    <code className="flex-1 font-mono text-xs bg-white border border-ink px-2 py-2 break-all">{twilioWebhookUrl}</code>
                                    <button
                                        data-testid="wa-copy-twilio"
                                        onClick={() => copy(twilioWebhookUrl, "twilio")}
                                        className="border-2 border-ink px-3 py-2 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                                    >
                                        {copiedField === "twilio" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                    </button>
                                </div>
                                <div className="text-[11px] text-inkSecondary mt-3 leading-relaxed">
                                    In Twilio console, go to Messaging → Senders → WhatsApp, open your sender, and set this URL as the inbound webhook (HTTP POST).
                                </div>
                            </div>
                        </div>

                        <div className="mt-5 flex justify-end">
                            <button onClick={() => setShowWebhook(false)} className="bg-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand">
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Template Picker Modal */}
            {showTemplatePicker && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowTemplatePicker(false)} data-testid="wa-template-picker">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// templates.send</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">Send a template</h3>
                            </div>
                            <button onClick={() => setShowTemplatePicker(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {!selectedTemplate ? (
                            <>
                                {templates.length === 0 ? (
                                    <div className="text-center py-8">
                                        <BookTemplate className="w-10 h-10 mx-auto text-inkSecondary opacity-40 mb-3" />
                                        <p className="text-sm text-inkSecondary mb-4">No templates yet.</p>
                                        <button
                                            data-testid="wa-seed-templates"
                                            onClick={seedDefaultTemplates}
                                            className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink inline-flex items-center gap-1.5"
                                        >
                                            <Sparkles className="w-3.5 h-3.5" /> Load 5 starter templates
                                        </button>
                                    </div>
                                ) : (
                                    <div className="space-y-2" data-testid="wa-template-list">
                                        {templates.filter((t) => t.status === "approved" || t.meta_status === "APPROVED" || t.meta_template_name).map((t) => (
                                            <button
                                                key={t.id}
                                                data-testid={`wa-template-pick-${t.name}`}
                                                onClick={() => pickTemplate(t)}
                                                className="w-full text-left border-2 border-ink p-3 hover:bg-brand/10 hover:border-brand transition-colors"
                                            >
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="font-bold text-sm tracking-tight font-mono">{t.name}</div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-bg border border-ink">
                                                            {t.category}
                                                        </span>
                                                        <span className="text-[9px] font-mono uppercase tracking-widest px-2 py-0.5 bg-bg border border-ink">
                                                            {t.param_count || 0} param
                                                        </span>
                                                    </div>
                                                </div>
                                                <p className="text-xs text-inkSecondary">{t.body}</p>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="bg-bg border-2 border-ink p-3 mb-4">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mb-1">{selectedTemplate.name}</div>
                                    <p className="text-sm">{selectedTemplate.body}</p>
                                </div>

                                {templateParams.length > 0 && (
                                    <div className="space-y-2 mb-4">
                                        <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-1">Fill parameters</div>
                                        {templateParams.map((p, i) => (
                                            <div key={i}>
                                                <label className="text-[10px] font-mono text-inkSecondary">{`{{${i+1}}}`}</label>
                                                <input
                                                    data-testid={`wa-template-param-${i}`}
                                                    autoFocus={i === 0}
                                                    value={p}
                                                    onChange={(e) => {
                                                        const next = [...templateParams];
                                                        next[i] = e.target.value;
                                                        setTemplateParams(next);
                                                    }}
                                                    placeholder={`Value for {{${i+1}}}`}
                                                    className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Preview */}
                                <div className="bg-brand/10 border-2 border-brand p-3 mb-4">
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-ink mb-1">preview</div>
                                    <p className="text-sm whitespace-pre-wrap">
                                        {selectedTemplate.body.replace(/\{\{(\d+)\}\}/g, (_, n) => templateParams[parseInt(n, 10) - 1] || `{{${n}}}`)}
                                    </p>
                                </div>

                                <div className="flex gap-2 justify-end">
                                    <button onClick={() => setSelectedTemplate(null)} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">
                                        Back
                                    </button>
                                    <button
                                        data-testid="wa-template-send"
                                        onClick={sendTemplate}
                                        disabled={sending}
                                        className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink disabled:opacity-50 flex items-center gap-1.5"
                                    >
                                        {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                        Send template
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Template Manager Modal */}
            {showTemplateManager && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowTemplateManager(false)} data-testid="wa-template-manager">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// templates.manage</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">Message templates</h3>
                                <p className="text-xs text-inkSecondary mt-1">Create reusable templates with variables like {`{{1}}`}, {`{{2}}`}. Required to start a chat outside WhatsApp's 24-hour window.</p>
                            </div>
                            <button onClick={() => setShowTemplateManager(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Form */}
                            <div className="border-2 border-ink p-4 bg-bg">
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary mb-3">
                                    {editingTemplate ? `editing · ${editingTemplate.name}` : "create new"}
                                </div>
                                                <div className="space-y-3">
                                    <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Meta name</label>
                                        <input
                                            data-testid="wa-tpl-name"
                                            value={templateForm.name}
                                            onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                                            placeholder="order_confirmation"
                                            className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand font-mono"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Category</label>
                                            <select
                                                data-testid="wa-tpl-category"
                                                value={templateForm.category}
                                                onChange={(e) => setTemplateForm({ ...templateForm, category: e.target.value })}
                                                className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand"
                                            >
                                                <option value="utility">Utility</option>
                                                <option value="marketing">Marketing</option>
                                                <option value="authentication">Authentication</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Language</label>
                                            <input
                                                data-testid="wa-tpl-language"
                                                value={templateForm.language}
                                                onChange={(e) => setTemplateForm({ ...templateForm, language: e.target.value })}
                                                placeholder="en_US"
                                                className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand font-mono"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Header (optional)</label>
                                        <input value={templateForm.header} onChange={(e) => setTemplateForm({ ...templateForm, header: e.target.value })} placeholder="Hi {{1}}," className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">
                                            Body — use {`{{1}}`}, {`{{2}}`} for variables
                                        </label>
                                        <textarea
                                            data-testid="wa-tpl-body"
                                            value={templateForm.body}
                                            onChange={(e) => setTemplateForm({ ...templateForm, body: e.target.value })}
                                            placeholder="Hi {{1}}, your order {{2}} is ready."
                                            rows={4}
                                            className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand resize-y"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Footer (optional)</label>
                                        <input value={templateForm.footer} onChange={(e) => setTemplateForm({ ...templateForm, footer: e.target.value })} placeholder="Reply STOP to opt out" className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand" />
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">
                                            Local Meta name (optional)
                                        </label>
                                        <input
                                            data-testid="wa-tpl-meta-name"
                                            value={templateForm.meta_template_name}
                                            onChange={(e) => setTemplateForm({ ...templateForm, meta_template_name: e.target.value })}
                                            placeholder="Only if registered in Meta Business Manager"
                                            className="w-full border-2 border-ink bg-white px-3 py-2 text-sm outline-none focus:border-brand font-mono"
                                        />
                                        <p className="text-[10px] text-inkSecondary mt-1">Fill this only when Meta has approved this exact name — it then uses Meta's proper template API.</p>
                                    </div>
                                    <div className="flex gap-2 flex-wrap">
                                        <button type="button" onClick={submitTemplateToMeta} disabled={metaSubmitting} className="flex-1 bg-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand disabled:opacity-50">
                                            {metaSubmitting ? "Submitting..." : "Submit to Meta"}
                                        </button>
                                        <button
                                            data-testid="wa-tpl-save"
                                            onClick={saveTemplate}
                                            className="flex-1 bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink"
                                        >
                                            {editingTemplate ? "Update" : "Create"}
                                        </button>
                                        {editingTemplate && (
                                            <button
                                                onClick={() => { setEditingTemplate(null); setTemplateForm({ name: "", category: "utility", language: "en_US", body: "", header: "", footer: "", meta_template_name: "" }); }}
                                                className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                                            >
                                                Cancel
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* List */}
                            <div>
                                <div className="flex items-center justify-between mb-3 gap-2">
                                    <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">{templates.length} template{templates.length === 1 ? "" : "s"}</div>
                                    <button type="button" onClick={syncMetaTemplates} disabled={metaSyncing} className="text-[10px] font-bold uppercase tracking-widest text-brand hover:text-ink underline disabled:opacity-50">{metaSyncing ? "Syncing..." : "Sync from Meta"}</button>
                                    {templates.length === 0 && (
                                        <button
                                            data-testid="wa-tpl-seed"
                                            onClick={seedDefaultTemplates}
                                            className="text-[10px] font-bold uppercase tracking-widest text-brand hover:text-ink underline"
                                        >
                                            Load starters
                                        </button>
                                    )}
                                </div>
                                <div className="space-y-2 max-h-[500px] overflow-y-auto" data-testid="wa-tpl-list">
                                    {templates.length === 0 ? (
                                        <div className="text-center py-6 text-xs text-inkSecondary border-2 border-dashed border-ink/30">
                                            No templates yet.
                                        </div>
                                    ) : (
                                        templates.map((t) => (
                                            <div key={t.id} data-testid={`wa-tpl-item-${t.name}`} className="border-2 border-ink p-3">
                                                <div className="flex items-center justify-between gap-2 mb-1">
                                                    <div className="font-bold text-sm font-mono tracking-tight">{t.name}</div>
                                                    <div className="flex gap-1">
                                                        <button onClick={() => editTemplate(t)} className="border-2 border-ink p-1 hover:bg-ink hover:text-white" title="Edit">
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                        <button onClick={() => deleteTemplate(t.id)} className="border-2 border-ink p-1 hover:bg-bad hover:text-white hover:border-bad" title="Delete">
                                                            <Trash2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 mb-1">
                                                    <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-bg border border-ink">{t.category}</span>
                                                    <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-bg border border-ink">{t.language}</span>
                                                    <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-bg border border-ink">{t.param_count || 0} param</span>
                                                    {t.meta_template_name && (
                                                        <span className="text-[9px] font-mono uppercase tracking-widest px-1.5 py-0.5 bg-ok/10 border border-ok text-ok">meta</span>
                                                    )}
                                                </div>
                                                <p className="text-xs text-inkSecondary">{t.body}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Sync Contact Modal */}
            {showSyncContact && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowSyncContact(false)} data-testid="wa-sync-contact-modal">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// sync.lead</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">
                                    {selectedConv?.contact_id ? "Update contact" : "Sync as lead"}
                                </h3>
                                <p className="text-xs text-inkSecondary mt-1">
                                    Phone <span className="font-mono">{selectedPhone}</span> will be tagged <span className="bg-bg px-1 font-mono">whatsapp</span>, <span className="bg-bg px-1 font-mono">lead</span>.
                                </p>
                            </div>
                            <button onClick={() => setShowSyncContact(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Name</label>
                                <input
                                    data-testid="wa-sync-name"
                                    autoFocus
                                    value={contactForm.name}
                                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                    placeholder="Alex Parker"
                                    className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Email</label>
                                    <input
                                        data-testid="wa-sync-email"
                                        type="email"
                                        value={contactForm.email}
                                        onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                        placeholder="alex@acme.com"
                                        className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                                    />
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Company</label>
                                    <input
                                        data-testid="wa-sync-company"
                                        value={contactForm.company}
                                        onChange={(e) => setContactForm({ ...contactForm, company: e.target.value })}
                                        placeholder="Acme Inc."
                                        className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Notes</label>
                                <textarea
                                    data-testid="wa-sync-notes"
                                    value={contactForm.notes}
                                    onChange={(e) => setContactForm({ ...contactForm, notes: e.target.value })}
                                    rows={2}
                                    placeholder="Context about this lead…"
                                    className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand resize-y"
                                />
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-5">
                            <button onClick={() => setShowSyncContact(false)} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">
                                Cancel
                            </button>
                            <button
                                data-testid="wa-sync-submit"
                                onClick={syncContact}
                                disabled={syncing}
                                className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                                {selectedConv?.contact_id ? "Update contact" : "Create lead"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create Ticket Modal */}
            {showCreateTicket && (
                <div className="fixed inset-0 bg-ink/60 grid place-items-center z-50 p-4" onClick={() => setShowCreateTicket(false)} data-testid="wa-create-ticket-modal">
                    <div className="bg-white border-2 border-ink p-6 w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <div className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary">// ticket.from.chat</div>
                                <h3 className="font-heading font-black text-2xl tracking-tighter">New ticket from chat</h3>
                                <p className="text-xs text-inkSecondary mt-1">
                                    Linked to <span className="font-bold">{selectedConv?.contact_name || selectedPhone}</span>.
                                    Assignee → current assignment{selectedConv?.assigned_to_name ? ` (${selectedConv.assigned_to_name})` : " (unassigned)"}.
                                </p>
                            </div>
                            <button onClick={() => setShowCreateTicket(false)} className="border-2 border-ink p-1.5 hover:bg-ink hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Subject</label>
                                <input
                                    data-testid="wa-ticket-subject"
                                    autoFocus
                                    value={ticketForm.subject}
                                    onChange={(e) => setTicketForm({ ...ticketForm, subject: e.target.value })}
                                    placeholder="Customer question about billing…"
                                    className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Priority</label>
                                    <select
                                        data-testid="wa-ticket-priority"
                                        value={ticketForm.priority}
                                        onChange={(e) => setTicketForm({ ...ticketForm, priority: e.target.value })}
                                        className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand"
                                    >
                                        <option value="low">Low</option>
                                        <option value="medium">Medium</option>
                                        <option value="high">High</option>
                                        <option value="urgent">Urgent</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Include last N msgs</label>
                                    <input
                                        type="number"
                                        min={0}
                                        max={50}
                                        data-testid="wa-ticket-include"
                                        value={ticketForm.include_last_messages}
                                        onChange={(e) => setTicketForm({ ...ticketForm, include_last_messages: e.target.value })}
                                        className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand font-mono"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Extra description (optional)</label>
                                <textarea
                                    data-testid="wa-ticket-description"
                                    value={ticketForm.description}
                                    onChange={(e) => setTicketForm({ ...ticketForm, description: e.target.value })}
                                    rows={3}
                                    placeholder="Any extra context for the agent handling this ticket…"
                                    className="w-full border-2 border-ink bg-bg px-3 py-2 text-sm outline-none focus:border-brand resize-y"
                                />
                            </div>
                            <div className="bg-bg border-l-2 border-brand p-2 text-[11px] text-inkSecondary">
                                Ticket will be created with <span className="font-bold">channel = whatsapp</span> and the last {ticketForm.include_last_messages || 0} messages as context. If the contact doesn't exist yet, it will be created automatically as a lead.
                            </div>
                        </div>
                        <div className="flex gap-2 justify-end mt-5">
                            <button onClick={() => setShowCreateTicket(false)} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">
                                Cancel
                            </button>
                            <button
                                data-testid="wa-ticket-submit"
                                onClick={createTicketFromChat}
                                disabled={creatingTicket}
                                className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink disabled:opacity-50 flex items-center gap-1.5"
                            >
                                {creatingTicket ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
                                Create ticket
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default WhatsAppInbox;
