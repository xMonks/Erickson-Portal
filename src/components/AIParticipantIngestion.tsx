import React, { useState } from "react";
import { 
  Sparkles, Check, Loader2, AlertCircle, 
  Mail, Phone, MapPin, IndianRupee, 
  Layers, CheckCircle2, Edit3, Trash2, Database,
  ArrowRight, FileText, UserCheck
} from "lucide-react";
import { collection, doc, writeBatch } from "firebase/firestore";
import { db } from "../firebase";

export interface ExtractedParticipant {
  firstName: string;
  lastName: string;
  email: string;
  countryCode: string;
  phone: string;
  company: string;
  designation: string;
  gender: string;
  batchNumber: string;
  city: string;
  industry: string;
  linkedIn: string;
  coachingJourney: string;
  otherPrograms: string;
  cmm: string;
  tcc: string;
  tlc: string;
  clientPartner: string;
  leadSource: string;
  totalAmount: number;
  paymentReceived: number;
  paymentStatus: string;
  fullAddress: string;
}

interface AIParticipantIngestionProps {
  availableBatches?: string[];
  defaultBatch?: string;
  onSavedSuccess?: (participants: any[]) => void;
  className?: string;
}

const SAMPLE_SINGLE_LEAD = `Candidate Profile:
Full Name: Dr. Ananya Sen
Email: ananya.sen@apexhealth.in
Phone: +91 9820123456
Designation: Director of Talent & Leadership
Company: Apex Healthcare Solutions
City: Bengaluru, Karnataka
Cohort Batch: 65
Gender: Female
Industry: Healthcare & Life Sciences
LinkedIn: https://linkedin.com/in/ananyasen-coach
Coaching Journey: Executive Coaching & TASC
Course Fee: 160000
Payment Made: 80000 (Partial advance)
Source: Website Form`;

const SAMPLE_MULTI_LEAD = `Candidate 1:
Name: Rajesh Varma
Email: rajesh.varma@fintechventures.com
Mobile: 9811223344
Designation: Chief Technology Officer
Company: FinTech Ventures India
City: Mumbai
Batch: 65
Fee: 160000, Paid: 160000 (Paid in full)
Source: Referral

Candidate 2:
Name: Meera Iyer
Email: meera.iyer@globaltalent.org
Phone: 9845098765
Designation: VP Human Capital
Company: Global Talent Partners
City: New Delhi
Batch: 65
Fee: 160000, Paid: 50000
Gender: Female
Source: LinkedIn Inquiry`;

