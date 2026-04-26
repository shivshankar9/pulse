import { useState } from "react";
import api from "../lib/api";
import { Sparkles, FileText, Target } from "lucide-react";
import { toast } from "sonner";

const AIAssistant = () => {
    const [tab, setTab] = useState("nba");
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [output, setOutput] = useState("");

    const run = async () => {
        setLoading(true); setOutput("");
        try {
            if (tab === "summarize") {
                const { data } = await api.post("/ai/summarize", { text });
                setOutput(data.summary);
            } else if (tab === "nba") {
                const { data } = await api.post("/ai/next-best-action", {});
                setOutput(data.recommendation);
            }
        } catch (err) {
            toast.error("AI failed: " + (err.response?.data?.detail || ""));
        }
        setLoading(false);
    };

    const tabs = [
        { id: "nba", label: "Next best action", icon: Target },
        { id: "summarize", label: "Summarize", icon: FileText },
    ];

    return (
        <div className="p-6 md:p-10 max-w-[1100px]" data-testid="assistant-page">
            <div className="mb-8">
                <div className="text-[11px] font-mono uppercase tracking-[0.3em] text-inkSecondary mb-2">// agent.console</div>
                <h1 className="font-heading font-black text-4xl md:text-5xl tracking-tighter">AI Assistant</h1>
                <p className="text-sm text-inkSecondary mt-2">Powered by Claude Sonnet 4.5 — your sales agent on standby.</p>
            </div>

            <div className="flex gap-px bg-ink border border-ink mb-6 w-fit">
                {tabs.map((t) => (
                    <button
                        key={t.id}
                        data-testid={`assistant-tab-${t.id}`}
                        onClick={() => { setTab(t.id); setOutput(""); }}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${tab === t.id ? "bg-brand text-white" : "bg-white text-ink hover:bg-bg"}`}
                    >
                        <t.icon className="w-3.5 h-3.5" /> {t.label}
                    </button>
                ))}
            </div>

            <div className="bg-white border-2 border-ink p-5">
                {tab === "summarize" && (
                    <>
                        <label className="text-[11px] font-bold uppercase tracking-widest text-inkSecondary block mb-2">Paste a call transcript or email thread</label>
                        <textarea
                            data-testid="assistant-summarize-input"
                            rows={8} value={text} onChange={(e) => setText(e.target.value)}
                            className="w-full bg-bg border-2 border-ink px-3 py-2 outline-none focus:border-brand text-sm resize-none mb-3"
                        />
                    </>
                )}
                {tab === "nba" && (
                    <p className="text-sm text-inkSecondary mb-3">Analyze your live pipeline and tell me the single highest-leverage action right now.</p>
                )}
                <button
                    data-testid="assistant-run-btn"
                    onClick={run}
                    disabled={loading || (tab === "summarize" && !text)}
                    className="bg-brand text-white px-5 py-3 text-xs font-bold uppercase tracking-widest flex items-center gap-2 brutal-shadow hover:bg-ink transition-all disabled:opacity-50"
                >
                    <Sparkles className="w-4 h-4" /> {loading ? "Thinking…" : "Run agent"}
                </button>
            </div>

            {output && (
                <div className="bg-brand/10 border-2 border-brand p-5 mt-6 animate-fade-in" data-testid="assistant-output">
                    <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-widest mb-3">
                        <span className="w-1.5 h-1.5 bg-brand inline-block animate-pulse"></span>
                        agent_response // claude-sonnet-4.5
                    </div>
                    <pre className="font-mono text-sm whitespace-pre-wrap leading-relaxed text-ink">{output}</pre>
                </div>
            )}
        </div>
    );
};

export default AIAssistant;
