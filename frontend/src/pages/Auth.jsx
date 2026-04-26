import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

const Auth = () => {
    const [params] = useSearchParams();
    const [mode, setMode] = useState(params.get("mode") === "register" ? "register" : "login");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);
    const { login, register, user } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (user) navigate("/app");
    }, [user, navigate]);

    const submit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (mode === "login") await login(email, password);
            else await register(email, password, name);
            toast.success(mode === "login" ? "Welcome back" : "Account created");
            navigate("/app");
        } catch (err) {
            toast.error(err.response?.data?.detail || "Something went wrong");
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-bg" data-testid="auth-page">
            {/* Left visual */}
            <div className="relative hidden lg:flex bg-ink text-bg p-10 flex-col justify-between overflow-hidden grain">
                <Link to="/" className="font-heading font-black text-xl flex items-center gap-2">
                    <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM
                </Link>
                <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-bg/60 mb-4">// agent feed</div>
                    <h2 className="font-heading font-black text-5xl tracking-tighter leading-[0.95]">
                        The CRM<br/>that <span className="text-brand">closes</span><br/>with you.
                    </h2>
                    <div className="mt-10 space-y-3 max-w-md">
                        {[
                            "AGENT_01 → scored 14 leads (+3 hot)",
                            "AGENT_02 → drafted follow-up to Acme",
                            "AGENT_04 → next move: call Oren today",
                        ].map((l) => (
                            <div key={l} className="font-mono text-[12px] uppercase tracking-widest border-l-2 border-brand pl-3">
                                {l}
                            </div>
                        ))}
                    </div>
                </div>
                <div className="font-mono text-[10px] uppercase tracking-widest text-bg/60">v1.0 / brutalist edition</div>
            </div>

            {/* Right form */}
            <div className="flex items-center justify-center p-6 lg:p-12">
                <div className="w-full max-w-md">
                    <div className="lg:hidden mb-8">
                        <Link to="/" className="font-heading font-black text-xl flex items-center gap-2">
                            <span className="inline-block w-3 h-3 bg-brand"></span> PULSE/CRM
                        </Link>
                    </div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-inkSecondary mb-2">
                        {mode === "login" ? "// access terminal" : "// new operator"}
                    </div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter mb-2">
                        {mode === "login" ? "Sign in" : "Create account"}
                    </h1>
                    <p className="text-sm text-inkSecondary mb-8">
                        {mode === "login" ? "Welcome back, operator." : "Fresh CRM, zero clutter."}
                    </p>

                    <form onSubmit={submit} className="space-y-4" data-testid="auth-form">
                        {mode === "register" && (
                            <div>
                                <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Full name</label>
                                <input
                                    data-testid="auth-name-input"
                                    type="text" required value={name} onChange={(e) => setName(e.target.value)}
                                    className="w-full bg-white border-2 border-ink px-3 py-3 outline-none focus:border-brand text-sm"
                                />
                            </div>
                        )}
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Email</label>
                            <input
                                data-testid="auth-email-input"
                                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-white border-2 border-ink px-3 py-3 outline-none focus:border-brand text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-1">Password</label>
                            <input
                                data-testid="auth-password-input"
                                type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-white border-2 border-ink px-3 py-3 outline-none focus:border-brand text-sm"
                            />
                        </div>
                        <button
                            data-testid="auth-submit-btn"
                            type="submit" disabled={loading}
                            className="w-full bg-brand text-white px-6 py-3 font-bold uppercase tracking-widest text-sm flex items-center justify-center gap-2 brutal-shadow hover:bg-ink hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[6px_6px_0_0_rgba(10,10,10,1)] transition-all disabled:opacity-50"
                        >
                            {loading ? "…" : (mode === "login" ? "Sign in" : "Create account")}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    </form>

                    <div className="mt-6 text-sm text-inkSecondary text-center">
                        {mode === "login" ? (
                            <>No account? <button data-testid="auth-toggle-register" onClick={() => setMode("register")} className="font-bold text-ink underline underline-offset-4 hover:text-brand">Create one</button></>
                        ) : (
                            <>Already have an account? <button data-testid="auth-toggle-login" onClick={() => setMode("login")} className="font-bold text-ink underline underline-offset-4 hover:text-brand">Sign in</button></>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Auth;
