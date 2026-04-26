import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../lib/api";
import { toast } from "sonner";
import { Mail, MessageCircle, Phone, Calendar, Shield, Users as UsersIcon, Plus, Trash2, Check, X, ShieldCheck, Key, Webhook, Copy } from "lucide-react";

const TABS = [
    { id: "integrations", label: "Integrations", icon: Key },
    { id: "roles", label: "Roles & Permissions", icon: Shield },
    { id: "team", label: "Team", icon: UsersIcon },
    { id: "webhooks", label: "Webhooks", icon: Webhook },
];

const Settings = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState("integrations");

    const can = (p) => (user?.permissions || []).includes(p);

    if (!can("settings.manage") && !can("roles.manage") && !can("users.manage")) {
        return (
            <div className="p-10" data-testid="settings-denied">
                <div className="bg-white border-2 border-ink p-8 max-w-md">
                    <Shield className="w-8 h-8 text-bad mb-4" />
                    <h1 className="font-heading font-black text-2xl tracking-tighter mb-2">Access denied</h1>
                    <p className="text-sm text-inkSecondary">Your role ({user?.role_label}) doesn't include settings access. Contact an admin to request access.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="settings-page">
            <div className="mb-8">
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// admin.console</div>
                <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Settings</h1>
                <p className="text-sm text-inkSecondary mt-2">Configure integrations, manage roles & permissions, and assign team access.</p>
            </div>

            <div className="flex gap-px bg-ink border border-ink mb-6 w-fit flex-wrap">
                {TABS.map((t) => (
                    <button
                        key={t.id}
                        data-testid={`settings-tab-${t.id}`}
                        onClick={() => setTab(t.id)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${tab === t.id ? "bg-brand text-white" : "bg-white text-ink hover:bg-bg"}`}
                    >
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            {tab === "integrations" && <IntegrationsTab />}
            {tab === "roles" && <RolesTab />}
            {tab === "team" && <TeamTab />}
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

    const load = async () => {
        try {
            const [u, r] = await Promise.all([api.get("/users"), api.get("/roles")]);
            setUsers(u.data); setRoles(r.data);
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

    return (
        <div data-testid="team-section">
            <h2 className="font-heading font-black text-2xl tracking-tighter mb-4">Team members ({users.length})</h2>
            <div className="bg-white border-2 border-ink overflow-x-auto">
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
            <div className="mt-4 bg-bg border-l-2 border-brand p-3 text-xs text-inkSecondary">
                <span className="font-bold text-ink">Tip:</span> have new teammates register at <span className="font-mono">/auth</span>, then assign their role here. Email-invite flow coming soon.
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
