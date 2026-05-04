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
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [provider, setProvider] = useState('resend');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [verifying, setVerifying] = useState(false);

    const load = async () => {
        try {
            const { data } = await api.get('/domains');
            setDomains(data);
        } catch (error) {
            toast.error('Failed to load domains');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    const addDomain = async (e) => {
        e.preventDefault();
        if (!newDomain) {
            toast.error('Please enter a domain name');
            return;
        }

        try {
            const { data } = await api.post('/domains', {
                domain: newDomain,
                provider: provider,
            });
            toast.success('Domain added! Configure DNS records to verify.');
            setDomains([data, ...domains]);
            setNewDomain('');
            setSelectedDomain(data);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to add domain');
        }
    };

    const verifyDomain = async (domain) => {
        setVerifying(true);
        try {
            const { data } = await api.post('/domains/verify', { domain });
            toast.success(data.verified ? 'Domain verified!' : 'Verification pending. Check DNS records.');
            load();
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Verification failed');
        } finally {
            setVerifying(false);
        }
    };

    const deleteDomain = async (domainId) => {
        if (!window.confirm('Are you sure you want to remove this domain?')) return;

        try {
            await api.delete(`/domains/${domainId}`);
            toast.success('Domain removed');
            setDomains(domains.filter(d => d.id !== domainId));
            if (selectedDomain?.id === domainId) {
                setSelectedDomain(null);
            }
        } catch (error) {
            toast.error('Failed to remove domain');
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        toast.success('Copied to clipboard');
    };

    if (loading) {
        return <div className="font-mono text-sm">LOADING…</div>;
    }

    // Get user ID for webhook URL
    const { user } = useAuth();
    const webhookUrl = `${window.location.origin}/api/webhooks/resend/${user?.id}`;

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
                                        Requires DNS configuration below
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

            <h2 className="font-heading font-black text-2xl tracking-tighter mb-2">Custom Domains</h2>
            <p className="text-sm text-inkSecondary mb-6">Send emails from your own domain (e.g., hello@yourbusiness.com)</p>

            {/* Add Domain Form */}
            <div className="bg-white border-2 border-ink p-5 mb-6">
                <h3 className="font-heading font-black text-xl tracking-tighter mb-3">Add Domain</h3>
                <form onSubmit={addDomain} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input
                        data-testid="domain-input"
                        placeholder="yourbusiness.com"
                        value={newDomain}
                        onChange={(e) => setNewDomain(e.target.value)}
                        className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm"
                    />
                    <select
                        data-testid="domain-provider"
                        value={provider}
                        onChange={(e) => setProvider(e.target.value)}
                        className="bg-bg border-2 border-ink px-3 py-2 outline-none text-sm font-bold uppercase tracking-widest"
                    >
                        <option value="resend">Resend</option>
                        <option value="sendgrid">SendGrid</option>
                        <option value="smtp">Custom SMTP</option>
                    </select>
                    <button
                        data-testid="domain-add-btn"
                        type="submit"
                        className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink flex items-center justify-center gap-2"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Domain
                    </button>
                </form>
                <p className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary mt-2">
                    Enter your domain without http:// or www
                </p>
            </div>

            {/* Domains List */}
            {domains.length === 0 ? (
                <div className="bg-white border-2 border-ink p-12 text-center">
                    <Globe className="w-12 h-12 mx-auto mb-4 text-inkSecondary" />
                    <h3 className="font-heading font-black text-xl tracking-tighter mb-2">No domains configured</h3>
                    <p className="text-sm text-inkSecondary">
                        Add your first custom domain to start sending emails from your own domain.
                    </p>
                </div>
            ) : (
                <div className="space-y-4">
                    {domains.map((domain) => (
                        <div key={domain.id} className="bg-white border-2 border-ink p-5" data-testid={`domain-card-${domain.id}`}>
                            <div className="flex items-start justify-between mb-3 flex-wrap gap-3">
                                <div>
                                    <div className="font-heading font-black text-xl tracking-tighter flex items-center gap-2">
                                        <Globe className="w-5 h-5 text-brand" />
                                        {domain.domain}
                                        {domain.verified ? (
                                            <span className="text-[10px] font-mono uppercase tracking-widest bg-ok/10 text-ok border border-ok px-2 py-0.5">
                                                <CheckCircle2 className="w-3 h-3 inline mr-1" />
                                                Verified
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-mono uppercase tracking-widest bg-yellow-100 text-yellow-800 border border-yellow-300 px-2 py-0.5">
                                                <AlertCircle className="w-3 h-3 inline mr-1" />
                                                Pending
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-xs text-inkSecondary mt-1">
                                        Provider: {domain.provider.toUpperCase()} • Added {new Date(domain.created_at).toLocaleDateString()}
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        data-testid={`domain-verify-${domain.id}`}
                                        onClick={() => verifyDomain(domain.domain)}
                                        disabled={verifying}
                                        className="border-2 border-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white disabled:opacity-50 flex items-center gap-1"
                                    >
                                        <RefreshCw className={`w-3 h-3 ${verifying ? 'animate-spin' : ''}`} />
                                        Verify
                                    </button>
                                    <button
                                        data-testid={`domain-toggle-${domain.id}`}
                                        onClick={() => setSelectedDomain(selectedDomain?.id === domain.id ? null : domain)}
                                        className="border-2 border-ink px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white"
                                    >
                                        {selectedDomain?.id === domain.id ? 'Hide' : 'Show'} DNS
                                    </button>
                                    <button
                                        data-testid={`domain-delete-${domain.id}`}
                                        onClick={() => deleteDomain(domain.id)}
                                        className="border-2 border-ink px-2 py-1.5 hover:bg-bad hover:text-white hover:border-bad"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>

                            {selectedDomain?.id === domain.id && (
                                <div className="mt-4 bg-bg border-l-2 border-brand p-4">
                                    <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-3">
                                        DNS Records - Add these to your domain registrar
                                    </div>
                                    <div className="space-y-3">
                                        {domain.dns_records?.map((record, idx) => (
                                            <div key={idx} className="bg-white border border-ink p-3">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <span className="text-[10px] font-mono uppercase tracking-widest bg-brand text-white px-2 py-0.5">
                                                        {record.type}
                                                    </span>
                                                    <span className="text-xs font-bold">{record.purpose}</span>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <div>
                                                        <label className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary">Name/Host</label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <code className="flex-1 text-xs bg-bg px-2 py-1 border border-line font-mono break-all">
                                                                {record.name}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(record.name)}
                                                                className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-white"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary">Value</label>
                                                        <div className="flex items-center gap-2 mt-1">
                                                            <code className="flex-1 text-xs bg-bg px-2 py-1 border border-line font-mono break-all">
                                                                {record.value}
                                                            </code>
                                                            <button
                                                                onClick={() => copyToClipboard(record.value)}
                                                                className="border-2 border-ink px-2 py-1 hover:bg-ink hover:text-white"
                                                            >
                                                                <Copy className="w-3 h-3" />
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {domain.verification_results && (
                                        <div className="mt-4">
                                            <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-2">
                                                Verification Status
                                            </div>
                                            <div className="space-y-2">
                                                {domain.verification_results.map((result, idx) => (
                                                    <div key={idx} className="flex items-center gap-2 text-xs">
                                                        {result.verified ? (
                                                            <CheckCircle2 className="w-4 h-4 text-ok" />
                                                        ) : (
                                                            <XCircle className="w-4 h-4 text-bad" />
                                                        )}
                                                        <span>{result.record.purpose}: {result.status}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ---------- Roles Tab ----------
const RolesTab = () => {
    const [roles, setRoles] = useState([]);
    const [perms, setPerms] = useState([]);
    const [creating, setCreating] = useState(false);
    const [form, setForm] = useState({ name: "", description: "", permissions: [] });
    const [editId, setEditId] = useState(null);

    const load = async () => {
        const [r, p] = await Promise.all([api.get("/roles"), api.get("/permissions")]);
        setRoles(r.data); setPerms(p.data);
    };
    useEffect(() => { load(); }, []);

    const togglePerm = (p) => {
        setForm((f) => ({ ...f, permissions: f.permissions.includes(p) ? f.permissions.filter((x) => x !== p) : [...f.permissions, p] }));
    };

    const save = async () => {
        try {
            if (editId) {
                await api.put(`/roles/${editId}`, form);
                toast.success("Role updated");
            } else {
                await api.post("/roles", form);
                toast.success("Role created");
            }
            setCreating(false); setEditId(null); setForm({ name: "", description: "", permissions: [] });
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Save failed");
        }
    };

    const edit = (r) => {
        if (r.system) { toast.error("System roles are read-only"); return; }
        setEditId(r.id); setForm({ name: r.name, description: r.description || "", permissions: r.permissions });
        setCreating(true);
    };

    const remove = async (r) => {
        if (r.system) { toast.error("System roles cannot be deleted"); return; }
        if (!window.confirm(`Delete role "${r.name}"?`)) return;
        try {
            await api.delete(`/roles/${r.id}`);
            toast.success("Deleted");
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Delete failed");
        }
    };

    // Group perms by resource
    const groups = perms.reduce((acc, p) => {
        const [g] = p.split(".");
        if (!acc[g]) acc[g] = [];
        acc[g].push(p);
        return acc;
    }, {});

    return (
        <div data-testid="roles-section">
            <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
                <h2 className="font-heading font-black text-2xl tracking-tighter">Roles ({roles.length})</h2>
                <button data-testid="role-new-btn" onClick={() => { setCreating(!creating); setEditId(null); setForm({ name: "", description: "", permissions: [] }); }} className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 hover:bg-ink">
                    <Plus className="w-3.5 h-3.5" /> New role
                </button>
            </div>

            {creating && (
                <div className="bg-white border-2 border-ink p-5 mb-6" data-testid="role-form">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                        <input data-testid="role-input-name" placeholder="Role name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                        <input data-testid="role-input-desc" placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    </div>
                    <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-2">Permissions ({form.permissions.length}/{perms.length})</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                        {Object.entries(groups).map(([g, ps]) => (
                            <div key={g} className="bg-bg border border-ink p-3">
                                <div className="text-[10px] font-mono uppercase tracking-widest text-ink mb-2">{g}</div>
                                <div className="space-y-1">
                                    {ps.map((p) => (
                                        <label key={p} className="flex items-center gap-2 cursor-pointer">
                                            <input data-testid={`perm-toggle-${p}`} type="checkbox" checked={form.permissions.includes(p)} onChange={() => togglePerm(p)} className="w-3.5 h-3.5 accent-brand" />
                                            <span className="text-xs font-mono">{p.split(".")[1]}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button data-testid="role-save-btn" onClick={save} className="bg-brand text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink">{editId ? "Update" : "Create"}</button>
                        <button onClick={() => { setCreating(false); setEditId(null); }} className="border-2 border-ink px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">Cancel</button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {roles.map((r) => (
                    <div key={r.id} data-testid={`role-card-${r.id}`} className="bg-white border-2 border-ink p-5">
                        <div className="flex items-start justify-between mb-2">
                            <div>
                                <div className="font-heading font-black text-xl tracking-tighter flex items-center gap-2">
                                    <ShieldCheck className="w-4 h-4 text-brand" /> {r.name}
                                    {r.system && <span className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary border border-ink px-1.5">system</span>}
                                </div>
                                <div className="text-xs text-inkSecondary mt-1">{r.description}</div>
                            </div>
                            {!r.system && (
                                <div className="flex gap-1">
                                    <button data-testid={`role-edit-${r.id}`} onClick={() => edit(r)} className="border-2 border-ink px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white">Edit</button>
                                    <button data-testid={`role-delete-${r.id}`} onClick={() => remove(r)} className="border-2 border-ink px-2 py-1 hover:bg-bad hover:text-white hover:border-bad"><Trash2 className="w-3 h-3" /></button>
                                </div>
                            )}
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1">
                            {(r.permissions || []).slice(0, 8).map((p) => (
                                <span key={p} className="text-[10px] font-mono bg-bg border border-line px-1.5 py-0.5">{p}</span>
                            ))}
                            {(r.permissions || []).length > 8 && <span className="text-[10px] font-mono text-inkSecondary">+{r.permissions.length - 8}</span>}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---------- Team Tab ----------
const TeamTab = () => {
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [invites, setInvites] = useState([]);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("agent");

    const load = async () => {
        try {
            const [u, r, i] = await Promise.all([api.get("/users"), api.get("/roles"), api.get("/invitations")]);
            setUsers(u.data); setRoles(r.data); setInvites(i.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to load");
        }
    };
    useEffect(() => { load(); }, []);

    const setRole = async (userId, role) => {
        try {
            await api.patch(`/users/${userId}/role`, { role });
            toast.success("Role updated");
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Update failed");
        }
    };

    const sendInvite = async (e) => {
        e.preventDefault();
        try {
            const { data } = await api.post("/invitations", { email: inviteEmail, role: inviteRole });
            const linkPath = data.invite_url || `/accept-invite?token=${data.token}`;
            const fullUrl = linkPath.startsWith("http") ? linkPath : window.location.origin + linkPath;
            navigator.clipboard.writeText(fullUrl);
            toast.success(data.email_sent ? `Invite emailed + link copied` : `Invite link copied (Resend not configured)`);
            setInviteEmail("");
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Invite failed");
        }
    };

    const revokeInvite = async (id) => {
        await api.delete(`/invitations/${id}`);
        load();
    };

    const copyInvite = (inv) => {
        const link = (inv.invite_url || `/accept-invite?token=${inv.token}`);
        const url = link.startsWith("http") ? link : window.location.origin + link;
        navigator.clipboard.writeText(url);
        toast.success("Link copied");
    };

    return (
        <div data-testid="team-section">
            {/* Invite */}
            <div className="bg-white border-2 border-ink p-5 mb-6" data-testid="invite-section">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3 flex items-center gap-2"><UserPlus className="w-5 h-5 text-brand" /> Invite teammate</h2>
                <form onSubmit={sendInvite} className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <input data-testid="invite-email-input" required type="email" placeholder="email@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} className="md:col-span-2 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    <div className="flex gap-2">
                        <select data-testid="invite-role-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="flex-1 bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-xs font-bold uppercase tracking-widest">
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                        <button data-testid="invite-send-btn" type="submit" className="bg-brand text-white px-4 text-xs font-bold uppercase tracking-widest hover:bg-ink flex items-center gap-1"><Send className="w-3 h-3" /> Invite</button>
                    </div>
                </form>
                <p className="text-[11px] font-mono uppercase tracking-widest text-inkSecondary mt-2">Sends email if Resend configured, else link is copied to clipboard.</p>
            </div>

            <h2 className="font-heading font-black text-2xl tracking-tighter mb-4">Team members ({users.length})</h2>
            <div className="bg-white border-2 border-ink overflow-x-auto mb-6">
                <table className="w-full text-sm">
                    <thead>
                        <tr className="border-b-2 border-ink">
                            {["Name", "Email", "Role", "Joined"].map((h) => <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-inkSecondary">{h}</th>)}
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((u) => (
                            <tr key={u.id} data-testid={`team-row-${u.id}`} className="border-b border-line">
                                <td className="px-4 py-3 font-bold">{u.name}</td>
                                <td className="px-4 py-3 font-mono text-xs">{u.email}</td>
                                <td className="px-4 py-3">
                                    <select data-testid={`team-role-${u.id}`} value={u.role || "admin"} onChange={(e) => setRole(u.id, e.target.value)} className="bg-bg border-2 border-ink px-2 py-1 text-xs font-bold uppercase tracking-widest">
                                        {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                                    </select>
                                </td>
                                <td className="px-4 py-3 font-mono text-xs text-inkSecondary">{u.created_at?.slice(0, 10)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {invites.filter(i => i.status === "pending").length > 0 && (
                <>
                    <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Pending invites ({invites.filter(i => i.status === "pending").length})</h2>
                    <div className="bg-white border-2 border-ink">
                        {invites.filter(i => i.status === "pending").map((inv) => (
                            <div key={inv.id} data-testid={`invite-row-${inv.id}`} className="flex items-center gap-3 px-4 py-3 border-b border-line last:border-b-0">
                                <div className="flex-1">
                                    <div className="font-bold text-sm">{inv.email}</div>
                                    <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary">role: {inv.role} · expires {inv.expires_at?.slice(0, 10)}</div>
                                </div>
                                <button data-testid={`invite-copy-${inv.id}`} onClick={() => copyInvite(inv)} className="border-2 border-ink px-2 py-1 text-[10px] font-bold uppercase tracking-widest hover:bg-ink hover:text-white">Copy link</button>
                                <button data-testid={`invite-revoke-${inv.id}`} onClick={() => revokeInvite(inv.id)} className="border-2 border-ink px-2 py-1 hover:bg-bad hover:text-white hover:border-bad"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

// ---------- Helpdesk Tab ----------
const HelpdeskTab = () => {
    const [config, setConfig] = useState(null);
    const [fields, setFields] = useState([]);
    const [canned, setCanned] = useState([]);
    const [groups, setGroups] = useState([]);
    const [users, setUsers] = useState([]);
    const [roles, setRoles] = useState([]);
    const [newField, setNewField] = useState({ label: "", type: "text", options: "", required: false });
    const [newCanned, setNewCanned] = useState({ name: "", body: "", shortcut: "" });
    const [newGroup, setNewGroup] = useState({ name: "", description: "", member_ids: [] });

    const load = async () => {
        try {
            const [c, f, cn, g, u, r] = await Promise.all([
                api.get("/helpdesk/config"), api.get("/ticket-fields"),
                api.get("/canned-responses"), api.get("/groups"),
                api.get("/users").catch(() => ({ data: [] })),
                api.get("/roles"),
            ]);
            setConfig(c.data); setFields(f.data); setCanned(cn.data); setGroups(g.data); setUsers(u.data); setRoles(r.data);
        } catch (err) { toast.error("Load failed"); }
    };
    useEffect(() => { load(); }, []);

    if (!config) return <div className="font-mono text-sm">LOADING…</div>;

    const updateConfig = async (patch) => {
        try {
            const updated = { ...config, ...patch };
            await api.put("/helpdesk/config", patch);
            setConfig(updated);
            toast.success("Saved");
        } catch (err) { toast.error("Save failed"); }
    };

    const addField = async (e) => {
        e.preventDefault();
        try {
            await api.post("/ticket-fields", {
                label: newField.label, type: newField.type, required: newField.required,
                options: newField.type === "select" ? newField.options.split(",").map(s => s.trim()).filter(Boolean) : [],
            });
            setNewField({ label: "", type: "text", options: "", required: false });
            toast.success("Field added");
            load();
        } catch (err) { toast.error("Add failed"); }
    };

    const delField = async (id) => { await api.delete(`/ticket-fields/${id}`); load(); };

    const addCanned = async (e) => {
        e.preventDefault();
        try {
            await api.post("/canned-responses", newCanned);
            setNewCanned({ name: "", body: "", shortcut: "" });
            toast.success("Canned response added");
            load();
        } catch (err) { toast.error("Add failed"); }
    };

    const delCanned = async (id) => { await api.delete(`/canned-responses/${id}`); load(); };

    const addGroup = async (e) => {
        e.preventDefault();
        try {
            await api.post("/groups", newGroup);
            setNewGroup({ name: "", description: "", member_ids: [] });
            toast.success("Group created");
            load();
        } catch (err) { toast.error("Create failed"); }
    };

    const delGroup = async (id) => { await api.delete(`/groups/${id}`); load(); };

    const PRIORITIES = ["low", "medium", "high", "urgent"];

    return (
        <div className="space-y-6" data-testid="helpdesk-section">
            {/* Auto-assign */}
            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Auto-assignment</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Mode</label>
                        <select data-testid="assign-mode" value={config.assignment.mode} onChange={(e) => updateConfig({ assignment: { ...config.assignment, mode: e.target.value } })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none text-sm font-bold uppercase tracking-widest">
                            {["off", "round_robin", "load_balanced", "channel"].map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Eligible role</label>
                        <select data-testid="assign-role" value={config.assignment.eligible_role} onChange={(e) => updateConfig({ assignment: { ...config.assignment, eligible_role: e.target.value } })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none text-sm font-bold uppercase tracking-widest">
                            {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
                        </select>
                    </div>
                </div>
                {config.assignment.mode === "channel" && (
                    <div className="mt-4 bg-bg border-l-2 border-brand p-3">
                        <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-2">Channel routing</div>
                        {["whatsapp", "email", "portal", "chat", "call"].map((ch) => (
                            <div key={ch} className="grid grid-cols-2 gap-2 mb-2">
                                <span className="text-xs font-mono uppercase tracking-widest self-center">{ch}</span>
                                <select data-testid={`channel-map-${ch}`} value={(config.assignment.channel_map || {})[ch] || ""} onChange={(e) => updateConfig({ assignment: { ...config.assignment, channel_map: { ...(config.assignment.channel_map || {}), [ch]: e.target.value } } })} className="bg-white border-2 border-ink px-2 py-1 text-xs">
                                    <option value="">— unassigned —</option>
                                    {users.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* SLA */}
            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">SLA targets (minutes)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {PRIORITIES.map((p) => (
                        <div key={p} className="bg-bg border-2 border-ink p-3">
                            <div className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary mb-2">{p}</div>
                            <div className="grid grid-cols-2 gap-2">
                                <input data-testid={`sla-${p}-fr`} type="number" min={0} value={config.sla[p].first_response_minutes} onChange={(e) => updateConfig({ sla: { ...config.sla, [p]: { ...config.sla[p], first_response_minutes: parseInt(e.target.value) || 0 } } })} className="bg-white border-2 border-ink px-2 py-1 text-xs" />
                                <input data-testid={`sla-${p}-res`} type="number" min={0} value={config.sla[p].resolution_minutes} onChange={(e) => updateConfig({ sla: { ...config.sla, [p]: { ...config.sla[p], resolution_minutes: parseInt(e.target.value) || 0 } } })} className="bg-white border-2 border-ink px-2 py-1 text-xs" />
                            </div>
                            <div className="grid grid-cols-2 text-[10px] font-mono text-inkSecondary mt-1"><span>1st response</span><span>resolve</span></div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Custom Fields */}
            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Ticket custom fields</h2>
                <form onSubmit={addField} className="grid grid-cols-1 md:grid-cols-5 gap-2 mb-4" data-testid="field-form">
                    <input data-testid="field-label" required placeholder="Label" value={newField.label} onChange={(e) => setNewField({ ...newField, label: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs" />
                    <select data-testid="field-type" value={newField.type} onChange={(e) => setNewField({ ...newField, type: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs uppercase">
                        {["text", "select", "number", "date", "checkbox"].map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {newField.type === "select" && <input data-testid="field-options" placeholder="opt1, opt2, opt3" value={newField.options} onChange={(e) => setNewField({ ...newField, options: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs" />}
                    <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={newField.required} onChange={(e) => setNewField({ ...newField, required: e.target.checked })} className="accent-brand" /> required</label>
                    <button data-testid="field-add" type="submit" className="bg-brand text-white px-3 text-xs font-bold uppercase tracking-widest hover:bg-ink">Add</button>
                </form>
                <div className="space-y-2">
                    {fields.map((f) => (
                        <div key={f.id} data-testid={`field-row-${f.id}`} className="flex items-center gap-3 bg-bg border border-ink px-3 py-2">
                            <span className="font-mono text-xs uppercase tracking-widest text-ink">{f.type}</span>
                            <span className="flex-1 font-bold text-sm">{f.label}</span>
                            {f.required && <span className="text-[10px] font-mono uppercase tracking-widest text-bad">required</span>}
                            {f.type === "select" && <span className="text-[10px] font-mono text-inkSecondary truncate">[{(f.options || []).join(", ")}]</span>}
                            <button data-testid={`field-delete-${f.id}`} onClick={() => delField(f.id)} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {fields.length === 0 && <div className="text-xs text-inkSecondary">No custom fields yet.</div>}
                </div>
            </div>

            {/* Canned Responses */}
            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Canned responses</h2>
                <form onSubmit={addCanned} className="space-y-2 mb-4" data-testid="canned-form">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <input data-testid="canned-name" required placeholder="Name (e.g. Greeting)" value={newCanned.name} onChange={(e) => setNewCanned({ ...newCanned, name: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs" />
                        <input data-testid="canned-shortcut" placeholder="Shortcut /greet" value={newCanned.shortcut} onChange={(e) => setNewCanned({ ...newCanned, shortcut: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs font-mono" />
                        <button data-testid="canned-add" type="submit" className="bg-brand text-white px-3 text-xs font-bold uppercase tracking-widest hover:bg-ink">Add</button>
                    </div>
                    <textarea data-testid="canned-body" required placeholder="Response body…" rows={2} value={newCanned.body} onChange={(e) => setNewCanned({ ...newCanned, body: e.target.value })} className="w-full bg-bg border-2 border-ink px-2 py-1.5 text-xs resize-none" />
                </form>
                <div className="space-y-2">
                    {canned.map((c) => (
                        <div key={c.id} data-testid={`canned-row-${c.id}`} className="bg-bg border border-ink px-3 py-2">
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex-1">
                                    <span className="font-bold text-sm">{c.name}</span>
                                    {c.shortcut && <span className="ml-2 font-mono text-[10px] text-brand">{c.shortcut}</span>}
                                    <div className="text-xs text-inkSecondary mt-1 line-clamp-2">{c.body}</div>
                                </div>
                                <button data-testid={`canned-delete-${c.id}`} onClick={() => delCanned(c.id)} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3 h-3" /></button>
                            </div>
                        </div>
                    ))}
                    {canned.length === 0 && <div className="text-xs text-inkSecondary">No canned responses yet.</div>}
                </div>
            </div>

            {/* Groups */}
            <div className="bg-white border-2 border-ink p-5">
                <h2 className="font-heading font-black text-xl tracking-tighter mb-3">Groups / Departments</h2>
                <form onSubmit={addGroup} className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-4" data-testid="group-form">
                    <input data-testid="group-name" required placeholder="Name (e.g. Sales)" value={newGroup.name} onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs" />
                    <input data-testid="group-desc" placeholder="Description" value={newGroup.description} onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })} className="bg-bg border-2 border-ink px-2 py-1.5 text-xs" />
                    <button data-testid="group-add" type="submit" className="bg-brand text-white px-3 text-xs font-bold uppercase tracking-widest hover:bg-ink">Add</button>
                </form>
                <div className="space-y-2">
                    {groups.map((g) => (
                        <div key={g.id} data-testid={`group-row-${g.id}`} className="bg-bg border border-ink px-3 py-2 flex items-center justify-between">
                            <div>
                                <div className="font-bold text-sm">{g.name}</div>
                                <div className="text-xs text-inkSecondary">{g.description}</div>
                            </div>
                            <button data-testid={`group-delete-${g.id}`} onClick={() => delGroup(g.id)} className="text-inkSecondary hover:text-bad"><Trash2 className="w-3 h-3" /></button>
                        </div>
                    ))}
                    {groups.length === 0 && <div className="text-xs text-inkSecondary">No groups yet.</div>}
                </div>
            </div>
        </div>
    );
};

// ---------- Webhooks Tab ----------
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
