import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ArrowRight, CheckCircle2 } from "lucide-react";

const AcceptInvite = () => {
    const [params] = useSearchParams();
    const navigate = useNavigate();
    const { fetchMe } = useAuth();
    const token = params.get("token");
    const [invite, setInvite] = useState(null);
    const [error, setError] = useState("");
    const [name, setName] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!token) { setError("Missing token"); return; }
        api.get(`/invitations/check/${token}`)
            .then(r => setInvite(r.data))
            .catch(e => setError(e.response?.data?.detail || "Invalid invite"));
    }, [token]);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const { data } = await api.post("/invitations/accept", { token, name, password });
            localStorage.setItem("pulse_token", data.token);
            toast.success("Welcome to the team");
            window.location.href = "/app";
        } catch (err) {
            toast.error(err.response?.data?.detail || "Accept failed");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-bg flex items-center justify-center p-6" data-testid="accept-invite-page">
            <div className="w-full max-w-md">
                <Link to="/" className="font-heading font-black text-xl flex items-center gap-2 mb-8">
                    <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM
                </Link>
                {error ? (
                    <div className="bg-white border-2 border-bad p-6">
                        <h1 className="font-heading font-black text-2xl tracking-tighter mb-2">Invitation issue</h1>
                        <p className="text-sm text-inkSecondary">{error}</p>
                    </div>
                ) : invite ? (
                    <>
                        <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// invitation</div>
                        <h1 className="font-heading font-black text-4xl tracking-tighter mb-2">Join the team</h1>
                        <p className="text-sm text-inkSecondary mb-6">
                            You've been invited as <span className="font-bold text-ink">{invite.role}</span>.
                            Sign up with <span className="font-mono text-ink">{invite.email}</span>.
                        </p>
                        <form onSubmit={submit} className="bg-white border-2 border-ink p-6 space-y-4 brutal-shadow" data-testid="accept-invite-form">
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Full name</label>
                                <input data-testid="invite-name" required value={name} onChange={(e) => setName(e.target.value)} className="w-full bg-bg border-2 border-ink px-3 py-3 outline-none focus:border-brand text-sm" />
                            </div>
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Password</label>
                                <input data-testid="invite-password" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full bg-bg border-2 border-ink px-3 py-3 outline-none focus:border-brand text-sm" />
                            </div>
                            <button data-testid="invite-submit" type="submit" disabled={loading} className="w-full bg-brand text-white px-5 py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 brutal-shadow hover:bg-ink transition-all disabled:opacity-50">
                                {loading ? "…" : "Accept & join"} <ArrowRight className="w-4 h-4" />
                            </button>
                        </form>
                    </>
                ) : (
                    <div className="text-sm text-inkSecondary font-mono">LOADING…</div>
                )}
            </div>
        </div>
    );
};

export default AcceptInvite;
