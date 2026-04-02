import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { 
  Send, 
  User, 
  Mail, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  Calendar, 
  Clock, 
  Video,
  ChevronRight,
  Loader2,
  Lock,
  LogOut,
  Upload,
  FileText,
  Download,
  Trash2,
  CalendarDays,
  Settings,
  RefreshCw
} from "lucide-react";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [status, setStatus] = useState<{ type: "success" | "error" | null; message: string }>({
    type: null,
    message: "",
  });
  const [showPreview, setShowPreview] = useState(false);
  const [testEmail, setTestEmail] = useState("");
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [showTestInput, setShowTestInput] = useState(false);
  const [includeCC, setIncludeCC] = useState(true);

  // Bulk Sending State
  const [bulkData, setBulkData] = useState<{ name: string; email: string }[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkReport, setBulkReport] = useState<{ name: string; email: string; status: string; error?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isCalendarConnected, setIsCalendarConnected] = useState(false);
  const [googleTokens, setGoogleTokens] = useState<any>(null);
  const [isSendingInvite, setIsSendingInvite] = useState(false);

  React.useEffect(() => {
    const savedTokens = localStorage.getItem("google_tokens");
    if (savedTokens) {
      setGoogleTokens(JSON.parse(savedTokens));
      setIsCalendarConnected(true);
    }
    if (isLoggedIn) {
      checkCalendarStatus();
    }
  }, [isLoggedIn]);

  // Global OAuth Message Listener & Fallback Polling
  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Relaxed origin check for AI Studio environment
      const origin = event.origin;
      const isAllowedOrigin = 
        !origin || // Some browsers send null origin for popups
        origin.endsWith(".run.app") || 
        origin.includes("localhost") || 
        origin.includes("vercel.app") ||
        origin === window.location.origin;

      if (!isAllowedOrigin) return;

      if (event.data?.type === "OAUTH_AUTH_SUCCESS") {
        const tokens = event.data.tokens;
        if (tokens) {
          setGoogleTokens(tokens);
          localStorage.setItem("google_tokens", JSON.stringify(tokens));
        }
        setIsCalendarConnected(true);
        setStatus({ type: "success", message: "Google Calendar connected successfully!" });
        checkCalendarStatus(); // Refresh from server
      }
    };

    const handleFocus = () => {
      if (isLoggedIn) {
        checkCalendarStatus();
      }
    };

    // Polling fallback every 5 seconds if not connected
    const interval = setInterval(() => {
      if (isLoggedIn && !isCalendarConnected) {
        checkCalendarStatus();
      }
    }, 5000);

    window.addEventListener("message", handleMessage);
    window.addEventListener("focus", handleFocus);
    
    return () => {
      window.removeEventListener("message", handleMessage);
      window.removeEventListener("focus", handleFocus);
      clearInterval(interval);
    };
  }, [isLoggedIn, isCalendarConnected]);

  const checkCalendarStatus = async () => {
    try {
      const query = googleTokens ? `?tokens=${encodeURIComponent(JSON.stringify(googleTokens))}` : "";
      const response = await fetch(`/api/auth/status${query}`, { credentials: "include" });
      const data = await response.json();
      console.log("Calendar connection status:", data.connected);
      setIsCalendarConnected(data.connected);
    } catch (error) {
      console.error("Failed to check calendar status:", error);
    }
  };

  const handleConnectCalendar = async () => {
    try {
      const response = await fetch("/api/auth/google/url");
      const data = await response.json();
      
      if (data.error) {
        setStatus({ type: "error", message: data.error });
        return;
      }

      const { url } = data;
      window.open(url, "google_oauth", "width=600,height=700");
    } catch (error) {
      setStatus({ type: "error", message: "Failed to initiate Google connection." });
    }
  };

  const handleSendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientEmail) {
      setStatus({ type: "error", message: "Please provide a client email." });
      return;
    }
    if (!isCalendarConnected) {
      setStatus({ type: "error", message: "Please connect your Google Calendar first." });
      return;
    }

    setIsSendingInvite(true);
    setStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/calendar/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          clientName, 
          clientEmail,
          tokens: googleTokens 
        }),
        credentials: "include",
      });
      const data = await response.json();
      if (response.ok) {
        setStatus({ type: "success", message: "Calendar invite sent successfully!" });
      } else {
        setStatus({ type: "error", message: data.error || "Failed to send invite." });
      }
    } catch (error) {
      setStatus({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setIsSendingInvite(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "nimda") {
      setIsLoggedIn(true);
      localStorage.setItem("isLoggedIn", "true");
      setLoginError("");
    } else {
      setLoginError("Invalid username or password.");
    }
  };

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    } catch (error) {
      console.error("Logout error:", error);
    }
    setIsLoggedIn(false);
    setIsCalendarConnected(false);
    setGoogleTokens(null);
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("google_tokens");
    setUsername("");
    setPassword("");
  };

  const handleSendEmail = async (e: React.FormEvent, isTest: boolean = false, targetEmail?: string) => {
    if (e) e.preventDefault();
    
    const emailToUse = isTest ? targetEmail : clientEmail;
    const nameToUse = clientName || (isTest ? "Test User" : "");

    if (!emailToUse) {
      setStatus({ type: "error", message: "Please provide an email address." });
      return;
    }

    if (isTest) setIsSendingTest(true);
    else setIsSending(true);
    
    setStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          clientName: nameToUse, 
          clientEmail: emailToUse,
          isTest,
          includeCC
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setStatus({ 
          type: "success", 
          message: isTest ? `Test email sent to ${emailToUse}!` : "Welcome email sent successfully!" 
        });
        if (!isTest) {
          setClientName("");
          setClientEmail("");
        } else {
          setShowTestInput(false);
        }
      } else {
        setStatus({ type: "error", message: data.error || "Failed to send email." });
      }
    } catch (error) {
      setStatus({ type: "error", message: "An unexpected error occurred." });
    } finally {
      setIsSending(false);
      setIsSendingTest(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    const extension = file.name.split(".").pop()?.toLowerCase();

    if (extension === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const parsedData = results.data.map((row: any) => ({
            name: row.Name || row.name || row.NAME || "",
            email: row.Email || row.email || row.EMAIL || "",
          })).filter(item => item.email);
          setBulkData(parsedData);
        },
      });
    } else if (extension === "xlsx" || extension === "xls") {
      reader.onload = (event) => {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet);
        const parsedData = jsonData.map((row: any) => ({
          name: row.Name || row.name || row.NAME || "",
          email: row.Email || row.email || row.EMAIL || "",
        })).filter(item => item.email);
        setBulkData(parsedData);
      };
      reader.readAsArrayBuffer(file);
    } else {
      setStatus({ type: "error", message: "Please upload a valid CSV or Excel file." });
    }
  };

  const handleBulkSend = async () => {
    if (bulkData.length === 0) return;

    setIsBulkSending(true);
    setBulkProgress({ current: 0, total: bulkData.length });
    const report: typeof bulkReport = [];

    for (let i = 0; i < bulkData.length; i++) {
      const client = bulkData[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await fetch("/api/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientName: client.name,
            clientEmail: client.email,
            isTest: false,
            includeCC,
          }),
        });

        const data = await response.json();
        if (response.ok) {
          report.push({ ...client, status: "Success" });
        } else {
          report.push({ ...client, status: "Failed", error: data.error || "Unknown error" });
        }
      } catch (error) {
        report.push({ ...client, status: "Failed", error: "Network error" });
      }
      
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setBulkReport(report);
    setIsBulkSending(false);
    setBulkData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus({ type: "success", message: `Bulk sending completed! ${report.filter(r => r.status === "Success").length} succeeded, ${report.filter(r => r.status === "Failed").length} failed.` });
  };

  const downloadReport = () => {
    if (bulkReport.length === 0) return;
    const csv = Papa.unparse(bulkReport);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `email_report_${new Date().toISOString().split('T')[0]}.csv`);
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-[#1e293b] font-sans selection:bg-blue-100">
      {!isLoggedIn ? (
        <div className="min-h-screen flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-white rounded-3xl border border-slate-200 p-8 shadow-xl space-y-8"
          >
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 mx-auto mb-4">
                <Lock className="text-white w-8 h-8" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Portal Login</h1>
              <p className="text-slate-500">Please enter your credentials to access the Erickson Coaching Welcome Portal.</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Username</label>
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Password</label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              {loginError && (
                <p className="text-sm text-rose-600 font-medium text-center">{loginError}</p>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-200 transition-all"
              >
                Login
              </button>
            </form>
          </motion.div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                  <Send className="text-white w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold tracking-tight text-slate-900">Erickson Coaching India</h1>
                  <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Welcome Portal</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  {!isCalendarConnected ? (
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={handleConnectCalendar}
                        className="text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100 flex items-center gap-2 transition-all"
                      >
                        <CalendarDays className="w-3.5 h-3.5" />
                        Connect Calendar
                      </button>
                      <button 
                        onClick={checkCalendarStatus}
                        className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors"
                        title="Refresh Status"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Calendar Connected
                    </div>
                  )}
                </div>
                <div className="hidden sm:block">
                  <span className="text-sm text-slate-400">Logged in as marketing@xmonks.com</span>
                </div>
                <button 
                  onClick={handleLogout}
                  className="p-2 text-slate-400 hover:text-rose-600 transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>
          </header>

          <main className="max-w-4xl mx-auto px-4 py-12 space-y-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
          
          {/* Form Section */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            <div className="space-y-2">
              <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Onboard New Client</h2>
              <p className="text-slate-500">Enter the client details to send the official welcome package for 'The Art & Science of Coaching'.</p>
            </div>

            <form onSubmit={handleSendEmail} className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Client Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={clientName}
                    onChange={(e) => setClientName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    Client Email Address
                  </label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    placeholder="e.g. john@example.com"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none placeholder:text-slate-300"
                  />
                </div>

                <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                  <input
                    id="includeCC"
                    type="checkbox"
                    checked={includeCC}
                    onChange={(e) => setIncludeCC(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="includeCC" className="text-sm font-medium text-slate-700 cursor-pointer select-none">
                    CC preeti@erickson.co.in
                  </label>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold py-3 px-6 rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 group"
                >
                  {isSending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Send Welcome Email
                      <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    disabled={isSendingInvite || !isCalendarConnected}
                    onClick={handleSendInvite}
                    className="w-full bg-slate-800 hover:bg-slate-900 disabled:bg-slate-200 text-white font-semibold py-3 px-6 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 group"
                  >
                    {isSendingInvite ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <>
                        Add to Calendar Event
                        <CalendarDays className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-slate-400 text-center">
                    Adds guest to the existing master event.
                  </p>
                </div>
              </div>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="w-full px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <Eye className="w-4 h-4" />
                  {showPreview ? "Hide Preview" : "Preview Email"}
                </button>
              </div>

              <div className="pt-4 border-t border-slate-100">
                {!showTestInput ? (
                  <button
                    type="button"
                    onClick={() => setShowTestInput(true)}
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-2 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    Send a test email to yourself
                  </button>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="space-y-3"
                  >
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Test Email Recipient</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="your-email@example.com"
                        className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <button
                        type="button"
                        disabled={isSendingTest || !testEmail}
                        onClick={() => handleSendEmail(null as any, true, testEmail)}
                        className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-slate-900 disabled:bg-slate-300 transition-all flex items-center gap-2"
                      >
                        {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Test"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowTestInput(false)}
                        className="text-sm text-slate-400 hover:text-slate-600 px-2"
                      >
                        Cancel
                      </button>
                    </div>
                  </motion.div>
                )}
              </div>
            </form>

            <AnimatePresence>
              {status.type && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`p-4 rounded-xl flex items-start gap-3 ${
                    status.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"
                  }`}
                >
                  {status.type === "success" ? (
                    <CheckCircle2 className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  )}
                  <p className="text-sm font-medium">{status.message}</p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Info Card Section */}
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900">Course Overview</h3>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Upcoming Batch</p>
                    <p className="text-sm text-slate-500">May 28 - June 21, 2026</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Timings</p>
                    <p className="text-sm text-slate-500">06:00 PM - 09:30 PM IST</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Video className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Platform</p>
                    <p className="text-sm text-slate-500">Zoom (Live Interactive)</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-3">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Quick Tip</p>
              <p className="text-sm text-slate-600 italic">
                "The battle is to reduce the gap between Who I know/ believe/ think I am and Who I want to BE."
              </p>
            </div>
          </motion.div>
        </div>

        {/* Bulk Upload Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Bulk Onboarding
              </h3>
              <p className="text-sm text-slate-500">Upload a CSV or Excel file with "Name" and "Email" columns.</p>
            </div>
            {bulkReport.length > 0 && (
              <button
                onClick={downloadReport}
                className="flex items-center gap-2 text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-100 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Last Report
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative group">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept=".csv, .xlsx, .xls"
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-400 rounded-2xl p-8 transition-all flex flex-col items-center justify-center gap-3 bg-slate-50 group-hover:bg-blue-50/30">
                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center">
                  <FileText className="w-6 h-6 text-slate-400 group-hover:text-blue-500 transition-colors" />
                </div>
                <p className="text-sm font-semibold text-slate-600">
                  {bulkData.length > 0 ? `${bulkData.length} clients loaded` : "Click or drag file here"}
                </p>
                <p className="text-xs text-slate-400">Supports .csv, .xlsx, .xls</p>
              </div>
            </div>

            <div className="flex flex-col justify-center gap-4">
              {bulkData.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-slate-900">Ready to send</span>
                    <button 
                      onClick={() => {
                        setBulkData([]);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                      }}
                      className="text-slate-400 hover:text-rose-600 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={handleBulkSend}
                    disabled={isBulkSending}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isBulkSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending {bulkProgress.current}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Start Bulk Sending
                      </>
                    )}
                  </button>
                </div>
              )}
              
              {isBulkSending && (
                <div className="space-y-2">
                  <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      className="h-full bg-blue-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-slate-500 font-medium">
                    Processing... Please do not close the tab.
                  </p>
                </div>
              )}

              {!isBulkSending && bulkData.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 border border-slate-100 rounded-2xl bg-slate-50/50">
                  <p className="text-sm text-slate-400">No file selected for bulk processing.</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Email Preview Modal-like Section */}
        <AnimatePresence>
          {showPreview && (
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              className="mt-16 bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden"
            >
              <div className="bg-slate-900 px-8 py-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-rose-500" />
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <div className="w-3 h-3 rounded-full bg-emerald-500" />
                </div>
                <p className="text-xs font-mono text-slate-400">Email Preview Mode</p>
              </div>
              
              <div className="p-8 sm:p-12 max-w-2xl mx-auto">
                <div className="space-y-6 text-slate-800 leading-relaxed">
                  <div className="pb-6 border-b border-slate-100">
                    <p className="text-sm text-slate-400 mb-1">Subject:</p>
                    <p className="font-bold text-slate-900">Welcome: The Art and Science of Coaching (The Essentials Course) by Erickson Coaching International (India Team) (Online, May-June, 2026)</p>
                  </div>

                  <p>Dear {clientName || "<Client Name>"},</p>
                  <p>Warm greetings!</p>
                  <p>I would like to personally welcome you to <strong>‘The Art & Science of Coaching (The Essentials Course)’</strong>.</p>
                  <p>Congratulations and sincere gratitude for trusting us as your partner in your Coaching Journey. Coaching is about you as a whole person: your values, goals, work, balance, fulfillment, and life purpose.</p>
                  
                  <div className="pl-6 border-l-4 border-blue-600 py-2 my-8 italic text-slate-600 bg-slate-50 rounded-r-xl">
                    "The battle is to reduce the gap between Who I know/ believe/ think I am and Who I want to BE. The real self and the expected self."
                  </div>

                  <p>The world of Coaching is an exciting space in which we Inspire, Implement, Integrate, and Celebrate our client’s insights and accomplishments...</p>
                  
                  <div className="bg-blue-50 p-8 rounded-2xl space-y-4 border border-blue-100">
                    <h4 className="font-bold text-blue-900">The Art & Science of Coaching (The Essentials Course), Part I - II</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                      <div>
                        <p className="font-bold text-blue-800 mb-2">Dates</p>
                        <p className="text-blue-700">Part I: 28th May - 31st May, 2026 & 04th June - 07th June, 2026</p>
                        <p className="text-blue-700">Part II: 11th June - 14th June, 2026 & 18th June - 21st June, 2026</p>
                      </div>
                      <div>
                        <p className="font-bold text-blue-800 mb-2">Timings</p>
                        <p className="text-blue-700">06:00 - 09:30 PM IST</p>
                      </div>
                    </div>
                    <div className="pt-4">
                      <div className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold shadow-md">Join Zoom Meeting</div>
                    </div>
                  </div>

                  <div className="pt-12 border-t border-slate-100">
                    <p className="font-bold text-slate-900">Great Regards,</p>
                    <p className="font-bold text-blue-600">Gaurav Arora</p>
                    <p className="text-sm text-slate-500">Inspirer</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>© 2026 Erickson Coaching International (India Team) & xMonks. All rights reserved.</p>
      </footer>
        </>
      )}
    </div>
  );
}
