import React, { useState, useEffect, useRef } from "react";
import { 
  Sparkles, Send, Loader2, RefreshCw, AlertCircle, HelpCircle, 
  ShieldAlert, User, Bot, ArrowUpRight, Cpu
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

export default function AIView() {
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [isConfigured, setIsConfigured] = useState<boolean | null>(null);
  const [configError, setConfigError] = useState<string>("");

  // Chat States
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hello! I am your **Erickson Portal AI Copilot**, powered by **Gemini 3.5 Flash**.\n\nI have real-time, read-only secure access to the active portal database (including participant demographics, active cohort enrollments, payments, and marketing transaction ledgers).\n\nAsk me anything about these metrics! For example:\n- *What is our collection progress percentage?*\n- *Which city has enrolled the most candidates?*\n- *What are some strategic recommendations to improve collection velocity based on our data?*"
    }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [sendingChat, setSendingChat] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggested Prompts based strictly on the stored database parameters
  const SUGGESTED_PROMPTS = [
    "What is our collection progress percentage?",
    "Identify cities with registered candidates",
    "Compare ad spends vs outstanding balance",
    "Provide recommendations to streamline registration"
  ];

  // Verify configuration state on mount
  useEffect(() => {
    checkConfiguration();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const checkConfiguration = async () => {
    setLoadingConfig(true);
    setConfigError("");
    try {
      // Pin configuration state against the insights metadata endpoint which acts as verification
      const res = await fetch("/api/ai/insights");
      const data = await res.json();
      if (res.ok) {
        if (data.isConfigured === false) {
          setIsConfigured(false);
          setConfigError(data.error);
        } else {
          setIsConfigured(true);
        }
      } else {
        setIsConfigured(false);
        setConfigError(data.error || "Failed to reach AI configuration status.");
      }
    } catch (e: any) {
      console.error(e);
      setIsConfigured(false);
      setConfigError("Connection to AI services failed. Check if API credentials exist.");
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleSendChat = async (textToSend?: string) => {
    const rawMsg = textToSend || inputMessage;
    if (!rawMsg.trim() || sendingChat) return;

    if (!textToSend) setInputMessage("");

    const userMsg: Message = {
      id: Math.random().toString(),
      role: "user",
      content: rawMsg
    };

    setMessages(prev => [...prev, userMsg]);
    setSendingChat(true);

    try {
      const historyToSend = [...messages, userMsg].map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyToSend })
      });

      const data = await res.json();
      if (res.ok) {
        if (data.isConfigured === false) {
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            role: "assistant",
            content: "⚠️ **System Notification:** " + (data.error || "Gemini API Secret key is missing. Ensure GEMINI_API_KEY is configured in your project Secrets.")
          }]);
        } else if (data.reply) {
          setMessages(prev => [...prev, {
            id: Math.random().toString(),
            role: "assistant",
            content: data.reply
          }]);
        }
      } else {
        setMessages(prev => [...prev, {
          id: Math.random().toString(),
          role: "assistant",
          content: "❌ **Error:** Failed to receive a response from the AI assistant. Please try query again."
        }]);
      }
    } catch (err) {
      setMessages(prev => [...prev, {
        id: Math.random().toString(),
        role: "assistant",
        content: "❌ **Connection Error:** Could not contact the server assistant."
      }]);
    } finally {
      setSendingChat(false);
    }
  };

  // Custom JSX text rendering helper with inline bold formatting support
  const renderInlineFormatting = (text: string) => {
    const parts = [];
    const boldRegex = /\*\*(.*?)\*\*/g;
    let match;
    let lastIndex = 0;
    
    while ((match = boldRegex.exec(text)) !== null) {
      const boldText = match[1];
      const matchIndex = match.index;
      
      if (matchIndex > lastIndex) {
        parts.push(text.substring(lastIndex, matchIndex));
      }
      
      parts.push(
        <strong className="font-bold text-slate-950 bg-blue-50/70 px-1 rounded border border-blue-100/50" key={matchIndex}>
          {boldText}
        </strong>
      );
      lastIndex = boldRegex.lastIndex;
    }
    
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }
    
    return parts.length > 0 ? parts : text;
  };

  // Markdown Custom Parser - generates clean, tailored React structures out of chat response
  const parseMarkdown = (text: string, isUser: boolean = false) => {
    if (!text) return null;
    const lines = text.split("\n");
    let isInsideTable = false;
    let tableHeaders: string[] = [];
    const tableRows: string[][] = [];

    const renderedJSX: React.ReactNode[] = [];
    const textColor = isUser ? "text-slate-800" : "text-slate-700";

    lines.forEach((line, idx) => {
      const trimmed = line.trim();

      // Table formatting check
      if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
        const cells = trimmed.split("|").map(c => c.trim()).filter((_, i, arr) => i > 0 && i < arr.length - 1);
        if (trimmed.includes("---")) {
          // Table divider row, ignore it
          return;
        }
        if (!isInsideTable) {
          isInsideTable = true;
          tableHeaders = cells;
        } else {
          tableRows.push(cells);
        }
        return;
      } else if (isInsideTable) {
        // Table closed
        renderedJSX.push(
          <div key={`table-${idx}`} className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  {tableHeaders.map((h, hidx) => (
                    <th key={hidx} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-100">
                {tableRows.map((row, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                    {row.map((cell, cellIdx) => (
                      <td key={cellIdx} className={`px-4 py-2.5 text-sm font-medium ${textColor}`}>{renderInlineFormatting(cell)}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        isInsideTable = false;
        tableHeaders = [];
        tableRows.length = 0;
      }

      // Traditional headings, list and checklist layout rendering
      if (trimmed.startsWith("### ")) {
        renderedJSX.push(<h3 key={idx} className="text-sm font-extrabold text-slate-900 tracking-tight mt-5 mb-2 flex items-center gap-2 border-l-4 border-blue-600 pl-2">{renderInlineFormatting(trimmed.substring(4))}</h3>);
      } else if (trimmed.startsWith("## ")) {
        renderedJSX.push(<h2 key={idx} className="text-md font-bold text-slate-900 tracking-tight border-b border-slate-100 pb-2 mt-6 mb-3">{renderInlineFormatting(trimmed.substring(3))}</h2>);
      } else if (trimmed.startsWith("# ")) {
        renderedJSX.push(<h1 key={idx} className="text-lg font-black text-blue-900 tracking-tight border-b border-blue-100 pb-2 mt-7 mb-4">{renderInlineFormatting(trimmed.substring(2))}</h1>);
      } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        renderedJSX.push(
          <div key={idx} className="flex items-start gap-2.5 py-1.5 pl-3">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-2 flex-shrink-0" />
            <p className={`${textColor} text-sm leading-relaxed`}>{renderInlineFormatting(trimmed.substring(2))}</p>
          </div>
        );
      } else if (/^\d+\s*\.\s+/.test(trimmed)) {
        const orderNum = trimmed.match(/^(\d+)\s*\.\s+/)?.[1] || "1";
        const content = trimmed.replace(/^\d+\s*\.\s+/, "");
        renderedJSX.push(
          <div key={idx} className="flex items-start gap-2.5 py-1.5 pl-3">
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex-shrink-0">{orderNum}</span>
            <p className={`${textColor} text-sm leading-relaxed`}>{renderInlineFormatting(content)}</p>
          </div>
        );
      } else if (trimmed === "") {
        renderedJSX.push(<div key={idx} className="h-2" />);
      } else {
        renderedJSX.push(<p key={idx} className={`${textColor} text-sm leading-relaxed mb-3`}>{renderInlineFormatting(trimmed)}</p>);
      }
    });

    if (isInsideTable) {
      renderedJSX.push(
        <div key="table-end" className="my-4 overflow-x-auto rounded-xl border border-slate-200 shadow-sm">
          <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
              <tr>
                {tableHeaders.map((h, hidx) => (
                  <th key={hidx} className="px-4 py-3 text-left text-xs font-bold text-slate-700 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-100">
              {tableRows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-slate-50/50 transition-colors">
                  {row.map((cell, cellIdx) => (
                    <td key={cellIdx} className={`px-4 py-2.5 text-sm font-medium ${textColor}`}>{renderInlineFormatting(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return renderedJSX;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Title Header with explicit model feedback */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Sparkles className="text-blue-600 w-6 h-6 animate-pulse" />
            Erickson AI Copilot
          </h2>
          <p className="text-sm text-slate-500">Secure real-time interactive business database insights assistant</p>
        </div>
        
        {/* Model Badge */}
        <div className="flex items-center gap-2 self-start md:self-auto bg-blue-50/50 border border-blue-100 px-3.5 py-1.5 rounded-2xl">
          <Cpu className="w-4 h-4 text-blue-600" />
          <span className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Model:</span>
          <span className="text-xs font-extrabold text-blue-700">Gemini 3.5 Flash</span>
        </div>
      </div>

      {/* Secret API Key configuration check */}
      {isConfigured === false && (
        <motion.div 
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-amber-50 border border-amber-200 rounded-3xl p-8 flex flex-col md:flex-row gap-6 items-start"
        >
          <div className="p-4 bg-amber-100 rounded-2xl text-amber-800 flex-shrink-0">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-amber-900">Gemini Secret Key Required</h3>
            <p className="text-sm text-amber-700 leading-relaxed">
              We detected that the Gemini API server-side endpoint is configured, but your workspace is missing the `GEMINI_API_KEY` environment secret.
            </p>
            <div className="text-xs bg-white border border-amber-100 rounded-xl p-4 space-y-2 text-slate-600 font-mono shadow-sm">
              <span className="font-bold text-slate-800">To enable Erickson AI Copilot instantly:</span>
              <ol className="list-decimal pl-4 space-y-1">
                <li>Click the <span className="font-bold">Settings</span> menu at the top of your workspace sidebar.</li>
                <li>Write <span className="font-bold">GEMINI_API_KEY</span> as the Variable Name.</li>
                <li>Paste your personal Google Gemini API key as the value.</li>
                <li>Click <span className="font-bold">Save Secrets</span>, then verify the connection state below!</li>
              </ol>
            </div>
            <button
              onClick={checkConfiguration}
              disabled={loadingConfig}
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white font-bold text-xs rounded-xl transition-all shadow shadow-amber-200 flex items-center gap-1.5"
            >
              {loadingConfig ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              Verify Connection State
            </button>
          </div>
        </motion.div>
      )}

      {/* Shared Interactive Chat Workspace */}
      {isConfigured !== false && (
        <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm flex flex-col h-[650px]">
          {/* Chat Window Header metadata */}
          <div className="bg-slate-50/50 p-4 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-blue-105 rounded-xl flex items-center justify-center text-blue-600 border border-blue-100">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800 leading-none mb-1">Erickson AI Copilot Assistant</h3>
                <div className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Active Secure Session</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setMessages([{
                id: "welcome",
                role: "assistant",
                content: "Hello! I am your **Erickson Portal AI Copilot**, powered by **Gemini 3.5 Flash**.\n\nI have real-time, read-only secure access to the active portal database (including participant demographics, active cohort enrollments, payments, and marketing transaction ledgers).\n\nAsk me anything about these metrics! For example:\n- *What is our collection progress percentage?*\n- *Which city has enrolled the most candidates?*\n- *What are some strategic recommendations to improve collection velocity based on our data?*"
              }])}
              className="text-xs font-semibold text-slate-505 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 transition-colors"
            >
              Clear Thread
            </button>
          </div>

          {/* Chat Messages flow */}
          <div className="flex-1 p-6 overflow-y-auto space-y-4 min-h-0 bg-slate-50/20">
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 max-w-[85%] ${m.role === "user" ? "ml-auto flex-row-reverse" : "mr-auto"}`}
              >
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm font-mono text-xs font-bold ${
                  m.role === "user" ? "bg-slate-200 text-slate-700" : "bg-blue-600 text-white"
                }`}>
                  {m.role === "user" ? "U" : "AI"}
                </div>
                <div>
                  <div className={`p-4 rounded-2xl shadow-sm leading-relaxed text-sm ${
                    m.role === "user" 
                      ? "bg-slate-100 text-slate-800 border border-slate-200 rounded-tr-none" 
                      : "bg-white text-slate-800 border border-slate-200 rounded-tl-none prose prose-slate"
                  }`}>
                    {parseMarkdown(m.content, m.role === "user")}
                  </div>
                </div>
              </motion.div>
            ))}

            {sendingChat && (
              <div className="flex gap-3 max-w-[80%] mr-auto">
                <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0 animate-spin border border-blue-100">
                  <Loader2 className="w-4 h-4" />
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-200 rounded-tl-none shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Click Suggested Prompts pill drawer */}
          <div className="p-3 bg-slate-50/50 border-t border-slate-200 flex flex-nowrap gap-2 overflow-x-auto select-none no-scrollbar flex-shrink-0">
            {SUGGESTED_PROMPTS.map((promptText, pIdx) => (
              <button
                key={pIdx}
                onClick={() => handleSendChat(promptText)}
                disabled={sendingChat}
                className="px-3.5 py-1.5 rounded-full bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-200 text-xs text-slate-600 hover:text-blue-700 font-semibold transition-all shadow-sm flex-shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                {promptText}
                <ArrowUpRight className="w-3 h-3 text-slate-400" />
              </button>
            ))}
          </div>

          {/* Interactive Input Form */}
          <div className="p-4 border-t border-slate-200 bg-white flex-shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendChat();
              }}
              className="flex gap-3"
            >
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Ask about candidate ratios, geographical hotspots, collection totals, or strategic recommendations..."
                disabled={sendingChat}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500/25 focus:border-blue-500 outline-none transition-all placeholder:text-slate-400 text-sm"
              />
              <button
                type="submit"
                disabled={sendingChat || !inputMessage.trim()}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white p-3 rounded-xl shadow transition-all duration-150 transform active:translate-y-0 shadow-blue-100"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
