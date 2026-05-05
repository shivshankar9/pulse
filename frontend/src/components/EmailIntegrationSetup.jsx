import { useState } from "react";
import api from "../lib/api";
import { toast } from "sonner";
import {
    Mail, ArrowRight, Check, AlertCircle, Copy, Zap, 
    ExternalLink, ChevronDown, ChevronUp, Eye, EyeOff
} from "lucide-react";

const EmailIntegrationSetup = ({ onComplete }) => {
    const [step, setStep] = useState(0); // 0: choose, 1: config, 2: verify
    const [provider, setProvider] = useState("resend");
    const [loading, setLoading] = useState(false);
    const [config, setConfig] = useState({});
    const [testResult, setTestResult] = useState(null);
    const [showPassword, setShowPassword] = useState({});
    const [expandedDomain, setExpandedDomain] = useState(null);

    const PROVIDERS = [
        {
            id: "resend",
            name: "Resend",
            desc: "Cloud email (recommended for beginners)",
            icon: "🚀",
            fields: [
                { key: "api_key", label: "API Key", placeholder: "re_xxx", secret: true, help: "Get from resend.com/api-keys" },
                { key: "from_email", label: "From Email", placeholder: "support@yourcompany.com", help: "Your support email address" }
            ],
            difficulty: "Easy",
            setupTime: "2 min"
        },
        {
            id: "smtp",
            name: "Custom SMTP",
            desc: "Gmail, Outlook, or custom server",
            icon: "📧",
            fields: [
                { key: "host", label: "SMTP Host", placeholder: "smtp.gmail.com", help: "SMTP server address" },
                { key: "port", label: "Port", placeholder: "587", help: "Usually 587 or 465" },
                { key: "username", label: "Email/Username", placeholder: "your-email@domain.com" },
                { key: "password", label: "Password", placeholder: "••••", secret: true, help: "Use app password for Gmail" },
                { key: "from_email", label: "From Email", placeholder: "support@yourcompany.com" },
                { key: "from_name", label: "From Name", placeholder: "Support Team", help: "Display name in emails" }
            ],
            difficulty: "Medium",
            setupTime: "5 min"
        },
        {
            id: "godaddy_smtp",
            name: "GoDaddy Email",
            desc: "GoDaddy hosting with professional email",
            icon: "🏢",
            fields: [
                { key: "host", label: "SMTP Host", placeholder: "smtp.secureserver.net", defaultValue: "smtp.secureserver.net" },
                { key: "port", label: "Port", placeholder: "587", defaultValue: "587" },
                { key: "username", label: "Email Address", placeholder: "support@yourdomain.com" },
                { key: "password", label: "Email Password", placeholder: "••••", secret: true },
                { key: "from_email", label: "From Email", placeholder: "support@yourdomain.com" },
                { key: "from_name", label: "From Name", placeholder: "Support Team" }
            ],
            difficulty: "Easy",
            setupTime: "3 min"
        }
    ];

    const handleProviderSelect = (id) => {
        setProvider(id);
        setConfig({});
        setStep(1);
    };

    const handleInputChange = (key, value) => {
        setConfig({ ...config, [key]: value });
    };

    const validateConfig = () => {
        const providerDef = PROVIDERS.find(p => p.id === provider);
        const requiredFields = providerDef.fields.filter(f => !f.optional);
        
        for (const field of requiredFields) {
            if (!config[field.key]?.trim()) {
                toast.error(`${field.label} is required`);
                return false;
            }
        }
        return true;
    };

    const handleSave = async () => {
        if (!validateConfig()) return;

        setLoading(true);
        try {
            await api.put(`/integrations/${provider}`, { config });
            toast.success(`${provider} integration saved!`);
            
            // Auto-test connection
            setTimeout(() => {
                handleTest();
            }, 500);
        } catch (err) {
            toast.error(err.response?.data?.detail || "Failed to save configuration");
            setLoading(false);
        }
    };

    const handleTest = async () => {
        setLoading(true);
        try {
            const { data } = await api.post(`/integrations/${provider}/test`);
            setTestResult({ success: true, message: data.account_status || "Connection successful!" });
            toast.success("Email integration verified!");
            setStep(2);
            setTimeout(() => {
                if (onComplete) onComplete();
            }, 1500);
        } catch (err) {
            setTestResult({ 
                success: false, 
                message: err.response?.data?.detail || "Connection failed. Check your credentials." 
            });
            toast.error("Connection test failed");
        } finally {
            setLoading(false);
        }
    };

    const currentProvider = PROVIDERS.find(p => p.id === provider);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 p-6">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
                            <Mail className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Email Setup</h2>
                            <p className="text-sm text-gray-600">Connect your email to receive support messages</p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 0: Choose Provider */}
                    {step === 0 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-gray-900 mb-6">Choose Your Email Provider</h3>
                            <div className="grid gap-4">
                                {PROVIDERS.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => handleProviderSelect(p.id)}
                                        className="text-left p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <span className="text-2xl">{p.icon}</span>
                                                    <div>
                                                        <h4 className="font-bold text-gray-900">{p.name}</h4>
                                                        <p className="text-sm text-gray-600">{p.desc}</p>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-semibold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full mb-1">{p.difficulty}</div>
                                                <div className="text-xs text-gray-500">{p.setupTime}</div>
                                            </div>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Step 1: Configure */}
                    {step === 1 && currentProvider && (
                        <div className="space-y-6">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center text-lg">{currentProvider.icon}</div>
                                <div>
                                    <h3 className="font-bold text-gray-900">{currentProvider.name}</h3>
                                    <p className="text-sm text-gray-600">{currentProvider.desc}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {currentProvider.fields.map(field => (
                                    <div key={field.key}>
                                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                                            {field.label}
                                            {field.optional ? <span className="text-gray-400 ml-1">(optional)</span> : <span className="text-red-500">*</span>}
                                        </label>
                                        <div className="relative">
                                            <input
                                                type={field.secret && !showPassword[field.key] ? "password" : "text"}
                                                placeholder={field.placeholder}
                                                defaultValue={field.defaultValue || ""}
                                                value={config[field.key] || ""}
                                                onChange={(e) => handleInputChange(field.key, e.target.value)}
                                                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm hover:border-gray-300 transition-colors"
                                            />
                                            {field.secret && (
                                                <button
                                                    type="button"
                                                    onClick={() => setShowPassword({ ...showPassword, [field.key]: !showPassword[field.key] })}
                                                    className="absolute right-3 top-3 text-gray-400 hover:text-gray-600"
                                                >
                                                    {showPassword[field.key] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                                </button>
                                            )}
                                        </div>
                                        {field.help && <p className="text-xs text-gray-500 mt-1">{field.help}</p>}
                                    </div>
                                ))}
                            </div>

                            {/* Connection Status */}
                            {testResult && (
                                <div className={`p-4 rounded-lg border-2 flex items-start gap-3 ${
                                    testResult.success 
                                        ? "bg-green-50 border-green-200" 
                                        : "bg-red-50 border-red-200"
                                }`}>
                                    {testResult.success ? (
                                        <Check className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                                    ) : (
                                        <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                                    )}
                                    <div>
                                        <p className={`font-semibold ${testResult.success ? "text-green-800" : "text-red-800"}`}>
                                            {testResult.success ? "Connected!" : "Connection Failed"}
                                        </p>
                                        <p className={`text-sm ${testResult.success ? "text-green-700" : "text-red-700"}`}>
                                            {testResult.message}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button
                                    onClick={() => setStep(0)}
                                    className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-lg font-semibold hover:bg-gray-50 transition-all"
                                >
                                    Back
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 transition-all shadow-lg"
                                >
                                    {loading ? "Connecting..." : "Connect Email"}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Step 2: Success */}
                    {step === 2 && (
                        <div className="text-center space-y-6 py-8">
                            <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center mx-auto shadow-lg animate-pulse">
                                <Check className="w-10 h-10 text-white" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-bold text-gray-900 mb-2">Email Connected!</h3>
                                <p className="text-gray-600">Your email integration is ready to receive support messages</p>
                            </div>

                            <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4 text-left space-y-3">
                                <h4 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-blue-600" />
                                    What's Next?
                                </h4>
                                <ul className="space-y-2 text-sm text-gray-700">
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 font-bold">1.</span>
                                        <span>Your inbox will now receive all support emails</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 font-bold">2.</span>
                                        <span>Emails automatically create tickets in your system</span>
                                    </li>
                                    <li className="flex items-start gap-2">
                                        <span className="text-blue-600 font-bold">3.</span>
                                        <span>Reply directly from Pulse to manage conversations</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                onClick={() => {
                                    if (onComplete) onComplete();
                                    setStep(0);
                                    setConfig({});
                                }}
                                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 shadow-lg transition-all"
                            >
                                Done
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EmailIntegrationSetup;
