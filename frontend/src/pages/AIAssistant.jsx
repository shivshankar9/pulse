import { useState } from "react";
import api from "../lib/api";
import { Sparkles, FileText, Target, Bot, Zap, Brain } from "lucide-react";
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
        { id: "nba", label: "Next Best Action", icon: Target, description: "Get AI recommendations for your pipeline" },
        { id: "summarize", label: "Summarize", icon: FileText, description: "Summarize calls, emails, and meetings" },
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
            <div className="p-4 sm:p-6 md:p-10 max-w-[1100px]" data-testid="assistant-page">
                {/* Enhanced Header */}
                <div className="mb-6 sm:mb-8">
                    <div className="bg-white border-b border-gray-200 shadow-md rounded-t-xl">
                        <div className="px-4 sm:px-6 py-4 sm:py-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-lg">
                                            <Bot className="w-5 h-5 sm:w-7 sm:h-7 text-white" />
                                        </div>
                                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent">
                                            AI Assistant
                                        </h1>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 sm:gap-3 ml-0 sm:ml-15">
                                        <span className="flex items-center gap-1.5 bg-white px-2 sm:px-3 py-1.5 rounded-full shadow-sm border border-purple-200 hover:shadow-md transition-shadow">
                                            <Brain className="w-3.5 h-3.5 text-purple-600" />
                                            <span className="font-semibold text-purple-700 text-xs sm:text-sm">Claude Sonnet 4.5</span>
                                        </span>
                                        <span className="flex items-center gap-1.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-2 sm:px-3 py-1.5 rounded-full shadow-lg">
                                            <Zap className="w-3.5 h-3.5" />
                                            <span className="font-medium text-xs">AI Powered</span>
                                        </span>
                                    </div>
                                    <p className="text-sm text-gray-600 mt-2 ml-0 sm:ml-15">Your intelligent sales agent on standby</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Mobile-Responsive Tab Navigation */}
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-1 bg-white rounded-xl border-2 border-gray-200 p-1 mb-6 shadow-sm">
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            data-testid={`assistant-tab-${t.id}`}
                            onClick={() => { setTab(t.id); setOutput(""); }}
                            className={`flex-1 px-4 py-3 sm:py-2 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all ${
                                tab === t.id 
                                    ? "bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md" 
                                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                            }`}
                        >
                            <t.icon className="w-4 h-4" />
                            <div className="text-left">
                                <div>{t.label}</div>
                                <div className={`text-xs ${tab === t.id ? 'text-purple-100' : 'text-gray-500'} hidden sm:block`}>
                                    {t.description}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>

                {/* Mobile-Responsive Content Area */}
                <div className="bg-white border-2 border-gray-200 rounded-xl p-4 sm:p-6 shadow-md">
                    {tab === "summarize" && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2">
                                    Paste Content to Summarize
                                </label>
                                <p className="text-xs text-gray-600 mb-3">
                                    Add call transcripts, email threads, meeting notes, or any text content
                                </p>
                                <textarea
                                    data-testid="assistant-summarize-input"
                                    rows={8} 
                                    value={text} 
                                    onChange={(e) => setText(e.target.value)}
                                    placeholder="Paste your content here..."
                                    className="w-full bg-white border-2 border-gray-200 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm shadow-sm hover:border-gray-300 transition-colors resize-none"
                                />
                            </div>
                        </div>
                    )}
                    
                    {tab === "nba" && (
                        <div className="space-y-4">
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                                <h3 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                                    <Target className="w-5 h-5" />
                                    Next Best Action Analysis
                                </h3>
                                <p className="text-sm text-purple-800">
                                    AI will analyze your live pipeline data and recommend the single highest-leverage action to take right now.
                                </p>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="text-lg font-bold text-gray-900">Pipeline</div>
                                    <div className="text-xs text-gray-600">Analyzes deals & stages</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="text-lg font-bold text-gray-900">Activities</div>
                                    <div className="text-xs text-gray-600">Reviews tasks & follow-ups</div>
                                </div>
                                <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                                    <div className="text-lg font-bold text-gray-900">Contacts</div>
                                    <div className="text-xs text-gray-600">Evaluates engagement</div>
                                </div>
                            </div>
                        </div>
                    )}
                    
                    <button
                        data-testid="assistant-run-btn"
                        onClick={run}
                        disabled={loading || (tab === "summarize" && !text.trim())}
                        className="w-full sm:w-auto bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold hover:from-purple-700 hover:to-pink-700 flex items-center justify-center gap-2 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                    >
                        <Sparkles className="w-5 h-5" />
                        {loading ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                Thinking...
                            </>
                        ) : (
                            `Run ${tab === 'nba' ? 'Analysis' : 'Summarizer'}`
                        )}
                    </button>
                </div>

                {/* Mobile-Responsive Output */}
                {output && (
                    <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-300 rounded-xl p-4 sm:p-6 mt-6 shadow-md" data-testid="assistant-output">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center shadow-sm">
                                <Bot className="w-5 h-5 text-white" />
                            </div>
                            <div>
                                <div className="font-semibold text-purple-900">AI Response</div>
                                <div className="text-xs text-purple-700">Claude Sonnet 4.5</div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg p-4 border border-purple-200 shadow-sm">
                            <pre className="text-sm whitespace-pre-wrap leading-relaxed text-gray-800 font-sans">
                                {output}
                            </pre>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AIAssistant;
