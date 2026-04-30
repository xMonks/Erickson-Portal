import React, { useState, useEffect } from "react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Save, Loader2, Link as LinkIcon, RefreshCw } from "lucide-react";
import { motion } from "motion/react";

export default function DeveloperView() {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docRef = doc(db, 'settings', 'calendarLinks');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSettings(prev => ({ ...prev, ...(docSnap.data() as any) }));
        }
      } catch (error) {
        console.error("Error fetching calendar links:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus({ type: null, message: '' });
    try {
      await setDoc(doc(db, 'settings', 'calendarLinks'), settings);
      setSaveStatus({ type: 'success', message: 'Settings saved successfully!' });
    } catch (error) {
      console.error("Error saving settings:", error);
      setSaveStatus({ type: 'error', message: 'Failed to save settings.' });
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus({ type: null, message: '' }), 3000);
    }
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
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Developer Settings</h2>
        <p className="text-slate-500">Configure core integration parameters, including recurring calendar event links.</p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm space-y-8">
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
            <LinkIcon className="w-5 h-5 text-blue-600" />
            Email Placeholders
          </h3>
          <p className="text-sm text-slate-500">
            Configure the dates and timings that will be injected into the automated welcome emails.
          </p>

          <div className="space-y-4 pt-4">
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
          <div className="space-y-4 pt-4">
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
        </div>

        <div className="pt-6 border-t border-slate-100 flex items-center justify-between">
          <div>
            {saveStatus.type && (
              <p className={`text-sm font-medium ${saveStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                {saveStatus.message}
              </p>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-slate-900 hover:bg-black text-white px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Configuration
          </button>
        </div>
      </div>
    </motion.div>
  );
}
