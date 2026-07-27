import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area, LineChart, Line
} from "recharts";
import { 
  Target, TrendingUp, Search, Globe, MessageSquare, Linkedin, Share2, 
  Calendar, CheckCircle2, AlertCircle, Edit3, Save, Download, RefreshCw, 
  Users, Coins, Sparkles, ArrowUpRight, Zap, Check, Plus, Trash2, Filter, Layers,
  ChevronRight, ArrowRight, Gauge, Sliders, Activity, UserCheck, HelpCircle
} from "lucide-react";
import { saveAs } from "file-saver";
import Papa from "papaparse";

// Default Channel Targets
const DEFAULT_CHANNEL_TARGETS = [
  {
    id: "google",
    name: "Google Ads",
    iconName: "Search",
    category: "Paid Search & Ads",
    target: 1200,
    color: "#4285F4",
    lightBg: "bg-blue-50",
    border: "border-blue-100",
    text: "text-blue-600",
    badge: "bg-blue-100 text-blue-800",
    description: "High-intent search campaigns targeting executive & ICF life coaching queries.",
    avgCpl: "₹350 - ₹500",
    conversionRateEstimate: 12,
    growthStrategy: "Scale high-performing phrase match keywords & optimize negative keyword lists."
  },
  {
    id: "seo",
    name: "SEO / Organic",
    iconName: "Globe",
    category: "Organic Search",
    target: 800,
    color: "#10B981",
    lightBg: "bg-emerald-50",
    border: "border-emerald-100",
    text: "text-emerald-600",
    badge: "bg-emerald-100 text-emerald-800",
    description: "Organic inbound traffic from ICF accreditation, coaching tools & blog content.",
    avgCpl: "₹0 (Organic)",
    conversionRateEstimate: 14,
    growthStrategy: "Publish weekly pillar posts on coaching frameworks, ICF Level 1/2 certifications."
  },
  {
    id: "meta",
    name: "Meta Ads",
    iconName: "Share2",
    category: "Social Paid Media",
    target: 450,
    color: "#6366F1",
    lightBg: "bg-indigo-50",
    border: "border-indigo-100",
    text: "text-indigo-600",
    badge: "bg-indigo-100 text-indigo-800",
    description: "Facebook & Instagram video ads targeting HR leaders, managers & aspiring coaches.",
    avgCpl: "₹250 - ₹400",
    conversionRateEstimate: 8,
    growthStrategy: "Utilize alumni testimonial video reels & lead forms with custom qualification filters."
  },
  {
    id: "whatsapp",
    name: "WhatsApp Direct",
    iconName: "MessageSquare",
    category: "Direct Messaging",
    target: 220,
    color: "#0284C7",
    lightBg: "bg-sky-50",
    border: "border-sky-100",
    text: "text-sky-600",
    badge: "bg-sky-100 text-sky-800",
    description: "Direct inbound broadcast campaigns, community nurturing & instant drip sequences.",
    avgCpl: "₹150 - ₹250",
    conversionRateEstimate: 18,
    growthStrategy: "Automate instant welcome replies, webinar invites & 1-on-1 counselor booking links."
  },
  {
    id: "linkedin",
    name: "LinkedIn B2B",
    iconName: "Linkedin",
    category: "B2B & Executive",
    target: 180,
    color: "#0D9488",
    lightBg: "bg-teal-50",
    border: "border-teal-100",
    text: "text-teal-600",
    badge: "bg-teal-100 text-teal-800",
    description: "Corporate L&D outreach, thought leadership content & Message Ads for senior executives.",
    avgCpl: "₹600 - ₹900",
    conversionRateEstimate: 15,
    growthStrategy: "Target L&D Directors, CHROs & C-suite executives searching for executive coaching programs."
  }
];

// Actual Month Names (Replacing generic "Month 1")
const MONTH_NAMES = [
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026"
];

const MONTH_SHORT_NAMES = [
  "Aug 2026",
  "Sep 2026",
  "Oct 2026",
  "Nov 2026",
  "Dec 2026"
];

// Monthly weights over 5 months: 16%, 18%, 20%, 22%, 24% = 100%
const MONTH_WEIGHTS = [0.16, 0.18, 0.20, 0.22, 0.24];

interface MonthlyActuals {
  [monthIndex: number]: {
    [channelId: string]: number;
  };
}

interface ChannelStageData {
  raw: number;
  contacted: number;
  qualified: number;
  proposal: number;
  enrolled: number;
}

interface LeadStagesState {
  [monthIndex: number]: {
    [channelId: string]: ChannelStageData;
  };
}

