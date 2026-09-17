import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import { 
  Save, 
  Loader2, 
  Link as LinkIcon, 
  Plus, 
  Trash2, 
  Edit2, 
  X, 
  Calendar, 
  Settings, 
  Check,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  Key,
  Globe,
  AlertCircle,
  Video,
  ExternalLink,
  Sparkles,
  RotateCcw,
  Clock
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { parseCourseTimings, getCourseTimingParagraph } from "../utils/timingUtils";

interface BatchROI {
  id: string;
  name: string;
  startDate: string;
  conversions: Record<string, number>;
  spendMonths: string[];
}

const DEFAULT_BATCH_RECORDS: BatchROI[] = [
  {
    id: "66",
    name: "Batch 66",
    startDate: "2026-09-17",
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ["2026-09", "2026-10"],
  },
  {
    id: "67",
    name: "Batch 67",
    startDate: "2026-09-19",
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ["2026-09", "2026-10"],
  },
  {
    id: "68",
    name: "Batch 68",
    startDate: "2026-11-26",
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ["2026-11", "2026-12"],
  },
];

export default function DeveloperView() {
  const [activeTab, setActiveTab] = useState<'settings' | 'batches' | 'zoho'>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Zoho Connection State
  const [zohoStatus, setZohoStatus] = useState<any>(null);
  const [isCheckingZoho, setIsCheckingZoho] = useState(false);
  const [isTestingZoho, setIsTestingZoho] = useState(false);
  const [zohoTestResult, setZohoTestResult] = useState<any>(null);

  // Zoho Form Override State (saved to Firestore)
  const [zohoForm, setZohoForm] = useState({
    clientId: "",
    clientSecret: "",
    refreshToken: "",
    region: "in"
  });
  const [isSavingZohoConfig, setIsSavingZohoConfig] = useState(false);

  // Zoho Grant Code Exchange State
  const [grantCodeInput, setGrantCodeInput] = useState("");
  const [isExchangingCode, setIsExchangingCode] = useState(false);
  const [exchangeResult, setExchangeResult] = useState<any>(null);

  // Tab 1: Email & Calendar Settings
  const [settings, setSettings] = useState({
    link1: "",
    link2: "",
    link3: "",
    link4: "",
    courseDatesPart1: "28th May - 31st May, 2026 & 04th June - 07th June, 2026",
    courseDatesPart2: "11th June - 14th June, 2026 & 18th June - 21st June, 2026",
    courseTimings: "06:00 - 09:30 PM IST",
    courseTimingNote: "",
    gratitudeDiariesLink: "https://www.xmonks.com/Metaphor%20Diaries%20from%20xMonks%20Batch-63_2026.pdf",
    zoomLink: "https://us06web.zoom.us/j/85070565878?pwd=VCLc9OaHuJAaxWnWiPrj3ybPjiH8M3.1",
    zoomMeetingId: "850 7056 5878",
    zoomPasscode: "462023",
    zoomButtonLabel: "Join Zoom Meeting",
  });

  // Tab 2: Batch Management
  const [roiData, setRoiData] = useState<{
    batches: BatchROI[];
    courseFee: number;
    useCrmConversions: boolean;
  }>({
    batches: [],
    courseFee: 160000,
    useCrmConversions: true,
  });

  // Batch Form State
  const [editingBatch, setEditingBatch] = useState<BatchROI | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formState, setFormState] = useState({
    id: "",
    name: "",
    startDate: "",
    spendMonthsStr: "",
  });

  useEffect(() => {
    // 1. Listen to settings/calendarLinks
    const docRef = doc(db, 'settings', 'calendarLinks');
    const unsubscribeLinks = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSettings(prev => ({ 
          ...prev, 
          ...(data as any),
          zoomLink: data.zoomLink !== undefined ? data.zoomLink : prev.zoomLink,
          zoomMeetingId: data.zoomMeetingId !== undefined ? data.zoomMeetingId : prev.zoomMeetingId,
          zoomPasscode: data.zoomPasscode !== undefined ? data.zoomPasscode : prev.zoomPasscode,
          zoomButtonLabel: data.zoomButtonLabel !== undefined ? data.zoomButtonLabel : prev.zoomButtonLabel,
        }));
      }
    });

    // 2. Listen to settings/roiData
    const roiRef = doc(db, 'settings', 'roiData');
    const unsubscribeRoi = onSnapshot(roiRef, async (roiSnap) => {
      let currentBatches: BatchROI[] = [];
      let courseFee = 160000;
      let useCrmConversions = true;

      if (roiSnap.exists()) {
        const rData = roiSnap.data();
        currentBatches = rData.batches || [];
        courseFee = rData.courseFee !== undefined ? rData.courseFee : 160000;
        useCrmConversions = rData.useCrmConversions !== undefined ? rData.useCrmConversions : true;
      }

      // Merge defaults if missing or outdated
      let hasUpdates = false;
      const mergedBatches = [...currentBatches];

      DEFAULT_BATCH_RECORDS.forEach(dbat => {
        const existingIndex = mergedBatches.findIndex(b => b.id === dbat.id);
        if (existingIndex === -1) {
          mergedBatches.push(dbat);
          hasUpdates = true;
        } else {
          const ext = mergedBatches[existingIndex];
          if (!ext.startDate || ext.startDate !== dbat.startDate) {
            mergedBatches[existingIndex] = {
              ...ext,
              startDate: dbat.startDate
            };
            hasUpdates = true;
          }
        }
      });

      if (hasUpdates) {
        mergedBatches.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        try {
          await setDoc(roiRef, {
            batches: mergedBatches,
            courseFee,
            useCrmConversions,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          console.error("Error auto-seeding batch records:", error);
        }
        currentBatches = mergedBatches;
      }

      setRoiData({
        batches: currentBatches,
        courseFee,
        useCrmConversions
      });
      setIsLoading(false);
    }, (error) => {
      console.error("Error listening to roiData in developer settings:", error);
      setIsLoading(false);
    });

    // 3. Listen to settings/zohoConfig
    const zohoRef = doc(db, 'settings', 'zohoConfig');
    const unsubscribeZoho = onSnapshot(zohoRef, (docSnap) => {
      if (docSnap.exists()) {
        const zData = docSnap.data();
        setZohoForm(prev => ({
          ...prev,
          clientId: zData.clientId || "",
          clientSecret: zData.clientSecret || "",
          refreshToken: zData.refreshToken || "",
          region: zData.region || "in"
        }));
      }
    });

    fetchZohoStatus();

    return () => {
      unsubscribeLinks();
      unsubscribeRoi();
      unsubscribeZoho();
    };
  }, []);

  const fetchZohoStatus = async () => {
    setIsCheckingZoho(true);
    try {
      const res = await fetch("/api/zoho/status");
      if (res.ok) {
        const data = await res.json();
        setZohoStatus(data);
      }
    } catch (e) {
      console.warn("Error fetching Zoho status:", e);
    } finally {
      setIsCheckingZoho(false);
    }
  };

  const handleTestZohoConnection = async (overrideData?: any) => {
    setIsTestingZoho(true);
    setZohoTestResult(null);
    try {
      const payload = overrideData || {
        clientId: zohoForm.clientId,
        clientSecret: zohoForm.clientSecret,
        refreshToken: zohoForm.refreshToken,
        region: zohoForm.region
      };

      const res = await fetch("/api/zoho/test-connection", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setZohoTestResult(data);
      // Refresh status as well
      await fetchZohoStatus();
    } catch (err: any) {
      setZohoTestResult({
        success: false,
        error: "Network request failed: " + err.message
      });
    } finally {
      setIsTestingZoho(false);
    }
  };

  const handleSaveZohoConfig = async () => {
    setIsSavingZohoConfig(true);
    setSaveStatus({ type: null, message: '' });
    try {
      await setDoc(doc(db, 'settings', 'zohoConfig'), {
        clientId: zohoForm.clientId.trim(),
        clientSecret: zohoForm.clientSecret.trim(),
        refreshToken: zohoForm.refreshToken.trim(),
        region: zohoForm.region.trim().toLowerCase(),
        updatedAt: new Date().toISOString()
      }, { merge: true });

      setSaveStatus({ type: 'success', message: 'Zoho CRM credentials saved to project database successfully!' });
      await fetchZohoStatus();
    } catch (e: any) {
      console.error("Error saving Zoho config:", e);
      setSaveStatus({ type: 'error', message: 'Failed to save Zoho configuration: ' + e.message });
    } finally {
      setIsSavingZohoConfig(false);
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 4000);
    }
  };

  const handleExchangeGrantCode = async () => {
    if (!grantCodeInput.trim()) return;
    setIsExchangingCode(true);
    setExchangeResult(null);
    try {
      const res = await fetch("/api/zoho/exchange-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: grantCodeInput.trim(),
          clientId: zohoForm.clientId,
          clientSecret: zohoForm.clientSecret,
          region: zohoForm.region
        })
      });
      const data = await res.json();
      setExchangeResult(data);
      if (data.success && data.refreshToken) {
        setZohoForm(prev => ({ ...prev, refreshToken: data.refreshToken }));
        setGrantCodeInput("");
        await fetchZohoStatus();
      }
    } catch (err: any) {
      setExchangeResult({ success: false, error: "Failed to exchange code: " + err.message });
    } finally {
      setIsExchangingCode(false);
    }
  };

  const formatMeetingId = (rawId: string) => {
    const digits = rawId.replace(/\s+/g, '');
    if (digits.length === 11) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 7)} ${digits.slice(7)}`;
    } else if (digits.length === 10) {
      return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    }
    return rawId;
  };

  const handleAutoExtractFromZoomUrl = (url: string) => {
    if (!url) return;
    let meetingId = "";
    let passcode = "";

    const idMatch = url.match(/\/j\/([0-9]+)/);
    if (idMatch && idMatch[1]) {
      meetingId = formatMeetingId(idMatch[1]);
    }

    const pwdMatch = url.match(/[?&]pwd=([^&#]+)/);
    if (pwdMatch && pwdMatch[1]) {
      passcode = decodeURIComponent(pwdMatch[1]);
    }

    setSettings(prev => ({
      ...prev,
      zoomMeetingId: meetingId || prev.zoomMeetingId,
      zoomPasscode: passcode || prev.zoomPasscode,
    }));
  };

  const handleZoomUrlChange = (url: string) => {
    let meetingId = settings.zoomMeetingId;
    let passcode = settings.zoomPasscode;

    const idMatch = url.match(/\/j\/([0-9]+)/);
    if (idMatch && idMatch[1]) {
      const formatted = formatMeetingId(idMatch[1]);
      if (!meetingId || meetingId === "850 7056 5878") {
        meetingId = formatted;
      }
    }

    const pwdMatch = url.match(/[?&]pwd=([^&#]+)/);
    if (pwdMatch && pwdMatch[1]) {
      if (!passcode || passcode === "462023") {
        passcode = decodeURIComponent(pwdMatch[1]);
      }
    }

    setSettings(prev => ({
      ...prev,
      zoomLink: url,
      zoomMeetingId: meetingId,
      zoomPasscode: passcode,
    }));
  };

  const handleResetZoomDefaults = () => {
    setSettings(prev => ({
      ...prev,
      zoomLink: "https://us06web.zoom.us/j/85070565878?pwd=VCLc9OaHuJAaxWnWiPrj3ybPjiH8M3.1",
      zoomMeetingId: "850 7056 5878",
      zoomPasscode: "462023",
      zoomButtonLabel: "Join Zoom Meeting",
    }));
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });
    try {
      await setDoc(doc(db, 'settings', 'calendarLinks'), settings);
      setSaveStatus({ type: 'success', message: 'Calendar and Email settings saved successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    }
  };

  const handleSaveRoiData = async (updatedBatches: BatchROI[]) => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });
    try {
      await setDoc(doc(db, 'settings', 'roiData'), {
        ...roiData,
        batches: updatedBatches,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      setRoiData(prev => ({ ...prev, batches: updatedBatches }));
      setSaveStatus({ type: 'success', message: 'Batch configuration saved successfully!' });
    } catch (error) {
      console.error("Error saving batch data:", error);
      setSaveStatus({ type: 'error', message: 'Failed to save batch configuration.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    }
  };

  const handleStartEdit = (batch: BatchROI) => {
    setEditingBatch(batch);
    setIsAddingNew(false);
    setFormState({
      id: batch.id,
      name: batch.name,
      startDate: batch.startDate || "",
      spendMonthsStr: batch.spendMonths ? batch.spendMonths.join(", ") : "",
    });
  };

  const handleStartAdd = () => {
    setEditingBatch(null);
    setIsAddingNew(true);
    // Find next potential batch ID
    const nextId = roiData.batches.length > 0
      ? (Math.max(...roiData.batches.map(b => parseInt(b.id) || 0)) + 1).toString()
      : "65";
    setFormState({
      id: nextId,
      name: `Batch ${nextId}`,
      startDate: new Date().toISOString().split('T')[0],
      spendMonthsStr: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    });
  };

  const handleSaveBatchForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.id.trim() || !formState.name.trim() || !formState.startDate.trim()) {
      setSaveStatus({ type: 'error', message: 'Batch ID, Name and Start Date are required.' });
      return;
    }

    const cleanedSpendMonths = formState.spendMonthsStr
      .split(",")
      .map(s => s.trim())
      .filter(s => s.length > 0);

    let updatedBatches = [...roiData.batches];

    if (isAddingNew) {
      if (updatedBatches.some(b => b.id === formState.id.trim())) {
        setSaveStatus({ type: 'error', message: `Batch ID "${formState.id}" already exists.` });
        return;
      }

      const newBatch: BatchROI = {
        id: formState.id.trim(),
        name: formState.name.trim(),
        startDate: formState.startDate.trim(),
        conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
        spendMonths: cleanedSpendMonths,
      };
      updatedBatches.push(newBatch);
    } else if (editingBatch) {
      // Remove original, and insert updated
      updatedBatches = updatedBatches.map(b => {
        if (b.id === editingBatch.id) {
          return {
            ...b,
            id: formState.id.trim(),
            name: formState.name.trim(),
            startDate: formState.startDate.trim(),
            spendMonths: cleanedSpendMonths,
          };
        }
        return b;
      });
    }

    // Sort batches numerically by ID descending (or ascending, ascending makes sense for sequence)
    updatedBatches.sort((a, b) => {
      const numA = parseInt(a.id) || 0;
      const numB = parseInt(b.id) || 0;
      return numA - numB;
    });

    await handleSaveRoiData(updatedBatches);
    setIsAddingNew(false);
    setEditingBatch(null);
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!window.confirm(`Are you sure you want to delete Batch ${batchId}?`)) {
      return;
    }
    const updatedBatches = roiData.batches.filter(b => b.id !== batchId);
    await handleSaveRoiData(updatedBatches);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto space-y-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Developer Settings</h2>
          <p className="text-slate-500">Configure core integration parameters, calendar linkages, and batch timeline configurations.</p>
        </div>

        {/* Action feedback banner if any */}
        {saveStatus.type && (
          <div className={`px-4 py-2 rounded-xl border text-sm font-medium ${
            saveStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}>
            {saveStatus.message}
          </div>
        )}
      </div>

      {/* Tabs Switcher */}
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-lg border border-slate-200">
        <button
          onClick={() => { setActiveTab('settings'); setIsAddingNew(false); setEditingBatch(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
            activeTab === 'settings' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Settings className="w-4 h-4" />
          Email & Calendar
        </button>
        <button
          onClick={() => { setActiveTab('batches'); setIsAddingNew(false); setEditingBatch(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
            activeTab === 'batches' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <Layers className="w-4 h-4" />
          Batch Records
        </button>
        <button
          onClick={() => { setActiveTab('zoho'); setIsAddingNew(false); setEditingBatch(null); }}
          className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold transition-all duration-150 flex items-center justify-center gap-2 ${
            activeTab === 'zoho' 
              ? "bg-white text-slate-900 shadow-sm" 
              : "text-slate-600 hover:text-slate-900 hover:bg-white/50"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-amber-600" />
          Zoho CRM
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'settings' ? (
          <motion.div
            key="settings"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8"
          >
            <div className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                Recurring Calendar Links
              </h3>
              <p className="text-sm text-slate-500">
                Paste the full Google Calendar Template links here. The system will extract the `tmeid` ID automatically when adding participants.
              </p>

              <div className="space-y-6 pt-4">
                {[1, 2, 3, 4].map((num) => {
                  const key = `link${num}` as keyof typeof settings;
                  return (
                    <div key={num} className="space-y-2">
                      <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center text-xs text-slate-600 border border-slate-200">{num}</span>
                        Calendar Link {num}
                      </label>
                      <input
                        type="url"
                        value={settings[key]}
                        onChange={(e) => setSettings(prev => ({ ...prev, [key]: e.target.value }))}
                        placeholder="https://calendar.google.com/calendar/event?action=TEMPLATE&tmeid=..."
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                Email Placeholders & Batches
              </h3>
              <p className="text-sm text-slate-500">
                Configure default dates and timings that will be injected into automated candidate welcome emails.
              </p>

              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Course Dates (Part I)</label>
                    <input
                      type="text"
                      value={settings.courseDatesPart1}
                      onChange={(e) => setSettings(prev => ({ ...prev, courseDatesPart1: e.target.value }))}
                      placeholder="28th May - 31st May, 2026..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-slate-700">Course Dates (Part II)</label>
                    <input
                      type="text"
                      value={settings.courseDatesPart2}
                      onChange={(e) => setSettings(prev => ({ ...prev, courseDatesPart2: e.target.value }))}
                      placeholder="11th June - 14th June, 2026..."
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="text-sm font-semibold text-slate-700">Course Timings</label>
                    {(() => {
                      const parsed = parseCourseTimings(settings.courseTimings);
                      return (
                        <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-600">
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                            <Clock className="w-3 h-3" /> Start: <strong>{parsed.startTime}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                            Conclude: <strong>{parsed.endTime}</strong>
                          </span>
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md border border-emerald-100">
                            Duration: <strong>{parsed.durationText}</strong>
                          </span>
                        </div>
                      );
                    })()}
                  </div>
                  <input
                    type="text"
                    value={settings.courseTimings}
                    onChange={(e) => setSettings(prev => ({ ...prev, courseTimings: e.target.value }))}
                    placeholder="06:00 - 09:30 PM IST"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                  />
                  <p className="text-xs text-slate-400">
                    Supports 12-hour or 24-hour format (e.g., "06:00 - 09:30 PM IST", "10:00 AM - 01:30 PM", "18:00 - 21:30 IST").
                  </p>
                </div>

                {/* Dynamic Session Note / Paragraph Preview & Customization */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-slate-800">
                        Dynamic Session Schedule Paragraph (Welcome Email Note)
                      </span>
                    </div>
                    {settings.courseTimingNote && settings.courseTimingNote.trim() && (
                      <button
                        type="button"
                        onClick={() => setSettings(prev => ({ ...prev, courseTimingNote: "" }))}
                        className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1 hover:underline"
                      >
                        <RotateCcw className="w-3 h-3" /> Reset to Auto-Generated
                      </button>
                    )}
                  </div>

                  <p className="text-xs text-slate-500">
                    This paragraph appears in the welcome email below the meeting access button. It automatically extracts your session start time, conclusion time, and duration from <strong>Course Timings</strong> above.
                  </p>

                  <div className="bg-white border border-slate-200 rounded-lg p-3 text-sm text-slate-600 italic">
                    "{getCourseTimingParagraph(settings.courseTimings, settings.courseTimingNote)}"
                  </div>

                  <div className="pt-1">
                    <details className="text-xs text-slate-600 group">
                      <summary className="cursor-pointer font-medium text-blue-600 hover:text-blue-700 inline-flex items-center gap-1 select-none">
                        <span>Edit custom paragraph wording (optional override)</span>
                      </summary>
                      <div className="mt-2 space-y-2">
                        <textarea
                          rows={3}
                          value={settings.courseTimingNote || ""}
                          onChange={(e) => setSettings(prev => ({ ...prev, courseTimingNote: e.target.value }))}
                          placeholder="Leave blank to automatically generate from Course Timings..."
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                        />
                        <p className="text-[11px] text-slate-400">
                          If left blank, the paragraph automatically adapts to any new timing you type in Course Timings.
                        </p>
                      </div>
                    </details>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-600" />
                    Zoom Meeting Details (Join Zoom Button)
                  </h3>
                  <p className="text-sm text-slate-500">
                    Configure the dynamic Zoom link and meeting access credentials displayed on the "Join Zoom Meeting" button and summary inside candidate welcome emails.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetZoomDefaults}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                    title="Reset to default Erickson Zoom link"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Reset Default
                  </button>
                  {settings.zoomLink && (
                    <a
                      href={settings.zoomLink}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Test Link
                    </a>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                      Zoom Join Meeting URL
                      <span className="text-xs text-blue-600 font-normal">(Dynamic button href)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => handleAutoExtractFromZoomUrl(settings.zoomLink)}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium underline flex items-center gap-1 cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" /> Extract ID & Passcode from URL
                    </button>
                  </div>
                  <input
                    type="url"
                    value={settings.zoomLink}
                    onChange={(e) => handleZoomUrlChange(e.target.value)}
                    placeholder="https://us06web.zoom.us/j/85070565878?pwd=..."
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                  />
                  <p className="text-xs text-slate-400">
                    Pasting a link with <code className="text-slate-600 bg-slate-100 px-1 py-0.5 rounded">/j/MEETING_ID?pwd=PASSCODE</code> will automatically populate the Meeting ID and Passcode fields.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Button Label / Text</label>
                  <input
                    type="text"
                    value={settings.zoomButtonLabel}
                    onChange={(e) => setSettings(prev => ({ ...prev, zoomButtonLabel: e.target.value }))}
                    placeholder="Join Zoom Meeting"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm font-medium"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Meeting ID</label>
                  <input
                    type="text"
                    value={settings.zoomMeetingId}
                    onChange={(e) => setSettings(prev => ({ ...prev, zoomMeetingId: e.target.value }))}
                    placeholder="850 7056 5878"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700">Passcode</label>
                  <input
                    type="text"
                    value={settings.zoomPasscode}
                    onChange={(e) => setSettings(prev => ({ ...prev, zoomPasscode: e.target.value }))}
                    placeholder="462023"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                  />
                </div>
              </div>

              {/* Live Preview Box */}
              <div className="mt-4 p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Live Email Preview</p>
                  <span className="text-xs text-slate-400">What the participant sees</span>
                </div>
                <div className="p-5 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-3">
                    <a
                      href={settings.zoomLink || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-block bg-[#0056b3] hover:bg-blue-700 text-white px-6 py-2.5 rounded-lg font-bold text-sm shadow-sm transition-all"
                    >
                      {settings.zoomButtonLabel || "Join Zoom Meeting"}
                    </a>
                    {(settings.zoomMeetingId || settings.zoomPasscode) && (
                      <div className="text-xs text-slate-600 font-mono space-y-0.5">
                        {settings.zoomMeetingId && <p>Meeting ID: <strong className="text-slate-800">{settings.zoomMeetingId}</strong></p>}
                        {settings.zoomPasscode && <p>Passcode: <strong className="text-slate-800">{settings.zoomPasscode}</strong></p>}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-slate-400 sm:text-right max-w-xs break-all">
                    <span className="font-semibold text-slate-600">Button URL Target:</span>
                    <p className="font-mono text-slate-500 mt-1 line-clamp-2">{settings.zoomLink || "(None set)"}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-4 pt-8 border-t border-slate-100">
              <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-blue-600" />
                Template Links
              </h3>
              <p className="text-sm text-slate-500">
                Configure external links used in email templates.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700">Gratitude Diaries Link</label>
                <input
                  type="url"
                  value={settings.gratitudeDiariesLink}
                  onChange={(e) => setSettings(prev => ({ ...prev, gratitudeDiariesLink: e.target.value }))}
                  placeholder="https://www.xmonks.com/Metaphor%20Diaries.pdf"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none font-mono text-sm"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-center justify-end">
              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Save Configuration
              </button>
            </div>
          </motion.div>
        ) : activeTab === 'batches' ? (
          <motion.div
            key="batches"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* Form Drawer / Container for Add or Edit Batch */}
            <AnimatePresence>
              {(isAddingNew || editingBatch) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="bg-slate-50 rounded-3xl border border-slate-200 p-6 overflow-hidden space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-blue-600" />
                      {isAddingNew ? "Add New Batch Record" : `Edit Batch ${editingBatch?.id}`}
                    </h4>
                    <button
                      onClick={() => { setIsAddingNew(false); setEditingBatch(null); }}
                      className="p-1.5 rounded-full hover:bg-slate-200 text-slate-500 hover:text-slate-800 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveBatchForm} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Batch ID / Number</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingBatch} // don't change original id if editing
                        value={formState.id}
                        onChange={(e) => setFormState(prev => ({ ...prev, id: e.target.value }))}
                        placeholder="65"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-mono disabled:opacity-60"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Batch Display Name</label>
                      <input
                        type="text"
                        required
                        value={formState.name}
                        onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="Batch 65"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Starting Date</label>
                      <input
                        type="date"
                        required
                        value={formState.startDate}
                        onChange={(e) => setFormState(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-slate-600">Spend Months (comma separated)</label>
                      <input
                        type="text"
                        value={formState.spendMonthsStr}
                        onChange={(e) => setFormState(prev => ({ ...prev, spendMonthsStr: e.target.value }))}
                        placeholder="2026-06, 2026-07"
                        className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none text-sm font-mono"
                      />
                      <p className="text-[10px] text-slate-400">Specifies the months when Google/Meta spends are tracked for this batch.</p>
                    </div>

                    <div className="md:col-span-2 pt-2 flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => { setIsAddingNew(false); setEditingBatch(null); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="px-5 py-2 rounded-xl text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 cursor-pointer disabled:opacity-50 shadow-md shadow-blue-100"
                      >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                        {isAddingNew ? "Add Batch" : "Save Changes"}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>

            {/* List of Batches Container */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-blue-600" />
                    Current & Upcoming Batches
                  </h3>
                  <p className="text-sm text-slate-500">
                    Maintain the records, starting dates, and spend parameters for your Erickson batch pipeline.
                  </p>
                </div>
                {!isAddingNew && !editingBatch && (
                  <button
                    onClick={handleStartAdd}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-blue-100"
                  >
                    <Plus className="w-4 h-4" />
                    New Batch
                  </button>
                )}
              </div>

              <div className="overflow-x-auto border border-slate-150 rounded-2xl">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-150 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-4">ID</th>
                      <th className="px-6 py-4">Batch Name</th>
                      <th className="px-6 py-4">Start Date</th>
                      <th className="px-6 py-4">Spend Months</th>
                      <th className="px-6 py-4">Conversions</th>
                      <th className="px-6 py-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-sm text-slate-700 font-medium">
                    {roiData.batches.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                          No batch records found. Add one to get started!
                        </td>
                      </tr>
                    ) : (
                      roiData.batches.map((batch) => (
                        <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">
                            {batch.id}
                          </td>
                          <td className="px-6 py-4 text-slate-900">
                            {batch.name}
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 rounded-lg text-slate-700 text-xs font-semibold">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {batch.startDate || "Not Set"}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono text-xs">
                            {batch.spendMonths && batch.spendMonths.length > 0 
                              ? batch.spendMonths.join(", ") 
                              : <span className="text-slate-400 italic">None</span>
                            }
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex flex-wrap gap-1 max-w-[220px]">
                              {Object.entries(batch.conversions || {}).map(([platform, count]) => (
                                (count as number) > 0 && (
                                  <span key={platform} className="inline-flex items-center text-[10px] font-bold px-1.5 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded">
                                    {platform}: {count}
                                  </span>
                                )
                              ))}
                              {Object.values(batch.conversions || {}).every(v => (v as number) === 0) && (
                                <span className="text-slate-400 italic text-xs">0 conversions</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleStartEdit(batch)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
                                title="Edit batch information"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteBatch(batch.id)}
                                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-rose-600 transition-colors cursor-pointer"
                                title="Delete batch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="zoho"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.15 }}
            className="space-y-6"
          >
            {/* 1. Live Environment Status Header Card */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
                    <ShieldCheck className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-slate-900">Zoho CRM Integration Status</h3>
                    <p className="text-sm text-slate-500">Live OAuth credentials & API connection diagnostics</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={fetchZohoStatus}
                    disabled={isCheckingZoho}
                    className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors flex items-center gap-2 text-xs font-semibold"
                    title="Refresh server status"
                  >
                    <RefreshCw className={`w-4 h-4 ${isCheckingZoho ? 'animate-spin text-blue-600' : ''}`} />
                    Refresh
                  </button>

                  <button
                    onClick={() => handleTestZohoConnection()}
                    disabled={isTestingZoho}
                    className="px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    {isTestingZoho ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4" />
                        Test Connection
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Status Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client ID</span>
                    {zohoStatus?.clientIdConfigured ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-800 truncate font-semibold">
                    {zohoStatus?.clientIdMasked || "Not Set"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Client Secret</span>
                    {zohoStatus?.clientSecretConfigured ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        Missing
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-800 font-semibold">
                    {zohoStatus?.clientSecretConfigured ? "••••••••••••••••" : "Not Set"}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refresh Token</span>
                    {zohoStatus?.refreshTokenConfigured ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                        Configured
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                        Missing in Env
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-slate-800 truncate font-semibold">
                    {zohoStatus?.refreshTokenMasked || (zohoForm.refreshToken ? "Set in Database" : "Not Set")}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Region</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                      {zohoStatus?.region || "IN"}
                    </span>
                  </div>
                  <p className="font-mono text-xs text-slate-800 truncate font-semibold">
                    {zohoStatus?.accountsDomain || "accounts.zoho.in"}
                  </p>
                </div>
              </div>

              {/* Test Result Alert if any */}
              {zohoTestResult && (
                <div className={`p-5 rounded-2xl border text-sm ${
                  zohoTestResult.success 
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900' 
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <div className="flex items-start gap-3">
                    {zohoTestResult.success ? (
                      <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                        <Check className="w-5 h-5" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0">
                        <AlertCircle className="w-5 h-5" />
                      </div>
                    )}
                    <div className="space-y-1.5 flex-1">
                      <p className="font-bold text-base">
                        {zohoTestResult.success ? "Connection Verified Successfully!" : "Connection Test Failed"}
                      </p>
                      <p className="text-xs font-medium opacity-90">
                        {zohoTestResult.message || zohoTestResult.error}
                      </p>

                      {zohoTestResult.success && (
                        <div className="pt-2 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                          <div className="bg-emerald-100/60 p-2 rounded-lg">
                            <span className="text-emerald-700 block text-[10px] uppercase font-bold">Organization</span>
                            <span className="font-semibold">{zohoTestResult.orgName}</span>
                          </div>
                          <div className="bg-emerald-100/60 p-2 rounded-lg">
                            <span className="text-emerald-700 block text-[10px] uppercase font-bold">Authenticated User</span>
                            <span className="font-semibold">{zohoTestResult.userName || zohoTestResult.userEmail || "Connected"}</span>
                          </div>
                          <div className="bg-emerald-100/60 p-2 rounded-lg">
                            <span className="text-emerald-700 block text-[10px] uppercase font-bold">API Domain</span>
                            <span className="font-semibold">{zohoTestResult.apiDomain}</span>
                          </div>
                        </div>
                      )}

                      {!zohoTestResult.success && zohoTestResult.rawResponse && (
                        <div className="mt-2 p-2.5 bg-rose-100/80 rounded-xl font-mono text-xs overflow-x-auto">
                          {JSON.stringify(zohoTestResult.rawResponse, null, 2)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Direct Credentials Configuration & Firestore Persistence */}
            <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-6">
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Key className="w-5 h-5 text-indigo-600" />
                  Credentials & Database Sync
                </h4>
                <p className="text-sm text-slate-500">
                  Update or verify your Zoho Client ID, Client Secret, and Refresh Token. Saving here writes directly to Firestore so changes take effect immediately without waiting for container redeployment.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zoho Client ID
                  </label>
                  <input
                    type="text"
                    value={zohoForm.clientId}
                    onChange={(e) => setZohoForm({ ...zohoForm, clientId: e.target.value })}
                    placeholder="e.g. 1000.1U4VWHX8RVZMVGYI..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    From your Zoho Developer Console (Self Client or Server-based Application).
                  </p>
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zoho Client Secret
                  </label>
                  <input
                    type="password"
                    value={zohoForm.clientSecret}
                    onChange={(e) => setZohoForm({ ...zohoForm, clientSecret: e.target.value })}
                    placeholder="Client Secret key..."
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zoho Refresh Token (Zoho_Refresh_Token)
                  </label>
                  <input
                    type="text"
                    value={zohoForm.refreshToken}
                    onChange={(e) => setZohoForm({ ...zohoForm, refreshToken: e.target.value })}
                    placeholder="e.g. 1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <p className="text-[11px] text-slate-400">
                    Permanent refresh token generated from the Zoho API Console with CRM scopes.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Zoho Data Center / Region
                  </label>
                  <select
                    value={zohoForm.region}
                    onChange={(e) => setZohoForm({ ...zohoForm, region: e.target.value })}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-medium bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="in">India (.in - accounts.zoho.in)</option>
                    <option value="com">United States (.com - accounts.zoho.com)</option>
                    <option value="eu">Europe (.eu - accounts.zoho.eu)</option>
                    <option value="au">Australia (.com.au - accounts.zoho.com.au)</option>
                    <option value="ca">Canada (.ca - accounts.zoho.ca)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => handleTestZohoConnection({
                    clientId: zohoForm.clientId,
                    clientSecret: zohoForm.clientSecret,
                    refreshToken: zohoForm.refreshToken,
                    region: zohoForm.region
                  })}
                  disabled={isTestingZoho || !zohoForm.clientId || !zohoForm.clientSecret || !zohoForm.refreshToken}
                  className="px-5 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors flex items-center gap-2 disabled:opacity-40"
                >
                  {isTestingZoho ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  Test These Credentials
                </button>

                <button
                  type="button"
                  onClick={handleSaveZohoConfig}
                  disabled={isSavingZohoConfig}
                  className="px-6 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all shadow-sm flex items-center gap-2 disabled:opacity-50"
                >
                  {isSavingZohoConfig ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Saving to Project Database...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Save to Project Database
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* 3. Instant Grant Code Exchanger Card */}
            <div className="bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-white rounded-3xl border border-amber-200/80 p-8 shadow-sm space-y-5">
              <div className="space-y-1">
                <h4 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <RefreshCw className="w-5 h-5 text-amber-600" />
                  Have a Grant Code from Zoho API Console?
                </h4>
                <p className="text-sm text-slate-600 leading-relaxed">
                  If you just generated a code in Zoho API Console (<span className="font-semibold text-slate-800">Self Client &rarr; Generate Code</span>), paste it below. We will immediately exchange it for a permanent Refresh Token and save it to your project database.
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={grantCodeInput}
                    onChange={(e) => setGrantCodeInput(e.target.value)}
                    placeholder="Paste Zoho grant code here (e.g. 1000.xxxx...)"
                    className="flex-1 px-4 py-2.5 rounded-xl border border-amber-200 bg-white text-sm font-mono focus:ring-2 focus:ring-amber-500 focus:outline-none placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={handleExchangeGrantCode}
                    disabled={isExchangingCode || !grantCodeInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-all shadow-sm flex items-center justify-center gap-2 disabled:opacity-50 shrink-0 cursor-pointer"
                  >
                    {isExchangingCode ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Exchanging & Connecting...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Exchange Code & Connect
                      </>
                    )}
                  </button>
                </div>
                <p className="text-[11px] text-amber-900/70">
                  Note: Zoho Grant Codes expire after 2 to 10 minutes. Please exchange right after generating.
                </p>
              </div>

              {exchangeResult && (
                <div className={`p-4 rounded-2xl border text-xs ${
                  exchangeResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}>
                  <p className="font-bold text-sm mb-1">
                    {exchangeResult.success ? "Success!" : "Exchange Failed"}
                  </p>
                  <p>{exchangeResult.message || exchangeResult.error}</p>
                  {exchangeResult.success && exchangeResult.orgName && (
                    <p className="mt-1 font-semibold text-emerald-800">
                      Connected to: {exchangeResult.orgName} ({exchangeResult.userName || exchangeResult.userEmail})
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 4. Setup Instructions & Scopes Guide */}
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-3">
              <h5 className="font-bold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-blue-600" />
                How to generate a Refresh Token in Zoho API Console:
              </h5>
              <ol className="list-decimal pl-5 space-y-1.5 leading-relaxed">
                <li>Log in to the <a href="https://api-console.zoho.in/" target="_blank" rel="noreferrer" className="text-blue-600 underline font-semibold">Zoho API Console (India)</a> or your respective region's API console.</li>
                <li>Select your Client ID or create a <strong>Self Client</strong>.</li>
                <li>In the <strong>Generate Code</strong> tab, enter the scope: <code className="bg-white px-1.5 py-0.5 rounded border border-slate-200 font-bold text-slate-800">ZohoCRM.modules.ALL,ZohoCRM.users.READ,ZohoCRM.org.READ</code></li>
                <li>Choose a duration (e.g. 10 minutes) and enter a description, then click <strong>Generate</strong>.</li>
                <li>Exchange the generated grant code for a permanent <strong>Refresh Token</strong> using Zoho's token endpoint or paste it here.</li>
              </ol>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

