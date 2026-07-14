import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { collection, doc, setDoc, getDocs, getDoc } from "firebase/firestore";
import { 
  X, UserPlus, Mail, BookOpen, CheckCircle, AlertCircle, Loader2, 
  Search, Calendar, DollarSign, Building2, User, Phone, MapPin, 
  Briefcase, GraduationCap, Link2, Plus, Sparkles, ChevronRight, Eye
} from "lucide-react";

// Predefined templates matching ResourcesView.tsx
interface Template {
  id: string;
  name: string;
  subject: string;
  headerImage: string;
  headerLink?: string;
  content: string;
}

const TEMPLATES: Template[] = [
  {
    id: "leadership-ideas",
    name: "Leadership Ideas",
    subject: "A few ideas that might change how you lead",
    headerImage: "https://xmonks.com/Gemini_Generated_Image_cl9aeicl9aeicl9a%20%281%29.png",
    content: `
Hi <Name>,
Most leadership challenges aren't skill problems. They're thinking problems.

Here are a few resources our clients find useful:

📝 Blogs

Coaching Doesn't Have Black and White Answers
xmonks.com/blogs/coaching-black-white
Anand Mahindra: An Epitome of Leadership
xmonks.com/blogs/anand-mahindra
Leadership Lessons from the Indian Army
https://xmonks.com/blogs/air-marshal-sanjeev-kapoor-why-no-one-can-break-india-india-pakistan-china

📘 Ebooks

Coaching Philosophy
https://xmonks.com/Ebookspdf/Coaching%20Philosophy%20E-book_Version-II_2021.pdf
The Magic of Coaching Conversations
https://xmonks.com/Ebookspdf/Magic%20of%20Coaching%20Conversation-%20Ebook_2021.pdf
Find Your Coaching Niche
https://xmonks.com/Ebookspdf/Coaching%20Competencies%20-%20EBook_2021_Verion%20II.pdf

These aren't theories — they're patterns we see every day in leaders, managers, and teams.

Take what's useful. Ignore the rest.

And if something resonates, that's worth paying attention to.
    `.trim()
  },
  {
    id: "live-webinars",
    name: "Live Webinars",
    subject: "Join us live — conversations that matter",
    headerImage: "https://www.xmonks.com/Gemini_Generated_Image_f8q9dsf8q9dsf8q9%20%281%29.png",
    content: `
Hi <Name>,
We regularly host:

• Live webinars on leadership & coaching
• Interactive workshops for managers and HR leaders
• Masterclasses on performance conversations & mindset

These sessions aren't lectures. They're thinking spaces — practical, reflective, and real.

If you'd like to join an upcoming session, you can explore what's coming up below.

Button Register for Upcoming Event : https://erickson.co.in/events-new.html

We'd love to have you in the room.
    `.trim()
  },
  {
    id: "feedback",
    name: "Feedback Form",
    subject: "We Value Your Feedback –The Art & Science of Coaching - Essentials Course (Part I & II)",
    headerImage: "https://xmonks.com/ChatGPT%20Image%20Apr%2021%2C%202026%2C%2002_27_25%20PM.png",
    headerLink: "https://docs.google.com/forms/d/e/1FAIpQLScUPAZdgoDHrE7J2lrlVHcYbTIoEgZo46-4yjIZVCpzHIUHMA/viewform?usp=header",
    content: `
Hi <Name>,

Congratulations once again on completing The Art & Science of Coaching – Essentials Course (Part I & II).

This milestone reflects not just your commitment to learning, but your dedication to becoming a more conscious, impactful leader.

As you move forward on your leadership journey, we invite you to pause for a moment and reflect.

Your experience, insights, and honest feedback are incredibly valuable to us. They don’t just help us improve a program — they help us shape transformative experiences for future leaders like you.

We would be truly grateful if you could take a few minutes to share your thoughts:

Button Share Your Feedback : https://docs.google.com/forms/d/e/1FAIpQLScUPAZdgoDHrE7J2lrlVHcYbTIoEgZo46-4yjIZVCpzHIUHMA/viewform?usp=header

Your voice has the power to inspire, refine, and elevate what we create next.

Thank you for being an integral part of this journey.

Warm regards
    `.trim()
  },
  {
    id: "youtube-videos",
    name: "Latest YouTube Videos",
    subject: "Wisdom for Your Journey — Latest from Gaurav Arora",
    headerImage: "https://yt3.googleusercontent.com/B-izn7KAKWIZjjSxog3fvlu_50Rf2G8X7OaSg9HcpRNm0VkmtwTONdsn50eMFPBYVSn3gf4=w1707-fcrop64=1,00005a57ffffa5a8-k-c0xffffffff-no-nd-rj",
    headerLink: "https://www.youtube.com/playlist?list=PL83z9Rmr_Lf66HvjSOhmIXmZYyJm2AX7I",
    content: `
Hi <Name>,

Wisdom isn't just about what we know — it's about what we share.

We've recently released a series of deep-dive conversations on "The xMonks Drive" that explore the intersection of leadership, mindfulness, and human potential.

Here are the latest 4 episodes from our featured playlist you might find valuable:

[VIDEOS_GRID]

These conversations are designed to help you pause, reflect, and grow.

Button Explore Playlist : https://www.youtube.com/playlist?list=PL83z9Rmr_Lf66HvjSOhmIXmZYyJm2AX7I

We hope these insights spark something meaningful for you.
    `.trim()
  },
  {
    id: "gratitude-diaries",
    name: "Gratitude Diaries",
    subject: "With Deep Gratitude – Your Metaphor Diaries",
    headerImage: "https://xmonks.com/ChatGPT%20Image%20Apr%2030%2C%202026%2C%2002_38_08%20PM.png",
    content: `
Hi <Name>,

Metaphors have a way of touching our imagination and evoking emotions that words alone often cannot capture. They invite us to see deeper truths, sparking insight and shifting perspectives.

With this spirit, we extend our heartfelt gratitude to you for sharing the metaphors you associate with Coaching. Each of your reflections has been lovingly curated into the Metaphor Diaries. We are delighted to share this compilation with you as a token of appreciation and inspiration.

Button View Gratitude Diaries : https://www.xmonks.com/Metaphor%20Diaries%20from%20xMonks%20Batch-63_2026.pdf

In coaching conversations, the use of metaphors opens doors to powerful exploration, helping clients uncover meaning, clarity, and possibility. We hope this collection serves as a reminder of the creativity and depth you bring to the coaching space.

Thank you, once again, for your trust and presence on this journey. Wishing you continued success as you walk the path of growth and transformation.

Great Regards,
Gaurav Arora
    `.trim()
  }
];

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  batchNumber?: string;
  company?: string;
  designation?: string;
  city?: string;
  countryCode?: string;
  phone?: string;
}

