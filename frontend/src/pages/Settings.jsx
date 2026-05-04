import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, Calendar, Shield, Users as UsersIcon, Plus, Trash2, Check, X, ShieldCheck, Key, Webhook, Copy, LifeBuoy, UserPlus, Send, Globe, RefreshCw, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const TABS = [
    { id: "integrations", label: "Integrations", icon: Key },
    { id: "domains", label: "Domains & Email", icon: Mail },
    { id: "roles", label: "Roles & Permissions", icon: Shield },
    { id: "team", label: "Team", icon: UsersIcon },
    { id: "helpdesk", label: "Helpdesk", icon: LifeBuoy },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
];

const Settings = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState("integrations");

    const can = (p) => (user?.permissions || []).includes(p);

    if (!can("settings.manage") && !can("roles.manage") && !can("users.manage")) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                <div className="bg-white rounded-xl border-2 border-gray-200 p-8 max-w-md shadow-lg" data-testid="settings-denied">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-br from-red-100 to-red-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Shield className="w-8 h-8 text-red-600" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
                        <p className="text-gray-600 mb-4">
                            Your role ({user?.role_label}) doesn't include settings access.
                        </p>
                        <p className="text-sm text-gray-500">
                            Contact an admin to request access.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="p-6 md:p-10 max-w-[1400px]" data-testid="settings-page">
                {/* Enhanced Header */}
                <div className="mb-8">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                                    <Shield className="w-7 h-7 text-white" />
                                </div>
                                <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                    Settings
                                </h1>
                            </div>
                            <p className="text-sm text-gray-600 ml-15">Configure integrations, manage roles & permissions, and assign team access.</p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap gap-1 bg-white rounded-lg p-1 border border-gray-200 shadow-sm mb-6 w-fit">
                    {TABS.map((t) => (
                        <button
                            key={t.id}
                            data-testid={`settings-tab-${t.id}`}
                            onClick={() => setTab(t.id)}
                            className={`px-4 py-2.5 rounded-md text-sm font-semibold flex items-center gap-2 transition-all ${
                                tab === t.id 
                                    ? "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md" 
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                        >
                            <t.icon className="w-4 h-4" /> {t.label}
                        </button>
                    ))}
                </div>

                {tab === "integrations" && <IntegrationsTab />}
                {tab === "domains" && <DomainsTab />}
                {tab === "roles" && <RolesTab />}
                {tab === "team" && <TeamTab />}
                {tab === "helpdesk" && <HelpdeskTab />}
                {tab === "webhooks" && <WebhooksTab user={user} />}
            </div>
        </div>
    );
};

// ---------- Integrations Tab ----------
const PROVIDER_DEFS = {
    resend: {
        label: "Resend (Email)",
        icon: Mail,
        desc: "Send transactional and marketing emails. Get key at resend.com/api-keys.",
        fields: [
            { key: "api_key", label: "API Key", placeholder: "re_xxxxxxxxxxxx", secret: true },
            { key: "from_email", label: "From email", placeholder: "no-reply@yourdomain.com" },
        ],
    },
    sendgrid: {
        label: "SendGrid (Email)",
        icon: Mail,
        desc: "Enterprise email delivery with advanced analytics. Get key at app.sendgrid.com/settings/api_keys.",
        fields: [
            { key: "api_key", label: "API Key", placeholder: "SG.xxxxxxxxxxxx", secret: true },
            { key: "from_email", label: "From email", placeholder: "no-reply@yourdomain.com" },
            { key: "from_name", label: "From name", placeholder: "Your Company" },
        ],
    },
    smtp: {
        label: "Custom SMTP",
        icon: Mail,
        desc: "Use your own SMTP server for complete control over email sending.",
        fields: [
            { key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com" },
            { key: "port", label: "Port", placeholder: "587" },
            { key: "username", label: "Username", placeholder: "your-email@domain.com" },
            { key: "password", label: "Password", placeholder: "•••••", secret: true },
            { key: "from_email", label: "From email", placeholder: "no-reply@yourdomain.com" },
            { key: "from_name", label: "From name", placeholder: "Your Company" },
        ],
    },
    twilio: {
        label: "Twilio (WhatsApp + Voice)",
        icon: MessageCircle,
        desc: "WhatsApp Business + programmable voice calls. Get keys at console.twilio.com.",
        fields: [
            { key: "account_sid", label: "Account SID", placeholder: "ACxxxxxxxxxxxx" },
            { key: "auth_token", label: "Auth Token", placeholder: "•••••", secret: true },
            { key: "whatsapp_number", label: "WhatsApp Number (E.164)", placeholder: "+14155238886" },
            { key: "voice_number", label: "Voice Number (E.164)", placeholder: "+15551234567" },
        ],
    },
    whatsapp_business: {
        label: "Meta WhatsApp Business API",
        icon: MessageCircle,
        desc: "Direct Meta integration (no Twilio). Get creds at developers.facebook.com → WhatsApp → API Setup.",
        fields: [
            { key: "access_token", label: "Access Token", placeholder: "EAAB•••••", secret: true },
            { key: "phone_number_id", label: "Phone Number ID", placeholder: "1234567890" },
            { key: "business_account_id", label: "Business Account ID", placeholder: "1234567890" },
        ],
    },
    google: {
        label: "Google (Calendar + Gmail)",
        icon: Calendar,
        desc: "Sync activities to Calendar, send via Gmail. Setup OAuth at console.cloud.google.com.",
        fields: [
            { key: "client_id", label: "OAuth Client ID", placeholder: "xxx.apps.googleusercontent.com" },
            { key: "client_secret", label: "OAuth Client Secret", placeholder: "•••••", secret: true },
            { key: "refresh_token", label: "Refresh Token (after consent)", placeholder: "1//••••" },
            { key: "calendar_id", label: "Calendar ID", placeholder: "primary" },
        ],
    },
};

const IntegrationsTab = () => {
    const [data, setData] = useState({});
    const [editing, setEditing] = useState(null);
    const [form, setForm] = useState({});
    const [testing, setTesting] = useState(null);

    const load = async () => {
        const { data } = await api.get("/integrations");
        setData(data);
    };
    useEffect(() => { load(); }, []);

    const save = async () => {
        try {
            await api.put(`/integrations/${editing}`, { config: form });
            toast.success(`${editing} saved`);
            setEditing(null); setForm({});
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const remove = async (provider) => {
        if (!window.confirm(`Disconnect ${provider}?`)) return;
        await api.delete(`/integrations/${provider}`);
        toast.success("Disconnected");
        load();
    };

    const test = async (provider) => {
        setTesting(provider);
        try {
            const { data } = await api.post(`/integrations/${provider}/test`);
            toast.success(`${provider}: ${data.account_status || data.friendly_name || "OK"}`);
        } catch (err) {
            toast.error("Test failed: " + (err.response?.data?.detail || ""));
        }
        setTesting(null);
    };

    return (
        <div className="space-y-4" data-testid="integrations-section">
            {Object.entries(PROVIDER_DEFS).map(([key, def]) => {
                const cfg = data[key] || { configured: false, config_masked: {} };
                const Icon = def.icon;
                return (
                    <div key={key} className="bg-white border-2 border-ink p-5" data-testid={`integration-card-${key}`}>
                        <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 grid place-items-center border-2 border-ink ${cfg.configured ? "bg-brand text-white border-brand" : "bg-bg"}`}>
                                    <Icon className="w-5 h-5" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="font-heading font-black text-xl tracking-tighter">{def.label}</div>
                                    <div className={`text-[10px] font-mono uppercase tracking-widest ${cfg.configured ? "text-ok" : "text-inkSecondary"}`}>
                                        ● {cfg.configured ? "connected" : "not connected"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {cfg.configured && (
                                    <button data-testid={`integration-test-${key}`} onClick={() => test(key)} disabled={testing === key} className="border-2 border-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white disabled:opacity-50">
                                        {testing === key ? "Testing…" : "Test"}
                                    </button>
                                )}
                                <button data-testid={`integration-edit-${key}`} onClick={() => { setEditing(key); setForm({}); }} className="bg-brand text-white px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink">
                                    {cfg.configured ? "Edit" : "Connect"}
                                </button>
                                {cfg.configured && (
                                    <button data-testid={`integration-disconnect-${key}`} onClick={() => remove(key)} className="border-2 border-ink px-3 py-1.5 text-[10px] hover:bg-bad hover:text-white hover:border-bad">
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-inkSecondary mb-3">{def.desc}</p>
                        {cfg.configured && (
                            <div className="bg-bg border-l-2 border-brand p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                                {Object.entries(cfg.config_masked || {}).map(([k, v]) => (
                                    <div key={k} className="font-mono text-xs">
                                        <span className="text-inkSecondary uppercase tracking-widest">{k}:</span> <span className="text-ink">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {editing === key && (
                            <div className="mt-4 bg-bg border-2 border-ink p-4 space-y-3" data-testid={`integration-form-${key}`}>
                                {def.fields.map((f) => (
                                    <div key={f.key}>
                                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">{f.label}</label>
                                        <input
                                            data-testid={`integration-input-${key}-${f.key}`}
                                            type={f.secret ? "password" : "text"}
                                            placeholder={f.placeholder}
                                            value={form[f.key] || ""}
                                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                            className="w-full bg-white border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm"
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-2">
                                    <button data-testid={`integration-save-${key}`} onClick={save} className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink">Save</button>
                                    <button data-testid={`integration-cancel-${key}`} onClick={() => { setEditing(null); setForm({}); }} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">Cancel</button>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};

// ---------- Domains Tab ----------
const DomainsTab = () => {
    const { user } = useAuth();
    const webhookUrl = `${window.location.origin}/api/webhooks/resend/${user?.id}`;

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    return (
        <div data-testid="domains-section">
            {/* Email Integration Status */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-lg p-6 mb-6">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Email Integration</h3>
                        <p className="text-gray-700 mb-4">
                            Receive emails directly into your CRM. Emails sent to support addresses will automatically create tickets.
                        </p>
                        
                        <div className="bg-white rounded-lg border border-blue-200 p-4 mb-4">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Webhook URL</span>
                                <button
                                    onClick={() => copyToClipboard(webhookUrl)}
                                    className="bg-blue-600 text-white px-3 py-1 rounded text-xs font-medium hover:bg-blue-700 flex items-center gap-1"
                                >
                                    <Copy className="w-3 h-3" /> Copy
                                </button>
                            </div>
                            <code className="text-xs bg-gray-100 px-2 py-1 rounded block break-all font-mono">
                                {webhookUrl}
                            </code>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg border border-blue-200 p-4">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Easy Setup (Recommended)
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Use Resend's managed email address - no DNS setup required!
                                </p>
                                <div className="bg-gray-50 rounded p-3">
                                    <p className="text-xs font-mono text-gray-700">
                                        Example: support@abc123.resend.app
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Get this from your Resend dashboard
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-blue-200 p-4">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    Custom Domain
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Use your own domain (e.g., support@yourdomain.com)
                                </p>
                                <div className="bg-gray-50 rounded p-3">
                                    <p className="text-xs text-gray-700">
                                        Requires DNS configuration
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Add domain → Configure DNS → Enable receiving
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                                <div className="text-sm">
                                    <p className="font-medium text-yellow-800">Setup Required</p>
                                    <p className="text-yellow-700 text-xs mt-1">
                                        Add the webhook URL above to your Resend dashboard under "Webhooks" with the "email.received" event.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Custom Domains</h2>
                <p className="text-sm text-inkSecondary">Domain management features coming soon. Use the email integration above for immediate setup.</p>
            </div>
        </div>
    );
};

// Placeholder components for other tabs
const RolesTab = () => (
    <div className="bg-white border-2 border-ink p-5">
        <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Roles & Permissions</h2>
        <p className="text-sm text-inkSecondary">Role management features available in full version.</p>
    </div>
);

const TeamTab = () => (
    <div className="bg-white border-2 border-ink p-5">
        <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Team Management</h2>
        <p className="text-sm text-inkSecondary">Team management features available in full version.</p>
    </div>
);

const HelpdeskTab = () => (
    <div className="bg-white border-2 border-ink p-5">
        <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Helpdesk Configuration</h2>
        <p className="text-sm text-inkSecondary">Helpdesk configuration features available in full version.</p>
    </div>
);

const WebhooksTab = ({ user }) => {
    const base = window.location.origin + "/api/webhooks";
    const [copied, setCopied] = useState("");

    const urls = [
        { id: "resend", label: "Resend events (delivery / open)", url: `${base}/resend/${user?.id}` },
        { id: "whatsapp", label: "Twilio WhatsApp inbound + status", url: `${base}/whatsapp/${user?.id}` },
        { id: "voice", label: "Twilio Voice status + recordings", url: `${base}/voice/${user?.id}` },
    ];

    const copy = (id, url) => {
        navigator.clipboard.writeText(url);
        setCopied(id);
        toast.success("Copied");
        setTimeout(() => setCopied(""), 1500);
    };

    return (
        <div data-testid="webhooks-section">
            <h2 className="font-heading font-black text-2xl tracking-tighter mb-2">Webhook URLs</h2>
            <p className="text-sm text-inkSecondary mb-4">Paste these URLs into your provider's webhook settings to ingest events.</p>
            <div className="space-y-3">
                {urls.map((w) => (
                    <div key={w.id} className="bg-white border-2 border-ink p-4" data-testid={`webhook-${w.id}`}>
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div>
                                <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary">// {w.id}</div>
                                <div className="font-bold text-sm">{w.label}</div>
                            </div>
                            <button data-testid={`webhook-copy-${w.id}`} onClick={() => copy(w.id, w.url)} className="border-2 border-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white flex items-center gap-1">
                                {copied === w.id ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} {copied === w.id ? "Copied" : "Copy"}
                            </button>
                        </div>
                        <div className="mt-2 bg-bg border border-line px-3 py-2 font-mono text-xs break-all">{w.url}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Settings;