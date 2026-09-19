import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, Send, Loader2, X, MessageSquare, Sparkles, Trash2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiChatApi, type AIPerformedAction } from "@/api/ai-chat.api";
import { getUser } from "@/utils/token";
import { NAV_ROUTES } from "@/config/nav-routes";

interface ChatMessage {
    id: string;
    role: "user" | "ai";
    content: string;
    actions?: AIPerformedAction[];
    timestamp: number;
}

const SUGGESTIONS = [
    "Show today's appointments",
    "Find patient Arunkumar",
    "Show patients with abnormal vitals",
    "Show Dr Kumar's schedule",
    "Create an appointment",
    "Show my notifications"
];

export function AIChatBox() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | undefined>();
    const [isListening, setIsListening] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const recognitionRef = useRef<any>(null);

    const user = getUser();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    const speechSupported = typeof window !== "undefined" &&
        ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
            recognitionRef.current = null;
        }
        setIsListening(false);
    }, []);

    const handleSendRef = useRef<(text?: string) => Promise<void>>();

    const startListening = useCallback(() => {
        if (!speechSupported) return;

        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
            let transcript = "";
            for (let i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            if (transcript) {
                const text = transcript.trim();
                setInput(text);
                setTimeout(() => {
                    if (handleSendRef.current) handleSendRef.current(text);
                }, 150);
            }
        };

        recognition.onerror = (event: any) => {
            if (event.error === "no-speech") return;
            if (event.error === "not-allowed" || event.error === "service-not-allowed") {
                setInput("Microphone access denied. Please allow mic permission in your browser settings.");
            } else if (event.error !== "aborted") {
                setInput("Voice input error: " + event.error);
            }
            stopListening();
        };

        recognition.onend = () => {
            if (recognitionRef.current) {
                try { recognition.start(); } catch { stopListening(); }
            }
        };

        recognitionRef.current = recognition;
        recognition.start();
        setIsListening(true);
    }, [speechSupported, stopListening]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    useEffect(() => {
        return () => { stopListening(); };
    }, [stopListening]);

    useEffect(() => {
        if (isOpen && inputRef.current) {
            inputRef.current.focus();
        }
        if (!isOpen) {
            stopListening();
        }
    }, [isOpen, stopListening]);

    const handleSend = async (text?: string) => {
        const prompt = (text || input).trim();
        if (!prompt || loading) return;
        if (isListening) stopListening();

        const userMsg: ChatMessage = {
            id: `msg_${Date.now()}_user`,
            role: "user",
            content: prompt,
            timestamp: Date.now()
        };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setLoading(true);

        try {
            const res = await aiChatApi.send({
                message: prompt,
                conversationId,
                navRoutes: NAV_ROUTES
            });

            const data = res.data;
            if (data.success) {
                setConversationId(data.conversationId);

                // Check for navigation response
                try {
                    const parsed = JSON.parse(data.message);
                    if (parsed.__navigate__) {
                        setMessages(prev => [...prev, {
                            id: `msg_${Date.now()}_nav`,
                            role: "ai",
                            content: `Redirecting you to ${parsed.__navigate__}...`,
                            timestamp: Date.now()
                        }]);
                        setTimeout(() => {
                            navigate(parsed.__navigate__);
                            setIsOpen(false);
                        }, 800);
                        return;
                    }
                } catch { /* not JSON, normal message */ }

                const aiMsg: ChatMessage = {
                    id: `msg_${Date.now()}_ai`,
                    role: "ai",
                    content: data.message,
                    actions: data.performedActions?.length ? data.performedActions : undefined,
                    timestamp: Date.now()
                };
                setMessages(prev => [...prev, aiMsg]);
            } else {
                setMessages(prev => [...prev, {
                    id: `msg_${Date.now()}_err`,
                    role: "ai",
                    content: data.message || "Something went wrong. Please try again.",
                    timestamp: Date.now()
                }]);
            }
        } catch (err: any) {
            const errorMsg = err?.response?.data?.message
                || err?.message
                || "Unable to reach the AI service. Please try again.";
            setMessages(prev => [...prev, {
                id: `msg_${Date.now()}_err`,
                role: "ai",
                content: errorMsg,
                timestamp: Date.now()
            }]);
        } finally {
            setLoading(false);
        }
    };

    handleSendRef.current = handleSend;

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    const handleNewChat = () => {
        setMessages([]);
        setConversationId(undefined);
        setInput("");
    };

    const formatTime = (ts: number) => {
        return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    };

    return (
        <>
            {/* Floating Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "fixed bottom-20 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-lg transition-all duration-200 hover:scale-105",
                    isOpen
                        ? "bg-gray-600 hover:bg-gray-700"
                        : "bg-[#004785] hover:bg-[#003A6B]"
                )}
                title="AI Assistant"
            >
                {isOpen ? (
                    <X className="h-6 w-6 text-white" />
                ) : (
                    <Bot className="h-6 w-6 text-white" />
                )}
            </button>

            {/* Chat Panel */}
            {isOpen && (
                <div className="fixed bottom-38 right-6 z-50 flex w-[400px] max-w-[calc(100vw-3rem)] flex-col rounded-2xl border border-[#E5E7EB] bg-white shadow-2xl"
                    style={{ height: "min(600px, calc(100vh - 180px))" }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between rounded-t-2xl border-b border-[#E5E7EB] bg-[#004785] px-5 py-3.5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
                                <Sparkles className="h-5 w-5 text-white" />
                            </div>
                            <div>
                                <h3 className="text-sm font-semibold text-white">HMS AI Agent</h3>
                                <p className="text-xs text-white/70">
                                    {user?.role_type || "Assistant"} • {user?.username || "User"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                            <button
                                onClick={handleNewChat}
                                className="rounded-lg p-2 text-white/70 hover:bg-white/10 hover:text-white"
                                title="New conversation"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 overflow-y-auto px-4 py-4">
                        {messages.length === 0 ? (
                            <div className="flex h-full flex-col items-center justify-center text-center">
                                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D6E3FF]">
                                    <Bot className="h-7 w-7 text-[#004785]" />
                                </div>
                                <p className="text-sm font-semibold text-[#374151]">
                                    Hi! I'm your HMS AI Agent.
                                </p>
                                <p className="mt-1 max-w-xs text-xs text-[#64748B]">
                                    I can search patients, manage appointments, check vitals, and more.
                                    Ask me anything about the HMS.
                                </p>
                                <div className="mt-5 flex flex-wrap justify-center gap-2">
                                    {SUGGESTIONS.map((s) => (
                                        <button
                                            key={s}
                                            onClick={() => void handleSend(s)}
                                            className="rounded-full border border-[#E5E7EB] bg-[#F7F9FB] px-3 py-1.5 text-xs text-[#374151] transition-colors hover:border-[#004785] hover:bg-[#D6E3FF] hover:text-[#004785]"
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {messages.map((m) => (
                                    <div
                                        key={m.id}
                                        className={cn(
                                            "flex items-start gap-2.5",
                                            m.role === "user" ? "flex-row-reverse" : ""
                                        )}
                                    >
                                        <div
                                            className={cn(
                                                "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
                                                m.role === "user" ? "bg-[#004785]" : "bg-[#D6E3FF]"
                                            )}
                                        >
                                            {m.role === "user" ? (
                                                <MessageSquare className="h-4 w-4 text-white" />
                                            ) : (
                                                <Bot className="h-4 w-4 text-[#004785]" />
                                            )}
                                        </div>
                                        <div className="max-w-[85%]">
                                            <div
                                                className={cn(
                                                    "rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed shadow-sm",
                                                    m.role === "user"
                                                        ? "bg-[#004785] text-white"
                                                        : "bg-[#F7F9FB] text-[#191C1E]"
                                                )}
                                                style={{ whiteSpace: "pre-wrap" }}
                                            >
                                                {m.content}
                                            </div>
                                            {m.actions && m.actions.length > 0 && (
                                                <div className="mt-2 space-y-1">
                                                    {m.actions.map((action, i) => (
                                                        <div
                                                            key={i}
                                                            className={cn(
                                                                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px]",
                                                                action.success
                                                                    ? "bg-green-50 text-green-700"
                                                                    : "bg-red-50 text-red-700"
                                                            )}
                                                        >
                                                            <span className="font-mono text-[10px] font-semibold">
                                                                {action.tool}
                                                            </span>
                                                            <span className="opacity-60">•</span>
                                                            <span>
                                                                {action.success ? "Success" : action.error || "Failed"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                            <div className={cn(
                                                "mt-0.5 text-[10px] text-[#94A3B8]",
                                                m.role === "user" ? "text-right" : "text-left"
                                            )}>
                                                {formatTime(m.timestamp)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {loading && (
                                    <div className="flex items-start gap-2.5">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#D6E3FF]">
                                            <Bot className="h-4 w-4 text-[#004785]" />
                                        </div>
                                        <div className="rounded-xl bg-[#F7F9FB] px-3.5 py-3 shadow-sm">
                                            <Loader2 className="h-4 w-4 animate-spin text-[#004785]" />
                                        </div>
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>

                    {/* Input */}
                    <div className="border-t border-[#E5E7EB] p-3">
                        <div className="flex items-end gap-2">
                            <textarea
                                ref={inputRef}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder="Ask about patients, appointments..."
                                rows={1}
                                disabled={loading}
                                className="flex-1 resize-none rounded-xl border border-[#E5E7EB] bg-[#F7F9FB] px-4 py-2.5 text-[13px] text-[#191C1E] placeholder:text-[#94A3B8] focus:border-[#004785] focus:outline-none focus:ring-1 focus:ring-[#004785] disabled:opacity-60"
                            />
                            {speechSupported && (
                                <button
                                    onClick={isListening ? stopListening : startListening}
                                    disabled={loading}
                                    className={cn(
                                        "flex h-10 w-10 items-center justify-center rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                        isListening
                                            ? "bg-red-500 text-white hover:bg-red-600 animate-pulse"
                                            : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                                    )}
                                    title={isListening ? "Stop voice input" : "Start voice input"}
                                >
                                    {isListening ? (
                                        <MicOff className="h-4 w-4" />
                                    ) : (
                                        <Mic className="h-4 w-4" />
                                    )}
                                </button>
                            )}
                            <button
                                onClick={() => void handleSend()}
                                disabled={!input.trim() || loading}
                                className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#004785] text-white transition-colors hover:bg-[#003A6B] disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Send className="h-4 w-4" />
                                )}
                            </button>
                        </div>
                        <p className="mt-1.5 text-center text-[10px] text-[#94A3B8]">
                            Enter to send • Shift+Enter for new line{speechSupported ? " • Click mic for voice input" : ""}
                        </p>
                    </div>
                </div>
            )}
        </>
    );
}