interface QuickActionPanelProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: string;
}

export default function QuickActionPanel({ isOpen, onClose, currentUser }: QuickActionPanelProps) {
  const [activeTab, setActiveTab] = useState<"add" | "email" | "resource">("add");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [batches, setBatches] = useState<string[]>([]);
  const [isSubmitLoading, setIsSubmitLoading] = useState(false);
  const [panelStatus, setPanelStatus] = useState<{ type: "success" | "error" | null; message: string }>({ type: null, message: "" });
  const [calendarLinks, setCalendarLinks] = useState<any>(null);

  // Auto-complete States
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRecipient, setSelectedRecipient] = useState<Participant | null>(null);
  const [showRecipientDropdown, setShowRecipientDropdown] = useState(false);

  // 1. Add Participant Form State
  const [addForm, setAddForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    countryCode: "91",
    phone: "",
    company: "",
    designation: "",
    gender: "",
    batchNumber: "",
    city: "",
    industry: "",
    linkedIn: "",
    coachingJourney: "Erickson Essentials Part I & II",
    leadSource: "",
    clientPartner: currentUser,
    totalAmount: "",
    paymentReceived: "",
    paymentStatus: "Unpaid"
  });

  // 2. Launch Email Form State
  const [emailForm, setEmailForm] = useState({
    customName: "",
    customEmail: "",
    isCustomRecipient: false,
    ccEmail: ""
  });

  // 3. Share Resource Form State
  const [resourceForm, setResourceForm] = useState({
    selectedTemplateId: TEMPLATES[0].id,
    customName: "",
    customEmail: "",
    isCustomRecipient: false,
  });

  const CC_OPTIONS = [
    { name: "None", email: "" },
    { name: "Preeti", email: "preeti@erickson.co.in" },
    { name: "Aakib", email: "aakib.posharkar@erickson.co.in" },
    { name: "Saurav", email: "saurav.tiwari@erickson.co.in" },
    { name: "Rejna", email: "rejna.balan@erickson.co.in" },
  ];

  // Fetch participants & calendar config
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      try {
        // Fetch participants
        const snap = await getDocs(collection(db, "participants"));
        const list: Participant[] = [];
        const batchSet = new Set<string>();
        snap.forEach(doc => {
          const data = doc.data();
          list.push({ id: doc.id, ...data } as Participant);
          if (data.batchNumber) batchSet.add(data.batchNumber);
        });
        setParticipants(list);
        setBatches(Array.from(batchSet).sort((a, b) => parseInt(a) - parseInt(b)));

        // Fetch calendar links from settings
        const settingsDoc = await getDoc(doc(db, "settings", "calendarLinks"));
        if (settingsDoc.exists()) {
          setCalendarLinks(settingsDoc.data());
        }
      } catch (err) {
        console.error("Failed to load quick actions context:", err);
      }
    };

    fetchData();
    // Clear status when opening
    setPanelStatus({ type: null, message: "" });
  }, [isOpen]);

  // Recipient search filtering
  const filteredParticipantsForSearch = participants.filter(p => {
    const fullName = `${p.firstName || ""} ${p.lastName || ""}`.toLowerCase();
    const email = (p.email || "").toLowerCase();
    const query = searchTerm.toLowerCase();
    return fullName.includes(query) || email.includes(query);
  });

  // Helper to compile HTML for templates
  const getTemplateHtml = (firstName: string, template: Template) => {
    let rawContent = template.content;
    const bodyParagraphs = rawContent
      .split("\n\n")
      .map((para) => {
        const lines = para
          .split("\n")
          .map((line) => {
            if (line.startsWith("Button ")) {
              const buttonTextAndLink = line.replace("Button ", "").split(":");
              const buttonText = buttonTextAndLink[0].trim();
              const buttonLink = buttonTextAndLink.slice(1).join(":").trim();
              return `
                <div style="margin: 24px 0; text-align: center;">
                  <a href="${buttonLink}" style="display: inline-block; background-color: #0056b3; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 12px rgba(0, 86, 179, 0.15);">${buttonText}</a>
                </div>
              `;
            }
            if (line.trim() === "[VIDEOS_GRID]") {
              return `
                <div style="margin: 24px 0; font-style: italic; color: #64748b; background: #f8fafc; border: 1px dashed #cbd5e1; padding: 16px; border-radius: 8px; text-align: center;">
                  (Episodes from The xMonks Drive are embedded dynamically in the main email)
                </div>
              `;
            }
            return `<div style="margin-bottom: 4px;">${line.trim()}</div>`;
          })
          .join("");
        return `<div style="margin-bottom: 20px; font-size: 15px; color: #334155;">${lines}</div>`;
      })
      .join("");

    return `
      <div style="font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #334155; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; background: #ffffff;">
        ${template.headerLink ? `<a href="${template.headerLink}" style="display: block;">` : ""}
          <img src="${template.headerImage}" alt="Header" style="width: 100%; height: auto; display: block;" referrerPolicy="no-referrer">
        ${template.headerLink ? "</a>" : ""}
        <div style="padding: 32px 40px;">
          ${bodyParagraphs.replace("<Name>", firstName)}
          <div style="margin-top: 40px; padding-top: 24px; border-top: 1px solid #f1f5f9; text-align: center;">
            <p style="margin-bottom: 4px; font-weight: 700; color: #1e293b;">Erickson Coaching India</p>
            <p style="margin: 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.02em;">Transforming lives through coaching excellence</p>
          </div>
        </div>
      </div>
    `;
  };

  // 1. Submit Action: Add Participant
  const handleAddParticipantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.firstName || !addForm.email) {
      setPanelStatus({ type: "error", message: "First Name and Email are required." });
      return;
    }

    setIsSubmitLoading(true);
    setPanelStatus({ type: null, message: "" });

    try {
      const docRef = doc(collection(db, "participants"));
      const total = parseFloat(addForm.totalAmount) || 0;
      const received = parseFloat(addForm.paymentReceived) || 0;
      const remaining = total - received;

      const newParticipant = {
        firstName: addForm.firstName,
        lastName: addForm.lastName,
        email: addForm.email,
        countryCode: addForm.countryCode,
        phone: addForm.phone,
        company: addForm.company,
        designation: addForm.designation,
        gender: addForm.gender,
        batchNumber: addForm.batchNumber,
        city: addForm.city,
        industry: addForm.industry,
        linkedIn: addForm.linkedIn,
        coachingJourney: addForm.coachingJourney,
        leadSource: addForm.leadSource,
        clientPartner: addForm.clientPartner,
        totalAmount: total,
        paymentReceived: received,
        remainingAmount: remaining,
        paymentStatus: addForm.paymentStatus,
        createdAt: new Date().toISOString()
      };

      // Clean undefined or empty fields
      Object.keys(newParticipant).forEach(key => {
        if ((newParticipant as Record<string, any>)[key] === undefined || (newParticipant as Record<string, any>)[key] === "") {
          delete (newParticipant as Record<string, any>)[key];
        }
      });

      await setDoc(docRef, newParticipant);
      setPanelStatus({ type: "success", message: `Participant "${addForm.firstName} ${addForm.lastName}" added successfully!` });
      
      // Reset form
      setAddForm({
        firstName: "",
        lastName: "",
        email: "",
        countryCode: "91",
        phone: "",
        company: "",
        designation: "",
        gender: "",
        batchNumber: "",
        city: "",
        industry: "",
        linkedIn: "",
        coachingJourney: "Erickson Essentials Part I & II",
        leadSource: "",
        clientPartner: currentUser,
        totalAmount: "",
        paymentReceived: "",
        paymentStatus: "Unpaid"
      });
    } catch (err: any) {
      console.error(err);
      setPanelStatus({ type: "error", message: err.message || "Failed to add participant to Firestore." });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // 2. Submit Action: Launch Email (Welcome/Onboarding)
  const handleLaunchEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailToUse = "";
    let nameToUse = "";

    if (emailForm.isCustomRecipient) {
      emailToUse = emailForm.customEmail;
      nameToUse = emailForm.customName;
    } else {
      if (!selectedRecipient) {
        setPanelStatus({ type: "error", message: "Please pick an existing participant or choose custom recipient." });
        return;
      }
      emailToUse = selectedRecipient.email;
      nameToUse = `${selectedRecipient.firstName || ""} ${selectedRecipient.lastName || ""}`.trim();
    }

    if (!emailToUse) {
      setPanelStatus({ type: "error", message: "Email address is required." });
      return;
    }

    setIsSubmitLoading(true);
    setPanelStatus({ type: null, message: "" });

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: nameToUse,
          clientEmail: emailToUse,
          isTest: false,
          ccEmail: emailForm.ccEmail,
          courseDatesPart1: calendarLinks?.courseDatesPart1,
          courseDatesPart2: calendarLinks?.courseDatesPart2,
          courseTimings: calendarLinks?.courseTimings,
          batchStartDate: calendarLinks?.batchStartDate
        })
      });

      const resData = await response.json();
      if (response.ok) {
        setPanelStatus({ type: "success", message: `Welcome email successfully sent to ${emailToUse}!` });
        setEmailForm({
          customName: "",
          customEmail: "",
          isCustomRecipient: false,
          ccEmail: ""
        });
        setSelectedRecipient(null);
        setSearchTerm("");
      } else {
        setPanelStatus({ type: "error", message: resData.error || "Failed to launch onboarding email." });
      }
    } catch (err: any) {
      console.error(err);
      setPanelStatus({ type: "error", message: "Unexpected communication error occurred." });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  // 3. Submit Action: Log / Share Resource
  const handleShareResourceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let emailToUse = "";
    let nameToUse = "";
    let firstNameToUse = "";

    if (resourceForm.isCustomRecipient) {
      emailToUse = resourceForm.customEmail;
      nameToUse = resourceForm.customName;
      firstNameToUse = resourceForm.customName.split(" ")[0];
    } else {
      if (!selectedRecipient) {
        setPanelStatus({ type: "error", message: "Please select a recipient participant." });
        return;
      }
      emailToUse = selectedRecipient.email;
      firstNameToUse = selectedRecipient.firstName;
      nameToUse = `${selectedRecipient.firstName || ""} ${selectedRecipient.lastName || ""}`.trim();
    }

    if (!emailToUse) {
      setPanelStatus({ type: "error", message: "Recipient email is required." });
      return;
    }

    const templateObj = TEMPLATES.find(t => t.id === resourceForm.selectedTemplateId);
    if (!templateObj) {
      setPanelStatus({ type: "error", message: "Invalid resource template selected." });
      return;
    }

    setIsSubmitLoading(true);
    setPanelStatus({ type: null, message: "" });

    try {
      const htmlContent = getTemplateHtml(firstNameToUse, templateObj);
      const response = await fetch("/api/send-generic-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: emailToUse,
          subject: templateObj.subject,
          html: htmlContent
        })
      });

      const resData = await response.json();
      if (response.ok) {
        setPanelStatus({ type: "success", message: `Resource template "${templateObj.name}" successfully sent to ${emailToUse}!` });
        setResourceForm({
          selectedTemplateId: TEMPLATES[0].id,
          customName: "",
          customEmail: "",
          isCustomRecipient: false
        });
        setSelectedRecipient(null);
        setSearchTerm("");
      } else {
        setPanelStatus({ type: "error", message: resData.error || "Failed to deliver resource email." });
      }
    } catch (err: any) {
      console.error(err);
      setPanelStatus({ type: "error", message: "Failed to dispatch resource delivery request." });
    } finally {
      setIsSubmitLoading(false);
    }
  };

  const handleSelectRecipientFromSearch = (participant: Participant) => {
    setSelectedRecipient(participant);
    setSearchTerm(`${participant.firstName || ""} ${participant.lastName || ""}`.trim());
    setShowRecipientDropdown(false);
  };

  const activeTemplate = TEMPLATES.find(t => t.id === resourceForm.selectedTemplateId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Dark Glass Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950/40 backdrop-blur-[4px] z-[100]"
          />

          {/* Right-Side Slide-Over Drawer */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 220 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[480px] bg-slate-900 text-white z-[101] shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col border-l border-white/10"
          >
            {/* Header */}
            <div className="p-6 border-b border-white/5 flex items-center justify-between bg-slate-900/80 backdrop-blur-xl">
              <div>
                <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest flex items-center gap-1">
                  <Sparkles className="w-3 h-3 animate-pulse" /> Erickson India Tools
                </span>
                <h3 className="text-xl font-bold tracking-tight text-white mt-1">Quick-Actions</h3>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-white/10 rounded-xl transition-all border border-white/5 hover:border-white/20"
              >
                <X className="w-5 h-5 text-slate-400 hover:text-white" />
              </button>
            </div>

            {/* Quick Action Tabs */}
            <div className="px-6 py-3 border-b border-white/5 bg-slate-950/30 flex gap-2">
              <button
                onClick={() => { setActiveTab("add"); setPanelStatus({ type: null, message: "" }); }}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                  activeTab === "add" 
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Add Participant
              </button>

              <button
                onClick={() => { setActiveTab("email"); setPanelStatus({ type: null, message: "" }); }}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                  activeTab === "email" 
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <Mail className="w-4 h-4" />
                Launch Email
              </button>

              <button
                onClick={() => { setActiveTab("resource"); setPanelStatus({ type: null, message: "" }); }}
                className={`flex-1 py-3 px-2 rounded-xl text-xs font-bold transition-all flex flex-col items-center gap-1.5 border ${
                  activeTab === "resource" 
                    ? "bg-blue-600/20 border-blue-500/50 text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)]" 
                    : "bg-transparent border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/5"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                Log Resource
              </button>
            </div>

            {/* Scrollable Content Container */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
              
              {/* Feedback Alert Panel */}
              <AnimatePresence mode="wait">
                {panelStatus.type && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`p-4 rounded-xl border flex items-start gap-3 ${
                      panelStatus.type === "success" 
                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" 
                        : "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    }`}
                  >
                    {panelStatus.type === "success" ? (
                      <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    )}
                    <p className="text-sm font-semibold leading-snug">{panelStatus.message}</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* TAB 1: ADD PARTICIPANT FORM */}
              {activeTab === "add" && (
                <form onSubmit={handleAddParticipantSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> First Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="John"
                        value={addForm.firstName}
                        onChange={(e) => setAddForm(prev => ({ ...prev, firstName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Last Name</label>
                      <input
                        type="text"
                        placeholder="Doe"
                        value={addForm.lastName}
                        onChange={(e) => setAddForm(prev => ({ ...prev, lastName: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5" /> Email Address *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="john.doe@company.com"
                      value={addForm.email}
                      onChange={(e) => setAddForm(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Code</label>
                      <input
                        type="text"
                        placeholder="91"
                        value={addForm.countryCode}
                        onChange={(e) => setAddForm(prev => ({ ...prev, countryCode: e.target.value }))}
                        className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm text-center"
                      />
                    </div>
                    <div className="col-span-2 space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5" /> Mobile Phone
                      </label>
                      <input
                        type="tel"
                        placeholder="9876543210"
                        value={addForm.phone}
                        onChange={(e) => setAddForm(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Building2 className="w-3.5 h-3.5" /> Company
                      </label>
                      <input
                        type="text"
                        placeholder="Google"
                        value={addForm.company}
                        onChange={(e) => setAddForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Designation</label>
                      <input
                        type="text"
                        placeholder="Director"
                        value={addForm.designation}
                        onChange={(e) => setAddForm(prev => ({ ...prev, designation: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Batch Number</label>
                      <select
                        value={addForm.batchNumber}
                        onChange={(e) => setAddForm(prev => ({ ...prev, batchNumber: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-850 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-white text-sm"
                      >
                        <option value="" className="text-slate-900 bg-white">Select Batch</option>
                        {batches.map(b => (
                          <option key={b} value={b} className="text-slate-900 bg-white">Batch {b}</option>
                        ))}
                        <option value="63" className="text-slate-900 bg-white">Batch 63</option>
                        <option value="64" className="text-slate-900 bg-white">Batch 64</option>
                        <option value="65" className="text-slate-900 bg-white">Batch 65</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5" /> City
                      </label>
                      <input
                        type="text"
                        placeholder="Delhi / Mumbai"
                        value={addForm.city}
                        onChange={(e) => setAddForm(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400">Gender</label>
                      <select
                        value={addForm.gender}
                        onChange={(e) => setAddForm(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-slate-850 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-white text-sm"
                      >
                        <option value="" className="text-slate-900 bg-white">Select Gender</option>
                        <option value="Male" className="text-slate-900 bg-white">Male</option>
                        <option value="Female" className="text-slate-900 bg-white">Female</option>
                        <option value="Other" className="text-slate-900 bg-white">Other</option>
                        <option value="Prefer not to say" className="text-slate-900 bg-white">Prefer not to say</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                        <Link2 className="w-3.5 h-3.5" /> LinkedIn URL
                      </label>
                      <input
                        type="url"
                        placeholder="https://linkedin.com/in/..."
                        value={addForm.linkedIn}
                        onChange={(e) => setAddForm(prev => ({ ...prev, linkedIn: e.target.value }))}
                        className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                      />
                    </div>
                  </div>

                  <div className="border-t border-white/5 pt-4 my-2">
                    <h4 className="text-xs font-extrabold text-blue-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                      <DollarSign className="w-4 h-4" /> Financial Transactions
                    </h4>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">Total Fee</label>
                        <input
                          type="number"
                          placeholder="INR"
                          value={addForm.totalAmount}
                          onChange={(e) => setAddForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">Received</label>
                        <input
                          type="number"
                          placeholder="INR"
                          value={addForm.paymentReceived}
                          onChange={(e) => setAddForm(prev => ({ ...prev, paymentReceived: e.target.value }))}
                          className="w-full px-3 py-2.5 bg-white/5 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-slate-400">Status</label>
                        <select
                          value={addForm.paymentStatus}
                          onChange={(e) => setAddForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                          className="w-full px-2 py-2.5 bg-slate-850 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-xs text-white"
                        >
                          <option value="Paid" className="text-slate-900 bg-white">Paid</option>
                          <option value="Partial" className="text-slate-900 bg-white">Partial</option>
                          <option value="Unpaid" className="text-slate-900 bg-white">Unpaid</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitLoading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-6"
                  >
                    {isSubmitLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Saving Participant...
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-5 h-5" /> Save Participant
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 2: LAUNCH EMAIL */}
              {activeTab === "email" && (
                <form onSubmit={handleLaunchEmailSubmit} className="space-y-5">
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">Recipient Mode</label>
                      <button
                        type="button"
                        onClick={() => setEmailForm(prev => ({ ...prev, isCustomRecipient: !prev.isCustomRecipient }))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                      >
                        {emailForm.isCustomRecipient ? "Select Existing Participant" : "Use Custom Recipient"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!emailForm.isCustomRecipient ? (
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Search className="w-3.5 h-3.5" /> Search Participant
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type name or email to search..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setShowRecipientDropdown(true);
                              if (!e.target.value) setSelectedRecipient(null);
                            }}
                            onFocus={() => setShowRecipientDropdown(true)}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/35 text-sm"
                          />
                          {selectedRecipient && (
                            <span className="absolute right-3 top-2.5 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-bold uppercase tracking-widest">
                              Selected
                            </span>
                          )}
                        </div>

                        {showRecipientDropdown && searchTerm && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-slate-850 border border-white/10 rounded-xl shadow-2xl z-20 divide-y divide-white/5 custom-scrollbar">
                            {filteredParticipantsForSearch.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No participants match search</div>
                            ) : (
                              filteredParticipantsForSearch.map(p => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => handleSelectRecipientFromSearch(p)}
                                  className="w-full text-left p-3 hover:bg-white/5 transition-colors flex flex-col"
                                >
                                  <span className="text-xs font-bold text-white">{p.firstName} {p.lastName}</span>
                                  <span className="text-[11px] text-slate-400">{p.email}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Full Name</label>
                          <input
                            type="text"
                            placeholder="Jane Doe"
                            required
                            value={emailForm.customName}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, customName: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Email Address</label>
                          <input
                            type="email"
                            placeholder="jane.doe@gmail.com"
                            required
                            value={emailForm.customEmail}
                            onChange={(e) => setEmailForm(prev => ({ ...prev, customEmail: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Carbon Copy (CC) Lead</label>
                    <select
                      value={emailForm.ccEmail}
                      onChange={(e) => setEmailForm(prev => ({ ...prev, ccEmail: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-850 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm text-white"
                    >
                      {CC_OPTIONS.map(opt => (
                        <option key={opt.name} value={opt.email} className="text-slate-900 bg-white">
                          {opt.name} {opt.email ? `(${opt.email})` : ""}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="bg-blue-600/10 border border-blue-500/20 p-4 rounded-xl space-y-2">
                    <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Email template content</span>
                    <h5 className="text-sm font-bold text-white leading-none mt-1">Essentials Welcome & Onboarding Template</h5>
                    <p className="text-xs text-slate-400 leading-relaxed mt-1.5">
                      Sends the custom, highly structured Erickson Coaching journey email featuring details of upcoming Online Module Part 1 & Part 2, standard session hours, custom Zoom coordinates, and instant calendar invitation triggers.
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitLoading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Triggering Mailer...
                      </>
                    ) : (
                      <>
                        <Mail className="w-5 h-5" /> Launch Onboarding Email
                      </>
                    )}
                  </button>
                </form>
              )}

              {/* TAB 3: LOG / SHARE RESOURCE */}
              {activeTab === "resource" && (
                <form onSubmit={handleShareResourceSubmit} className="space-y-5">
                  
                  {/* Recipient Selection */}
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-4 space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-300">Recipient Mode</label>
                      <button
                        type="button"
                        onClick={() => setResourceForm(prev => ({ ...prev, isCustomRecipient: !prev.isCustomRecipient }))}
                        className="text-xs text-blue-400 hover:text-blue-300 font-bold flex items-center gap-1"
                      >
                        {resourceForm.isCustomRecipient ? "Select Existing Participant" : "Use Custom Recipient"}
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {!resourceForm.isCustomRecipient ? (
                      <div className="space-y-2 relative">
                        <label className="text-xs font-bold text-slate-400 flex items-center gap-1">
                          <Search className="w-3.5 h-3.5" /> Search Participant
                        </label>
                        <div className="relative">
                          <input
                            type="text"
                            placeholder="Type name or email to search..."
                            value={searchTerm}
                            onChange={(e) => {
                              setSearchTerm(e.target.value);
                              setShowRecipientDropdown(true);
                              if (!e.target.value) setSelectedRecipient(null);
                            }}
                            onFocus={() => setShowRecipientDropdown(true)}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/35 text-sm"
                          />
                          {selectedRecipient && (
                            <span className="absolute right-3 top-2.5 px-2 py-1 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] rounded font-bold uppercase tracking-widest">
                              Selected
                            </span>
                          )}
                        </div>

                        {showRecipientDropdown && searchTerm && (
                          <div className="absolute left-0 right-0 top-full mt-1.5 max-h-48 overflow-y-auto bg-slate-850 border border-white/10 rounded-xl shadow-2xl z-20 divide-y divide-white/5 custom-scrollbar">
                            {filteredParticipantsForSearch.length === 0 ? (
                              <div className="p-3 text-xs text-slate-400 text-center">No participants match search</div>
                            ) : (
                              filteredParticipantsForSearch.map(p => (
                                <button
                                  type="button"
                                  key={p.id}
                                  onClick={() => handleSelectRecipientFromSearch(p)}
                                  className="w-full text-left p-3 hover:bg-white/5 transition-colors flex flex-col"
                                >
                                  <span className="text-xs font-bold text-white">{p.firstName} {p.lastName}</span>
                                  <span className="text-[11px] text-slate-400">{p.email}</span>
                                </button>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Full Name</label>
                          <input
                            type="text"
                            placeholder="Jane Doe"
                            required
                            value={resourceForm.customName}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, customName: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="text-xs font-bold text-slate-400">Email Address</label>
                          <input
                            type="email"
                            placeholder="jane.doe@gmail.com"
                            required
                            value={resourceForm.customEmail}
                            onChange={(e) => setResourceForm(prev => ({ ...prev, customEmail: e.target.value }))}
                            className="w-full px-4 py-2.5 bg-slate-950/40 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Resource Selector */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-400">Select Resource Template</label>
                    <select
                      value={resourceForm.selectedTemplateId}
                      onChange={(e) => setResourceForm(prev => ({ ...prev, selectedTemplateId: e.target.value }))}
                      className="w-full px-4 py-2.5 bg-slate-850 border border-white/10 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-sm text-white"
                    >
                      {TEMPLATES.map(t => (
                        <option key={t.id} value={t.id} className="text-slate-900 bg-white">{t.name} - {t.subject}</option>
                      ))}
                    </select>
                  </div>

                  {/* Template Mini Preview */}
                  {activeTemplate && (
                    <div className="bg-slate-950/50 border border-white/5 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-wider">Resource Preview</span>
                        <span className="text-[10px] font-bold text-slate-500">Subject: "{activeTemplate.subject}"</span>
                      </div>
                      <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10">
                        <img 
                          src={activeTemplate.headerImage} 
                          alt={activeTemplate.name} 
                          className="w-full h-full object-cover"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed max-h-24 overflow-y-auto custom-scrollbar italic whitespace-pre-wrap">
                        {activeTemplate.content.substring(0, 150)}...
                      </p>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitLoading}
                    className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    {isSubmitLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" /> Sending Resource...
                      </>
                    ) : (
                      <>
                        <BookOpen className="w-5 h-5" /> Share & Log Resource
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
