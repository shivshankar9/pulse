import { useEffect, useState } from "react";
import api from "../lib/api";
import { TrendingUp, Users, ListTodo, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Stat = ({ label, value, sub, icon: Icon, accent }) => (
    <div className={`bg-white border-2 border-ink p-5 brutal-hover ${accent ? "border-brand" : ""}`}>
        <div className="flex items-start justify-between mb-6">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-inkSecondary">{label}</span>
            <Icon className={`w-4 h-4 ${accent ? "text-brand" : "text-ink"}`} strokeWidth={2.5} />
        </div>
        <div className="font-heading font-black text-4xl tracking-tighter">{value}</div>
        {sub && <div className="text-xs font-mono text-inkSecondary mt-2 uppercase tracking-widest">{sub}</div>}
    </div>
);

const Dashboard = () => {
    const [stats, setStats] = useState(null);
    const [insight, setInsight] = useState("");
    const [insightLoading, setInsightLoading] = useState(false);

    const load = async () => {
        try {
            const { data } = await api.get("/dashboard/stats");
            setStats(data);
        } catch { /* ignore */ }
    };

    useEffect(() => { load(); }, []);

    const askAI = async () => {
        setInsightLoading(true);
        try {
            const { data } = await api.post("/ai/next-best-action", {});
            setInsight(data.recommendation);
        } catch (err) {
            toast.error("AI failed: " + (err.response?.data?.detail || ""));
        }
        setInsightLoading(false);
    };

    const fmt = (n) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n || 0);

    return (
        <div className="p-6 md:p-10 max-w-[1400px]" data-testid="dashboard-page">
            <div className="flex items-end justify-between mb-8 flex-wrap gap-4">
                <div>
                    <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// command center</div>
                    <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">Dashboard</h1>
                </div>
                <button
                    data-testid="dashboard-ask-ai-btn"
                    onClick={askAI}
                    disabled={insightLoading}
                    className="bg-ink text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-brand transition-all disabled:opacity-50"
                >
                    <Sparkles className="w-4 h-4" /> {insightLoading ? "Thinking…" : "Ask agent: next move"}
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat label="Pipeline value" value={fmt(stats?.pipeline_value)} sub={`${stats?.open_deals || 0} open deals`} icon={TrendingUp} accent />
                <Stat label="Won revenue" value={fmt(stats?.won_value)} sub={`${stats?.won_deals || 0} closed-won`} icon={Trophy} />
                <Stat label="Contacts" value={stats?.contacts_count || 0} sub="in your CRM" icon={Users} />
                <Stat label="Pending tasks" value={stats?.pending_tasks || 0} sub="awaiting action" icon={ListTodo} />
            </div>

            {/* AI insight panel */}
            <div className="bg-brand/10 border-2 border-brand p-6 mb-6 relative" data-testid="ai-insight-panel">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 bg-brand inline-block animate-pulse"></span>
                        agent_04 // next_best_action
                    </div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-inkSecondary">claude-sonnet-4.5</span>
                </div>
                {insight ? (
                    <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-ink">{insight}</pre>
                ) : (
                    <p className="text-sm text-inkSecondary">Click <span className="font-bold text-ink">"Ask agent"</span> to get the highest-leverage move based on your live pipeline.</p>
                )}
            </div>

            {/* Pipeline by stage */}
            <div className="bg-white border-2 border-ink p-6">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="font-heading font-black text-2xl tracking-tighter">Pipeline breakdown</h2>
                    <a href="/app/pipeline" data-testid="dashboard-pipeline-link" className="text-xs font-bold uppercase tracking-widest hover:text-brand inline-flex items-center gap-1">View Kanban <ArrowRight className="w-3 h-3" /></a>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-px bg-ink border border-ink">
                    {["lead", "qualified", "proposal", "negotiation", "won", "lost"].map((s) => {
                        const v = stats?.by_stage?.[s] || { count: 0, value: 0 };
                        return (
                            <div key={s} className="bg-white p-4">
                                <div className="text-[10px] font-bold uppercase tracking-widest text-inkSecondary">{s}</div>
                                <div className="font-heading font-black text-2xl mt-2">{v.count}</div>
                                <div className="font-mono text-xs text-inkSecondary mt-1">{fmt(v.value)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Dashboard;
