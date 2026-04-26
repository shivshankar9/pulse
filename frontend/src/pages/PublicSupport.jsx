import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import api from "../lib/api";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const PublicSupport = () => {
    const [params] = useSearchParams();
    const initialEmail = params.get("to") || "";
    const [form, setForm] = useState({
        workspace_email: initialEmail,
        subject: "",
        description: "",
        requester_name: "",
        requester_email: "",
    });
    const [submitted, setSubmitted] = useState(false);
    const [loading, setLoading] = useState(false);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await api.post("/public/tickets", form);
            setSubmitted(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to submit");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6" data-testid="public-support-page">
            <div className="w-full max-w-xl">
                <div className="font-heading font-black text-xl mb-8 flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM <span className="text-inkSecondary text-sm">/ support</span>
                </div>

                {submitted ? (
                    <div className="bg-white border-2 border-ink p-8 brutal-shadow text-center" data-testid="ticket-success">
                        <CheckCircle2 className="w-12 h-12 text-ok mx-auto mb-4" />
                        <h1 className="font-heading font-black text-3xl tracking-tighter mb-2">Ticket received</h1>
                        <p className="text-sm text-inkSecondary mb-6">We'll get back to you at <span className="font-mono text-ink">{form.requester_email}</span> shortly.</p>
                        <button onClick={() => { setSubmitted(false); setForm({ ...form, subject: "", description: "" }); }} className="border-2 border-ink px-5 py-2 text-xs font-bold uppercase tracking-widest hover:bg-ink hover:text-white">Submit another</button>
                    </div>
                ) : (
                    <>
                        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// support.portal</div>
                        <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mb-2">How can we help?</h1>
                        <p className="text-sm text-inkSecondary mb-8">Submit a ticket and we'll route it to the right person on the team.</p>
                        <form onSubmit={submit} className="bg-white border-2 border-ink p-6 space-y-4 brutal-shadow" data-testid="public-ticket-form">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Workspace email *</label>
                                <input data-testid="public-workspace-email" type="email" required value={form.workspace_email} onChange={(e) => setForm({ ...form, workspace_email: e.target.value })} placeholder="team@yourcompany.com" className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                                <div className="text-[10px] font-mono uppercase tracking-widest text-inkSecondary mt-1">the operator's CRM email</div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Your name *</label>
                                    <input data-testid="public-requester-name" required value={form.requester_name} onChange={(e) => setForm({ ...form, requester_name: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                                </div>
                                <div>
                                    <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Your email *</label>
                                    <input data-testid="public-requester-email" type="email" required value={form.requester_email} onChange={(e) => setForm({ ...form, requester_email: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Subject *</label>
                                <input data-testid="public-subject" required value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Describe the issue *</label>
                                <textarea data-testid="public-description" required rows={5} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none" />
                            </div>
                            <button data-testid="public-submit-btn" type="submit" disabled={loading} className="w-full bg-brand text-white px-5 py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 brutal-shadow hover:bg-ink transition-all disabled:opacity-50">
                                {loading ? "Submitting…" : "Submit ticket"} <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
};

export default PublicSupport;
