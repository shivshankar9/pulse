import { useEffect, useState } from "react";
import { toast } from "sonner";
import { BookOpen, Check, Copy, Loader2, PlugZap, RadioTower, ShieldCheck, Save } from "lucide-react";
import api from "../../lib/api";

const PROVIDERS = [
  { id: "twilio", name: "Twilio", tagline: "Fastest setup · browser softphone · global numbers", fields: [
    ["account_sid", "Account SID", "Starts with AC — Console → Account info"],
    ["auth_token", "Auth Token", "Console → Account info (keep secret)", true],
    ["phone_number", "Twilio phone number", "E.164, e.g. +14155550123"],
    ["api_key_sid", "API Key SID (softphone)", "Starts with SK — Console → API keys & tokens"],
    ["api_key_secret", "API Key Secret (softphone)", "Shown once when the key is created", true],
    ["twiml_app_sid", "TwiML App SID (softphone)", "Starts with AP — Voice → TwiML apps"],
  ] },
  { id: "telnyx", name: "Telnyx", tagline: "Lower per-minute pricing · Call Control API", fields: [
    ["api_key", "API Key", "Mission Control → API Keys", true],
    ["connection_id", "Voice API Application ID", "Voice → Programmable Voice → your application"],
    ["phone_number", "Telnyx phone number", "E.164, assigned to the application"],
    ["public_key", "Account Public Key", "Keys & Credentials → Public Key (webhook signing)"],
  ] },
  { id: "plivo", name: "Plivo", tagline: "Simple XML model · competitive pricing", fields: [
    ["auth_id", "Auth ID", "Console → Account → API Keys"],
    ["auth_token", "Auth Token", "Console → Account → API Keys", true],
    ["phone_number", "Plivo phone number", "E.164, attached to your Voice application"],
  ] },
];

