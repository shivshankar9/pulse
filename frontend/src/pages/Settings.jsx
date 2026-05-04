import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { 
    Mail, MessageCircle, Calendar, Shield, Users as UsersIcon, Plus, Trash2, Check,
    Webhook, Copy, LifeBuoy, Globe, RefreshCw, CheckCircle2, AlertCircle, Info, Key
} from "lucide-react";
import AutomationSettings from "../components/AutomationSettings";

const TABS = [
    { id: "integrations", label: "Integrations", icon: Key },
    { id: "automation", label: "Automation", icon: RefreshCw },
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
                {tab === "automation" && <AutomationSettings />}
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
        <div className="space-y-6" data-testid="integrations-section">
            {Object.entries(PROVIDER_DEFS).map(([key, def]) => {
                const cfg = data[key] || { configured: false, config_masked: {} };
                const Icon = def.icon;
                return (
                    <div key={key} className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md hover:shadow-lg transition-all" data-testid={`integration-card-${key}`}>
                        <div className="flex items-start justify-between flex-wrap gap-4 mb-4">
                            <div className="flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-lg flex items-center justify-center shadow-lg ${
                                    cfg.configured 
                                        ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white" 
                                        : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600"
                                }`}>
                                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                                </div>
                                <div>
                                    <div className="text-xl font-bold text-gray-900">{def.label}</div>
                                    <div className={`text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 ${
                                        cfg.configured ? "text-green-600" : "text-gray-500"
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full ${cfg.configured ? "bg-green-500" : "bg-gray-400"}`}></span>
                                        {cfg.configured ? "Connected" : "Not Connected"}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                {cfg.configured && (
                                    <button 
                                        data-testid={`integration-test-${key}`} 
                                        onClick={() => test(key)} 
                                        disabled={testing === key} 
                                        className="bg-white border-2 border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50 hover:border-gray-300"
                                    >
                                        {testing === key ? "Testing..." : "Test"}
                                    </button>
                                )}
                                <button 
                                    data-testid={`integration-edit-${key}`} 
                                    onClick={() => { setEditing(key); setForm({}); }} 
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                                >
                                    {cfg.configured ? "Edit" : "Connect"}
                                </button>
                                {cfg.configured && (
                                    <button 
                                        data-testid={`integration-disconnect-${key}`} 
                                        onClick={() => remove(key)} 
                                        className="bg-white border-2 border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                        <p className="text-sm text-gray-600 mb-4">{def.desc}</p>
                        {cfg.configured && (
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-l-blue-600 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-3">
                                {Object.entries(cfg.config_masked || {}).map(([k, v]) => (
                                    <div key={k} className="font-mono text-xs">
                                        <span className="text-gray-500 uppercase tracking-wider font-semibold">{k}:</span> 
                                        <span className="text-gray-800 ml-2">{v}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                        {editing === key && (
                            <div className="mt-6 bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6 space-y-4" data-testid={`integration-form-${key}`}>
                                {def.fields.map((f) => (
                                    <div key={f.key}>
                                        <label className="text-xs font-semibold uppercase tracking-wider text-gray-600 block mb-2">{f.label}</label>
                                        <input
                                            data-testid={`integration-input-${key}-${f.key}`}
                                            type={f.secret ? "password" : "text"}
                                            placeholder={f.placeholder}
                                            value={form[f.key] || ""}
                                            onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                                            className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                        />
                                    </div>
                                ))}
                                <div className="flex gap-3 pt-2">
                                    <button 
                                        data-testid={`integration-save-${key}`} 
                                        onClick={save} 
                                        className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                                    >
                                        Save
                                    </button>
                                    <button 
                                        data-testid={`integration-cancel-${key}`} 
                                        onClick={() => { setEditing(null); setForm({}); }} 
                                        className="bg-white border-2 border-gray-200 px-6 py-3 rounded-lg font-semibold hover:shadow-md transition-all hover:border-gray-300"
                                    >
                                        Cancel
                                    </button>
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
    const [domains, setDomains] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDomain, setNewDomain] = useState('');
    const [provider, setProvider] = useState('resend');
    const [selectedDomain, setSelectedDomain] = useState(null);
    const [verifying, setVerifying] = useState(false);
    const webhookUrl = `${window.location.origin}/api/webhooks/resend/${user?.id}`;

    const loadDomains = async () => {
        try {
            const { data } = await api.get('/domains');
            setDomains(data || []);
        } catch (error) {
            console.error('Failed to load domains:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDomains();
    }, []);

    const addDomain = async () => {
        if (!newDomain.trim()) {
            toast.error('Please enter a domain name');
            return;
        }

        try {
            const { data } = await api.post('/domains', {
                domain: newDomain.trim(),
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
            loadDomains();
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

    return (
        <div data-testid="domains-section" className="space-y-6">
            {/* Email Integration Status */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-300 rounded-xl p-6 shadow-md">
                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                        <Mail className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Email Integration</h3>
                        <p className="text-gray-700 mb-4">
                            Receive emails directly into your CRM. Emails sent to support addresses will automatically create tickets.
                        </p>
                        
                        <div className="bg-white rounded-lg border border-blue-200 p-4 mb-4 shadow-sm">
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-gray-700">Webhook URL</span>
                                <button
                                    onClick={() => copyToClipboard(webhookUrl)}
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:from-blue-700 hover:to-indigo-700 flex items-center gap-1.5 shadow-md hover:shadow-lg transition-all"
                                >
                                    <Copy className="w-3 h-3" /> Copy
                                </button>
                            </div>
                            <code className="text-xs bg-gray-100 px-3 py-2 rounded-lg block break-all font-mono border">
                                {webhookUrl}
                            </code>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    Easy Setup (Recommended)
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Use Resend's managed email address - no DNS setup required!
                                </p>
                                <div className="bg-gray-50 rounded-lg p-3 border">
                                    <p className="text-xs font-mono text-gray-700">
                                        Example: support@abc123.resend.app
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Get this from your Resend dashboard
                                    </p>
                                </div>
                            </div>

                            <div className="bg-white rounded-lg border border-blue-200 p-4 shadow-sm hover:shadow-md transition-shadow">
                                <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                                    <Globe className="w-4 h-4 text-blue-600" />
                                    Custom Domain
                                </h4>
                                <p className="text-sm text-gray-600 mb-3">
                                    Use your own domain (e.g., support@yourdomain.com)
                                </p>
                                <div className="bg-gray-50 rounded-lg p-3 border">
                                    <p className="text-xs text-gray-700">
                                        Requires DNS configuration
                                    </p>
                                    <p className="text-xs text-gray-600 mt-1">
                                        Add domain → Configure DNS → Enable receiving
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
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

            {/* Custom Domains Management */}
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                    <h2 className="text-xl font-bold text-gray-900">Custom Email Domains</h2>
                    <p className="text-sm text-gray-600 mt-1">Configure your own domain to send emails from your business address</p>
                </div>

                <div className="p-6">
                    {/* Add Domain Form */}
                    <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6 mb-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Domain</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="md:col-span-2">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Domain Name</label>
                                <input
                                    type="text"
                                    placeholder="yourbusiness.com"
                                    value={newDomain}
                                    onChange={(e) => setNewDomain(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors"
                                />
                                <p className="text-xs text-gray-600 mt-1">Enter your domain without http:// or www</p>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Provider</label>
                                <select
                                    value={provider}
                                    onChange={(e) => setProvider(e.target.value)}
                                    className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-sm hover:border-gray-300 transition-colors"
                                >
                                    <option value="resend">Resend (Recommended)</option>
                                    <option value="sendgrid">SendGrid</option>
                                    <option value="smtp">Custom SMTP</option>
                                </select>
                            </div>
                        </div>
                        <button
                            onClick={addDomain}
                            className="mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2"
                        >
                            <Plus className="w-4 h-4" />
                            Add Domain
                        </button>
                    </div>

                    {/* Domains List */}
                    {loading ? (
                        <div className="text-center py-8">
                            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600 mb-2" />
                            <p className="text-gray-600">Loading domains...</p>
                        </div>
                    ) : domains.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                                <Globe className="w-10 h-10 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-bold text-gray-900 mb-2">No Custom Domains</h3>
                            <p className="text-gray-600 mb-4">Add your first custom domain to send emails from your business address</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {domains.map((domain) => (
                                <div key={domain.id} className="border-2 border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                                                domain.verified 
                                                    ? "bg-gradient-to-br from-green-600 to-green-700 text-white" 
                                                    : "bg-gradient-to-br from-gray-100 to-gray-200 text-gray-600"
                                            }`}>
                                                <Globe className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-lg font-bold text-gray-900">{domain.domain}</h4>
                                                <div className="flex items-center gap-2">
                                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${
                                                        domain.verified 
                                                            ? "bg-gradient-to-r from-green-50 to-green-100 text-green-700 border-2 border-green-300" 
                                                            : "bg-gradient-to-r from-yellow-50 to-yellow-100 text-yellow-700 border-2 border-yellow-300"
                                                    }`}>
                                                        {domain.verified ? (
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                        ) : (
                                                            <AlertCircle className="w-3.5 h-3.5" />
                                                        )}
                                                        {domain.verified ? 'Verified' : 'Pending'}
                                                    </span>
                                                    <span className="text-xs text-gray-500 uppercase font-semibold tracking-wider">
                                                        {domain.provider}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => verifyDomain(domain.domain)}
                                                disabled={verifying}
                                                className="bg-white border-2 border-gray-200 px-4 py-2 rounded-lg text-sm font-semibold hover:shadow-md transition-all disabled:opacity-50 hover:border-gray-300"
                                            >
                                                <RefreshCw className={`w-4 h-4 mr-2 ${verifying ? 'animate-spin' : ''}`} />
                                                Verify
                                            </button>
                                            <button
                                                onClick={() => setSelectedDomain(selectedDomain?.id === domain.id ? null : domain)}
                                                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all"
                                            >
                                                {selectedDomain?.id === domain.id ? 'Hide' : 'Show'} DNS
                                            </button>
                                            <button
                                                onClick={() => deleteDomain(domain.id)}
                                                className="bg-white border-2 border-red-200 text-red-600 px-3 py-2 rounded-lg hover:bg-red-50 hover:border-red-300 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {selectedDomain?.id === domain.id && domain.dns_records && (
                                        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg">
                                            <div className="flex items-center gap-2 mb-4">
                                                <AlertCircle className="w-5 h-5 text-blue-600" />
                                                <h5 className="font-semibold text-blue-900">DNS Configuration Required</h5>
                                            </div>
                                            <p className="text-sm text-blue-800 mb-4">
                                                Add these DNS records to your domain registrar (GoDaddy, Namecheap, Cloudflare, etc.)
                                            </p>

                                            <div className="space-y-4">
                                                {domain.dns_records.map((record, idx) => (
                                                    <div key={idx} className="bg-white border border-blue-200 rounded-lg p-4 shadow-sm">
                                                        <div className="flex items-center justify-between mb-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200">
                                                                    {record.type}
                                                                </span>
                                                                <span className="text-sm font-medium text-gray-900">{record.purpose}</span>
                                                            </div>
                                                        </div>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Name/Host</label>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <code className="text-sm bg-gray-100 px-3 py-2 rounded-lg border flex-1 font-mono">
                                                                        {record.name}
                                                                    </code>
                                                                    <button
                                                                        onClick={() => copyToClipboard(record.name)}
                                                                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                                                                    >
                                                                        <Copy className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                            <div>
                                                                <label className="text-xs font-semibold text-gray-600 uppercase tracking-wider">Value</label>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <code className="text-sm bg-gray-100 px-3 py-2 rounded-lg border flex-1 font-mono truncate">
                                                                        {record.value}
                                                                    </code>
                                                                    <button
                                                                        onClick={() => copyToClipboard(record.value)}
                                                                        className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg transition-colors"
                                                                    >
                                                                        <Copy className="w-4 h-4 text-gray-600" />
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-4 p-3 bg-blue-100 border border-blue-200 rounded-lg">
                                                <p className="text-sm text-blue-800">
                                                    <strong>Next Steps:</strong> After adding these DNS records, click "Verify" to confirm your domain setup. 
                                                    DNS changes can take up to 24 hours to propagate.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Placeholder components for other tabs
const RolesTab = () => (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md">
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-purple-100 to-purple-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <Shield className="w-10 h-10 text-purple-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Roles & Permissions</h2>
            <p className="text-gray-600 mb-4">Advanced role management features available in the full version.</p>
            <div className="bg-gradient-to-r from-purple-50 to-purple-100 border border-purple-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-purple-800">
                    Configure user roles, permissions, and access controls for your team members.
                </p>
            </div>
        </div>
    </div>
);

const TeamTab = () => (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md">
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-green-100 to-green-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <UsersIcon className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Team Management</h2>
            <p className="text-gray-600 mb-4">Invite and manage team members with different access levels.</p>
            <div className="bg-gradient-to-r from-green-50 to-green-100 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-green-800">
                    Add team members, assign roles, and manage user permissions across your organization.
                </p>
            </div>
        </div>
    </div>
);

const HelpdeskTab = () => (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-md">
        <div className="text-center py-12">
            <div className="w-20 h-20 bg-gradient-to-br from-orange-100 to-orange-200 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <LifeBuoy className="w-10 h-10 text-orange-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Helpdesk Configuration</h2>
            <p className="text-gray-600 mb-4">Configure automated responses, SLA settings, and ticket routing.</p>
            <div className="bg-gradient-to-r from-orange-50 to-orange-100 border border-orange-200 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-orange-800">
                    Set up business hours, auto-responses, escalation rules, and customer satisfaction surveys.
                </p>
            </div>
        </div>
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
        <div data-testid="webhooks-section" className="space-y-6">
            <div className="bg-white border-2 border-gray-200 rounded-xl shadow-md">
                <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                    <h2 className="text-2xl font-bold text-gray-900">Webhook URLs</h2>
                    <p className="text-sm text-gray-600 mt-1">Paste these URLs into your provider's webhook settings to ingest events.</p>
                </div>
                
                <div className="p-6 space-y-4">
                    {urls.map((w) => (
                        <div key={w.id} className="bg-gradient-to-r from-gray-50 to-gray-100 border-2 border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow" data-testid={`webhook-${w.id}`}>
                            <div className="flex items-start justify-between gap-4 flex-wrap">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-200 uppercase tracking-wider">
                                            {w.id}
                                        </span>
                                        <h3 className="text-lg font-bold text-gray-900">{w.label}</h3>
                                    </div>
                                    <div className="bg-white border border-gray-200 rounded-lg p-3 font-mono text-sm break-all text-gray-700">
                                        {w.url}
                                    </div>
                                </div>
                                <button 
                                    data-testid={`webhook-copy-${w.id}`} 
                                    onClick={() => copy(w.id, w.url)} 
                                    className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-4 py-2.5 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all flex items-center gap-2 flex-shrink-0"
                                >
                                    {copied === w.id ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />} 
                                    {copied === w.id ? "Copied" : "Copy"}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="px-6 pb-6">
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="font-semibold text-blue-900 mb-1">Webhook Setup Instructions</p>
                                <ul className="text-blue-800 space-y-1 text-xs">
                                    <li>• <strong>Resend:</strong> Add to Resend dashboard → Webhooks → Create webhook with "email.received" event</li>
                                    <li>• <strong>WhatsApp:</strong> Configure in Twilio Console → WhatsApp → Sandbox/Production settings</li>
                                    <li>• <strong>Voice:</strong> Set in Twilio Console → Phone Numbers → Configure webhook URL</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Settings;