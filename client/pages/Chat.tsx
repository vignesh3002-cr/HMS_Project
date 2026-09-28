import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bot, User, Send, Loader2, Sparkles, Trash2, Mic, MicOff } from "lucide-react";
import { PageHeader } from "@/components/hms/PageHeader";
import { Button } from "@/components/ui/button";
import { aiChatApi, type AIPerformedAction } from "@/api/ai-chat.api";
import { NAV_ROUTES } from "@/config/nav-routes";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
  actions?: AIPerformedAction[];
}

const SUGGESTIONS = [
  "Show today's appointments",
  "Find patient Arunkumar",
  "Show Dr Kumar's schedule",
  "Show my notifications",
  "Show dashboard summary",
  "Show all departments",
];

export default function Chat() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [isListening, setIsListening] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  const speechSupported = typeof window !== "undefined" &&
    ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  useEffect(() => {
    return () => { stopListening(); };
  }, [stopListening]);

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

  const handleSend = async (text?: string) => {
    const prompt = (text || input).trim();
    if (!prompt || loading) return;
    if (isListening) stopListening();

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: prompt,
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await aiChatApi.send({ message: prompt, conversationId, navRoutes: NAV_ROUTES });
      const data = res.data;
      if (data.success) {
        setConversationId(data.conversationId);

        // Check for navigation response
        try {
          const parsed = JSON.parse(data.message);
          if (parsed.__navigate__) {
            setMessages((prev) => [...prev, {
              id: crypto.randomUUID(),
              role: "ai",
              content: `Redirecting you to ${parsed.__navigate__}...`,
            }]);
            setTimeout(() => navigate(parsed.__navigate__), 800);
            return;
          }
        } catch { /* not JSON, normal message */ }

        const aiMsg: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          content: data.message,
          actions: data.performedActions?.length ? data.performedActions : undefined,
        };
        setMessages((prev) => [...prev, aiMsg]);
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "ai", content: data.message || "Something went wrong. Please try again." },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", content: "Sorry, I couldn't reach the AI. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  handleSendRef.current = handleSend;

  const handleNewChat = () => {
    setMessages([]);
    setConversationId(undefined);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="AI Assistant"
        title="AI Chat"
        description="Ask anything about patients, appointments, vitals, and more."
      />

      <div className="flex h-[calc(100vh-260px)] min-h-[480px] flex-col rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-[#E5E7EB] px-5 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#374151]">
            <Sparkles className="h-4 w-4 text-[#004785]" />
            HMS AI Agent
          </div>
          <button
            onClick={handleNewChat}
            className="rounded-lg p-2 text-[#94A3B8] hover:bg-[#F7F9FB] hover:text-[#374151]"
            title="New conversation"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D6E3FF]">
                <Sparkles className="h-7 w-7 text-[#004785]" />
              </div>
              <p className="text-sm font-semibold text-[#374151]">
                Hi! I'm your HMS AI Agent.
              </p>
              <p className="mt-1 max-w-sm text-sm text-[#64748B]">
                I can search patients, manage appointments, check vitals, and more.
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
            <>
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-start gap-3 ${
                    m.role === "user" ? "flex-row-reverse" : ""
                  }`}
                >
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                      m.role === "user" ? "bg-[#004785]" : "bg-[#D6E3FF]"
                    }`}
                  >
                    {m.role === "user" ? (
                      <User className="h-5 w-5 text-white" />
                    ) : (
                      <Bot className="h-5 w-5 text-[#004785]" />
                    )}
                  </div>
                  <div className="max-w-[75%]">
                    <div
                      className={`rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                        m.role === "user"
                          ? "bg-[#004785] text-white"
                          : "bg-[#F7F9FB] text-[#191C1E]"
                      }`}
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {m.content}
                    </div>
                    {m.actions && m.actions.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {m.actions.map((action, i) => (
                          <div
                            key={i}
                            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[11px] ${
                              action.success
                                ? "bg-green-50 text-green-700"
                                : "bg-red-50 text-red-700"
                            }`}
                          >
                            <span className="font-mono text-[10px] font-semibold">
                              {action.tool}
                            </span>
                            <span className="opacity-60">·</span>
                            <span>
                              {action.success ? "Success" : action.error || "Failed"}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#D6E3FF]">
                    <Bot className="h-5 w-5 text-[#004785]" />
                  </div>
                  <div className="rounded-xl bg-[#F7F9FB] px-4 py-3 shadow-sm">
                    <Loader2 className="h-4 w-4 animate-spin text-[#004785]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E7EB] p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about patients, appointments..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-lg border border-[#E5E7EB] bg-[#F7F9FB] px-4 py-2.5 text-sm text-[#191C1E] placeholder:text-[#94A3B8] focus:border-[#004785] focus:outline-none focus:ring-1 focus:ring-[#004785] disabled:opacity-60"
            />
            {speechSupported && (
              <button
                type="button"
                onClick={isListening ? stopListening : startListening}
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border transition-colors ${
                  isListening
                    ? "border-red-300 bg-red-50 text-red-600 hover:bg-red-100"
                    : "border-[#E5E7EB] bg-[#F7F9FB] text-[#64748B] hover:bg-[#E5E7EB]"
                }`}
                title={isListening ? "Stop listening" : "Start voice input"}
              >
                {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            )}
            <Button
              onClick={() => void handleSend()}
              disabled={!input.trim() || loading}
              className="h-11 bg-[#004785] px-4 hover:bg-[#003A6B]"
            >
              {loading ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
          <p className="mt-2 text-xs text-[#94A3B8]">
            Press Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </div>
  );
}
