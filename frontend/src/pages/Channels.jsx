import { useEffect, useState } from "react";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { Mail, MessageCircle, Phone, MessageSquare, Copy, Check } from "lucide-react";
import { toast } from "sonner";

const CHANNELS = [
    { id: "email", label: "Email", icon: Mail, desc: "Receive support emails as tickets. Connect via SMTP/Resend." },
    { id: "whatsapp", label: "WhatsApp", icon: MessageCircle, desc: "Chat with customers on WhatsApp Business via Twilio." },
    { id: "calls", label: "Voice Calls", icon: Phone, desc: "Log inbound/outbound calls and recordings via Twilio Voice." },
    { id: "chat", label: "Live Chat", icon: MessageSquare, desc: "Embed a chat widget on your site. Tickets land here." },
];

const Channels = () => {
    const { user } = useAuth();
    const [configs, setConfigs] = useState({});
    const [copied, setCopied] = useState(false);

    const load = async () => {
        const { data } = await api.get("/channels");
        const map = {};
        data.forEach((c) => { map[c.channel] = c; });
        setConfigs(map);
    };
    useEffect(() => { load(); }, []);

    const toggle = async (channel) => {
        const current = configs[channel] || { enabled: false, config: {} };
        try {
            await api.put("/channels", { channel, enabled: !current.enabled, config: current.config || {} });
            toast.success(`${channel} ${!current.enabled ? "enabled" : "disabled"}`);
            load();
        } catch (err) {
            toast.error("Update failed");
        }
    };

    const portalUrl = `${window.location.origin}/support?to=${encodeURIComponent(user?.email || "")}`;

    const copyPortal = () => {
        navigator.clipboard.writeText(portalUrl);
        setCopied(true);
        toast.success("Copied portal link");
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="channels-page">
            <div className="mb-8">
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// integrations.channels</div>
                <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Channels</h1>
                <p className="text-sm text-inkSecondary mt-2">Unify support across email, chat, WhatsApp and calls. All conversations land in your ticket queue.</p>
            </div>

            {/* Portal share card */}
            <div className="bg-brand/10 border-2 border-brand p-5 mb-6" data-testid="portal-card">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                        <div className="text-[11px] font-mono uppercase tracking-widest mb-1 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-brand inline-block"></span> public_portal // live
                        </div>
                        <h3 className="font-heading font-black text-xl tracking-tighter">Your support portal</h3>
                        <p className="text-sm text-inkSecondary mt-1">Share this link with customers. Submissions land directly in your ticket queue.</p>
                    </div>
                </div>
                <div className="mt-4 flex gap-2">
                    <input data-testid="portal-url-input" readOnly value={portalUrl} className="flex-1 bg-white border-2 border-ink px-3 py-2 font-mono text-xs outline-none" />
                    <button data-testid="portal-copy-btn" onClick={copyPortal} className="bg-ink text-white px-4 text-xs font-bold uppercase tracking-widest hover:bg-brand flex items-center gap-2">
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />} {copied ? "Copied" : "Copy"}
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {CHANNELS.map((ch) => {
                    const cfg = configs[ch.id];
                    const enabled = cfg?.enabled;
                    return (
                        <div key={ch.id} data-testid={`channel-card-${ch.id}`} className="bg-white border-2 border-ink p-5">
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 grid place-items-center border-2 border-ink ${enabled ? "bg-brand text-white border-brand" : "bg-bg"}`}>
                                        <ch.icon className="w-5 h-5" strokeWidth={2.5} />
                                    </div>
                                    <div>
                                        <div className="font-heading font-black text-xl tracking-tighter">{ch.label}</div>
                                        <div className={`text-[10px] font-mono uppercase tracking-widest ${enabled ? "text-ok" : "text-inkSecondary"}`}>
                                            ● {enabled ? "connected" : "not connected"}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    data-testid={`channel-toggle-${ch.id}`}
                                    onClick={() => toggle(ch.id)}
                                    className={`px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest border-2 ${enabled ? "bg-ink text-white border-ink" : "bg-white text-ink border-ink hover:bg-brand hover:text-white hover:border-brand"}`}
                                >
                                    {enabled ? "Disable" : "Enable"}
                                </button>
                            </div>
                            <p className="text-sm text-inkSecondary">{ch.desc}</p>
                            {enabled && (
                                <div className="mt-3 bg-bg border-l-2 border-brand p-3 font-mono text-[11px] uppercase tracking-widest text-inkSecondary">
                                    Webhook URL: <span className="text-ink">/api/webhooks/{ch.id}</span> (configure in your provider)
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 bg-white border-2 border-ink p-5 text-sm text-inkSecondary" data-testid="channels-keys-note">
                <div className="text-[11px] font-mono uppercase tracking-widest text-ink mb-2">// next steps</div>
                Live channel connections require API keys (Resend / Twilio / Meta WhatsApp Business). Toggle a channel "on" to mark intent — your operator can then add keys in <span className="text-ink font-bold">Settings → API Keys</span> to activate ingestion.
            </div>
        </div>
    );
};

export default Channels;
