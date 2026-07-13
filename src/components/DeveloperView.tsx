import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
  ArrowUpRight
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface BatchROI {
  id: string;
  name: string;
  startDate: string;
  conversions: Record<string, number>;
  spendMonths: string[];
}

export default function DeveloperView() {
  const [activeTab, setActiveTab] = useState<'settings' | 'batches'>('settings');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  // Tab 1: Email & Calendar Settings
  const [settings, setSettings] = useState({
    link1: "",
    link2: "",
    link3: "",
    link4: "",
    courseDatesPart1: "28th May - 31st May, 2026 & 04th June - 07th June, 2026",
    courseDatesPart2: "11th June - 14th June, 2026 & 18th June - 21st June, 2026",
    courseTimings: "06:00 - 09:30 PM IST",
    gratitudeDiariesLink: "https://www.xmonks.com/Metaphor%20Diaries%20from%20xMonks%20Batch-63_2026.pdf",
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
    const fetchData = async () => {
      try {
        // Fetch settings/calendarLinks
        const docRef = doc(db, 'settings', 'calendarLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...(docSnap.data() as any) }));
        }

        // Fetch settings/roiData
        const roiRef = doc(db, 'settings', 'roiData');
        const roiSnap = await getDoc(roiRef);
        if (roiSnap.exists()) {
          const rData = roiSnap.data();
          setRoiData({
            batches: rData.batches || [],
            courseFee: rData.courseFee !== undefined ? rData.courseFee : 160000,
            useCrmConversions: rData.useCrmConversions !== undefined ? rData.useCrmConversions : true,
          });
        }
      } catch (error) {
        console.error("Error fetching developer settings:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

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
      <div className="flex gap-2 p-1.5 bg-slate-100 rounded-2xl max-w-md border border-slate-200">
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
                  <label className="text-sm font-semibold text-slate-700">Course Timings</label>
                  <input
                    type="text"
                    value={settings.courseTimings}
                    onChange={(e) => setSettings(prev => ({ ...prev, courseTimings: e.target.value }))}
                    placeholder="06:00 - 09:30 PM IST"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none text-sm"
                  />
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
        ) : (
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
        )}
      </AnimatePresence>
    </motion.div>
  );
}
