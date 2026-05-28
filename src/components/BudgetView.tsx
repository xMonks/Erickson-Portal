import React, { useState, useEffect, useMemo } from "react";
import { collection, onSnapshot, query, doc, addDoc, deleteDoc, writeBatch, getDocs, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, AreaChart, Area
} from "recharts";
import { 
  TrendingUp, TrendingDown, Clock, Search, Filter, Plus, Calendar, 
  Trash2, Download, AlertTriangle, Sparkles, LayoutGrid, ListFilter, HelpCircle, ArrowUpRight, ArrowDownRight, Coins, RefreshCw, Layers, Loader2
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface Transaction {
  id: string;
  platform: "Google" | "Whatsapp" | "Meta" | "Youtube" | "Linkedin" | "Openai" | "OTT";
  type: "credit" | "spend";
  amount: number;
  date: string;
  description: string;
  createdAt: any;
}

interface BatchROI {
  id: string;
  name: string;
  startDate: string;
  conversions: Record<string, number>;
  spendMonths: string[];
}

const PLATFORM_DETAILS = {
  Google: { color: "#4285F4", text: "text-blue-600", bg: "bg-blue-50", hoverBg: "hover:bg-blue-100/50", border: "border-blue-100" },
  Whatsapp: { color: "#25D366", text: "text-emerald-600", bg: "bg-emerald-50", hoverBg: "hover:bg-emerald-100/50", border: "border-emerald-100" },
  Meta: { color: "#0668E1", text: "text-indigo-600", bg: "bg-indigo-50", hoverBg: "hover:bg-indigo-100/50", border: "border-indigo-100" },
  Youtube: { color: "#FF0000", text: "text-rose-600", bg: "bg-rose-50", hoverBg: "hover:bg-rose-100/50", border: "border-rose-100" },
  Linkedin: { color: "#0A66C2", text: "text-sky-600", bg: "bg-sky-50", hoverBg: "hover:bg-sky-100/50", border: "border-sky-100" },
  Openai: { color: "#10a37f", text: "text-teal-600", bg: "bg-teal-50", hoverBg: "hover:bg-teal-100/50", border: "border-teal-100" },
  OTT: { color: "#8A2BE2", text: "text-purple-600", bg: "bg-purple-50", hoverBg: "hover:bg-purple-100/50", border: "border-purple-100" }
};

const PLATFORMS = Object.keys(PLATFORM_DETAILS) as Array<keyof typeof PLATFORM_DETAILS>;

const CASE_STUDY_TRANSACTIONS = [
  // Google Ads Payments (Inflows - Total ₹5,50,000.00)
  { platform: "Google", type: "credit", amount: 100000, date: "2026-01-01", description: "Google Ads January Payment" },
  { platform: "Google", type: "credit", amount: 100000, date: "2026-02-01", description: "Google Ads February Payment" },
  { platform: "Google", type: "credit", amount: 100000, date: "2026-03-01", description: "Google Ads March Payment" },
  { platform: "Google", type: "credit", amount: 100000, date: "2026-04-01", description: "Google Ads April Payment" },
  { platform: "Google", type: "credit", amount: 150000, date: "2026-05-01", description: "Google Ads May Payment (Current)" },

  // Google Ads Spends (Outflows - Total ₹493,808.11)
  { platform: "Google", type: "spend", amount: 68593.99, date: "2026-01-15", description: "Google Ads January Spends (Net Cost)" },
  { platform: "Google", type: "spend", amount: 88684.63, date: "2026-02-15", description: "Google Ads February Spends (Net Cost)" },
  { platform: "Google", type: "spend", amount: 113055.72, date: "2026-03-15", description: "Google Ads March Spends (Net Cost)" },
  { platform: "Google", type: "spend", amount: 118356.40, date: "2026-04-15", description: "Google Ads April Spends (Net Cost)" },
  { platform: "Google", type: "spend", amount: 105117.37, date: "2026-05-15", description: "Google Ads May Spends (Net Cost)" },

  // YouTube Ads Payments (Inflows - Total ₹220,000.00)
  { platform: "Youtube", type: "credit", amount: 50000, date: "2026-01-01", description: "YouTube Ads January Payment" },
  { platform: "Youtube", type: "credit", amount: 60000, date: "2026-02-01", description: "YouTube Ads February Payment" },
  { platform: "Youtube", type: "credit", amount: 30000, date: "2026-03-01", description: "YouTube Ads March Payment" },
  { platform: "Youtube", type: "credit", amount: 50000, date: "2026-04-01", description: "YouTube Ads April Payment" },
  { platform: "Youtube", type: "credit", amount: 30000, date: "2026-05-01", description: "YouTube Ads May Payment (Current)" }, // Set as 30,000 so that total credits is exactly 220,000.00.

  // YouTube Ads Spends (Outflows - Total ₹220,000.00)
  { platform: "Youtube", type: "spend", amount: 33457.96, date: "2026-01-15", description: "YouTube Ads January Spends (Net Cost)" },
  { platform: "Youtube", type: "spend", amount: 42208.08, date: "2026-02-15", description: "YouTube Ads February Spends (Net Cost)" },
  { platform: "Youtube", type: "spend", amount: 64324.49, date: "2026-03-15", description: "YouTube Ads March Spends (Net Cost)" },
  { platform: "Youtube", type: "spend", amount: 50009.47, date: "2026-04-15", description: "YouTube Ads April Spends (Net Cost)" },
  { platform: "Youtube", type: "spend", amount: 30000.00, date: "2026-05-15", description: "YouTube Ads May Spends (Net Cost)" },

  // Whatsapp Payments (Inflows - Total ₹17,527.78)
  { platform: "Whatsapp", type: "credit", amount: 2056.98, date: "2026-01-01", description: "WhatsApp Ads January Payment" },
  { platform: "Whatsapp", type: "credit", amount: 2056.98, date: "2026-02-01", description: "WhatsApp Ads February Payment" },
  { platform: "Whatsapp", type: "credit", amount: 2136.68, date: "2026-03-01", description: "WhatsApp Ads March Payment" },
  { platform: "Whatsapp", type: "credit", amount: 3777.14, date: "2026-04-01", description: "WhatsApp Ads April Payment" },
  { platform: "Whatsapp", type: "credit", amount: 7500.00, date: "2026-05-01", description: "WhatsApp Ads May Payment (Current)" },

  // Whatsapp Spends (Outflows - Total ₹15,470.80)
  { platform: "Whatsapp", type: "spend", amount: 2056.98, date: "2026-01-15", description: "WhatsApp Ads January Spends (Net Cost)" },
  { platform: "Whatsapp", type: "spend", amount: 2056.98, date: "2026-02-15", description: "WhatsApp Ads February Spends (Net Cost)" },
  { platform: "Whatsapp", type: "spend", amount: 2136.68, date: "2026-03-15", description: "WhatsApp Ads March Spends (Net Cost)" },
  { platform: "Whatsapp", type: "spend", amount: 3777.14, date: "2026-04-15", description: "WhatsApp Ads April Spends (Net Cost)" },
  { platform: "Whatsapp", type: "spend", amount: 5443.02, date: "2026-05-15", description: "WhatsApp Ads May Spends (Net Cost)" },

  // Meta Payments (Inflows - Total ₹96,812.26)
  { platform: "Meta", type: "credit", amount: 4631.50, date: "2026-02-01", description: "Meta Ads February Payment" },
  { platform: "Meta", type: "credit", amount: 42017.28, date: "2026-03-01", description: "Meta Ads March Payment" },
  { platform: "Meta", type: "credit", amount: 31283.50, date: "2026-04-01", description: "Meta Ads April Payment" },
  { platform: "Meta", type: "credit", amount: 18879.98, date: "2026-05-01", description: "Meta Ads May Payment (Current)" },

  // Meta Spends (Outflows - Total ₹96,812.26)
  { platform: "Meta", type: "spend", amount: 4631.50, date: "2026-02-15", description: "Meta Ads February Spends (Net Cost)" },
  { platform: "Meta", type: "spend", amount: 42017.28, date: "2026-03-15", description: "Meta Ads March Spends (Net Cost)" },
  { platform: "Meta", type: "spend", amount: 31283.50, date: "2026-04-15", description: "Meta Ads April Spends (Net Cost)" },
  { platform: "Meta", type: "spend", amount: 18879.98, date: "2026-05-15", description: "Meta Ads May Spends (Net Cost)" }
];

export default function BudgetView() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isClearing, setIsClearing] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [txToDelete, setTxToDelete] = useState<string | null>(null);

  // Filter States
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("all");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [matrixViewMode, setMatrixViewMode] = useState<"spend" | "credit" | "comparison">("comparison");

  // Input States
  const [formType, setFormType] = useState<"credit" | "spend">("spend");
  const [formPlatform, setFormPlatform] = useState<keyof typeof PLATFORM_DETAILS>("Google");
  const [formAmount, setFormAmount] = useState<string>("");
  const [formDate, setFormDate] = useState<string>(() => {
    const today = new Date();
    const YYYY = today.getFullYear();
    const MM = String(today.getMonth() + 1).padStart(2, "0");
    const DD = String(today.getDate()).padStart(2, "0");
    return `${YYYY}-${MM}-${DD}`;
  });
  const [formDescription, setFormDescription] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<{ type: "success" | "error" | null; msg: string }>({ type: null, msg: "" });

  const [activeTab, setActiveTab] = useState<"analytics" | "roi" | "transactions">("analytics");

  // ROI & Conversions state
  const [roiBatches, setRoiBatches] = useState<BatchROI[]>([]);
  const [courseFee, setCourseFee] = useState<number>(75000);
  const [loadingRoi, setLoadingRoi] = useState<boolean>(true);
  const [showAddBatchModal, setShowAddBatchModal] = useState<boolean>(false);
  const [participants, setParticipants] = useState<any[]>([]);
  const [useCrmConversions, setUseCrmConversions] = useState<boolean>(true);

  // New Batch Form States
  const [newBatchName, setNewBatchName] = useState("");
  const [newBatchId, setNewBatchId] = useState("");
  const [newBatchStartDate, setNewBatchStartDate] = useState(() => {
    const today = new Date();
    return today.toISOString().substring(0, 10);
  });
  const [newBatchSpendMonths, setNewBatchSpendMonths] = useState<string[]>([]);
  const [newBatchConversions, setNewBatchConversions] = useState<Record<string, number>>({
    Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0
  });

  const DEFAULT_ROI_BATCHES: BatchROI[] = useMemo(() => [
    {
      id: "62",
      name: "Batch 62",
      startDate: "2026-01-22",
      conversions: { Google: 8, Youtube: 1, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
      spendMonths: ["2026-01"]
    },
    {
      id: "63",
      name: "Batch 63",
      startDate: "2026-03-19",
      conversions: { Google: 9, Youtube: 1, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
      spendMonths: ["2026-02", "2026-03"]
    },
    {
      id: "64",
      name: "Batch 64",
      startDate: "2026-05-28",
      conversions: { Google: 7, Youtube: 1, Whatsapp: 1, Meta: 1, Linkedin: 0, Openai: 0, OTT: 0 },
      spendMonths: ["2026-04", "2026-05"]
    }
  ], []);

  // Subscribe to ROI Configuration setup
  useEffect(() => {
    const docRef = doc(db, "settings", "roiData");
    const unsubscribe = onSnapshot(docRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        if (data.batches) {
          setRoiBatches(data.batches);
        } else {
          setRoiBatches(DEFAULT_ROI_BATCHES);
        }
        if (data.courseFee !== undefined) {
          setCourseFee(data.courseFee);
        }
        setUseCrmConversions(true);
      } else {
        setRoiBatches(DEFAULT_ROI_BATCHES);
      }
      setLoadingRoi(false);
    }, (error) => {
      console.error("Error reading ROI settings:", error);
      setRoiBatches(DEFAULT_ROI_BATCHES);
      setLoadingRoi(false);
    });
    return () => unsubscribe();
  }, [DEFAULT_ROI_BATCHES]);

  const updateRoiDataInFirestore = async (
    updatedBatches: BatchROI[],
    updatedFee: number,
    updatedUseCrm: boolean = useCrmConversions
  ) => {
    try {
      await setDoc(doc(db, "settings", "roiData"), {
        batches: updatedBatches,
        courseFee: updatedFee,
        useCrmConversions: updatedUseCrm,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    } catch (err) {
      console.error("Error saving updated ROI configurations:", err);
    }
  };

  const handleConversionChange = async (batchId: string, platform: string, newValue: number) => {
    const updated = roiBatches.map(b => {
      if (b.id === batchId) {
        return {
          ...b,
          conversions: {
            ...b.conversions,
            [platform]: Math.max(0, newValue)
          }
        };
      }
      return b;
    });
    setRoiBatches(updated);
    await updateRoiDataInFirestore(updated, courseFee);
  };

  const handleCourseFeeChange = async (val: number) => {
    setCourseFee(val);
    await updateRoiDataInFirestore(roiBatches, val);
  };

  const handleAddBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBatchName.trim()) return;
    const bId = newBatchId.trim() || String(Math.floor(Math.random() * 1000) + 100);
    
    const newBatchObj: BatchROI = {
      id: bId,
      name: newBatchName.trim(),
      startDate: newBatchStartDate,
      conversions: newBatchConversions,
      spendMonths: newBatchSpendMonths.length > 0 ? newBatchSpendMonths : [newBatchStartDate.substring(0, 7)]
    };

    const updated = [...roiBatches, newBatchObj];
    setRoiBatches(updated);
    await updateRoiDataInFirestore(updated, courseFee);

    // Reset Form
    setNewBatchName("");
    setNewBatchId("");
    setNewBatchSpendMonths([]);
    setNewBatchConversions({ Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 });
    setShowAddBatchModal(false);
  };

  const handleDeleteBatch = async (batchId: string) => {
    const updated = roiBatches.filter(b => b.id !== batchId);
    setRoiBatches(updated);
    await updateRoiDataInFirestore(updated, courseFee);
  };

  const handleUseCrmConversionsChange = async (val: boolean) => {
    setUseCrmConversions(val);
    await updateRoiDataInFirestore(roiBatches, courseFee, val);
  };

  const toggleNewBatchSpendMonth = (m: string) => {
    if (newBatchSpendMonths.includes(m)) {
      setNewBatchSpendMonths(newBatchSpendMonths.filter(x => x !== m));
    } else {
      setNewBatchSpendMonths([...newBatchSpendMonths, m]);
    }
  };

  // Subscribe to CRM participants for automatic conversions mapping
  useEffect(() => {
    const q = query(collection(db, "participants"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: any[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() });
      });
      setParticipants(data);
    }, (error) => {
      console.error("Error loading participants in BudgetView:", error);
    });
    return () => unsubscribe();
  }, []);

  // Subscribe to Firestore entries
  useEffect(() => {
    const q = query(collection(db, "adsBudgetTransactions"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Transaction[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Transaction);
      });
      // Sort chronologically by date desc
      data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTransactions(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore loading error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Clear all data
  const handleClearAllData = async () => {
    setShowClearConfirm(false);
    setIsClearing(true);
    try {
      const q = query(collection(db, "adsBudgetTransactions"));
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        const batch = writeBatch(db);
        snapshot.forEach((d) => {
          batch.delete(d.ref);
        });
        await batch.commit();
      }
    } catch (err) {
      console.error("Error clearing budget entries:", err);
    } finally {
      setIsClearing(false);
    }
  };

  // Seeding case study
  const handleLoadCaseStudy = async () => {
    setIsSeeding(true);
    try {
      const q = query(collection(db, "adsBudgetTransactions"));
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      
      // Clear any old logs to avoid duplicates and show the exact case structure
      if (!snapshot.empty) {
        snapshot.forEach((d) => {
          batch.delete(d.ref);
        });
      }

      // Add the exact 2026 case study entries block
      CASE_STUDY_TRANSACTIONS.forEach((tx) => {
        const docRef = doc(collection(db, "adsBudgetTransactions"));
        batch.set(docRef, {
          ...tx,
          createdAt: new Date().toISOString()
        });
      });

      await batch.commit();
    } catch (err) {
      console.error("Error seeding Google case dataset:", err);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formAmount || isNaN(Number(formAmount)) || Number(formAmount) <= 0) {
      setFormMessage({ type: "error", msg: "Please enter a valid amount." });
      return;
    }
    if (!formDescription.trim()) {
      setFormMessage({ type: "error", msg: "Please enter notes or description." });
      return;
    }

    setIsSubmitting(true);
    setFormMessage({ type: null, msg: "" });

    try {
      await addDoc(collection(db, "adsBudgetTransactions"), {
        platform: formPlatform,
        type: formType,
        amount: parseFloat(formAmount),
        date: formDate,
        description: formDescription,
        createdAt: new Date().toISOString()
      });

      setFormMessage({ type: "success", msg: "Transaction recorded successfully!" });
      setFormAmount("");
      setFormDescription("");
      
      // Auto dismiss success alert
      setTimeout(() => setFormMessage({ type: null, msg: "" }), 3000);
    } catch (error) {
      console.error("Error writing transaction:", error);
      setFormMessage({ type: "error", msg: "Failed to save transaction." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const performDeleteTransaction = async () => {
    if (!txToDelete) return;
    const id = txToDelete;
    setTxToDelete(null);
    try {
      await deleteDoc(doc(db, "adsBudgetTransactions", id));
    } catch (err) {
      console.error("Error deleting record:", err);
    }
  };

  // Helper format currency
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // Extract all available months from transactions for filter dropdown
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    transactions.forEach(t => {
      if (t.date) {
        // "YYYY-MM" format
        months.add(t.date.substring(0, 7));
      }
    });
    return Array.from(months).sort((a, b) => b.localeCompare(a)); // sorting descending
  }, [transactions]);

  const normalizePlatform = (str: string): string => {
    if (!str) return "";
    const cleaned = str.trim().toLowerCase();
    if (cleaned.includes("google")) return "Google";
    if (cleaned.includes("whatsapp")) return "Whatsapp";
    if (cleaned.includes("youtube")) return "Youtube";
    if (cleaned.includes("meta") || cleaned.includes("facebook") || cleaned.includes("instagram")) return "Meta";
    if (cleaned.includes("linkedin")) return "Linkedin";
    if (cleaned.includes("openai") || cleaned.includes("chatgpt")) return "Openai";
    if (cleaned.includes("ott")) return "OTT";
    return str; // Fallback
  };

  const roiCalculations = useMemo(() => {
    let grandConversions = 0;
    let grandCost = 0;
    
    // Calculate for each batch
    const batchList = roiBatches.map(batch => {
      let batchConversionsCount = 0;
      const channelStats = PLATFORMS.map(platform => {
        let conversions = batch.conversions[platform] || 0;
        
        if (useCrmConversions) {
          // Count participants with matching batch and leadSource
          conversions = participants.filter(p => {
            const matchesBatch = p.batchNumber && (
              p.batchNumber.toString() === batch.id || 
              p.batchNumber.toString() === `Batch ${batch.id}` || 
              p.batchNumber.toString().trim() === batch.name.trim() ||
              p.batchNumber.toString().toLowerCase().replace(/\s+/g, '') === batch.name.toLowerCase().replace(/\s+/g, '')
            );
            const matchesPlatform = p.leadSource && (
              normalizePlatform(p.leadSource.toString().trim()) === platform
            );
            return matchesBatch && matchesPlatform;
          }).length;
        }

        batchConversionsCount += conversions;
        
        // Sum spending in these months for this platform
        const cost = transactions
          .filter(t => t.type === "spend" && t.platform === platform && t.date && batch.spendMonths.includes(t.date.substring(0, 7)))
          .reduce((sum, t) => sum + t.amount, 0);
          
        return {
          platform,
          conversions,
          cost,
          revenue: conversions * courseFee,
          net: (conversions * courseFee) - cost,
          cpa: conversions > 0 ? cost / conversions : 0,
          roi: cost > 0 ? (((conversions * courseFee) - cost) / cost) * 100 : 0
        };
      });

      const totalConversions = batchConversionsCount;
      const totalRevenue = totalConversions * courseFee;

      // Spends across ALL channels for this batch's months
      const totalCost = channelStats.reduce((sum, ch) => sum + ch.cost, 0);
      const totalNet = totalRevenue - totalCost;
      const blendedRoi = totalCost > 0 ? (totalNet / totalCost) * 100 : 0;
      const blendedCpa = totalConversions > 0 ? totalCost / totalConversions : 0;

      grandConversions += totalConversions;
      grandCost += totalCost;

      return {
        ...batch,
        channelStats,
        totalConversions,
        totalCost,
        totalRevenue,
        totalNet,
        blendedRoi,
        blendedCpa
      };
    });

    const grandRevenue = grandConversions * courseFee;
    const grandNet = grandRevenue - grandCost;
    const grandRoi = grandCost > 0 ? (grandNet / grandCost) * 100 : 0;

    return {
      batches: batchList,
      grandConversions,
      grandCost,
      grandRevenue,
      grandNet,
      grandRoi
    };
  }, [roiBatches, courseFee, transactions, useCrmConversions, participants]);

  // Compute stats on the filtered vs overall dataset
  const overallTotals = useMemo(() => {
    let totalAdded = 0;
    let totalSpent = 0;

    const target = transactions.filter(t => {
      const matchPlatform = selectedPlatform === "all" || t.platform === selectedPlatform;
      const matchMonth = selectedMonth === "all" || (t.date && t.date.startsWith(selectedMonth));
      return matchPlatform && matchMonth;
    });

    target.forEach(t => {
      if (t.type === "credit") {
        totalAdded += t.amount;
      } else {
        totalSpent += t.amount;
      }
    });

    return {
      added: totalAdded,
      spent: totalSpent,
      remaining: totalAdded - totalSpent
    };
  }, [transactions, selectedPlatform, selectedMonth]);

  // Filters process
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchPlatform = selectedPlatform === "all" || t.platform === selectedPlatform;
      const matchType = selectedType === "all" || t.type === selectedType;
      const matchMonth = selectedMonth === "all" || (t.date && t.date.startsWith(selectedMonth));
      
      const searchLower = searchQuery.toLowerCase();
      const matchSearch = !searchLower || 
        t.description.toLowerCase().includes(searchLower) || 
        t.platform.toLowerCase().includes(searchLower) ||
        t.amount.toString().includes(searchLower);

      return matchPlatform && matchType && matchMonth && matchSearch;
    });
  }, [transactions, selectedPlatform, selectedType, selectedMonth, searchQuery]);

  // Chart data calculation
  const platformBreakdownData = useMemo(() => {
    const platformStats: Record<string, { credited: number; spent: number }> = {};
    
    // Initialize platforms
    PLATFORMS.forEach(p => {
      platformStats[p] = { credited: 0, spent: 0 };
    });

    // We can aggregate values for the selected month to make the chart adapt to time filters!
    const targetDataset = selectedMonth === "all" 
      ? transactions 
      : transactions.filter(t => t.date && t.date.startsWith(selectedMonth));

    targetDataset.forEach(t => {
      if (platformStats[t.platform]) {
        if (t.type === "credit") {
          platformStats[t.platform].credited += t.amount;
        } else {
          platformStats[t.platform].spent += t.amount;
        }
      }
    });

    return PLATFORMS.map(p => ({
      name: p,
      Credited: platformStats[p].credited,
      Spent: platformStats[p].spent,
      Net: platformStats[p].credited - platformStats[p].spent,
      color: PLATFORM_DETAILS[p].color
    })).filter(item => item.Credited > 0 || item.Spent > 0);
  }, [transactions, selectedMonth]);

  const pieChartData = useMemo(() => {
    return platformBreakdownData.map(d => ({
      name: d.name,
      value: d.Spent,
      color: d.color
    })).filter(d => d.value > 0);
  }, [platformBreakdownData]);

  const monthlyTrendData = useMemo(() => {
    const monthlyGroups: Record<string, { credited: number; spent: number }> = {};
    
    transactions.forEach(t => {
      const monthStr = t.date ? t.date.substring(0, 7) : "Unknown";
      if (!monthlyGroups[monthStr]) {
        monthlyGroups[monthStr] = { credited: 0, spent: 0 };
      }
      if (t.type === "credit") {
        monthlyGroups[monthStr].credited += t.amount;
      } else {
        monthlyGroups[monthStr].spent += t.amount;
      }
    });

    return Object.entries(monthlyGroups)
      .map(([month, data]) => ({
        month: month === "Unknown" ? month : new Date(month + "-02").toLocaleString("en-US", { month: "short", year: "numeric" }),
        "Credits Added": data.credited,
        "Spent": data.spent,
        rawMonth: month
      }))
      .sort((a, b) => a.rawMonth.localeCompare(b.rawMonth));
  }, [transactions]);

  const detailedMonthlyTrends = useMemo(() => {
    const monthsMap: Record<string, { credited: number; spent: number; txCount: number }> = {};
    
    transactions.forEach(t => {
      const monthStr = t.date ? t.date.substring(0, 7) : "Unknown";
      if (monthStr !== "Unknown") {
        if (!monthsMap[monthStr]) {
          monthsMap[monthStr] = { credited: 0, spent: 0, txCount: 0 };
        }
        if (t.type === "credit") {
          monthsMap[monthStr].credited += t.amount;
        } else {
          monthsMap[monthStr].spent += t.amount;
        }
        monthsMap[monthStr].txCount += 1;
      }
    });

    return Object.entries(monthsMap)
      .map(([month, data]) => {
        const net = data.credited - data.spent;
        const burnRate = data.credited > 0 ? Math.round((data.spent / data.credited) * 100) : 0;
        return {
          monthKey: month,
          monthName: new Date(month + "-02").toLocaleString("en-US", { month: "long", year: "numeric" }),
          credited: data.credited,
          spent: data.spent,
          net,
          burnRate,
          txCount: data.txCount
        };
      })
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey));
  }, [transactions]);

  const monthlyPlatformMatrix = useMemo(() => {
    return PLATFORMS.map(p => {
      const platformTx = transactions.filter(t => t.platform === p);
      
      const getMonthCredit = (monthStr: string) => {
        return platformTx
          .filter(t => t.type === "credit" && t.date && t.date.startsWith(`2026-${monthStr}`))
          .reduce((sum, t) => sum + t.amount, 0);
      };

      const getMonthSpend = (monthStr: string) => {
        return platformTx
          .filter(t => t.type === "spend" && t.date && t.date.startsWith(`2026-${monthStr}`))
          .reduce((sum, t) => sum + t.amount, 0);
      };

      const janCred = getMonthCredit("01");
      const febCred = getMonthCredit("02");
      const marCred = getMonthCredit("03");
      const aprCred = getMonthCredit("04");
      const mayCred = getMonthCredit("05");

      const janSpend = getMonthSpend("01");
      const febSpend = getMonthSpend("02");
      const marSpend = getMonthSpend("03");
      const aprSpend = getMonthSpend("04");
      const maySpend = getMonthSpend("05");

      const totalCredits = platformTx
        .filter(t => t.type === "credit")
        .reduce((sum, t) => sum + t.amount, 0);

      const totalSpends = platformTx
        .filter(t => t.type === "spend")
        .reduce((sum, t) => sum + t.amount, 0);

      const remaining = totalCredits - totalSpends;

      return {
        platform: p,
        details: PLATFORM_DETAILS[p] || PLATFORM_DETAILS["Google"],
        janCred,
        febCred,
        marCred,
        aprCred,
        mayCred,
        janSpend,
        febSpend,
        marSpend,
        aprSpend,
        maySpend,
        totalCredits,
        totalSpends,
        remaining
      };
    });
  }, [transactions]);

  const visibleMatrixRows = useMemo(() => {
    return monthlyPlatformMatrix.filter(row => {
      return selectedPlatform === "all" || row.platform === selectedPlatform;
    });
  }, [monthlyPlatformMatrix, selectedPlatform]);

  // Compute breakdown metrics for each card of the 7 platforms
  const platformCardsData = useMemo(() => {
    return PLATFORMS.map(p => {
      let credited = 0;
      let spent = 0;

      // Filter transactions for this specific platform
      const list = transactions.filter(t => t.platform === p);
      
      // Let's filter also by selectedMonth if desired
      const filteredList = selectedMonth === "all" 
        ? list 
        : list.filter(t => t.date.startsWith(selectedMonth));

      filteredList.forEach(t => {
        if (t.type === "credit") {
          credited += t.amount;
        } else {
          spent += t.amount;
        }
      });

      const totalBalance = credited - spent;
      const spentPercent = credited > 0 ? Math.round((spent / credited) * 100) : 0;

      return {
        name: p,
        credited,
        spent,
        balance: totalBalance,
        spentPercent,
        ...PLATFORM_DETAILS[p],
        transactionCount: filteredList.length
      };
    });
  }, [transactions, selectedMonth]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    csvContent += "Date,Platform,Transaction Type,Amount (INR),Notes / Reference\n";
    
    filteredTransactions.forEach(t => {
      const formattedType = t.type === "credit" ? "Credit Added" : "Spend";
      const notes = t.description.replace(/"/g, '""');
      csvContent += `${t.date},${t.platform},${formattedType},${t.amount},"${notes}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Ads_Budget_Report_${selectedMonth === "all" ? "All_Time" : selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const deletedTxDetails = txToDelete ? transactions.find(t => t.id === txToDelete) : null;

  const renderMatrixCell = (credVal: number, spendVal: number) => {
    if (matrixViewMode === "comparison") {
      return (
        <div className="flex flex-col items-end gap-0.5 justify-center py-1 font-mono">
          <span className={`text-[11px] font-extrabold ${credVal > 0 ? "text-emerald-600" : "text-slate-300"}`}>
            {credVal > 0 ? `+${formatCurrency(credVal)}` : "—"}
          </span>
          <span className={`text-[11px] font-bold ${spendVal > 0 ? "text-rose-600" : "text-slate-300"}`}>
            {spendVal > 0 ? `-${formatCurrency(spendVal)}` : "—"}
          </span>
        </div>
      );
    } else if (matrixViewMode === "credit") {
      return (
        <span className={`font-mono font-bold text-xs ${credVal > 0 ? "text-emerald-600" : "text-slate-400"}`}>
          {credVal > 0 ? formatCurrency(credVal) : "—"}
        </span>
      );
    } else {
      return (
        <span className={`font-mono font-bold text-xs ${spendVal > 0 ? "text-rose-600" : "text-slate-400"}`}>
          {spendVal > 0 ? formatCurrency(spendVal) : "—"}
        </span>
      );
    }
  };

  return (
    <div className="space-y-8">
      {/* Upper Title and Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
            <Coins className="text-blue-600 w-8 h-8" />
            Ads Budget Manager
          </h2>
          <p className="text-slate-500 font-medium">
            Maintain marketing credits, track expenses, and view platform ROI analytics across platforms.
          </p>
        </div>
        
        <div className="flex items-center flex-wrap gap-2.5">
          <button
            onClick={handleLoadCaseStudy}
            disabled={isSeeding || isClearing}
            className="bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm"
            title="Load Google Ads & Platform Jan-May case study ledger metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isSeeding ? "animate-spin" : ""}`} />
            {isSeeding ? "Syncing..." : "Load Case Study Ledger"}
          </button>

          {transactions.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              disabled={isClearing}
              className="bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5"
            >
              <Trash2 className={`w-3.5 h-3.5 ${isClearing ? "animate-pulse" : ""}`} />
              {isClearing ? "Clearing Ledger..." : "Clear Ledger"}
            </button>
          )}

          <button
            onClick={handleExportCSV}
            disabled={filteredTransactions.length === 0}
            className="bg-white border border-slate-200 text-slate-700 hover:text-slate-900 hover:border-slate-300 px-3.5 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 shadow-sm disabled:opacity-50"
          >
            <Download className="w-3.5 h-3.5" />
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-semibold text-sm">Synchronizing live budget ledger...</p>
        </div>
      ) : (
        <>
          {/* Main Top Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Total Balance Card */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-3xl p-6 shadow-md border border-blue-500/10 relative overflow-hidden flex flex-col justify-between min-h-[160px]"
            >
              <div className="absolute right-0 bottom-0 opacity-10 translate-y-4 translate-x-4">
                <Coins className="w-36 h-36" />
              </div>
              <div className="flex justify-between items-start">
                <p className="text-blue-100 font-bold uppercase tracking-wider text-xs">Remaining Budget Pool</p>
                <div className="bg-white/20 p-1.5 rounded-lg text-white">
                  <Coins className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold tracking-tight">
                  {formatCurrency(overallTotals.remaining)}
                </h3>
                <p className="text-blue-200 text-xs mt-1 font-medium">Over {transactions.length} recorded adjustments</p>
              </div>
            </motion.div>

            {/* Total Credits Received */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex justify-between items-start">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total Credits Injected</p>
                <div className="bg-emerald-50 text-emerald-600 p-2 rounded-xl">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  {formatCurrency(overallTotals.added)}
                </h3>
                <p className="text-emerald-600 text-xs mt-1 font-bold flex items-center gap-1">
                  Active balance refuels
                </p>
              </div>
            </motion.div>

            {/* Total Cash Burn */}
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 flex flex-col justify-between min-h-[160px]"
            >
              <div className="flex justify-between items-start">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">Ad Spend Burned</p>
                <div className="bg-rose-50 text-rose-600 p-2 rounded-xl">
                  <ArrowDownRight className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-4">
                <h3 className="text-3xl font-extrabold text-slate-900 tracking-tight text-rose-600">
                  {formatCurrency(overallTotals.spent)}
                </h3>
                <p className="text-rose-500 text-xs mt-1 font-bold">
                  {overallTotals.added > 0 ? `${Math.round((overallTotals.spent / overallTotals.added) * 100)}% total allocation used` : "0% used"}
                </p>
              </div>
            </motion.div>
          </div>

          {/* Interactive Dashboard Filters */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="bg-blue-50 p-2.5 rounded-2xl text-blue-600">
                  <Filter className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm tracking-tight">Active Dashboard Controllers</h4>
                  <p className="text-[11px] text-slate-400 font-bold">Refine the entire analytics deck, cumulative metrics, and charts simultaneously</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {(selectedMonth !== "all" || selectedPlatform !== "all") && (
                  <button
                    onClick={() => {
                      setSelectedMonth("all");
                      setSelectedPlatform("all");
                    }}
                    className="text-xs bg-slate-150 hover:bg-slate-200 text-slate-600 hover:text-slate-800 font-extrabold py-1.5 px-3 rounded-lg transition-colors flex items-center gap-1"
                  >
                    Reset Active Filters
                  </button>
                )}
              </div>
            </div>

            {/* Row 1: Month Timeline Filter */}
            <div className="space-y-2">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Select Period Limit</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedMonth("all")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                    selectedMonth === "all"
                      ? "bg-blue-600 text-white"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-105 border border-slate-100"
                  }`}
                >
                  <span>📅 All Time</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${selectedMonth === "all" ? "bg-white/20 text-white" : "bg-slate-250 text-slate-500"}`}>
                    {transactions.length}
                  </span>
                </button>

                {availableMonths.length === 0 ? (
                  <div className="text-slate-400 text-xs font-semibold italic pl-1">
                    Add logs to populate monthly timelines.
                  </div>
                ) : (
                  availableMonths.map((m) => {
                    const count = transactions.filter(t => t.date && t.date.startsWith(m)).length;
                    const monthName = new Date(m + "-02").toLocaleString("en-US", { month: "short", year: "numeric" });
                    return (
                      <button
                        key={m}
                        onClick={() => setSelectedMonth(m)}
                        className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center gap-2 ${
                          selectedMonth === m
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                        }`}
                      >
                        <span className="capitalize">{monthName}</span>
                        <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold ${selectedMonth === m ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>

            {/* Row 2: Platform Lead Source Filter */}
            <div className="space-y-2 pt-3 border-t border-slate-100">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest block">Select Lead Source Platform</span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setSelectedPlatform("all")}
                  className={`py-2 px-4 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 ${
                    selectedPlatform === "all"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-slate-50 text-slate-600 hover:bg-slate-105 border border-slate-100"
                  }`}
                >
                  <span>🚀 All Lead Sources</span>
                  <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${selectedPlatform === "all" ? "bg-white/20 text-white" : "bg-slate-250 text-slate-500"}`}>
                    {transactions.length}
                  </span>
                </button>

                {PLATFORMS.map((p) => {
                  const details = PLATFORM_DETAILS[p] || PLATFORM_DETAILS["Google"];
                  const count = transactions.filter(t => t.platform === p).length;
                  return (
                    <button
                      key={p}
                      onClick={() => setSelectedPlatform(p)}
                      className={`py-2 px-4 rounded-xl text-xs font-bold transition-all border shadow-sm flex items-center gap-2 ${
                        selectedPlatform === p
                          ? `${details.bg} ${details.text} border-2 border-current font-extrabold`
                          : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                      }`}
                    >
                      <span className="capitalize">{p}</span>
                      <span className={`px-1.5 py-0.5 rounded-lg text-[10px] font-extrabold ${selectedPlatform === p ? "bg-white/50" : "bg-slate-100 text-slate-500"}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Tab Control */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`py-3.5 px-6 font-bold text-sm tracking-tight border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "analytics" 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              Platform Deck & Analytics
            </button>
            <button
              onClick={() => setActiveTab("roi")}
              className={`py-3.5 px-6 font-bold text-sm tracking-tight border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "roi" 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <Coins className="w-4 h-4 text-emerald-600" />
              Channel ROI & Conversions
            </button>
            <button
              onClick={() => setActiveTab("transactions")}
              className={`py-3.5 px-6 font-bold text-sm tracking-tight border-b-2 transition-all flex items-center gap-2 ${
                activeTab === "transactions" 
                  ? "border-blue-600 text-blue-600" 
                  : "border-transparent text-slate-500 hover:text-slate-800"
              }`}
            >
              <ListFilter className="w-4 h-4" />
              Transaction Ledger ({filteredTransactions.length})
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* LEFT / CENTER SECTIONS ACCORDING TO THE ACTIVE TAB */}
            <div className="lg:col-span-2 space-y-8">
              {activeTab === "analytics" ? (
                <>
                  {/* Platforms Status Deck */}
                  <div className="space-y-4">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-yellow-500" />
                      Platform Card Overview
                    </h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {platformCardsData.map((plat) => {
                        const alertThresh = plat.spentPercent >= 85;
                        return (
                          <div 
                            key={plat.name}
                            className={`bg-white rounded-2xl border ${plat.border} p-5 hover:shadow-md transition-all flex flex-col justify-between ${plat.hoverBg}`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={`font-bold px-3 py-1 rounded-lg text-xs tracking-wider uppercase ${plat.bg} ${plat.text}`}>
                                {plat.name}
                              </span>
                              <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold font-mono">
                                <Clock className="w-3.5 h-3.5" />
                                {plat.transactionCount} items
                              </div>
                            </div>

                            <div className="my-4">
                              <span className="text-slate-400 font-bold text-[10px] tracking-wider uppercase">Remaining Balance</span>
                              <div className="text-xl font-bold text-slate-900 mt-0.5">{formatCurrency(plat.balance)}</div>
                              
                              {/* Small Bar Visual */}
                              <div className="w-full bg-slate-100 h-1.5 rounded-full mt-3 overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300" 
                                  style={{ 
                                    width: `${Math.min(plat.spentPercent, 100)}%`,
                                    backgroundColor: plat.spentPercent > 85 ? "#ef4444" : plat.spentPercent > 50 ? "#f59e0b" : plat.color
                                  }}
                                />
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-50 text-slate-500">
                              <div>
                                <span className="font-medium text-[11px] block text-slate-400">Added</span>
                                <span className="font-bold text-slate-700">{formatCurrency(plat.credited)}</span>
                              </div>
                              <div className="text-right">
                                <span className="font-medium text-[11px] block text-slate-400">Spent ({plat.spentPercent}%)</span>
                                <span className="font-bold text-slate-800">{formatCurrency(plat.spent)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Platform Monthly Credit & Allocation Matrix Table */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-5">
                    <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-base tracking-tight flex items-center gap-2">
                          <Layers className="w-5 h-5 text-blue-600" />
                          Cumulative Lead Sources Month-wise Overview
                        </h3>
                        <p className="text-xs text-slate-400 font-bold mt-0.5">
                          Aggregated payments (credits), actual net costs (spends), and live leftover balances month-wise
                        </p>
                      </div>
                      
                      <div className="flex bg-slate-100 p-1 rounded-xl items-center gap-1 self-start md:self-auto font-sans">
                        <button
                          onClick={() => setMatrixViewMode("comparison")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            matrixViewMode === "comparison"
                              ? "bg-white text-blue-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Comparison Views
                        </button>
                        <button
                          onClick={() => setMatrixViewMode("credit")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            matrixViewMode === "credit"
                              ? "bg-white text-emerald-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Payments (Credits)
                        </button>
                        <button
                          onClick={() => setMatrixViewMode("spend")}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                            matrixViewMode === "spend"
                              ? "bg-white text-rose-600 shadow-sm"
                              : "text-slate-500 hover:text-slate-800"
                          }`}
                        >
                          Spends (Costs)
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-100">
                      <table className="w-full text-left text-xs whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-extrabold uppercase tracking-wide">
                            <th className="py-4 px-4 font-extrabold">Lead Source Platform</th>
                            <th className="py-4 px-4 text-right">Jan</th>
                            <th className="py-4 px-4 text-right">Feb</th>
                            <th className="py-4 px-4 text-right">March</th>
                            <th className="py-4 px-4 text-right font-medium">April</th>
                            <th className="py-4 px-4 text-right font-extrabold text-blue-600 bg-blue-50/20">May (Current)</th>
                            <th className="py-4 px-4 text-right font-extrabold text-slate-800 border-l border-slate-100">
                              {matrixViewMode === "spend" ? "Total Costs" : "Total Payments"}
                            </th>
                            {matrixViewMode === "comparison" && (
                              <th className="py-4 px-4 text-right font-extrabold text-rose-600 border-l border-slate-100 bg-slate-50/10">Total Costs</th>
                            )}
                            <th className="py-4 px-4 text-right font-extrabold text-blue-700 border-l border-slate-100">Remaining Pool</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                          {visibleMatrixRows.map((row) => (
                            <tr key={row.platform} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 px-4">
                                <span className={`px-2.5 py-1 rounded-lg text-xs font-extrabold uppercase ${row.details.bg} ${row.details.text}`}>
                                  {row.platform}
                                </span>
                              </td>
                              <td className="py-4 px-4 text-right">
                                {renderMatrixCell(row.janCred, row.janSpend)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {renderMatrixCell(row.febCred, row.febSpend)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {renderMatrixCell(row.marCred, row.marSpend)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {renderMatrixCell(row.aprCred, row.aprSpend)}
                              </td>
                              <td className="py-4 px-4 text-right bg-blue-50/5">
                                {renderMatrixCell(row.mayCred, row.maySpend)}
                              </td>
                              <td className="py-4 px-4 text-right font-mono font-extrabold text-slate-900 border-l border-slate-100 bg-slate-50/30">
                                {matrixViewMode === "spend" ? formatCurrency(row.totalSpends) : formatCurrency(row.totalCredits)}
                              </td>
                              {matrixViewMode === "comparison" && (
                                <td className="py-4 px-4 text-right font-mono font-extrabold text-rose-600 border-l border-slate-100 bg-rose-50/5">
                                  {formatCurrency(row.totalSpends)}
                                </td>
                              )}
                              <td className={`py-4 px-4 text-right font-mono font-extrabold border-l border-slate-100 ${row.remaining > 0 ? "text-blue-700 bg-blue-50/20" : "text-amber-600 bg-blue-50/5"}`}>
                                {formatCurrency(row.remaining)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Visual Charts section */}
                  {platformBreakdownData.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                          <h4 className="font-bold text-slate-900">Spent vs Refuel by Platform</h4>
                          <p className="text-xs text-slate-400 font-medium">Comparison of credited funds and actual spent totals</p>
                        </div>
                      </div>

                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={platformBreakdownData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(Number(value)), ""]}
                              contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.05)" }}
                            />
                            <Legend wrapperStyle={{ fontSize: 13 }} />
                            <Bar dataKey="Credited" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Credits Added" />
                            <Bar dataKey="Spent" fill="#ef4444" radius={[4, 4, 0, 0]} name="Credits Spent" />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Monthly totals trends if multiple months exist */}
                  {monthlyTrendData.length > 0 && (
                    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                      <div>
                        <h4 className="font-bold text-slate-900">Budget Flow Trends</h4>
                        <p className="text-xs text-slate-400 font-medium">Month-by-month cash refills vs system spends</p>
                      </div>
                      
                      <div className="h-72 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={monthlyTrendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAdded" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorSpent" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2}/>
                                <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} />
                            <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} />
                            <Tooltip 
                              formatter={(value) => [formatCurrency(Number(value)), ""]}
                              contentStyle={{ borderRadius: "12px", border: "1px solid #f1f5f9" }}
                            />
                            <Legend wrapperStyle={{ fontSize: 13 }} />
                            <Area type="monotone" dataKey="Credits Added" stroke="#10b981" fillOpacity={1} fill="url(#colorAdded)" strokeWidth={2} name="Funds Deposited" />
                            <Area type="monotone" dataKey="Spent" stroke="#f43f5e" fillOpacity={1} fill="url(#colorSpent)" strokeWidth={2} name="Spends Incurred" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Detailed Monthly Trends breakdown cards */}
                  {detailedMonthlyTrends.length > 0 && (
                    <div className="space-y-4 pt-2">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-blue-600" />
                            Monthly Trend Explorer
                          </h3>
                          <p className="text-xs text-slate-400 font-bold">Aggregated stats overview of budget operations by month. Click to filter!</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {detailedMonthlyTrends.map((trend) => (
                          <div 
                            key={trend.monthKey}
                            onClick={() => setSelectedMonth(trend.monthKey === selectedMonth ? "all" : trend.monthKey)}
                            className={`bg-white rounded-2xl border p-5 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                              selectedMonth === trend.monthKey 
                                ? "border-blue-600 bg-blue-50/20 ring-2 ring-blue-600/10" 
                                : "border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-blue-500" />
                                <span className="font-bold text-slate-950 text-sm">{trend.monthName}</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                selectedMonth === trend.monthKey ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-500"
                              }`}>
                                {trend.txCount} operations
                              </span>
                            </div>

                            <div className="grid grid-cols-3 gap-2 my-4 pt-2 border-t border-slate-100 font-sans">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Injected</span>
                                <span className="text-xs font-extrabold text-emerald-600 inline-flex items-center gap-0.5">
                                  <ArrowUpRight className="w-3 h-3 flex-shrink-0" />
                                  {formatCurrency(trend.credited)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Spends</span>
                                <span className="text-xs font-extrabold text-rose-600 inline-flex items-center gap-0.5">
                                  <ArrowDownRight className="w-3 h-3 flex-shrink-0" />
                                  {formatCurrency(trend.spent)}
                                </span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Net Balance</span>
                                <span className={`text-xs font-bold ${trend.net >= 0 ? "text-slate-800" : "text-amber-600"}`}>
                                  {formatCurrency(trend.net)}
                                </span>
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between text-[11px] mb-1 font-semibold">
                                <span className="text-slate-400">Monthly Burn Rate</span>
                                <span className={`${trend.burnRate >= 85 ? "text-rose-600" : trend.burnRate >= 50 ? "text-amber-500" : "text-emerald-600"}`}>
                                  {trend.burnRate}%
                                </span>
                              </div>
                              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                <div 
                                  className="h-full rounded-full transition-all duration-300"
                                  style={{
                                    width: `${Math.min(trend.burnRate, 100)}%`,
                                    backgroundColor: trend.burnRate >= 85 ? "#ef4444" : trend.burnRate >= 50 ? "#f59e0b" : "#10b981"
                                  }}
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : activeTab === "roi" ? (
                /* CHANNEL ROI & ADMISSIONS DASHBOARD */
                <div className="space-y-8">
                  {/* Title Bar & Actions */}
                  <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-3xl p-6 md:p-8 text-white shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Coins className="w-6 h-6 text-emerald-400" />
                        <h3 className="text-xl md:text-2xl font-black tracking-tight font-sans">Channel ROI & Cohorts</h3>
                      </div>
                      <p className="text-xs md:text-sm text-slate-300 font-medium leading-relaxed">
                        Combine real ad investments with enrollment conversion counts to calculate true acquisition efficiency.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={async () => {
                          if (window.confirm("Are you sure you want to restore the default Batch 62, 63, and 64 conversion data? This will overwrite your current settings.")) {
                            setRoiBatches(DEFAULT_ROI_BATCHES);
                            await updateRoiDataInFirestore(DEFAULT_ROI_BATCHES, 75000);
                            setCourseFee(75000);
                          }
                        }}
                        className="px-4 py-2 bg-slate-800 border border-slate-700 hover:bg-slate-700 hover:border-slate-600 rounded-xl text-xs font-bold text-slate-200 transition-all flex items-center gap-1.5 active:scale-95"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        Reset Default Data
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddBatchModal(true)}
                        className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white rounded-xl text-xs font-black shadow-md shadow-emerald-950/20 transition-all flex items-center gap-2 active:scale-95"
                      >
                        <Plus className="w-4 h-4" />
                        Add New Batch
                      </button>
                    </div>
                  </div>

                  {/* Pricing Matrix Config Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-blue-600 uppercase tracking-widest block font-sans">Cohort Pricing Setup</span>
                        <h4 className="font-extrabold text-slate-900 text-base">Course Tuition / Value per Enrollment</h4>
                        <p className="text-xs text-slate-500 leading-relaxed max-w-xl">
                          Each enrollment generated by a campaign is multiplied by this fee to evaluate dynamic Gross Ad Revenue and Marketing ROI.
                        </p>
                      </div>

                      <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-2xl w-full md:w-auto">
                        <span className="text-xs font-bold text-slate-400 font-mono">INR (₹)</span>
                        <input
                          type="number"
                          value={courseFee}
                          min="1"
                          onChange={(e) => handleCourseFeeChange(Number(e.target.value) || 0)}
                          className="font-mono font-black text-slate-800 text-lg w-32 bg-transparent focus:outline-none text-right placeholder:text-slate-300"
                        />
                      </div>
                    </div>

                    <div className="pt-2">
                      <input
                        type="range"
                        min="10000"
                        max="250000"
                        step="5000"
                        value={courseFee}
                        onChange={(e) => handleCourseFeeChange(Number(e.target.value))}
                        className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <div className="flex justify-between text-[11px] text-slate-400 font-mono font-bold mt-1">
                        <span>₹10,000</span>
                        <span>₹75,000 (Default)</span>
                        <span>₹1,50,000</span>
                        <span>₹2,50,050</span>
                      </div>
                    </div>

                    {/* Dynamic Insight Box */}
                    <div className="bg-blue-50/50 rounded-2xl p-5 border border-blue-100 flex items-start gap-3 text-sans">
                      <Sparkles className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <span className="text-xs font-extrabold text-blue-900 block uppercase tracking-wider font-sans">Tuition Fee Analytics Insight</span>
                        <p className="text-[11px] text-blue-700/90 font-medium leading-relaxed mt-1.5 font-sans">
                          At <strong className="font-extrabold text-blue-950 font-mono">{formatCurrency(courseFee)}</strong> per enrollment, your average Blended Cost Per Acquisition (CPA) is <strong className="font-extrabold text-blue-950 font-mono">{formatCurrency(roiCalculations.grandConversions > 0 ? roiCalculations.grandCost / roiCalculations.grandConversions : 0)}</strong>. You consume approximately <strong className="font-extrabold text-blue-950 font-mono">{Math.round((roiCalculations.grandCost / (roiCalculations.grandRevenue || 1)) * 100)}%</strong> of your gross cohort revenue on platform marketing.
                        </p>
                      </div>
                    </div>


                  </div>

                  {/* Aggregate ROI Overview Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Cumulative Spends</span>
                      <span className="text-slate-900 font-black text-xl md:text-2xl font-mono block mt-1">
                        {formatCurrency(roiCalculations.grandCost)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5">
                        Total advertising spends across all batch months.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Total Admissions</span>
                      <span className="text-slate-900 font-black text-xl md:text-2xl font-mono block mt-1 font-sans">
                        {roiCalculations.grandConversions} registrations
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5">
                        Enrollments acquired through target ad platforms.
                      </p>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                      <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Gross Revenue (Est.)</span>
                      <span className="text-emerald-600 font-black text-xl md:text-2xl font-mono block mt-1">
                        {formatCurrency(roiCalculations.grandRevenue)}
                      </span>
                      <p className="text-[10px] text-slate-400 font-semibold leading-relaxed mt-1.5">
                        Calculated directly from cumulative enrollment count.
                      </p>
                    </div>

                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 shadow-md flex flex-col justify-between">
                      <div>
                        <span className="text-slate-400 font-extrabold text-[10px] uppercase tracking-wider block">Net Profit & ROI</span>
                        <span className={`font-black text-base md:text-lg font-mono block mt-1 ${roiCalculations.grandNet >= 0 ? "text-emerald-700" : "text-amber-600"}`}>
                          {formatCurrency(roiCalculations.grandNet)}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between font-sans">
                        <span className="text-[10px] uppercase font-extrabold text-slate-400">ROI Percentage</span>
                        <span className={`px-2 py-0.5 rounded-lg text-xs font-black font-mono ${roiCalculations.grandRoi >= 0 ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                          {roiCalculations.grandRoi >= 0 ? "+" : ""}{Math.round(roiCalculations.grandRoi)}%
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* LIST OF BATCHES */}
                  <div className="space-y-6">
                    <h3 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                      <Layers className="w-5 h-5 text-indigo-500" />
                      Dynamic Batch Records & Cost Attribute
                    </h3>

                    {roiCalculations.batches.length === 0 ? (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-sm space-y-4">
                        <Coins className="w-12 h-12 text-slate-300 mx-auto" />
                        <h4 className="font-extrabold text-slate-800 text-base">No Custom Batches Found</h4>
                        <p className="text-xs text-slate-500 max-w-sm mx-auto font-sans">
                          Click "Add New Batch" to register an admission cycle, map campaign cost months, and report enrollment.
                        </p>
                        <button
                          type="button"
                          onClick={() => setShowAddBatchModal(true)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-md transition-all inline-flex items-center gap-2"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Register First Batch
                        </button>
                      </div>
                    ) : (
                      roiCalculations.batches.map((batch) => {
                        const positiveRoi = batch.totalNet >= 0;
                        return (
                          <div 
                            key={batch.id} 
                            className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col"
                          >
                            {/* Card Header */}
                            <div className="bg-slate-50 px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="font-black text-slate-900 font-sans text-base">{batch.name}</span>
                                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 text-[10px] font-extrabold rounded-md border border-indigo-100 uppercase tracking-widest font-mono">
                                    ID: {batch.id}
                                  </span>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 font-sans">
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                    Starts {new Date(batch.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span className="text-slate-300">•</span>
                                  <span className="flex items-center gap-1 font-mono font-semibold">
                                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                                    Cost Period: {batch.spendMonths.join(", ")}
                                  </span>
                                </div>
                              </div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${batch.name}?`)) {
                                    handleDeleteBatch(batch.id);
                                  }
                                }}
                                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-rose-50 transition-all active:scale-95"
                                title="Delete Cohort Batch"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>

                            {/* Batch KPIs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 border-b border-slate-100 bg-slate-50/20 divide-x divide-y md:divide-y-0 divide-slate-100 text-center font-sans">
                              <div className="py-4">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Total Ad Spends</span>
                                <span className="text-sm font-black text-slate-800 font-mono inline-block mt-0.5">
                                  {formatCurrency(batch.totalCost)}
                                </span>
                              </div>
                              <div className="py-4">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Enrollments</span>
                                <span className="text-sm font-black text-slate-800 font-mono inline-block mt-0.5">
                                  {batch.totalConversions}
                                </span>
                              </div>
                              <div className="py-4">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Gross Sales (Est.)</span>
                                <span className="text-sm font-black text-slate-800 font-mono inline-block mt-0.5">
                                  {formatCurrency(batch.totalRevenue)}
                                </span>
                              </div>
                              <div className="py-4 bg-slate-50/40">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">Net Profit / ROI</span>
                                <div className="flex flex-col items-center justify-center mt-0.5">
                                  <span className={`text-xs font-black font-mono ${positiveRoi ? "text-emerald-700" : "text-rose-600"}`}>
                                    {formatCurrency(batch.totalNet)}
                                  </span>
                                  <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black font-mono mt-0.5 ${positiveRoi ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                                    {batch.blendedRoi >= 0 ? "+" : ""}{Math.round(batch.blendedRoi)}%
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Main Grid: Counters left, Detailed table right */}
                            <div className="p-6 grid grid-cols-1 xl:grid-cols-12 gap-6">
                              {/* Left Side: Interactive counters */}
                              <div className="xl:col-span-5 space-y-4">
                                <div className="border-b border-slate-100 pb-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest block font-sans">
                                      {useCrmConversions ? "Auto-Synced Conversions" : "Update Conversions"}
                                    </span>
                                    {useCrmConversions && (
                                      <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-black rounded-md animate-pulse">
                                        CRM LIVE
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-[10px] text-slate-400 font-sans mt-1">
                                    {useCrmConversions 
                                      ? "Conversions are automatically pulled from active CRM lead sources for this cohort batch."
                                      : "Directly increment reported enrollments for this Batch. Instantly auto-saves in CRM cloud."}
                                  </p>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  {PLATFORMS.map(platform => {
                                    const details = PLATFORM_DETAILS[platform] || PLATFORM_DETAILS["Google"];
                                    const stats = batch.channelStats.find(ch => ch.platform === platform);
                                    const conversions = stats ? stats.conversions : (batch.conversions[platform] || 0);
                                    return (
                                      <div key={platform} className="bg-slate-50/50 border border-slate-200 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 hover:bg-slate-50 transition-all font-sans">
                                        <div className="space-y-0.5">
                                          <span className={`font-mono text-[10px] font-extrabold px-1.5 py-0.5 rounded-md uppercase tracking-wider block ${details.bg} ${details.text} border ${details.border} w-max`}>
                                            {platform}
                                          </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 opacity-90 font-sans">
                                          <button 
                                            type="button"
                                            disabled={useCrmConversions}
                                            onClick={() => handleConversionChange(batch.id, platform, conversions - 1)}
                                            className={`w-7 h-7 bg-white rounded-lg hover:bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center transition-all active:scale-90 border border-slate-200 ${useCrmConversions ? "cursor-not-allowed opacity-40" : ""}`}
                                            title={useCrmConversions ? "Conversions managed by CRM Sync" : ""}
                                          >
                                            -
                                          </button>
                                          <input 
                                            type="number"
                                            min="0"
                                            disabled={useCrmConversions}
                                            value={conversions}
                                            onChange={(e) => handleConversionChange(batch.id, platform, parseInt(e.target.value) || 0)}
                                            className={`w-9 h-7 bg-white border border-slate-200 rounded-lg text-center font-black text-xs focus:ring-1 focus:ring-indigo-500 font-mono outline-none ${useCrmConversions ? "bg-slate-100 text-slate-400 cursor-not-allowed" : ""}`}
                                            title={useCrmConversions ? "Conversions managed by CRM Sync" : ""}
                                          />
                                          <button 
                                            type="button"
                                            disabled={useCrmConversions}
                                            onClick={() => handleConversionChange(batch.id, platform, conversions + 1)}
                                            className={`w-7 h-7 bg-white rounded-lg hover:bg-slate-100 text-slate-600 font-extrabold text-sm flex items-center justify-center transition-all active:scale-90 border border-slate-200 ${useCrmConversions ? "cursor-not-allowed opacity-40" : ""}`}
                                            title={useCrmConversions ? "Conversions managed by CRM Sync" : ""}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Right Side: Channel performance table */}
                              <div className="xl:col-span-7 flex flex-col">
                                <div className="border-b border-slate-100 pb-2 mb-3">
                                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-widest block font-sans">Channel Performance Attribution</span>
                                  <p className="text-[10px] text-slate-400 font-sans font-medium">Detailed parameters mapping spends to reported cohort outcomes from lead source.</p>
                                </div>
                                
                                <div className="border border-slate-100 rounded-2xl overflow-hidden flex-1 mini-dense-table bg-white">
                                  <table className="w-full text-xs text-left bg-white font-sans text-slate-600">
                                    <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100">
                                      <tr>
                                        <th className="py-2.5 px-3 font-black">Platform</th>
                                        <th className="py-2.5 px-3 font-black text-right">Ad Spend</th>
                                        <th className="py-2.5 px-3 font-black text-center">Enroll</th>
                                        <th className="py-2.5 px-3 font-black text-right">CPA</th>
                                        <th className="py-2.5 px-3 font-black text-right">Channel ROI</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 font-sans">
                                      {batch.channelStats.map((ch) => {
                                        const details = PLATFORM_DETAILS[ch.platform as keyof typeof PLATFORM_DETAILS] || PLATFORM_DETAILS["Google"];
                                        return (
                                          <tr key={ch.platform} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="py-2 px-3 flex items-center gap-1.5 font-bold text-slate-800">
                                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: details.color }} />
                                              {ch.platform}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono text-slate-700 font-semibold">
                                              {ch.cost > 0 ? formatCurrency(ch.cost) : "—"}
                                            </td>
                                            <td className="py-2 px-3 text-center font-mono font-bold text-slate-800">
                                              {ch.conversions}
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-semibold text-slate-500">
                                              {ch.conversions > 0 
                                                ? formatCurrency(ch.cpa) 
                                                : ch.cost > 0 
                                                  ? "No Conv." 
                                                  : "Organic"
                                              }
                                            </td>
                                            <td className="py-2 px-3 text-right font-mono font-bold">
                                              {ch.cost > 0 ? (
                                                <span className={ch.roi >= 0 ? "text-emerald-600" : "text-rose-600"}>
                                                  {ch.roi >= 0 ? "+" : ""}{Math.round(ch.roi)}%
                                                </span>
                                              ) : ch.conversions > 0 ? (
                                                <span className="text-indigo-600 font-extrabold text-[9px] bg-indigo-50 border border-indigo-100 px-1 py-0.5 rounded uppercase font-mono">Organic</span>
                                              ) : (
                                                <span className="text-slate-400 font-normal">—</span>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>

                  {/* VISUAL CHARTS MODULE */}
                  {roiCalculations.batches.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 font-sans">
                      {/* Cost vs Revenue comparison by batch */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-sans">Visual Cohort Comparison</span>
                          <h4 className="font-extrabold text-slate-800 text-sm font-sans block">Campaign Spends vs Enrolled Value (₹)</h4>
                        </div>
                        <div className="h-64 font-mono text-[10px]">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={roiCalculations.batches.map(b => ({
                                name: b.name,
                                Spends: b.totalCost,
                                Revenue: b.totalRevenue
                              }))}
                              margin={{ top: 10, right: 10, left: 10, bottom: 0 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" vertical={false} />
                              <XAxis dataKey="name" />
                              <YAxis tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                              <Legend />
                              <Bar dataKey="Spends" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                              <Bar dataKey="Revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Conversions Share by Platform Pie */}
                      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                        <div className="space-y-1">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block font-sans">Channel Contribution Volume</span>
                          <h4 className="font-extrabold text-slate-800 text-sm font-sans block">Total Enrollments Share by Channel</h4>
                        </div>
                        <div className="h-64 font-sans flex items-center justify-center">
                          {(() => {
                            const pieData = PLATFORMS.map(p => {
                              const value = roiCalculations.batches.reduce((sum, b) => sum + (b.conversions[p] || 0), 0);
                              return { name: p, value, color: (PLATFORM_DETAILS[p] || PLATFORM_DETAILS["Google"]).color };
                            }).filter(x => x.value > 0);

                            if (pieData.length === 0) {
                              return <span className="text-xs text-slate-400 italic font-sans block">Render available when conversions &gt; 0</span>;
                            }

                            return (
                              <div className="w-full h-full flex flex-col sm:flex-row items-center justify-around gap-2 font-sans">
                                <div className="w-1/2 h-full">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                      <Pie
                                        data={pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={4}
                                        dataKey="value"
                                      >
                                        {pieData.map((entry, index) => (
                                          <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                      </Pie>
                                      <Tooltip formatter={(value) => [`${value} registrations`, 'Share']} />
                                    </PieChart>
                                  </ResponsiveContainer>
                                </div>
                                <div className="space-y-2 font-semibold text-slate-500 text-sans">
                                  {pieData.map(ch => (
                                    <div key={ch.name} className="flex items-center gap-2 text-xs">
                                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: ch.color }} />
                                      <span className="text-slate-500">{ch.name}:</span>
                                      <span className="text-slate-800 font-mono font-bold leading-none">{ch.value} ({Math.round((ch.value / roiCalculations.grandConversions) * 100)}%)</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* TRANSACTIONS LEDGER VIEW WITH SEARCH & FILTERS */
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                  {/* Filter bar */}
                  <div className="p-6 border-b border-slate-100 bg-slate-50/50 space-y-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search receipts notes, description..."
                          className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-sm outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all placeholder:text-slate-400"
                        />
                      </div>
                      
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Platform Filter */}
                        <select
                          value={selectedPlatform}
                          onChange={(e) => setSelectedPlatform(e.target.value)}
                          className="px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="all">All Platforms</option>
                          {PLATFORMS.map(p => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>

                        {/* Type Filter */}
                        <select
                          value={selectedType}
                          onChange={(e) => setSelectedType(e.target.value)}
                          className="px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="all">All Adjustments</option>
                          <option value="credit">Credit Added</option>
                          <option value="spend">Spent</option>
                        </select>

                        {/* Month Filter */}
                        <select
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="px-3 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        >
                          <option value="all">All Months</option>
                          {availableMonths.map(m => (
                            <option key={m} value={m}>
                              {new Date(m + "-02").toLocaleString("en-US", { month: "long", year: "numeric" })}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Transaction Table */}
                  <div className="overflow-x-auto">
                    {filteredTransactions.length === 0 ? (
                      <div className="flex flex-col items-center justify-center p-12 text-center space-y-3">
                        <AlertTriangle className="w-10 h-10 text-slate-300" />
                        <p className="text-slate-500 font-semibold text-sm">No transaction matches your search filter.</p>
                        <p className="text-xs text-slate-400">Clear filters to show complete receipts ledger.</p>
                      </div>
                    ) : (
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50/70 border-b border-slate-100 text-slate-400 text-xs font-bold uppercase tracking-wider">
                            <th className="py-4 px-6">Platform</th>
                            <th className="py-4 px-6">Details</th>
                            <th className="py-4 px-6">Date</th>
                            <th className="py-4 px-6 text-right">Adjustment</th>
                            <th className="py-4 px-6 text-center w-12">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredTransactions.map((tx) => {
                            const details = PLATFORM_DETAILS[tx.platform] || PLATFORM_DETAILS["Google"];
                            const isCred = tx.type === "credit";
                            return (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-all font-medium">
                                <td className="py-4 px-6">
                                  <span className={`px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${details.bg} ${details.text}`}>
                                    {tx.platform}
                                  </span>
                                </td>
                                <td className="py-4 px-6 max-w-xs overflow-hidden text-ellipsis">
                                  <div className="text-slate-900 font-bold">{tx.description}</div>
                                </td>
                                <td className="py-4 px-6 text-slate-500 font-semibold">
                                  {new Date(tx.date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                                </td>
                                <td className={`py-4 px-6 text-right font-bold ${isCred ? "text-emerald-600" : "text-rose-600"}`}>
                                  <span className="inline-flex items-center gap-1">
                                    {isCred ? "+" : "-"}
                                    {formatCurrency(tx.amount)}
                                  </span>
                                </td>
                                <td className="py-4 px-6 text-center">
                                  <button
                                    onClick={() => setTxToDelete(tx.id)}
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                                    title="Delete Transaction"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT SIDEBAR: QUICK FORM TRANSACTION ENTRY */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-6 sticky top-24">
                <div className="space-y-1">
                  <h4 className="font-bold text-slate-900 text-lg flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    New Log Entry
                  </h4>
                  <p className="text-xs text-slate-400 font-semibold">Add credits added or spent parameters instantly</p>
                </div>

                <form onSubmit={handleAddTransaction} className="space-y-4">
                  {/* Select Type */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Adjustment Type</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormType("spend")}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                          formType === "spend"
                            ? "bg-rose-50 border-rose-200 text-rose-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        Record Spend
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormType("credit")}
                        className={`py-3 px-4 rounded-xl border text-xs font-bold transition-all ${
                          formType === "credit"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-700 shadow-sm"
                            : "bg-white border-slate-200 text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        Credit Added
                      </button>
                    </div>
                  </div>

                  {/* Select Platform */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Platform</label>
                    <select
                      value={formPlatform}
                      onChange={(e) => setFormPlatform(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-200 hover:border-slate-300 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                    >
                      {PLATFORMS.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>

                  {/* Amount */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Amount (INR ₹)</label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                      <input
                        type="number"
                        required
                        value={formAmount}
                        onChange={(e) => setFormAmount(e.target.value)}
                        placeholder="e.g. 25000"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-sm font-bold tracking-wide outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>
                  </div>

                  {/* Date */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Transaction Date</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Notes / Campaign</label>
                    <textarea
                      required
                      value={formDescription}
                      onChange={(e) => setFormDescription(e.target.value)}
                      placeholder="e.g. Search ads targeting Batch 63 enrollment"
                      rows={3}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all resize-none placeholder:text-slate-300"
                    />
                  </div>

                  {/* Error & Success Feedback inside card */}
                  {formMessage.type && (
                    <motion.div 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-3.5 rounded-xl border flex items-start gap-2.5 text-xs font-bold leading-relaxed ${
                        formMessage.type === "success" 
                          ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                          : "bg-rose-50 border-rose-100 text-rose-700"
                      }`}
                    >
                      {formMessage.type === "success" ? (
                        <ArrowUpRight className="w-4 h-4 flex-shrink-0" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                      )}
                      <span>{formMessage.msg}</span>
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full text-white font-bold py-3 px-4 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 ${
                      formType === "credit"
                        ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-50"
                        : "bg-blue-600 hover:bg-blue-700 shadow-blue-50"
                    }`}
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Plus className="w-4 h-4" />
                    )}
                    {formType === "credit" ? "Inject New Credit" : "Record Spend Entry"}
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* Delete All Ledger Confirmation Overlay Modal */}
          <AnimatePresence>
            {showClearConfirm && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowClearConfirm(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 space-y-6"
                >
                  <div className="flex items-center gap-4 text-rose-600">
                    <div className="bg-rose-50 p-3 rounded-full">
                      <AlertTriangle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Clear Entire Ledger?</h3>
                      <p className="text-xs text-slate-500 mt-1">This operation cannot be undone.</p>
                    </div>
                  </div>
                  
                  <p className="text-slate-600 text-sm leading-relaxed">
                    Are you sure you want to permanently delete <strong className="text-slate-800">all {transactions.length} entries</strong> from your Ads Budget? All charts, platforms stats, and transaction lists will reset to zero.
                  </p>

                  <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowClearConfirm(false)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleClearAllData}
                      className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-rose-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Yes, Clear All
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Single Item Deletion Confirmation Overlay Modal */}
          <AnimatePresence>
            {txToDelete && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setTxToDelete(null)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                <motion.div
                  initial={{ scale: 0.95, opacity: 0, y: 10 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ scale: 0.95, opacity: 0, y: 10 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 max-w-md w-full relative z-10 space-y-6"
                >
                  <div className="flex items-center gap-4 text-amber-500">
                    <div className="bg-amber-50 p-3 rounded-full">
                      <Trash2 className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-lg">Delete Log Entry?</h3>
                      <p className="text-xs text-slate-500 mt-1">This entry will be permanently removed.</p>
                    </div>
                  </div>

                  {deletedTxDetails && (
                    <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 space-y-2 font-sans">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400 capitalize">Platform</span>
                        <span className="font-extrabold text-slate-700">{deletedTxDetails.platform}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Adjustment Type</span>
                        <span className={`font-extrabold capitalize ${deletedTxDetails.type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                          {deletedTxDetails.type === "credit" ? "Credit Injected" : "Spend Refuel"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-400">Amount</span>
                        <span className="font-extrabold text-slate-900">{formatCurrency(deletedTxDetails.amount)}</span>
                      </div>
                      {deletedTxDetails.description && (
                        <div className="pt-2 border-t border-slate-200/50">
                          <span className="font-bold text-slate-400 text-[10px] uppercase block tracking-wide">Notes</span>
                          <p className="text-xs text-slate-600 font-medium mt-1 italic">"{deletedTxDetails.description}"</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center justify-end gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setTxToDelete(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 font-bold text-xs transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={performDeleteTransaction}
                      className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-5 py-2.5 rounded-xl text-xs shadow-md shadow-amber-100 transition-colors flex items-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Yes, Delete Item
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Create New Batch Modal Overlay */}
          <AnimatePresence>
            {showAddBatchModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onClick={() => setShowAddBatchModal(false)}
                  className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
                />
                
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 15 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: 15 }}
                  className="bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 w-full max-w-lg relative z-10 flex flex-col gap-5 max-h-[90vh] overflow-y-auto"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <h3 className="font-extrabold text-slate-900 text-lg flex items-center gap-2">
                        <Layers className="w-5 h-5 text-indigo-600" />
                        Register Admission Cohort
                      </h3>
                      <p className="text-xs text-slate-500 leading-relaxed font-sans">
                        Add a new offline or online coaching batch program, associate ad expenses from target months, and map reported conversion metrics.
                      </p>
                    </div>
                  </div>

                  <form onSubmit={handleAddBatchSubmit} className="space-y-4">
                    {/* Batch Name */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Cohort Program Name / Number</label>
                      <input
                        type="text"
                        required
                        value={newBatchName}
                        onChange={(e) => setNewBatchName(e.target.value)}
                        placeholder="e.g. Batch 65 (Summer Essentials)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-sans"
                      />
                    </div>

                    {/* Batch Code e.g. 64 */}
                    <div className="space-y-1.5 font-sans">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Batch Number ID (Optional)</label>
                      <input
                        type="text"
                        value={newBatchId}
                        onChange={(e) => setNewBatchId(e.target.value)}
                        placeholder="e.g. 65 (autogenerated if blank)"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold font-mono outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all"
                      />
                    </div>

                    {/* Start Date */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Kickoff Commencement Date</label>
                      <input
                        type="date"
                        required
                        value={newBatchStartDate}
                        onChange={(e) => setNewBatchStartDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-semibold outline-none focus:bg-white focus:ring-2 focus:ring-blue-500 transition-all font-mono"
                      />
                    </div>

                    {/* Spend Attribution Months Selection */}
                    <div className="space-y-2">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Campaign Ad Spends Attribution</label>
                      <p className="text-[10px] text-slate-400 font-sans font-semibold">Toggle which ledger spend months are allocated as costs for this program batch.</p>
                      
                      <div className="flex flex-wrap gap-2 pt-1">
                        {availableMonths.length === 0 ? (
                          <span className="text-xs text-slate-400 italic font-sans block">No months present in transaction history</span>
                        ) : (
                          availableMonths.map((m) => {
                            const isSelect = newBatchSpendMonths.includes(m);
                            return (
                              <button
                                key={m}
                                type="button"
                                onClick={() => toggleNewBatchSpendMonth(m)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-bold font-mono transition-all border ${
                                  isSelect
                                    ? "bg-slate-900 text-white border-slate-900"
                                    : "bg-white text-slate-600 hover:bg-slate-50 border-slate-200"
                                }`}
                              >
                                {m}
                              </button>
                            );
                          })
                        )}
                      </div>
                    </div>

                    {/* Platform Pre-Conversions Grid */}
                    <div className="space-y-2 border-t border-slate-100 pt-3">
                      <label className="text-xs font-black text-slate-700 uppercase tracking-wider block">Initial Conversions Setup</label>
                      {useCrmConversions ? (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-[11px] text-emerald-800 font-medium font-sans leading-relaxed">
                          🌱 <strong>CRM Dynamic Sync is currently Active.</strong> Registrations for this batch will be computed automatically from registered CRM participant profiles matching this Cohort Batch and their Form Submission Lead Source. You can safely skip setting initial values here.
                        </div>
                      ) : (
                        <>
                          <p className="text-[10px] text-slate-400 font-sans font-semibold">Set starting enrollment values acquired per channel.</p>
                          <div className="grid grid-cols-2 gap-2.5 max-h-40 overflow-y-auto pr-1">
                            {PLATFORMS.map((platform) => {
                              const details = PLATFORM_DETAILS[platform] || PLATFORM_DETAILS["Google"];
                              return (
                                <div key={platform} className="flex items-center justify-between p-2 rounded-xl bg-slate-50/50 border border-slate-100 font-sans">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md ${details.bg} ${details.text} border ${details.border} font-mono block tracking-wide uppercase`}>
                                    {platform}
                                  </span>
                                  <input
                                    type="number"
                                    min="0"
                                    value={newBatchConversions[platform] || 0}
                                    onChange={(e) => {
                                      setNewBatchConversions({
                                        ...newBatchConversions,
                                        [platform]: Math.max(0, parseInt(e.target.value) || 0)
                                      });
                                    }}
                                    className="w-12 h-6 border focus:ring-1 focus:ring-blue-500 border-slate-200 outline-none text-center rounded-md font-bold text-xs bg-white font-mono"
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 font-sans">
                      <button
                        type="button"
                        onClick={() => setShowAddBatchModal(false)}
                        className="px-4 py-2 text-xs font-bold text-slate-500 hover:bg-slate-50 rounded-xl"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-extrabold shadow-md rounded-xl transition-all inline-flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        Create Program Batch
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
}
