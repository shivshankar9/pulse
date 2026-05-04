import { useEffect, useState } from "react";
import api from "../lib/api";
import { TrendingUp, Users, ListTodo, Trophy, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const Stat = ({ label, value, sub, icon: Icon, accent }) => (
    <div className={`bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-all border-2 ${
        accent ? "border-blue-300 bg-gradient-to-br from-blue-50 to-indigo-50" : "border-gray-200"
    }`}>
        <div className="flex items-start justify-between mb-4">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-600">{label}</span>
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center shadow-sm ${
                accent ? "bg-gradient-to-br from-blue-600 to-indigo-600" : "bg-gray-100"
            }`}>
                <Icon className={`w-5 h-5 ${accent ? "text-white" : "text-gray-600"}`} strokeWidth={2.5} />
            </div>
        </div>
        <div className="text-3xl font-bold text-gray-900 mb-1">{value}</div>
        {sub && <div className="text-sm text-gray-600 font-medium">{sub}</div>}
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
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="p-6 md:p-10 max-w-[1400px]" data-testid="dashboard-page">
                {/* Enhanced Header */}
                <div className="mb-8">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-6 py-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                                            <TrendingUp className="w-7 h-7 text-white" />
                                        </div>
                                        <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            Dashboard
                                        </h1>
                                    </div>
                                    <p className="text-sm text-gray-600 ml-15">Your command center for business insights</p>
                                </div>
                                <button
                                    data-testid="dashboard-ask-ai-btn"
                                    onClick={askAI}
                                    disabled={insightLoading}
                                    className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 flex items-center gap-2 shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <Sparkles className="w-5 h-5" />
                                    {insightLoading ? "Thinking..." : "Ask AI: Next Move"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <Stat label="Pipeline value" value={fmt(stats?.pipeline_value)} sub={`${stats?.open_deals || 0} open deals`} icon={TrendingUp} accent />
                <Stat label="Won revenue" value={fmt(stats?.won_value)} sub={`${stats?.won_deals || 0} closed-won`} icon={Trophy} />
                <Stat label="Contacts" value={stats?.contacts_count || 0} sub="in your CRM" icon={Users} />
                <Stat label="Pending tasks" value={stats?.pending_tasks || 0} sub="awaiting action" icon={ListTodo} />
            </div>

            {/* AI insight panel */}
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-6 mb-6 shadow-md hover:shadow-lg transition-shadow" data-testid="ai-insight-panel">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-sm">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <span className="text-sm font-semibold text-purple-900">AI Recommendation</span>
                    </div>
                    <span className="text-xs font-medium text-purple-700 bg-purple-100 px-3 py-1 rounded-full">Claude Sonnet 4.5</span>
                </div>
                {insight ? (
                    <div className="bg-white rounded-lg p-4 border border-purple-200">
                        <pre className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 font-sans">{insight}</pre>
                    </div>
                ) : (
                    <p className="text-sm text-purple-800">
                        Click <span className="font-bold">"Ask AI"</span> to get the highest-leverage move based on your live pipeline.
                    </p>
                )}
            </div>

            {/* Pipeline by stage */}
            <div className="bg-white rounded-xl border-2 border-gray-200 p-6 shadow-md">
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-bold text-gray-900">Pipeline Breakdown</h2>
                    <a 
                        href="/app/pipeline" 
                        data-testid="dashboard-pipeline-link" 
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 hover:gap-2 transition-all"
                    >
                        View Kanban <ArrowRight className="w-4 h-4" />
                    </a>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
                    {["lead", "qualified", "proposal", "negotiation", "won", "lost"].map((s) => {
                        const v = stats?.by_stage?.[s] || { count: 0, value: 0 };
                        const colors = {
                            lead: "from-gray-50 to-gray-100 border-gray-300",
                            qualified: "from-blue-50 to-blue-100 border-blue-300",
                            proposal: "from-purple-50 to-purple-100 border-purple-300",
                            negotiation: "from-yellow-50 to-yellow-100 border-yellow-300",
                            won: "from-green-50 to-green-100 border-green-300",
                            lost: "from-red-50 to-red-100 border-red-300"
                        };
                        return (
                            <div key={s} className={`bg-gradient-to-br ${colors[s]} border-2 rounded-lg p-4 hover:shadow-md transition-shadow`}>
                                <div className="text-xs font-semibold uppercase tracking-wider text-gray-600 mb-2">{s}</div>
                                <div className="text-2xl font-bold text-gray-900 mb-1">{v.count}</div>
                                <div className="text-sm text-gray-600 font-medium">{fmt(v.value)}</div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    </div>
    );
};

export default Dashboard;
