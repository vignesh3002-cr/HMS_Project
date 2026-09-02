import { useState } from "react";
import { Bot, User, Send, Loader2, Sparkles } from "lucide-react";
import { PageHeader } from "@/components/hms/PageHeader";
import { Button } from "@/components/ui/button";
import { nvidiaApi } from "@/api/nvidia.api";

interface ChatMessage {
  id: string;
  role: "user" | "ai";
  content: string;
}

export default function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: prompt },
    ]);
    setInput("");

    setLoading(true);
    try {
      const res = await nvidiaApi.chat(prompt);
      const content = res.data?.data?.content ?? "";
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "ai", content: content || "No response" },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "ai",
          content: "Sorry, I couldn't reach the AI. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
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
        description="Ask anything — powered by NVIDIA Nemotron."
      />

      <div className="flex h-[calc(100vh-260px)] min-h-[480px] flex-col rounded-xl border border-[#E5E7EB] bg-white shadow-sm">
        {/* Messages */}
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#D6E3FF]">
                <Sparkles className="h-7 w-7 text-clinical-blue" />
              </div>
              <p className="text-sm font-semibold text-[#374151]">
                Hi, I'm Nemotron, an AI assistant.
              </p>
              <p className="mt-1 max-w-sm text-sm text-[#64748B]">
                Ask me anything about the HMS system, patients, or general
                topics.
              </p>
            </div>
          ) : (
            messages.map((m) => (
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
                    <Bot className="h-5 w-5 text-clinical-blue" />
                  )}
                </div>
                <div
                  className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                    m.role === "user"
                      ? "bg-[#004785] text-white"
                      : "bg-[#F7F9FB] text-[#191C1E]"
                  }`}
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {m.content}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input */}
        <div className="border-t border-[#E5E7EB] p-4">
          <div className="flex items-end gap-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              rows={1}
              disabled={loading}
              className="flex-1 resize-none rounded-lg border border-[#E5E7EB] bg-[#F7F9FB] px-4 py-2.5 text-sm text-[#191C1E] placeholder:text-[#94A3B8] focus:border-clinical-blue focus:outline-none focus:ring-1 focus:ring-clinical-blue disabled:opacity-60"
            />
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