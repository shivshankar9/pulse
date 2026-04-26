import { useEffect, useState } from "react";
import api from "../lib/api";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";

const Emails = () => {
    const [emails, setEmails] = useState([]);
    const [contacts, setContacts] = useState([]);
    const [form, setForm] = useState({ contact_id: "", to: "", subject: "", body: "" });
    const [drafting, setDrafting] = useState(false);
    const [intent, setIntent] = useState("");

    const load = async () => {
        const [e, c] = await Promise.all([api.get("/emails"), api.get("/contacts")]);
        setEmails(e.data); setContacts(c.data);
    };
    useEffect(() => { load(); }, []);

    const onSelectContact = (id) => {
        const c = contacts.find((x) => x.id === id);
        setForm({ ...form, contact_id: id, to: c?.email || form.to });
    };

    const draft = async () => {
        if (!intent) { toast.error("Describe the intent first"); return; }
        setDrafting(true);
        try {
            const { data } = await api.post("/ai/draft-email", { contact_id: form.contact_id || null, intent });
            setForm({ ...form, subject: data.subject, body: data.body });
            toast.success("Draft generated");
        } catch (err) {
            toast.error("Draft failed: " + (err.response?.data?.detail || ""));
        }
        setDrafting(false);
    };

    const send = async (e) => {
        e.preventDefault();
        try {
            await api.post("/emails", { ...form, contact_id: form.contact_id || null });
            toast.success("Email logged");
            setForm({ contact_id: "", to: "", subject: "", body: "" });
            setIntent("");
            load();
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed");
        }
    };

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="emails-page">
            <div className="mb-8">
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// outreach.log</div>
                <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Emails</h1>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Composer */}
                <form onSubmit={send} className="bg-white border-2 border-ink p-5 space-y-3" data-testid="email-composer">
                    <h2 className="font-heading font-black text-2xl tracking-tighter">Compose</h2>
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Contact</label>
                        <select data-testid="email-contact-select" value={form.contact_id} onChange={(e) => onSelectContact(e.target.value)} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm">
                            <option value="">— select —</option>
                            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">To *</label>
                        <input data-testid="email-to-input" type="email" required value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    </div>
                    <div className="bg-brand/10 border-2 border-brand p-3">
                        <div className="text-[10px] font-mono uppercase tracking-widest mb-2 flex items-center gap-2"><Sparkles className="w-3 h-3" /> agent_02 // drafting</div>
                        <div className="flex gap-2">
                            <input data-testid="email-intent-input" placeholder="Intent: e.g. follow up after demo" value={intent} onChange={(e) => setIntent(e.target.value)} className="flex-1 bg-white border-2 border-ink px-3 py-2 outline-none focus:border-ink text-sm" />
                            <button data-testid="email-draft-btn" type="button" onClick={draft} disabled={drafting} className="bg-ink text-white px-4 py-2 text-xs font-bold uppercase tracking-widest hover:bg-brand transition-colors disabled:opacity-50">{drafting ? "…" : "Draft"}</button>
                        </div>
                    </div>
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Subject *</label>
                        <input data-testid="email-subject-input" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                    </div>
                    <div>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Body *</label>
                        <textarea data-testid="email-body-input" required rows={10} value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                    </div>
                    <button data-testid="email-send-btn" type="submit" className="w-full bg-brand text-white px-5 py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 brutal-shadow hover:bg-ink transition-all">
                        <Send className="w-4 h-4" /> Log send
                    </button>
                </form>

                {/* Log */}
                <div className="bg-white border-2 border-ink">
                    <div className="p-5 border-b-2 border-ink">
                        <h2 className="font-heading font-black text-2xl tracking-tighter">Sent log</h2>
                    </div>
                    <div className="max-h-[700px] overflow-y-auto">
                        {emails.length === 0 ? (
                            <div className="p-12 text-center text-inkSecondary text-sm">No sent emails yet.</div>
                        ) : emails.map((m) => (
                            <div key={m.id} data-testid={`email-row-${m.id}`} className="border-b border-line p-4 hover:bg-bg">
                                <div className="flex justify-between items-start mb-1">
                                    <div className="font-bold text-sm">{m.subject}</div>
                                    <span className="font-mono text-[10px] text-inkSecondary uppercase">{new Date(m.sent_at).toLocaleDateString()}</span>
                                </div>
                                <div className="text-xs text-inkSecondary font-mono">→ {m.to}</div>
                                <div className="text-xs text-inkSecondary mt-2 line-clamp-2 whitespace-pre-wrap">{m.body}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Emails;
