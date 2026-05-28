import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { collection, onSnapshot, query } from "firebase/firestore";
import { db } from "./firebase";
import { LogOut, Users, FileText, Send, Mail, User, CheckCircle2, AlertCircle, Eye, Calendar, Clock, Video, ChevronRight, Loader2, Lock, Upload, Download, Trash2, BookOpen, LayoutDashboard, Coins, Sparkles } from "lucide-react";
import ParticipantsView from "./components/ParticipantsView";
import DeveloperView from "./components/DeveloperView";
import ResourcesView from "./components/ResourcesView";
import DashboardView from "./components/DashboardView";
import BudgetView from "./components/BudgetView";
import AIView from "./components/AIView";

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return localStorage.getItem("isLoggedIn") === "true";
  });
  const [currentUser, setCurrentUser] = useState(() => {
    return localStorage.getItem("currentUser") || "";
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
  const [ccEmail, setCcEmail] = useState("");
  const [currentView, setCurrentView] = useState<'email' | 'dashboard' | 'participants' | 'developer' | 'resources' | 'budget' | 'ai'>('dashboard');
  const [emailPlaceholders, setEmailPlaceholders] = useState<{ courseDatesPart1?: string; courseDatesPart2?: string; courseTimings?: string }>({});

  useEffect(() => {
    const handleCopyCutPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      // Allow copy/cut/paste inside input and textarea fields so users can still type/edit forms
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
    };

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }
      e.preventDefault();
    };

    document.addEventListener('copy', handleCopyCutPaste);
    document.addEventListener('cut', handleCopyCutPaste);
    document.addEventListener('paste', handleCopyCutPaste);
    document.addEventListener('contextmenu', handleContextMenu);

    return () => {
      document.removeEventListener('copy', handleCopyCutPaste);
      document.removeEventListener('cut', handleCopyCutPaste);
      document.removeEventListener('paste', handleCopyCutPaste);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, []);

  const CC_OPTIONS = [
    { name: "None", email: "" },
    { name: "Preeti", email: "preeti@erickson.co.in" },
    { name: "Aakib", email: "aakib.posharkar@erickson.co.in" },
    { name: "Saurav", email: "saurav.tiwari@erickson.co.in" },
    { name: "Rejna", email: "rejna.balan@erickson.co.in" },
  ];

  // Bulk Sending State
  const [bulkData, setBulkData] = useState<{ name: string; email: string }[]>([]);
  const [isBulkSending, setIsBulkSending] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });
  const [bulkReport, setBulkReport] = useState<{ name: string; email: string; status: string; error?: string }[]>([]);
  const [isBulkAddingCalendar, setIsBulkAddingCalendar] = useState(false);
  const [selectedCalendarNum, setSelectedCalendarNum] = useState<number>(1);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [availableBatches, setAvailableBatches] = useState<string[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [participants, setParticipants] = useState<any[]>([]);

  useEffect(() => {
    if (!isLoggedIn) return;
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const batches = new Set<string>();
      const parts: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        parts.push({ id: doc.id, ...data });
        if (data.batchNumber) {
          batches.add(data.batchNumber);
        }
      });
      setParticipants(parts);
      setAvailableBatches(Array.from(batches).sort((a, b) => parseInt(a) - parseInt(b)));
    });

    const fetchPlaceholders = async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const docRef = doc(db, 'settings', 'calendarLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setEmailPlaceholders({
            courseDatesPart1: data.courseDatesPart1,
            courseDatesPart2: data.courseDatesPart2,
            courseTimings: data.courseTimings
          });
        }
      } catch (e) {
        console.error("Failed to load email placeholders", e);
      }
    };
    fetchPlaceholders();

    return () => unsubscribe();
  }, [isLoggedIn]);

  useEffect(() => {
    if (selectedBatch) {
      const batchParticipants = participants.filter(p => p.batchNumber === selectedBatch && p.email);
      setBulkData(batchParticipants.map(p => ({
        name: `${p.firstName || ''} ${p.lastName || ''}`.trim(),
        email: p.email
      })));
    }
  }, [selectedBatch, participants]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const creds: Record<string, string> = {
      'admin': 'nimda', // Master Admin
      'marketing@xmonks.com': 'nimda', // Marketing Admin
      'Aakib': 'bikkA',
      'Saurav': 'varuaS',
      'Rejna': 'anjeR',
      'Preeti': 'iteerP',
      'Sheena': 'frm@xmonks.com',
      'Vikram': 'markiV'
    };

    if (creds[username] && creds[username] === password) {
      setIsLoggedIn(true);
      setCurrentUser(username);
      localStorage.setItem("isLoggedIn", "true");
      localStorage.setItem("currentUser", username);
      setLoginError("");
    } else {
      setLoginError("Invalid username or password.");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentUser("");
    localStorage.removeItem("isLoggedIn");
    localStorage.removeItem("currentUser");
    setUsername("");
    setPassword("");
  };

  const isAdmin = currentUser === 'admin' || currentUser === 'marketing@xmonks.com';

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
          ccEmail,
          ...emailPlaceholders
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

    setSelectedBatch(""); // Clear selected batch when uploading file

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
            ccEmail,
            ...emailPlaceholders
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

  const handleBulkCalendarAdd = async () => {
    if (bulkData.length === 0) return;

    setIsBulkAddingCalendar(true);
    setBulkProgress({ current: 0, total: bulkData.length });
    const report: typeof bulkReport = [];

    // Fetch calendar links first
    let tmeid = "";
    let tmsrc = "";
    try {
      const { doc, getDoc } = await import("firebase/firestore");
      const docRef = doc(db, 'settings', 'calendarLinks');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const settings = docSnap.data();
        const link = settings[`link${selectedCalendarNum}`];
        if (link) {
          const url = new URL(link);
          tmeid = url.searchParams.get('tmeid') || "";
          tmsrc = url.searchParams.get('tmsrc') || "";
        }
      }
    } catch (e) {
      console.error("Error fetching calendar links:", e);
    }

    if (!tmeid) {
      setStatus({ type: "error", message: "Selected calendar is not configured in Developer settings." });
      setIsBulkAddingCalendar(false);
      return;
    }

    for (let i = 0; i < bulkData.length; i++) {
      const client = bulkData[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1 }));

      try {
        const response = await fetch("/api/add-to-calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: client.email,
            eventId: tmeid,
            calendarId: tmsrc || undefined
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
      
      await new Promise(resolve => setTimeout(resolve, 300));
    }

    setBulkReport(report);
    setIsBulkAddingCalendar(false);
    setBulkData([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setStatus({ type: "success", message: `Bulk calendar sync completed! ${report.filter(r => r.status === "Success").length} succeeded, ${report.filter(r => r.status === "Failed").length} failed.` });
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
        <div className="min-h-screen flex flex-col md:flex-row bg-white">
          {/* Left Side: Image */}
          <div className="hidden md:block md:w-1/2 lg:w-3/5 relative overflow-hidden">
            <img 
              src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=2071&auto=format&fit=crop" 
              alt="Professional Coaching Session"
              className="absolute inset-0 w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            {/* Note: To use your specific attached image, upload it to the project (e.g., as 'login-hero.jpg') and update the src above to '/login-hero.jpg' */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-900/60 via-transparent to-transparent" />
            <div className="absolute bottom-12 left-12 text-white z-10 max-w-lg">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="w-12 h-1 bg-blue-400 mb-6" />
                <h2 className="text-4xl lg:text-5xl font-bold mb-4 tracking-tight leading-tight">
                  Transforming Lives Through Coaching
                </h2>
                <p className="text-lg lg:text-xl text-blue-50 font-medium opacity-90 max-w-md">
                  Welcome to the Erickson Coaching International India Portal. Your journey to excellence starts here.
                </p>
              </motion.div>
            </div>
          </div>

          {/* Right Side: Login Portal */}
          <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16">
            <motion.div 
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-full max-w-md space-y-10"
            >
              <div className="space-y-4">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center shadow-xl shadow-blue-100 mb-6">
                  <Lock className="text-white w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Portal Login</h1>
                  <p className="text-slate-500 text-lg">Please enter your credentials to access the Welcome Portal.</p>
                </div>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Username</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <User className="w-5 h-5" />
                      </div>
                      <input
                        type="text"
                        required
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Enter your username"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-slate-700 uppercase tracking-wider">Password</label>
                    <div className="relative">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                        <Lock className="w-5 h-5" />
                      </div>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-12 pr-4 py-4 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {loginError && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-3 text-rose-600"
                  >
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p className="text-sm font-semibold">{loginError}</p>
                  </motion.div>
                )}

                <button
                  type="submit"
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-100 transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 group"
                >
                  Sign In
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </form>

              <div className="pt-8 border-t border-slate-100 text-center">
                <p className="text-sm text-slate-400">
                  © 2026 Erickson Coaching International India
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      ) : (
        <>
          {/* Header */}
          <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-200">
                    <Send className="text-white w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold tracking-tight text-slate-900">Erickson Coaching India</h1>
                    <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Welcome Portal</p>
                  </div>
                </div>
                <div className="hidden md:flex ml-8 space-x-4">
                  <button
                    onClick={() => setCurrentView('dashboard')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'dashboard' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </button>
                  <button
                    onClick={() => setCurrentView('email')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'email' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-4 h-4" />
                    Email Campaign
                  </button>
                  <button
                    onClick={() => setCurrentView('participants')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'participants' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    Participants
                  </button>
                  <button
                    onClick={() => setCurrentView('resources')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'resources' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    Resources
                  </button>
                  <button
                    onClick={() => setCurrentView('budget')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'budget' 
                        ? 'bg-blue-50 text-blue-700' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Coins className="w-4 h-4" />
                    Budget
                  </button>
                  <button
                    onClick={() => setCurrentView('ai')}
                    className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                      currentView === 'ai' 
                        ? 'bg-blue-50 text-blue-700 font-bold ring-1 ring-blue-100' 
                        : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    AI Copilot
                  </button>
                  {isAdmin && (
                    <button
                      onClick={() => setCurrentView('developer')}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                        currentView === 'developer' 
                          ? 'bg-blue-50 text-blue-700' 
                          : 'text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <FileText className="w-4 h-4" />
                      Developer
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:block">
                  <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    {isAdmin ? 'Administrator' : `Partner: ${currentUser}`}
                  </span>
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

          <main className="max-w-7xl mx-auto px-4 py-12 space-y-12">
            {currentView === 'dashboard' ? (
              <DashboardView currentUser={currentUser} />
            ) : currentView === 'developer' ? (
              <DeveloperView />
            ) : currentView === 'participants' ? (
              <ParticipantsView currentUser={currentUser} />
            ) : currentView === 'resources' ? (
              <ResourcesView currentUser={currentUser} />
            ) : currentView === 'budget' ? (
              <BudgetView />
            ) : currentView === 'ai' ? (
              <AIView />
            ) : (
              <>
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

                <div className="space-y-2">
                  <label htmlFor="ccEmail" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                    <Mail className="w-4 h-4 text-slate-400" />
                    CC Recipient
                  </label>
                  <select
                    id="ccEmail"
                    value={ccEmail}
                    onChange={(e) => setCcEmail(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  >
                    {CC_OPTIONS.map(option => (
                      <option key={option.email} value={option.email}>
                        {option.name}
                      </option>
                    ))}
                  </select>
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
                <button
                  type="button"
                  onClick={() => setShowPreview(!showPreview)}
                  className="px-6 py-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 font-semibold text-slate-700 transition-all flex items-center justify-center gap-2"
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
                    <p className="text-sm font-bold text-slate-900">Upcoming Batch (Part I)</p>
                    <p className="text-sm text-slate-500">{emailPlaceholders.courseDatesPart1 || "May 28 - June 21, 2026"}</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                    <Clock className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Timings</p>
                    <p className="text-sm text-slate-500">{emailPlaceholders.courseTimings || "06:00 PM - 09:30 PM IST"}</p>
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
              <p className="text-sm text-slate-500">Choose a batch or upload a CSV/Excel file with "Name" and "Email" columns.</p>
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
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="batchSelect" className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                  <Users className="w-4 h-4 text-slate-400" />
                  Select Batch
                </label>
                <select
                  id="batchSelect"
                  value={selectedBatch}
                  onChange={(e) => {
                    setSelectedBatch(e.target.value);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                    if (!e.target.value) setBulkData([]);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                >
                  <option value="">-- Choose a Batch --</option>
                  {availableBatches.map(batch => (
                    <option key={batch} value={batch}>
                      Batch {batch}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-slate-200"></div>
                <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-semibold uppercase">Or Upload File</span>
                <div className="flex-grow border-t border-slate-200"></div>
              </div>

              <div className="relative group">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".csv, .xlsx, .xls"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="border-2 border-dashed border-slate-200 group-hover:border-blue-400 rounded-2xl p-6 transition-all flex flex-col items-center justify-center gap-3 bg-slate-50 group-hover:bg-blue-50/30">
                  <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center">
                    <FileText className="w-5 h-5 text-slate-400 group-hover:text-blue-500 transition-colors" />
                  </div>
                  <p className="text-sm font-semibold text-slate-600">
                    {bulkData.length > 0 && !selectedBatch ? `${bulkData.length} clients loaded from file` : "Click or drag file here"}
                  </p>
                  <p className="text-xs text-slate-400">Supports .csv, .xlsx, .xls</p>
                </div>
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
                    disabled={isBulkSending || isBulkAddingCalendar}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-emerald-100 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                  >
                    {isBulkSending ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Sending {bulkProgress.current}/{bulkProgress.total}
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        Start Bulk Email Sending
                      </>
                    )}
                  </button>

                  <div className="pt-4 border-t border-slate-100 space-y-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Calendar className="w-3 h-3" />
                        Select Target Calendar
                      </label>
                      <div className="grid grid-cols-4 gap-2">
                        {[1, 2, 3, 4].map(num => (
                          <button
                            key={num}
                            onClick={() => setSelectedCalendarNum(num)}
                            className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                              selectedCalendarNum === num 
                                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 ring-2 ring-indigo-500/20' 
                                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                            }`}
                          >
                            #{num}
                          </button>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={handleBulkCalendarAdd}
                      disabled={isBulkSending || isBulkAddingCalendar}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 disabled:bg-slate-300"
                    >
                      {isBulkAddingCalendar ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin" />
                          Syncing {bulkProgress.current}/{bulkProgress.total}
                        </>
                      ) : (
                        <>
                          <Calendar className="w-4 h-4" />
                          Start Bulk Calendar Sync
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
              
              {(isBulkSending || isBulkAddingCalendar) && (
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

                  <p>The world of Coaching is an exciting space in which we Inspire, Implement, Integrate, and Celebrate our client’s insights and accomplishments. Coaching allows us to unblock that ability in us. We are passionate about supporting you to extend your reach and become even more than you dreamed possible.</p>
                  
                  <p>It’s an exciting time for Erickson Coaching International (India Team) and xMonks (Inspire Coaching Systems) as we continue to grow and adapt, remaining always curious, customer-focused, authentic, vulnerable, and committed. Our organization is going through a very humbling phase where we are doing several transformational interventions with many esteemed organizations in the country.</p>
                  
                  <p>With just a few days from the upcoming online batch of "The Art and Science of Coaching (The Essentials Course)" starting Thursday, 28th May, 2026, I would like to share the following details with you:</p>
                  
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

                  <p className="text-sm text-slate-500">
                    Please note that Part I & II Online consists of 16 live online Zoom sessions each lasting 3.50 hours with an expectation of approximately 45 minutes of outside class time work per online session. We will start at 6:00 PM every day and conclude by 9:30 PM.
                  </p>

                  <p>Before we close, our sincere thanks to you once again for trusting us and bringing your expertise to this program. You, as an organization leader, have the vision, the knowledge, and the experience to add tremendous value to the workshop. Throughout this program, we ask you to stay engaged, and curious, keep us proactive and help us shape the future of Coaching in India.</p>

                  <p>We all have it in us to thrive and be the best version of ourselves. We look forward to the magic we’ll co-create in your life. Get ready for super exciting sessions. I wish you all the very best for your Coaching journey and assure you of our utmost commitment. Should you need any clarification, please feel free to reach out to me.</p>

                  <p>My personal respect and thanks go out to all of you. Let’s change the world, one conversation at a time!</p>

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
              </>
            )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 py-12 text-center text-slate-400 text-sm">
        <p>© 2026 Erickson Coaching International (India Team) & xMonks. All rights reserved.</p>
      </footer>
        </>
      )}
    </div>
  );
}