export default function AIParticipantIngestion({
  availableBatches = [],
  defaultBatch = "65",
  onSavedSuccess,
  className = ""
}: AIParticipantIngestionProps) {
  const [rawText, setRawText] = useState("");
  const [selectedBatch, setSelectedBatch] = useState(defaultBatch);
  const [isConverting, setIsConverting] = useState(false);
  const [convertError, setConvertError] = useState("");
  const [parsedParticipants, setParsedParticipants] = useState<ExtractedParticipant[]>([]);
  const [summaryMessage, setSummaryMessage] = useState("");
  const [sourceModel, setSourceModel] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const handleConvert = async () => {
    if (!rawText.trim()) {
      setConvertError("Please enter or paste participant details into the text box.");
      return;
    }

    setIsConverting(true);
    setConvertError("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/ai/parse-participant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rawText: rawText.trim(),
          defaultBatchNumber: selectedBatch || defaultBatch
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to parse participant details.");
      }

      if (data.participants && Array.isArray(data.participants) && data.participants.length > 0) {
        setParsedParticipants(data.participants);
        setSummaryMessage(data.summary || `Extracted ${data.participants.length} participant(s) successfully.`);
        setSourceModel(data.source || "gemini-3.8-flash");
      } else {
        throw new Error("Could not extract any participant details. Please check the text format.");
      }
    } catch (err: any) {
      console.error("Conversion error:", err);
      setConvertError(err.message || "An unexpected error occurred while converting.");
    } finally {
      setIsConverting(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (parsedParticipants.length === 0) return;

    setIsSaving(true);
    setConvertError("");

    try {
      const savedDocs: any[] = [];
      const batch = writeBatch(db);

      for (const p of parsedParticipants) {
        const docRef = doc(collection(db, "participants"));
        const participantData = {
          firstName: p.firstName || "Unnamed",
          lastName: p.lastName || "",
          email: p.email || "",
          countryCode: p.countryCode || "+91",
          phone: p.phone || "",
          company: p.company || "",
          designation: p.designation || "",
          gender: p.gender || "",
          batchNumber: p.batchNumber || selectedBatch || defaultBatch || "65",
          city: p.city || "",
          industry: p.industry || "",
          linkedIn: p.linkedIn || "",
          coachingJourney: p.coachingJourney || "TASC",
          otherPrograms: p.otherPrograms || "",
          cmm: p.cmm || "",
          tcc: p.tcc || "",
          tlc: p.tlc || "",
          clientPartner: p.clientPartner || "",
          leadSource: p.leadSource || "Direct",
          totalAmount: Number(p.totalAmount) || 160000,
          paymentReceived: Number(p.paymentReceived) || 0,
          remainingAmount: (Number(p.totalAmount) || 160000) - (Number(p.paymentReceived) || 0),
          paymentStatus: p.paymentStatus || (Number(p.paymentReceived) >= (Number(p.totalAmount) || 160000) ? "Paid" : Number(p.paymentReceived) > 0 ? "Partial" : "Pending"),
          fullAddress: p.fullAddress || "",
          createdAt: new Date().toISOString()
        };

        batch.set(docRef, participantData);
        savedDocs.push({ id: docRef.id, ...participantData });
      }

      await batch.commit();

      setSavedCount(savedDocs.length);
      setSaveSuccess(true);
      if (onSavedSuccess) {
        onSavedSuccess(savedDocs);
      }
    } catch (err: any) {
      console.error("Firestore save error:", err);
      setConvertError("Failed to save to database: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = () => {
    setRawText("");
    setParsedParticipants([]);
    setConvertError("");
    setSummaryMessage("");
    setSaveSuccess(false);
    setEditingIndex(null);
  };

  const updateParticipantField = (index: number, field: keyof ExtractedParticipant, value: any) => {
    setParsedParticipants(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const removeParticipant = (index: number) => {
    setParsedParticipants(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className={`grid grid-cols-1 lg:grid-cols-12 gap-6 ${className}`}>
      
      {/* Left Column: Raw AI Ingestion Column */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">AI Input Column</h3>
              <p className="text-[11px] text-slate-500">Paste unformatted participant or lead details</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_SINGLE_LEAD)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="Load single lead sample"
            >
              Sample 1
            </button>
            <button
              type="button"
              onClick={() => setRawText(SAMPLE_MULTI_LEAD)}
              className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold px-2 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition-colors"
              title="Load 2 leads sample"
            >
              Sample 2
            </button>
          </div>
        </div>

        <div className="relative flex-1">
          <textarea
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={`Paste raw notes, email body, WhatsApp chat, or lead text here...\n\nExample:\nName: Neha Kapoor\nEmail: neha@example.com\nPhone: 9876543210\nCompany: Global Corp\nRole: Head of HR\nCity: Delhi\nBatch: 65`}
            rows={13}
            className="w-full h-full min-h-[260px] p-3.5 text-xs rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all font-mono leading-relaxed placeholder:text-slate-400 custom-scrollbar"
          />
          {rawText && (
            <button
              type="button"
              onClick={() => setRawText("")}
              className="absolute bottom-3 right-3 text-xs text-slate-400 hover:text-slate-600 bg-white/80 backdrop-blur px-2 py-1 rounded border border-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Batch & Conversion Button */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600 whitespace-nowrap">Default Batch:</label>
            <input
              type="text"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              placeholder="e.g. 65"
              className="w-24 px-2.5 py-1 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />
            {availableBatches.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {availableBatches.slice(0, 3).map(b => (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setSelectedBatch(b)}
                    className={`text-xs px-2 py-0.5 rounded border transition-colors ${selectedBatch === b ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                  >
                    {b}
                  </button>
                ))}
              </div>
            )}
          </div>

          {convertError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <div>{convertError}</div>
            </div>
          )}

          <button
            type="button"
            onClick={handleConvert}
            disabled={isConverting || !rawText.trim()}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 text-white font-semibold text-sm shadow-md hover:from-indigo-700 hover:to-blue-700 transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          >
            {isConverting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-white" />
                Converting to DB Structure...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-amber-300" />
                Convert with AI
              </>
            )}
          </button>
        </div>
      </div>

      {/* Right Column: Database Structure Preview & Save */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Database Structure Preview</h3>
              <p className="text-[11px] text-slate-500">Target schema ready for Firestore persistence</p>
            </div>
          </div>

          {parsedParticipants.length > 0 && (
            <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {parsedParticipants.length} Participant{parsedParticipants.length > 1 ? "s" : ""} Ready
            </span>
          )}
        </div>

        {/* Content Box */}
        <div className="flex-1 min-h-[300px] rounded-xl border border-slate-200 bg-white p-4 overflow-y-auto space-y-4 custom-scrollbar">
          {parsedParticipants.length === 0 ? (
            <div className="h-full min-h-[260px] flex flex-col items-center justify-center text-center p-6 text-slate-400 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-500">
                <Database className="w-6 h-6" />
              </div>
              <div>
                <p className="font-bold text-slate-800 text-sm">Waiting for AI Conversion</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Paste unstructured candidate details in the left column and click <span className="font-bold text-indigo-600">"Convert with AI"</span>. The parsed database structure will appear here.
                </p>
              </div>
              <div className="flex flex-wrap justify-center gap-1.5 pt-2 max-w-md">
                {["firstName", "lastName", "email", "phone", "company", "designation", "batchNumber", "city", "paymentStatus", "totalAmount"].map((f) => (
                  <span key={f} className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {f}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {summaryMessage && (
                <div className="p-3 rounded-xl bg-indigo-50/70 border border-indigo-100 text-xs text-indigo-900 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span className="font-medium">{summaryMessage}</span>
                  </div>
                  <span className="text-[10px] font-mono text-indigo-600 uppercase bg-white px-2 py-0.5 rounded border border-indigo-200 font-semibold">
                    {sourceModel}
                  </span>
                </div>
              )}

              {parsedParticipants.map((p, idx) => {
                const isEditingThis = editingIndex === idx;
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-indigo-200 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                          {(p.firstName?.[0] || "P").toUpperCase()}
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {p.firstName} {p.lastName}
                          </h4>
                          <p className="text-xs text-slate-500 flex items-center gap-2">
                            <span>{p.designation || "Participant"}</span>
                            {p.company && <span>• {p.company}</span>}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingIndex(isEditingThis ? null : idx)}
                          className={`p-1.5 rounded-lg border text-xs flex items-center gap-1 transition-colors ${isEditingThis ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                          title="Toggle edit fields"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          {isEditingThis ? "Done" : "Edit"}
                        </button>
                        {parsedParticipants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeParticipant(idx)}
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors"
                            title="Remove candidate"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Fields Grid */}
                    {isEditingThis ? (
                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200 text-xs">
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">First Name</label>
                          <input
                            type="text"
                            value={p.firstName}
                            onChange={(e) => updateParticipantField(idx, "firstName", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Last Name</label>
                          <input
                            type="text"
                            value={p.lastName}
                            onChange={(e) => updateParticipantField(idx, "lastName", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Email</label>
                          <input
                            type="email"
                            value={p.email}
                            onChange={(e) => updateParticipantField(idx, "email", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Phone</label>
                          <input
                            type="text"
                            value={p.phone}
                            onChange={(e) => updateParticipantField(idx, "phone", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Company</label>
                          <input
                            type="text"
                            value={p.company}
                            onChange={(e) => updateParticipantField(idx, "company", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Designation</label>
                          <input
                            type="text"
                            value={p.designation}
                            onChange={(e) => updateParticipantField(idx, "designation", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Batch Number</label>
                          <input
                            type="text"
                            value={p.batchNumber}
                            onChange={(e) => updateParticipantField(idx, "batchNumber", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">City</label>
                          <input
                            type="text"
                            value={p.city}
                            onChange={(e) => updateParticipantField(idx, "city", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Course Fee (INR)</label>
                          <input
                            type="number"
                            value={p.totalAmount}
                            onChange={(e) => updateParticipantField(idx, "totalAmount", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Paid Amount (INR)</label>
                          <input
                            type="number"
                            value={p.paymentReceived}
                            onChange={(e) => updateParticipantField(idx, "paymentReceived", Number(e.target.value))}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Lead Source</label>
                          <input
                            type="text"
                            value={p.leadSource || ""}
                            onChange={(e) => updateParticipantField(idx, "leadSource", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-500 font-semibold">Client Partner</label>
                          <input
                            type="text"
                            value={p.clientPartner || ""}
                            onChange={(e) => updateParticipantField(idx, "clientPartner", e.target.value)}
                            className="w-full px-2 py-1 rounded border border-slate-200 bg-white"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-2 border-t border-slate-200/60 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate font-mono text-[11px]">{p.email || "No Email"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.countryCode} {p.phone || "No Phone"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{p.city || "Not Specified"}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-indigo-700">Batch {p.batchNumber || selectedBatch}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-600 truncate">
                          <IndianRupee className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>Paid: ₹{(p.paymentReceived || 0).toLocaleString()} / ₹{(p.totalAmount || 160000).toLocaleString()}</span>
                        </div>
                        <div>
                          <span className={`inline-block text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${p.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-800' : p.paymentStatus === 'Partial' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'}`}>
                            {p.paymentStatus || 'Pending'}
                          </span>
                        </div>
                        {p.leadSource && (
                          <div className="flex items-center gap-1 text-slate-600 truncate">
                            <span className="text-[10px] font-semibold text-slate-400">Source:</span>
                            <span className="font-medium text-slate-700 truncate">{p.leadSource}</span>
                          </div>
                        )}
                        {p.clientPartner && (
                          <div className="flex items-center gap-1 text-slate-600 truncate">
                            <span className="text-[10px] font-semibold text-slate-400">Partner:</span>
                            <span className="font-medium text-slate-700 truncate">{p.clientPartner}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Bar */}
        {parsedParticipants.length > 0 && (
          <div className="pt-2 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleReset}
              className="px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              Clear / Reset
            </button>

            <button
              type="button"
              onClick={handleSaveToDatabase}
              disabled={isSaving || saveSuccess}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving to Firestore Database...
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-white" />
                  Successfully Saved {savedCount} Participant{savedCount > 1 ? "s" : ""} to Database!
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save {parsedParticipants.length > 1 ? `All ${parsedParticipants.length} Participants` : ""} to Database
                </>
              )}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
