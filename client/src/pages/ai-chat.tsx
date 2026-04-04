import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, Trash2, Bot, User, Sparkles } from "lucide-react";

const SUGGESTED_QUESTIONS = [
  "Am I better off itemizing or taking the standard deduction?",
  "What tax credits might I be missing?",
  "How can I reduce my tax liability?",
  "Explain my tax bracket breakdown",
  "What deductions should I consider for next year?",
  "How does the child tax credit work?",
  "Can you review my return for errors?",
  "What is my effective tax rate?",
];

export default function AIChat({ profileId }: { profileId: number }) {
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["/api/profiles", profileId, "chat"],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/profiles/${profileId}/chat`);
      return res.json();
    },
    enabled: profileId > 0,
  });

  const sendMutation = useMutation({
    mutationFn: async (msg: string) => {
      const res = await apiRequest("POST", `/api/profiles/${profileId}/chat`, { message: msg });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "chat"] });
      setMessage("");
    },
  });

  const clearMutation = useMutation({
    mutationFn: async () => apiRequest("DELETE", `/api/profiles/${profileId}/chat`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profiles", profileId, "chat"] }),
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!message.trim() || sendMutation.isPending) return;
    sendMutation.mutate(message.trim());
  };

  const handleSuggestion = (q: string) => {
    sendMutation.mutate(q);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-12rem)]" data-testid="ai-chat-page">
      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Bot className="h-4 w-4 text-primary" /> Tax AI Assistant
            </CardTitle>
            {messages.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => clearMutation.mutate()} data-testid="button-clear-chat">
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Clear
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="flex-1 flex flex-col overflow-hidden pb-0">
          <ScrollArea className="flex-1 pr-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="space-y-6 py-8">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 mb-3">
                    <Sparkles className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg">Tax AI Assistant</h3>
                  <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                    Ask me anything about your taxes. I can see your income, deductions, credits, and calculations in real time.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-w-lg mx-auto">
                  {SUGGESTED_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => handleSuggestion(q)}
                      className="text-left text-sm px-3 py-2 rounded-lg border hover:bg-accent transition-colors"
                      data-testid={`button-suggestion-${i}`}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {messages.map((msg: any, i: number) => (
                  <div key={i} className={`flex gap-3 ${msg.role === "user" ? "justify-end" : ""}`}>
                    {msg.role === "assistant" && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-primary" />
                      </div>
                    )}
                    <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted rounded-bl-md"
                    }`}>
                      <div className="whitespace-pre-wrap">{msg.content}</div>
                    </div>
                    {msg.role === "user" && (
                      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-accent flex items-center justify-center">
                        <User className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                ))}
                {sendMutation.isPending && (
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                      <Bot className="h-4 w-4 text-primary" />
                    </div>
                    <div className="bg-muted px-4 py-2.5 rounded-2xl rounded-bl-md">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                        <div className="w-2 h-2 bg-primary/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input */}
          <div className="flex gap-2 py-4 border-t mt-2">
            <Input
              data-testid="input-chat-message"
              value={message}
              onChange={e => setMessage(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); }}}
              placeholder="Ask about your taxes..."
              disabled={sendMutation.isPending}
              className="flex-1"
            />
            <Button
              onClick={handleSend}
              disabled={!message.trim() || sendMutation.isPending}
              data-testid="button-send-chat"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