function CopyRow({ label, value }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => { await navigator.clipboard.writeText(value); setCopied(true); setTimeout(() => setCopied(false), 1500); };
  return <div className="rounded-xl border border-border bg-bg p-3"><p className="text-[10px] font-bold uppercase tracking-wider text-inkSecondary">{label}</p><div className="mt-1 flex min-w-0 items-center gap-2"><code className="min-w-0 flex-1 truncate font-mono text-[11px]" title={value}>{value}</code><button onClick={copy} className="icon-button shrink-0" aria-label={`Copy ${label}`} data-testid={`copy-${label.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>{copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}</button></div></div>;
}

export function TelephonySettings({ flows = [], onSaved }) {
  const [settings, setSettings] = useState(null);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);

  const load = async () => {
    const { data } = await api.get("/voice/settings");
    setSettings(data);
    setForm({ provider: data.provider || "none", credentials: { ...(data.credentials || {}) }, agent_fallback_number: data.agent_fallback_number || "", sip_transfer_domain: data.sip_transfer_domain || "", record_calls: data.record_calls ?? true, softphone_enabled: data.softphone_enabled ?? true, verify_signatures: data.verify_signatures ?? true, default_flow_id: data.default_flow_id || "", auto_ticket_missed: data.auto_ticket_missed ?? true, auto_ticket_voicemail: data.auto_ticket_voicemail ?? true });
  };
  useEffect(() => { load().catch(() => toast.error("Unable to load telephony settings")); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const { data } = await api.put("/voice/settings", { ...form, default_flow_id: form.default_flow_id || null, agent_fallback_number: form.agent_fallback_number || null, sip_transfer_domain: form.sip_transfer_domain || null });
      setSettings(data); setForm((f) => ({ ...f, credentials: { ...data.credentials } }));
      toast.success(data.provider_ready ? "Telephony connected — real calls are enabled" : "Settings saved");
      onSaved?.(data);
    } catch (error) { toast.error(error.response?.data?.detail || "Could not save settings"); }
    setSaving(false);
  };
  const test = async () => {
    setTesting(true); setTestResult(null);
    try { const { data } = await api.post("/voice/settings/test"); setTestResult(data); toast.success("Provider credentials verified"); }
    catch (error) { setTestResult({ ok: false, error: error.response?.data?.detail || "Test failed" }); toast.error(error.response?.data?.detail || "Provider test failed"); }
    setTesting(false);
  };

  if (!form) return <div className="grid min-h-[300px] place-items-center text-sm text-inkSecondary"><Loader2 className="mr-2 size-4 animate-spin" />Loading telephony…</div>;
  const provider = PROVIDERS.find((p) => p.id === form.provider);
  const setCred = (key, value) => setForm({ ...form, credentials: { ...form.credentials, [key]: value } });

  return <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_380px]" data-testid="telephony-settings">
    <div className="rounded-2xl border border-border bg-surface p-5 md:p-7">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><h2 className="font-heading text-2xl font-black">Connect a carrier</h2><p className="mt-1 max-w-xl text-xs leading-5 text-inkSecondary">Your IVR engine runs here. A carrier only bridges calls to the public phone network — pick one, paste the credentials from its console, then point its webhooks at the URLs on the right.</p></div><span className={`inline-flex items-center gap-2 rounded-full px-3 py-2 text-[10px] font-bold uppercase tracking-wider ${settings?.provider_ready ? "border border-emerald-200 bg-emerald-50 text-emerald-700" : "border border-amber-200 bg-amber-50 text-amber-700"}`} data-testid="telephony-status-pill"><span className={`size-2 rounded-full ${settings?.provider_ready ? "bg-emerald-500" : "bg-amber-500"}`} />{settings?.provider_ready ? "Live calls enabled" : "Simulator only"}</span></div>
      <div className="mt-6 grid gap-3 md:grid-cols-3">{PROVIDERS.map((p) => <button key={p.id} onClick={() => setForm({ ...form, provider: p.id, credentials: settings?.provider === p.id ? { ...settings.credentials } : {} })} className={`rounded-2xl border p-4 text-left transition-colors ${form.provider === p.id ? "border-brand bg-brand/5" : "border-border bg-bg hover:border-ink/30"}`} data-testid={`provider-card-${p.id}`}><div className="flex items-center justify-between"><p className="text-sm font-bold">{p.name}</p>{form.provider === p.id && <Check className="size-4 text-brand" />}</div><p className="mt-1 text-[11px] leading-4 text-inkSecondary">{p.tagline}</p></button>)}</div>
      {provider ? <div className="mt-6 grid gap-4 md:grid-cols-2">{provider.fields.map(([key, label, help, secret]) => <label key={key} className="text-xs font-bold text-inkSecondary">{label}<input type={secret ? "password" : "text"} autoComplete="off" value={form.credentials[key] || ""} onChange={(e) => setCred(key, e.target.value)} className="field mt-1 font-mono" placeholder={help} data-testid={`cred-${key}`} /><span className="mt-1 block text-[10px] font-normal leading-4">{help}</span></label>)}</div> : <div className="mt-6 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-inkSecondary">Select a provider to enter credentials. Until then, the built-in simulator handles every call.</div>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <label className="text-xs font-bold text-inkSecondary">Agent fallback number<input value={form.agent_fallback_number} onChange={(e) => setForm({ ...form, agent_fallback_number: e.target.value })} className="field mt-1 font-mono" placeholder="+14155550999" data-testid="agent-fallback-input" /><span className="mt-1 block text-[10px] font-normal leading-4">Rings when a queue has no available agents or the softphone is offline.</span></label>
        <label className="text-xs font-bold text-inkSecondary">Default inbound flow<select value={form.default_flow_id} onChange={(e) => setForm({ ...form, default_flow_id: e.target.value })} className="field mt-1" data-testid="default-flow-select"><option value="">Use the published flow</option>{flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}</select></label>
        <label className="text-xs font-bold text-inkSecondary">SIP transfer domain (optional)<input value={form.sip_transfer_domain} onChange={(e) => setForm({ ...form, sip_transfer_domain: e.target.value })} className="field mt-1 font-mono" placeholder="pbx.yourcompany.com" data-testid="sip-domain-input" /><span className="mt-1 block text-[10px] font-normal leading-4">Lets queue members like “204” ring sip:204@your-pbx through the carrier.</span></label>
        <div className="grid gap-2 pt-1">{[["record_calls", "Record calls (dual channel)"], ["softphone_enabled", "Enable browser softphone (Twilio)"], ["verify_signatures", "Verify webhook signatures (recommended)"], ["auto_ticket_missed", "Auto-create a ticket for missed calls"], ["auto_ticket_voicemail", "Auto-create a ticket for voicemails"]].map(([key, label]) => <label key={key} className="flex items-center gap-3 rounded-xl border border-border bg-bg px-3 py-2 text-xs font-semibold"><input type="checkbox" checked={!!form[key]} onChange={(e) => setForm({ ...form, [key]: e.target.checked })} data-testid={`toggle-${key}`} />{label}</label>)}</div>
      </div>
      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-5">
        <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-50" data-testid="telephony-save-btn">{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}Save settings</button>
        <button onClick={test} disabled={testing || !settings?.provider_ready} className="btn-secondary disabled:opacity-40" data-testid="telephony-test-btn">{testing ? <Loader2 className="size-4 animate-spin" /> : <PlugZap className="size-4" />}Test connection</button>
        <a href="/docs/TELEPHONY_SETUP.md" target="_blank" rel="noreferrer" data-testid="setup-guide-link" className="ml-auto inline-flex items-center gap-2 text-xs font-bold text-brand"><BookOpen className="size-4" />Setup guide (README)</a>
      </div>
      {testResult && <div className={`mt-4 rounded-xl p-4 text-xs ${testResult.ok ? "bg-emerald-50 text-emerald-800" : "bg-red-50 text-red-700"}`} data-testid="telephony-test-result">{testResult.ok ? <><p className="font-bold">Connected to {testResult.provider}{testResult.account ? ` · ${testResult.account}` : ""}</p><p className="mt-1">Numbers on account: {testResult.numbers?.length ? testResult.numbers.join(", ") : "none found"} · {testResult.number_owned ? "your configured number is on this account ✓" : "configured number NOT found on this account — double-check it"}</p></> : <p className="font-bold">{testResult.error}</p>}</div>}
    </div>
    <aside className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface p-5"><div className="flex items-center gap-2"><RadioTower className="size-4 text-brand" /><p className="text-sm font-bold">Webhook URLs to paste into {provider?.name || "your carrier"}</p></div><p className="mt-1 text-xs leading-5 text-inkSecondary">These are unique to your workspace. They must be reachable over public HTTPS.</p><div className="mt-4 grid gap-2">{Object.entries(settings?.webhooks || {}).map(([label, url]) => <CopyRow key={label} label={label} value={url} />)}{!Object.keys(settings?.webhooks || {}).length && <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-inkSecondary">Save a provider to generate webhook URLs.</p>}</div></div>
      <div className="rounded-2xl border border-border bg-ink p-5 text-white"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 size-5 shrink-0" /><div><p className="text-sm font-bold">Credentials stay encrypted</p><p className="mt-1 text-xs leading-5 text-white/70">Secrets are encrypted at rest with your INTEGRATIONS_KEY and never sent to the browser. Every carrier webhook is signature-checked before the IVR engine acts.</p></div></div></div>
      {settings?.softphone_ready && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs text-emerald-800"><p className="font-bold">Softphone identity: <code className="font-mono">{settings.agent_identity}</code></p><p className="mt-1 leading-5">Add this identity (or your user) as a queue member so inbound calls ring in the browser.</p></div>}
    </aside>
  </section>;
}