export default function TargetsView() {
  // 1. Filter State: "all" or month index 0, 1, 2, 3, 4
  const [selectedMonth, setSelectedMonth] = useState<"all" | number>("all");

  // Targets state
  const [channelTargets, setChannelTargets] = useState(() => {
    const saved = localStorage.getItem("erickson_targets_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    return DEFAULT_CHANNEL_TARGETS;
  });

  // Monthly Actual Achieved Leads State
  const [monthlyActuals, setMonthlyActuals] = useState<MonthlyActuals>(() => {
    const saved = localStorage.getItem("erickson_targets_actuals_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const init: MonthlyActuals = {};
    for (let i = 0; i < 5; i++) {
      init[i] = { google: 0, seo: 0, meta: 0, whatsapp: 0, linkedin: 0 };
    }
    return init;
  });

  // Monthly Disqualified Leads State
  const [disqualifiedActuals, setDisqualifiedActuals] = useState<MonthlyActuals>(() => {
    const saved = localStorage.getItem("erickson_targets_disqualified_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const init: MonthlyActuals = {};
    for (let i = 0; i < 5; i++) {
      init[i] = { google: 0, seo: 0, meta: 0, whatsapp: 0, linkedin: 0 };
    }
    return init;
  });

  // Lead Stage Funnel Status state
  const [leadStages, setLeadStages] = useState<LeadStagesState>(() => {
    const saved = localStorage.getItem("erickson_targets_lead_stages_v1");
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { console.error(e); }
    }
    const init: LeadStagesState = {};
    for (let i = 0; i < 5; i++) {
      init[i] = {
        google: { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 },
        seo: { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 },
        meta: { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 },
        whatsapp: { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 },
        linkedin: { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 }
      };
    }
    return init;
  });

  // Modals / Status update modal state
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState(channelTargets);

  // Status & Current Leads Tracker Updating modal
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [activeUpdateMonth, setActiveUpdateMonth] = useState<number>(0);

  // Conversion rate simulator state
  const [simulatedConversionRate, setSimulatedConversionRate] = useState(10); // 10%
  const [avgTicketPrice, setAvgTicketPrice] = useState(185000); // ₹1,85,000 per enrollment

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem("erickson_targets_v1", JSON.stringify(channelTargets));
  }, [channelTargets]);

  useEffect(() => {
    localStorage.setItem("erickson_targets_actuals_v1", JSON.stringify(monthlyActuals));
  }, [monthlyActuals]);

  useEffect(() => {
    localStorage.setItem("erickson_targets_disqualified_v1", JSON.stringify(disqualifiedActuals));
  }, [disqualifiedActuals]);

  useEffect(() => {
    localStorage.setItem("erickson_targets_lead_stages_v1", JSON.stringify(leadStages));
  }, [leadStages]);

  // Overall 5-Month Totals
  const total5MonthTarget = useMemo(() => {
    return channelTargets.reduce((sum: number, c: any) => sum + Number(c.target), 0);
  }, [channelTargets]);

  const totalActualAchievedAllMonths = useMemo(() => {
    let sum = 0;
    Object.values(monthlyActuals).forEach((monthData) => {
      Object.values(monthData).forEach((val) => {
        sum += Number(val || 0);
      });
    });
    return sum;
  }, [monthlyActuals]);

  const totalDisqualifiedAllMonths = useMemo(() => {
    let sum = 0;
    Object.values(disqualifiedActuals).forEach((monthData) => {
      Object.values(monthData).forEach((val) => {
        sum += Number(val || 0);
      });
    });
    return sum;
  }, [disqualifiedActuals]);

  // Total Stage Funnel Aggregates
  const totalStageAggregates = useMemo(() => {
    let raw = 0, contacted = 0, qualified = 0, proposal = 0, enrolled = 0;

    const monthsToInclude = selectedMonth === "all" ? [0, 1, 2, 3, 4] : [selectedMonth];

    monthsToInclude.forEach((mIdx) => {
      const monthObj = leadStages[mIdx] || {};
      Object.values(monthObj).forEach((stData: ChannelStageData) => {
        raw += Number(stData?.raw || 0);
        contacted += Number(stData?.contacted || 0);
        qualified += Number(stData?.qualified || 0);
        proposal += Number(stData?.proposal || 0);
        enrolled += Number(stData?.enrolled || 0);
      });
    });

    return { raw, contacted, qualified, proposal, enrolled };
  }, [leadStages, selectedMonth]);

  // Monthly Breakdown Calculations
  const monthlyTargetBreakdown = useMemo(() => {
    return MONTH_NAMES.map((mName, mIdx) => {
      const weight = MONTH_WEIGHTS[mIdx];
      const monthTargetsByChannel: { [chId: string]: number } = {};
      let monthTotalTarget = 0;

      channelTargets.forEach((ch: any) => {
        const chMonthTarget = Math.round(ch.target * weight);
        monthTargetsByChannel[ch.id] = chMonthTarget;
        monthTotalTarget += chMonthTarget;
      });

      const monthActualsObj = monthlyActuals[mIdx] || {};
      let monthTotalActual = 0;
      Object.values(monthActualsObj).forEach(v => {
        monthTotalActual += Number(v || 0);
      });

      const monthDisqualifiedObj = disqualifiedActuals[mIdx] || {};
      let monthTotalDisqualified = 0;
      Object.values(monthDisqualifiedObj).forEach(v => {
        monthTotalDisqualified += Number(v || 0);
      });

      return {
        monthIndex: mIdx,
        monthName: mName,
        shortName: MONTH_SHORT_NAMES[mIdx],
        weight,
        channelTargets: monthTargetsByChannel,
        monthTotalTarget,
        monthTotalActual,
        monthActualsObj,
        monthTotalDisqualified,
        monthDisqualifiedObj,
        progressPct: monthTotalTarget > 0 ? Math.round((monthTotalActual / monthTotalTarget) * 100) : 0
      };
    });
  }, [channelTargets, monthlyActuals, disqualifiedActuals]);

  // Filtered Display Target & Actual depending on selected Month Filter
  const displayFilteredStats = useMemo(() => {
    if (selectedMonth === "all") {
      return {
        label: "5-Month Cumulative Target",
        target: total5MonthTarget,
        actual: totalActualAchievedAllMonths,
        disqualified: totalDisqualifiedAllMonths,
        pct: total5MonthTarget > 0 ? Math.round((totalActualAchievedAllMonths / total5MonthTarget) * 100) : 0,
        monthlyRunRate: Math.round(total5MonthTarget / 5)
      };
    } else {
      const mData = monthlyTargetBreakdown[selectedMonth];
      return {
        label: `${MONTH_NAMES[selectedMonth]} Target`,
        target: mData?.monthTotalTarget || 0,
        actual: mData?.monthTotalActual || 0,
        disqualified: mData?.monthTotalDisqualified || 0,
        pct: mData?.progressPct || 0,
        monthlyRunRate: mData?.monthTotalTarget || 0
      };
    }
  }, [selectedMonth, total5MonthTarget, totalActualAchievedAllMonths, totalDisqualifiedAllMonths, monthlyTargetBreakdown]);

  // Filtered Channels Target & Actuals
  const filteredChannelCardsData = useMemo(() => {
    return channelTargets.map((ch: any) => {
      if (selectedMonth === "all") {
        // Sum actuals across all 5 months
        let act = 0;
        Object.values(monthlyActuals).forEach(mObj => {
          act += Number(mObj[ch.id] || 0);
        });

        // Sum disqualified across all 5 months
        let disq = 0;
        Object.values(disqualifiedActuals).forEach(mObj => {
          disq += Number(mObj[ch.id] || 0);
        });

        // Sum stages across all 5 months
        let stRaw = 0, stContacted = 0, stQualified = 0, stProposal = 0, stEnrolled = 0;
        for (let i = 0; i < 5; i++) {
          const st = leadStages[i]?.[ch.id] || { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 };
          stRaw += st.raw;
          stContacted += st.contacted;
          stQualified += st.qualified;
          stProposal += st.proposal;
          stEnrolled += st.enrolled;
        }

        return {
          ...ch,
          displayTarget: ch.target,
          displayActual: act,
          displayDisqualified: disq,
          stages: { raw: stRaw, contacted: stContacted, qualified: stQualified, proposal: stProposal, enrolled: stEnrolled },
          pctAchieved: ch.target > 0 ? Math.round((act / ch.target) * 100) : 0,
          sharePct: total5MonthTarget > 0 ? ((ch.target / total5MonthTarget) * 100).toFixed(1) : "0"
        };
      } else {
        const mWeight = MONTH_WEIGHTS[selectedMonth];
        const mTarget = Math.round(ch.target * mWeight);
        const act = Number(monthlyActuals[selectedMonth]?.[ch.id] || 0);
        const disq = Number(disqualifiedActuals[selectedMonth]?.[ch.id] || 0);
        const st = leadStages[selectedMonth]?.[ch.id] || { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 };

        const totalSelectedMonthTarget = monthlyTargetBreakdown[selectedMonth]?.monthTotalTarget || 1;

        return {
          ...ch,
          displayTarget: mTarget,
          displayActual: act,
          displayDisqualified: disq,
          stages: st,
          pctAchieved: mTarget > 0 ? Math.round((act / mTarget) * 100) : 0,
          sharePct: ((mTarget / totalSelectedMonthTarget) * 100).toFixed(1)
        };
      }
    });
  }, [selectedMonth, channelTargets, monthlyActuals, disqualifiedActuals, leadStages, total5MonthTarget, monthlyTargetBreakdown]);

  // Donut / Pie Chart Data filtered
  const pieChartData = useMemo(() => {
    return filteredChannelCardsData.map((ch: any) => ({
      name: ch.name,
      value: ch.displayTarget,
      color: ch.color,
      pct: displayFilteredStats.target > 0 ? ((ch.displayTarget / displayFilteredStats.target) * 100).toFixed(1) : "0"
    }));
  }, [filteredChannelCardsData, displayFilteredStats]);

  // Cumulative Chart Data
  const cumulativeChartData = useMemo(() => {
    let cumTarget = 0;
    let cumActual = 0;

    return monthlyTargetBreakdown.map((mb) => {
      cumTarget += mb.monthTotalTarget;
      cumActual += mb.monthTotalActual;

      return {
        name: mb.shortName,
        fullMonth: mb.monthName,
        "Monthly Target": mb.monthTotalTarget,
        "Monthly Actual": mb.monthTotalActual,
        "Cumulative Target": cumTarget,
        "Cumulative Actual": cumActual
      };
    });
  }, [monthlyTargetBreakdown]);

  // Handle actual value input change in matrix
  const handleActualChange = (mIdx: number, chId: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setMonthlyActuals(prev => ({
      ...prev,
      [mIdx]: {
        ...(prev[mIdx] || {}),
        [chId]: num
      }
    }));
  };

  // Handle disqualified value input change
  const handleDisqualifiedChange = (mIdx: number, chId: string, value: string) => {
    const num = Math.max(0, parseInt(value) || 0);
    setDisqualifiedActuals(prev => ({
      ...prev,
      [mIdx]: {
        ...(prev[mIdx] || {}),
        [chId]: num
      }
    }));
  };

  // Update lead stage count for a specific month and channel
  const handleStageCountChange = (mIdx: number, chId: string, stageField: keyof ChannelStageData, value: number) => {
    const validVal = Math.max(0, value);
    setLeadStages(prev => {
      const prevMonth = prev[mIdx] || {};
      const prevCh = prevMonth[chId] || { raw: 0, contacted: 0, qualified: 0, proposal: 0, enrolled: 0 };
      const updatedCh = { ...prevCh, [stageField]: validVal };

      return {
        ...prev,
        [mIdx]: {
          ...prevMonth,
          [chId]: updatedCh
        }
      };
    });
  };

  // Reset to original default targets
  const handleResetToDefaults = () => {
    if (window.confirm("Reset lead source targets back to default initial values?")) {
      setChannelTargets(DEFAULT_CHANNEL_TARGETS);
      setTempTargets(DEFAULT_CHANNEL_TARGETS);
    }
  };

  // Save edited targets
  const handleSaveTargets = () => {
    setChannelTargets(tempTargets);
    setIsEditingTargets(false);
  };

  // Export CSV of Targets & Actuals
  const handleExportCSV = () => {
    const csvRows = channelTargets.map((ch: any) => {
      let ach = 0;
      Object.values(monthlyActuals).forEach(mObj => { ach += Number(mObj[ch.id] || 0); });
      return {
        "Lead Source": ch.name,
        "Category": ch.category,
        "5-Month Target": ch.target,
        "Monthly Avg Target": Math.round(ch.target / 5),
        "Actual Achieved Leads": ach,
        "Achievement Rate (%)": ch.target > 0 ? `${Math.round((ach / ch.target) * 100)}%` : "0%",
        "Lead Share (%)": `${((ch.target / total5MonthTarget) * 100).toFixed(1)}%`
      };
    });

    const csv = Papa.unparse(csvRows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `Erickson_Lead_Targets_${new Date().toISOString().split('T')[0]}.csv`);
  };

  // Render Icon helper
  const renderChannelIcon = (name: string, className = "w-5 h-5") => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("seo") || lowerName.includes("organic")) return <Globe className={className} />;
    if (lowerName.includes("google")) return <Search className={className} />;
    if (lowerName.includes("meta") || lowerName.includes("facebook")) return <Share2 className={className} />;
    if (lowerName.includes("whatsapp")) return <MessageSquare className={className} />;
    if (lowerName.includes("linkedin")) return <Linkedin className={className} />;
    return <Target className={className} />;
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Banner Header */}
      <div className="relative bg-gradient-to-r from-slate-900 via-blue-950 to-indigo-900 text-white rounded-3xl p-6 sm:p-8 lg:p-10 shadow-2xl border border-slate-800 overflow-hidden">
        <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 max-w-2xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-500/20 text-blue-300 border border-blue-400/30 backdrop-blur-md">
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                Strategic Target Blueprint
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <CheckCircle2 className="w-3.5 h-3.5" />
                5 Lead Channels Active
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
              Lead Generation Targets & Live Progress Tracker
            </h1>

            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Target projections across <strong className="text-white font-bold">Google Ads, SEO, Meta, WhatsApp & LinkedIn</strong> from August to December 2026. Update current leads achieved against targets to monitor real-time progress.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <button
              onClick={() => {
                setActiveUpdateMonth(selectedMonth === "all" ? 0 : selectedMonth);
                setIsUpdatingStatus(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Activity className="w-4 h-4" />
              <span>Update Current Leads & Progress</span>
            </button>

            <button
              onClick={() => setIsEditingTargets(true)}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-2 backdrop-blur-md active:scale-95 cursor-pointer"
            >
              <Edit3 className="w-4 h-4 text-blue-300" />
              <span>Customize Targets</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-lg shadow-blue-600/30 flex items-center gap-2 active:scale-95 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Dynamic Header Stats Bar based on Month Filter */}
        <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {selectedMonth === "all" ? "Total 5-Month Target" : `${MONTH_NAMES[selectedMonth]} Target`}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-white mt-1 font-mono">
              {displayFilteredStats.target.toLocaleString()} <span className="text-xs text-blue-300 font-normal">Leads</span>
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              {selectedMonth === "all" ? "Monthly Run Rate" : "Month Allocation Weight"}
            </p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1 font-mono">
              {selectedMonth === "all" ? `${displayFilteredStats.monthlyRunRate.toLocaleString()} / Mo` : `${(MONTH_WEIGHTS[selectedMonth] * 100).toFixed(0)}% Weight`}
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Top Target Source</p>
            <p className="text-2xl sm:text-3xl font-black text-blue-400 mt-1 font-mono">
              {selectedMonth === "all" ? "1,200" : Math.round(1200 * MONTH_WEIGHTS[selectedMonth])} <span className="text-xs text-blue-300 font-normal">Google</span>
            </p>
          </div>

          <div className="bg-white/5 rounded-2xl p-4 border border-white/10 backdrop-blur-sm">
            <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Current Achieved Leads</p>
            <div className="flex items-baseline gap-2 mt-1">
              <p className="text-2xl sm:text-3xl font-black text-amber-300 font-mono">
                {displayFilteredStats.actual.toLocaleString()}
              </p>
              <p className="text-xs text-slate-300 font-bold">
                ({displayFilteredStats.pct}% Progress)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Month-Wise Filter Switcher with Actual Month Names */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
            <Filter className="w-4 h-4" />
          </div>
          <div>
            <span className="text-xs font-black text-slate-900 uppercase tracking-wider block">Month-Wise Filter</span>
            <span className="text-[11px] text-slate-500 font-medium">Select an actual month to view its target vs current achieved leads.</span>
          </div>
        </div>

        {/* Filter Pills with Month Names */}
        <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedMonth("all")}
            className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap border ${
              selectedMonth === "all"
                ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
            }`}
          >
            All 5 Months (Overall)
          </button>

          {MONTH_NAMES.map((mName, mIdx) => (
            <button
              key={mIdx}
              onClick={() => setSelectedMonth(mIdx)}
              className={`px-3.5 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap border ${
                selectedMonth === mIdx
                  ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20"
                  : "bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200"
              }`}
            >
              {mName}
            </button>
          ))}
        </div>
      </div>

      {/* Current Leads vs Target Quick Progress Tracker */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div>
            <h2 className="text-base font-black text-white flex items-center gap-2">
              <Gauge className="w-5 h-5 text-amber-400" />
              Current Leads vs Target Progress Tracker
              {selectedMonth !== "all" && (
                <span className="text-xs font-bold text-blue-300 bg-blue-500/20 px-2.5 py-0.5 rounded-full border border-blue-400/30">
                  {MONTH_NAMES[selectedMonth]}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-300 font-medium">
              Monitor total current leads logged against target projections and evaluate completion percentages.
            </p>
          </div>

          <button
            onClick={() => {
              setActiveUpdateMonth(selectedMonth === "all" ? 0 : selectedMonth);
              setIsUpdatingStatus(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Update Current Leads Column</span>
          </button>
        </div>

        {/* Progress Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-1">
          {/* Target Leads */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-[10px] font-extrabold uppercase block">Target Leads</span>
            <p className="text-2xl font-black text-white mt-1 font-mono">{displayFilteredStats.target.toLocaleString()}</p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Goal for active period</p>
          </div>

          {/* Current Achieved Leads */}
          <div className="bg-white/5 rounded-2xl p-4 border border-amber-400/30 bg-amber-500/5">
            <span className="text-amber-300 text-[10px] font-extrabold uppercase block">Current Achieved Leads</span>
            <p className="text-2xl font-black text-amber-300 mt-1 font-mono">{displayFilteredStats.actual.toLocaleString()}</p>
            <p className="text-[10px] text-amber-400/80 font-semibold mt-1">
              {displayFilteredStats.pct}% of target reached
            </p>
          </div>

          {/* Disqualified Leads Counter */}
          <div className="bg-white/5 rounded-2xl p-4 border border-rose-400/30 bg-rose-500/5">
            <span className="text-rose-300 text-[10px] font-extrabold uppercase block">Disqualified Leads</span>
            <p className="text-2xl font-black text-rose-300 mt-1 font-mono">{displayFilteredStats.disqualified.toLocaleString()}</p>
            <p className="text-[10px] text-rose-400/80 font-semibold mt-1">
              {(displayFilteredStats.actual + displayFilteredStats.disqualified) > 0 
                ? `${((displayFilteredStats.disqualified / (displayFilteredStats.actual + displayFilteredStats.disqualified)) * 100).toFixed(1)}% disq rate` 
                : "Logged across sources"}
            </p>
          </div>

          {/* Remaining Leads Needed */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-[10px] font-extrabold uppercase block">Remaining Leads Needed</span>
            <p className="text-2xl font-black text-blue-300 mt-1 font-mono">
              {Math.max(0, displayFilteredStats.target - displayFilteredStats.actual).toLocaleString()}
            </p>
            <p className="text-[10px] text-blue-300/80 font-semibold mt-1">Shortfall to 100% target</p>
          </div>

          {/* Completion Status */}
          <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
            <span className="text-slate-400 text-[10px] font-extrabold uppercase block">Tracker Status</span>
            <p className="text-xl font-black text-emerald-400 mt-1">
              {displayFilteredStats.pct >= 100 ? "Target Achieved 🎉" : displayFilteredStats.pct >= 70 ? "On Track 🚀" : displayFilteredStats.pct > 0 ? "In Progress 📈" : "Awaiting Leads"}
            </p>
            <p className="text-[10px] text-slate-400 font-medium mt-1">Live pacing status</p>
          </div>
        </div>

        {/* Overall Animated Progress Bar */}
        <div className="space-y-2 pt-2 border-t border-white/10">
          <div className="flex justify-between items-center text-xs font-semibold text-slate-300">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              Overall Target Lead Completion Rate
            </span>
            <span className="font-mono font-bold text-amber-300">{displayFilteredStats.pct}% Reached</span>
          </div>
          <div className="w-full bg-slate-950/80 h-3 rounded-full overflow-hidden border border-white/10 p-0.5 shadow-inner">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-amber-500 via-amber-400 to-emerald-400"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, displayFilteredStats.pct)}%` }}
              transition={{ duration: 1.2, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>

      {/* 5 Configured Lead Source Target Cards */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-3">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Target className="w-5 h-5 text-blue-600" />
              Lead Source Channels Target & Progress
              <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                {selectedMonth === "all" ? "All Months" : MONTH_NAMES[selectedMonth]}
              </span>
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Individual channel targets, current leads achieved, and progress completion percentages.
            </p>
          </div>

          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
            Target Goal: <strong className="text-slate-900">{displayFilteredStats.target.toLocaleString()} Leads</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {filteredChannelCardsData.map((ch: any, idx: number) => {
            const actualAchieved = ch.displayActual;
            const pctAchieved = ch.pctAchieved;
            const sharePct = ch.sharePct;

            return (
              <motion.div
                key={ch.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className={`bg-white rounded-2xl p-5 border ${ch.border} shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group`}
              >
                {/* Top accent line */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: ch.color }}
                />

                <div>
                  {/* Channel Header */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl ${ch.lightBg} ${ch.text} border ${ch.border}`}>
                        {renderChannelIcon(ch.name, "w-5 h-5")}
                      </div>
                      <div>
                        <h3 className="font-black text-slate-900 text-base leading-tight">
                          {ch.name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          {ch.category}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Big Target Number */}
                  <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-100 mb-4">
                    <div className="flex items-baseline justify-between">
                      <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                        {selectedMonth === "all" ? "5-Month Target" : `${MONTH_SHORT_NAMES[selectedMonth]} Target`}
                      </span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md ${ch.badge}`}>
                        {sharePct}% Share
                      </span>
                    </div>
                    <p className="text-3xl font-black text-slate-900 mt-1 font-mono">
                      {Number(ch.displayTarget).toLocaleString()}
                      <span className="text-xs text-slate-400 font-bold ml-1">leads</span>
                    </p>
                    <p className="text-[11px] font-semibold text-slate-500 mt-1 flex items-center justify-between border-t border-slate-200/60 pt-1.5">
                      <span>Full 5-Mo Target:</span>
                      <strong className="text-slate-900 font-mono">{ch.target.toLocaleString()}</strong>
                    </p>
                  </div>

                  {/* Current Achieved Leads Box */}
                  <div className="bg-amber-50/60 p-2.5 rounded-xl border border-amber-200/60 mb-2 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-amber-900 font-extrabold">Current Achieved:</span>
                      <strong className="text-amber-700 font-mono font-black text-sm">{actualAchieved.toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Completion:</span>
                      <strong className="text-slate-900 font-extrabold">{pctAchieved}%</strong>
                    </div>
                  </div>

                  {/* Disqualified Leads Box */}
                  <div className="bg-rose-50/60 p-2.5 rounded-xl border border-rose-200/60 mb-3 text-xs space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-rose-900 font-extrabold">Disqualified:</span>
                      <strong className="text-rose-700 font-mono font-black text-sm">{Number(ch.displayDisqualified || 0).toLocaleString()}</strong>
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500 font-medium">Disq. Rate:</span>
                      <strong className="text-rose-800 font-extrabold">
                        {(actualAchieved + Number(ch.displayDisqualified || 0)) > 0
                          ? `${((Number(ch.displayDisqualified || 0) / (actualAchieved + Number(ch.displayDisqualified || 0))) * 100).toFixed(1)}%`
                          : "0%"}
                      </strong>
                    </div>
                  </div>
                </div>

                {/* Progress & Bar Tracker with Entrance Animation */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[11px] text-slate-500 font-bold">Progress:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {actualAchieved.toLocaleString()} / {ch.displayTarget.toLocaleString()}
                    </span>
                  </div>

                  <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, pctAchieved)}%` }}
                      transition={{ duration: 1, ease: "easeOut", delay: 0.1 * idx }}
                      style={{ 
                        backgroundColor: ch.color
                      }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[10px]">
                    <span className="text-slate-400 font-semibold">Benchmark CPL:</span>
                    <span className="font-extrabold text-slate-700">{ch.avgCpl}</span>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Visual Target Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Donut Distribution of Lead Sources (col-span-5) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <PieChart className="w-4.5 h-4.5 text-blue-600" />
                  Target Lead Share ({selectedMonth === "all" ? "All Months" : MONTH_NAMES[selectedMonth]})
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Percentage contribution of each channel to the target volume.
                </p>
              </div>
            </div>

            <div className="h-64 w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={65}
                    outerRadius={95}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieChartData.map((entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value: any) => [`${Number(value).toLocaleString()} leads`, 'Target']}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Center Overlay */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
                <span className="text-2xl font-black text-slate-900 font-mono">
                  {displayFilteredStats.target.toLocaleString()}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {selectedMonth === "all" ? "5-Mo Target" : "Month Target"}
                </span>
              </div>
            </div>
          </div>

          {/* Custom Legend */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-4 border-t border-slate-100 text-xs">
            {pieChartData.map((item: any) => (
              <div key={item.name} className="flex items-center gap-2 p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                <span className="w-3 h-3 rounded-md shrink-0" style={{ backgroundColor: item.color }} />
                <div className="min-w-0">
                  <p className="font-bold text-slate-800 text-[11px] truncate">{item.name}</p>
                  <p className="text-[10px] text-slate-500 font-mono">{item.value} ({item.pct}%)</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart 2: Cumulative Target vs Actual Pacing (col-span-7) */}
        <div className="lg:col-span-7 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-4 mb-4">
              <div>
                <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                  <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
                  Monthly Target vs Current Achieved Leads Progress
                </h3>
                <p className="text-xs text-slate-500 font-medium">
                  Month-by-month target progression vs actual leads achieved across months.
                </p>
              </div>

              <div className="flex items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-blue-600" />
                  <span className="font-bold text-slate-600">Cumulative Target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="font-bold text-slate-600">Achieved Leads</span>
                </div>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cumulativeChartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTarget" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563EB" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.25}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}
                  />
                  <Area type="monotone" dataKey="Cumulative Target" stroke="#2563EB" strokeWidth={3} fillOpacity={1} fill="url(#colorTarget)" />
                  <Area type="monotone" dataKey="Cumulative Actual" stroke="#F59E0B" strokeWidth={3} fillOpacity={1} fill="url(#colorActual)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 flex items-center justify-between text-xs mt-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-500 shrink-0 animate-pulse" />
              <span className="text-slate-600 font-medium">
                Pacing Benchmark: <strong className="text-slate-900 font-bold">570 leads/month average</strong> required to hit 2,850 total target.
              </span>
            </div>

            <span className="text-[10px] font-extrabold uppercase px-2.5 py-1 bg-blue-100 text-blue-800 rounded-lg">
              Aug - Dec 2026
            </span>
          </div>
        </div>
      </div>

      {/* Month-by-Month Target & Current Leads Matrix Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              Month-by-Month Lead Source Matrix & Current Leads Column
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Month-by-month channel targets and current achieved leads performance matrix across all 5 lead channels.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold">Status:</span>
            <span className="text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200 font-medium">
              Read-only matrix breakdown
            </span>
          </div>
        </div>

        {/* Matrix Table with Actual Month Names */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
                <th className="pb-3 pr-4">Month Name</th>
                <th className="pb-3 px-3 text-center text-blue-600">Google (1,200)</th>
                <th className="pb-3 px-3 text-center text-emerald-600">SEO (800)</th>
                <th className="pb-3 px-3 text-center text-indigo-600">Meta (450)</th>
                <th className="pb-3 px-3 text-center text-sky-600">WhatsApp (220)</th>
                <th className="pb-3 px-3 text-center text-teal-600">LinkedIn (180)</th>
                <th className="pb-3 px-3 text-center">Month Target</th>
                <th className="pb-3 px-3 text-center text-amber-600">Current Leads</th>
                <th className="pb-3 pl-3 text-right">Progress Status</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 text-xs font-semibold">
              {monthlyTargetBreakdown.map((mb) => {
                const isSelectedRow = selectedMonth === mb.monthIndex;

                return (
                  <tr 
                    key={mb.monthIndex} 
                    className={`transition-colors ${
                      isSelectedRow ? "bg-blue-50/80 border-l-4 border-l-blue-600" : "hover:bg-slate-50/70"
                    }`}
                  >
                    {/* Actual Month Name */}
                    <td className="py-4 pr-4 font-bold text-slate-900 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isSelectedRow ? "bg-blue-600 animate-ping" : "bg-slate-400"}`} />
                        <span className="font-extrabold text-slate-900">{mb.monthName}</span>
                        {isSelectedRow && (
                          <span className="text-[10px] font-extrabold bg-blue-600 text-white px-2 py-0.5 rounded-md ml-1">
                            Active Filter
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Google Channel Cell */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Tgt: {mb.channelTargets.google}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 text-xs" title="Achieved Leads">
                            {mb.monthActualsObj.google || 0}
                          </span>
                          <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 text-[11px]" title="Disqualified Leads">
                            {mb.monthDisqualifiedObj.google || 0} disq
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* SEO Channel Cell */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Tgt: {mb.channelTargets.seo}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100 text-xs" title="Achieved Leads">
                            {mb.monthActualsObj.seo || 0}
                          </span>
                          <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 text-[11px]" title="Disqualified Leads">
                            {mb.monthDisqualifiedObj.seo || 0} disq
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Meta Channel Cell */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Tgt: {mb.channelTargets.meta}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-extrabold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100 text-xs" title="Achieved Leads">
                            {mb.monthActualsObj.meta || 0}
                          </span>
                          <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 text-[11px]" title="Disqualified Leads">
                            {mb.monthDisqualifiedObj.meta || 0} disq
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* WhatsApp Channel Cell */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Tgt: {mb.channelTargets.whatsapp}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-extrabold text-sky-700 bg-sky-50 px-2 py-0.5 rounded-md border border-sky-100 text-xs" title="Achieved Leads">
                            {mb.monthActualsObj.whatsapp || 0}
                          </span>
                          <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 text-[11px]" title="Disqualified Leads">
                            {mb.monthDisqualifiedObj.whatsapp || 0} disq
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* LinkedIn Channel Cell */}
                    <td className="py-3 px-2 text-center">
                      <div className="flex flex-col items-center gap-0.5">
                        <span className="text-[10px] text-slate-400 font-bold">Tgt: {mb.channelTargets.linkedin}</span>
                        <div className="flex items-center gap-1">
                          <span className="font-mono font-extrabold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100 text-xs" title="Achieved Leads">
                            {mb.monthActualsObj.linkedin || 0}
                          </span>
                          <span className="font-mono font-extrabold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded-md border border-rose-100 text-[11px]" title="Disqualified Leads">
                            {mb.monthDisqualifiedObj.linkedin || 0} disq
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Month Total Target */}
                    <td className="py-3 px-3 text-center font-mono font-black text-slate-900 bg-slate-50/50">
                      {mb.monthTotalTarget.toLocaleString()}
                    </td>

                    {/* Current Achieved Leads Total */}
                    <td className="py-3 px-3 text-center font-mono font-black text-amber-700 bg-amber-50/50 border border-amber-200/60 rounded-xl">
                      <div>{mb.monthTotalActual.toLocaleString()} <span className="text-[10px] font-bold text-amber-600 block">achieved</span></div>
                      <div className="text-[10px] font-bold text-rose-600 border-t border-amber-200/40 mt-1 pt-0.5">{mb.monthTotalDisqualified.toLocaleString()} disq</div>
                    </td>

                    {/* Action & Progress Status */}
                    <td className="py-3 pl-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setActiveUpdateMonth(mb.monthIndex);
                            setIsUpdatingStatus(true);
                          }}
                          className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-lg text-[10px] font-extrabold transition-all border border-amber-200 flex items-center gap-1 cursor-pointer"
                        >
                          <Activity className="w-3 h-3 text-amber-700" />
                          <span>Update Leads</span>
                        </button>

                        {mb.monthTotalActual === 0 ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-500 border border-slate-200">
                            0% Leads
                          </span>
                        ) : mb.monthTotalActual >= mb.monthTotalTarget ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {mb.progressPct}% Achieved
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            {mb.progressPct}% Progress
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Matrix Summary Footer Row */}
            <tfoot>
              <tr className="bg-slate-900 text-white font-mono text-xs">
                <td className="py-4 px-4 font-extrabold rounded-l-2xl">
                  TOTAL 5-MONTHS
                </td>
                <td className="py-4 px-2 text-center font-bold text-blue-300">
                  {channelTargets.find((c: any) => c.id === 'google')?.target}
                </td>
                <td className="py-4 px-2 text-center font-bold text-emerald-300">
                  {channelTargets.find((c: any) => c.id === 'seo')?.target}
                </td>
                <td className="py-4 px-2 text-center font-bold text-indigo-300">
                  {channelTargets.find((c: any) => c.id === 'meta')?.target}
                </td>
                <td className="py-4 px-2 text-center font-bold text-sky-300">
                  {channelTargets.find((c: any) => c.id === 'whatsapp')?.target}
                </td>
                <td className="py-4 px-2 text-center font-bold text-teal-300">
                  {channelTargets.find((c: any) => c.id === 'linkedin')?.target}
                </td>
                <td className="py-4 px-3 text-center font-black text-white text-sm">
                  {total5MonthTarget.toLocaleString()}
                </td>
                <td className="py-4 px-3 text-center font-black text-amber-300 text-sm">
                  {totalActualAchievedAllMonths.toLocaleString()}
                </td>
                <td className="py-4 pr-4 text-right rounded-r-2xl">
                  <span className="px-3 py-1 bg-blue-600 text-white rounded-lg text-[10px] font-black uppercase">
                    {total5MonthTarget > 0 ? Math.round((totalActualAchievedAllMonths / total5MonthTarget) * 100) : 0}% OVERALL
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Lead-to-Enrollment Simulator & ROI Forecast */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50/40 p-6 sm:p-8 rounded-3xl border border-blue-100 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-blue-100 pb-4">
          <div>
            <h3 className="font-black text-slate-900 text-lg flex items-center gap-2">
              <Coins className="w-5 h-5 text-blue-600" />
              Lead Conversion & Enrollment Simulator
            </h3>
            <p className="text-xs text-slate-500 font-medium">
              Project enrolled coaching participants & revenue based on lead target conversion rates.
            </p>
          </div>

          <span className="px-3 py-1 bg-blue-600 text-white text-xs font-black rounded-full shadow-md">
            Interactive Forecast
          </span>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Controls Column */}
          <div className="lg:col-span-5 space-y-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <label className="font-extrabold text-slate-700">Lead-to-Enrollment Rate:</label>
                <span className="font-black text-blue-600 font-mono text-sm">{simulatedConversionRate}%</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="25" 
                step="0.5"
                value={simulatedConversionRate}
                onChange={(e) => setSimulatedConversionRate(parseFloat(e.target.value))}
                className="w-full accent-blue-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 font-bold">
                <span>3% Conservative</span>
                <span>10% Benchmark</span>
                <span>25% Aggressive</span>
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-slate-100">
              <label className="text-xs font-extrabold text-slate-700 block">Avg Course Fee per Participant (₹):</label>
              <input 
                type="number" 
                step="5000"
                value={avgTicketPrice}
                onChange={(e) => setAvgTicketPrice(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>

          {/* Forecast Output Bento */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Box 1: Projected Enrolled Clients */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Projected Enrolled Participants</p>
                <p className="text-3xl font-black text-slate-900 mt-2 font-mono">
                  {Math.round(displayFilteredStats.target * (simulatedConversionRate / 100))}
                  <span className="text-xs text-slate-400 font-normal ml-1">students</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 border-t border-slate-100 pt-2">
                Equivalent to <strong className="text-slate-900 font-bold">~{Math.round((displayFilteredStats.target * (simulatedConversionRate / 100)) / 40)} Coaching Batches</strong> (40 seats each).
              </p>
            </div>

            {/* Box 2: Projected Revenue */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Projected Revenue ({selectedMonth === "all" ? "5-Month" : "Single Month"})</p>
                <p className="text-3xl font-black text-emerald-600 mt-2 font-mono">
                  ₹{((Math.round(displayFilteredStats.target * (simulatedConversionRate / 100)) * avgTicketPrice) / 100000).toFixed(2)}
                  <span className="text-xs text-emerald-700 font-normal ml-1">Lakhs</span>
                </p>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-3 border-t border-slate-100 pt-2">
                Based on ₹{(avgTicketPrice).toLocaleString()} per enrolled coach.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Current Leads & Progress Update Modal */}
      <AnimatePresence>
        {isUpdatingStatus && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-2xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto"
            >
              {/* Modal Header - Fixed at Top */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-amber-500" />
                    Update Current Achieved Leads vs Target
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Select a month and easily update current achieved lead counts to track real-time progress.
                  </p>
                </div>
                <button
                  onClick={() => setIsUpdatingStatus(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Modal Content Body - Scrollable */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
                {/* Month Selector Dropdown with Actual Month Names */}
                <div>
                  <label className="text-xs font-extrabold text-slate-700 block mb-1.5">Select Target Month:</label>
                  <select
                    value={activeUpdateMonth}
                    onChange={(e) => setActiveUpdateMonth(parseInt(e.target.value))}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 font-extrabold text-sm text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                  >
                    {MONTH_NAMES.map((mName, idx) => (
                      <option key={idx} value={idx}>{mName}</option>
                    ))}
                  </select>
                </div>

                {/* Channel Current Leads Editor List */}
                <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                  <p className="text-xs font-extrabold text-slate-800 uppercase tracking-wider mb-2">
                    Update Achieved & Disqualified Leads for <span className="text-blue-600">{MONTH_NAMES[activeUpdateMonth]}</span>
                  </p>

                  {channelTargets.map((ch: any) => {
                    const mWeight = MONTH_WEIGHTS[activeUpdateMonth];
                    const chMonthTarget = Math.round(ch.target * mWeight);
                    const currentAchieved = Number(monthlyActuals[activeUpdateMonth]?.[ch.id] || 0);
                    const currentDisqualified = Number(disqualifiedActuals[activeUpdateMonth]?.[ch.id] || 0);
                    const progressPct = chMonthTarget > 0 ? Math.round((currentAchieved / chMonthTarget) * 100) : 0;

                    return (
                      <div key={ch.id} className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                        <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-2.5">
                            <div className={`p-2 rounded-xl ${ch.lightBg} ${ch.text}`}>
                              {renderChannelIcon(ch.name, "w-4 h-4")}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900 text-sm">{ch.name}</p>
                              <span className="text-[10px] font-bold text-slate-400">Target: <strong className="text-slate-800 font-mono">{chMonthTarget}</strong> leads</span>
                            </div>
                          </div>

                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded ${progressPct >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                            {progressPct}% Achieved
                          </span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          {/* Current Achieved Leads Stepper */}
                          <div className="bg-amber-50/50 p-2.5 rounded-xl border border-amber-200/60 flex flex-col justify-between gap-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-amber-900">Current Achieved:</span>
                              <span className="font-mono font-black text-amber-800">{currentAchieved}</span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => handleActualChange(activeUpdateMonth, ch.id, String(Math.max(0, currentAchieved - 10)))}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition-all cursor-pointer"
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActualChange(activeUpdateMonth, ch.id, String(Math.max(0, currentAchieved - 1)))}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-amber-100 text-amber-900 font-bold text-xs border border-amber-200 transition-all cursor-pointer"
                              >
                                -1
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={currentAchieved || ""}
                                onChange={(e) => handleActualChange(activeUpdateMonth, ch.id, e.target.value)}
                                placeholder="0"
                                className="w-16 px-1 py-1 text-center font-mono font-black text-xs text-slate-900 border border-amber-300 rounded-lg focus:ring-2 focus:ring-amber-500 outline-none bg-white"
                              />

                              <button
                                type="button"
                                onClick={() => handleActualChange(activeUpdateMonth, ch.id, String(currentAchieved + 1))}
                                className="px-2 py-1 rounded-lg bg-amber-200 hover:bg-amber-300 text-amber-900 font-bold text-xs transition-all cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleActualChange(activeUpdateMonth, ch.id, String(currentAchieved + 10))}
                                className="px-2 py-1 rounded-lg bg-amber-300 hover:bg-amber-400 text-amber-950 font-bold text-xs transition-all cursor-pointer"
                              >
                                +10
                              </button>
                            </div>
                          </div>

                          {/* Disqualified Leads Stepper */}
                          <div className="bg-rose-50/50 p-2.5 rounded-xl border border-rose-200/60 flex flex-col justify-between gap-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-rose-900">Disqualified Leads:</span>
                              <span className="font-mono font-black text-rose-800">{currentDisqualified}</span>
                            </div>

                            <div className="flex items-center justify-between gap-1">
                              <button
                                type="button"
                                onClick={() => handleDisqualifiedChange(activeUpdateMonth, ch.id, String(Math.max(0, currentDisqualified - 10)))}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
                              >
                                -10
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDisqualifiedChange(activeUpdateMonth, ch.id, String(Math.max(0, currentDisqualified - 1)))}
                                className="px-2 py-1 rounded-lg bg-white hover:bg-rose-100 text-rose-900 font-bold text-xs border border-rose-200 transition-all cursor-pointer"
                              >
                                -1
                              </button>

                              <input
                                type="number"
                                min="0"
                                value={currentDisqualified || ""}
                                onChange={(e) => handleDisqualifiedChange(activeUpdateMonth, ch.id, e.target.value)}
                                placeholder="0"
                                className="w-16 px-1 py-1 text-center font-mono font-black text-xs text-slate-900 border border-rose-300 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none bg-white"
                              />

                              <button
                                type="button"
                                onClick={() => handleDisqualifiedChange(activeUpdateMonth, ch.id, String(currentDisqualified + 1))}
                                className="px-2 py-1 rounded-lg bg-rose-200 hover:bg-rose-300 text-rose-900 font-bold text-xs transition-all cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDisqualifiedChange(activeUpdateMonth, ch.id, String(currentDisqualified + 10))}
                                className="px-2 py-1 rounded-lg bg-rose-300 hover:bg-rose-400 text-rose-950 font-bold text-xs transition-all cursor-pointer"
                              >
                                +10
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer Controls - Fixed at Bottom */}
              <div className="p-5 sm:p-6 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-3xl">
                <span className="text-xs text-slate-500 font-medium">
                  Live updates are saved automatically.
                </span>

                <button
                  onClick={() => setIsUpdatingStatus(false)}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  Done Updating
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Targets Modal */}
      <AnimatePresence>
        {isEditingTargets && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 flex flex-col max-h-[90vh] overflow-hidden my-auto"
            >
              {/* Modal Header - Fixed */}
              <div className="p-5 sm:p-6 border-b border-slate-100 flex justify-between items-center shrink-0 bg-white rounded-t-3xl">
                <div>
                  <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                    <Edit3 className="w-5 h-5 text-blue-600" />
                    Customize 5-Month Lead Source Targets
                  </h3>
                  <p className="text-xs text-slate-500 font-medium mt-0.5">
                    Adjust target lead numbers for each channel.
                  </p>
                </div>
                <button
                  onClick={() => setIsEditingTargets(false)}
                  className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {/* Target Inputs Form - Scrollable */}
              <div className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {tempTargets.map((ch: any, idx: number) => (
                  <div key={ch.id} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl ${ch.lightBg} ${ch.text}`}>
                        {renderChannelIcon(ch.name, "w-4 h-4")}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900 text-sm">{ch.name}</p>
                        <p className="text-[10px] text-slate-400 font-bold">{ch.category}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min="0"
                        value={ch.target}
                        onChange={(e) => {
                          const val = Math.max(0, parseInt(e.target.value) || 0);
                          setTempTargets(prev => prev.map((item: any, i: number) => i === idx ? { ...item, target: val } : item));
                        }}
                        className="w-28 px-3 py-2 text-right font-mono font-black text-slate-900 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                      />
                      <span className="text-xs font-bold text-slate-400">leads</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Modal Footer Controls - Fixed */}
              <div className="p-5 sm:p-6 border-t border-slate-100 flex items-center justify-between shrink-0 bg-slate-50/50 rounded-b-3xl">
                <button
                  onClick={handleResetToDefaults}
                  className="text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 px-3 py-2 rounded-xl border border-rose-100 transition-all cursor-pointer"
                >
                  Reset Defaults
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setIsEditingTargets(false)}
                    className="px-4 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100 text-xs font-bold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveTargets}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 cursor-pointer"
                  >
                    <Save className="w-4 h-4" />
                    Save Targets
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
