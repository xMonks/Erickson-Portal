import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, Activity, Globe, TrendingUp, PieChart as PieChartIcon, Loader2, Briefcase, CheckCircle2, Target, UserCheck, Calendar, ChevronDown, ChevronUp, Clock, Video, Copy, Check, ExternalLink, Bell, Sparkles, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';

interface Participant {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  gender: string;
  batchNumber: string;
  city: string;
  industry: string;
  cmm: string;
  tcc: string;
  tlc: string;
  coachingJourney?: string;
  clientPartner?: string;
  leadSource?: string;
  createdAt: string;
  fullAddress?: string;
  totalAmount?: number;
  paymentReceived?: number;
  remainingAmount?: number;
}

interface DashboardViewProps {
  currentUser?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

const DEFAULT_BATCH_RECORDS = [
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

export default function DashboardView({ currentUser = 'admin' }: DashboardViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [showAllCities, setShowAllCities] = useState(false);
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [copiedMilestoneId, setCopiedMilestoneId] = useState<string | null>(null);
  const [timelineCountdowns, setTimelineCountdowns] = useState<Record<string, string>>({});
  const [milestoneIdConfirmingDelete, setMilestoneIdConfirmingDelete] = useState<string | null>(null);
  const [deletedMilestoneIds, setDeletedMilestoneIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('deleted_milestones');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const milestonesList = useMemo(() => [
    {
      id: 'webinar-art',
      date: '2026-07-28T15:00:00',
      displayMonth: 'Jul',
      displayDay: '28',
      displayYear: '2026',
      program: 'Erickson Coaching Masterclass',
      title: 'The Art of Powerful Coaching Questions',
      batch: 'Live Webinar / Interactive Training Session',
      type: 'webinar' as const,
      badges: ['Live Webinar', 'Free Masterclass', 'Gaurav Arora', 'July 2026'],
      timings: '3:00 PM - 4:30 PM',
      scheduleDetails: {
        part1: 'Main Masterclass Session (July 28, 3:00 PM IST)',
        part2: 'Live Q&A, Networking and Resource distribution'
      },
      gcalLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=The+Art+of+Powerful+Coaching+Questions+Masterclass&dates=20260728T093000Z/20260728T110000Z&details=Live+Masterclass+with+Gaurav+Arora.+Learn+to+ask+powerful+coaching+questions+that+unlock+client+potential.&location=Zoom+Online',
      inviteDetails: `Event: The Art of Powerful Coaching Questions\nHost: Gaurav Arora\nDate: July 28, 2026\nTimings: 3:00 PM - 4:30 PM (IST)\nRegister now to attend the live interactive masterclass!`
    },
    {
      id: 'email-trigger-66',
      date: '2026-09-12T09:00:00',
      displayMonth: 'Sep',
      displayDay: '12',
      displayYear: '2026',
      program: 'Automated Email Automation',
      title: 'Pre-course Orientation & Onboarding Email',
      batch: 'Target: Batch 66 Enrolled Participants (5 Days Out)',
      type: 'email_trigger' as const,
      badges: ['Email Campaign', 'Automated', 'Pre-Onboarding', 'Orientation'],
      timings: '9:00 AM (Scheduled)',
      scheduleDetails: {
        part1: 'Deliver pre-reads, student guide PDFs, and Zoom links',
        part2: 'Triggers CC / BCC sync status logs in background'
      },
      gcalLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=Batch+66+Pre-course+Orientation+Email+Trigger&dates=20260912T033000Z/20260912T040000Z&details=Automated+onboarding+campaign+for+Batch+66.+Triggers+orientation+package+with+materials+and+credentials.',
      inviteDetails: `Milestone: Onboarding Campaign Trigger\nTarget: Batch 66\nTimeline: 5 days before launch\nAction: Send pre-course student guides, resource directories, and logistics info.`
    },
    {
      id: 'batch-66',
      date: '2026-09-17T10:00:00',
      displayMonth: 'Sep',
      displayDay: '17',
      displayYear: '2026',
      program: 'Erickson ICF Certification',
      title: 'TASC - Essentials (Part I & II)',
      batch: 'Batch 66 - Weekend Batches / Sat-Sun',
      type: 'batch_launch' as const,
      badges: ['Certification', 'Virtual', 'Online', 'September 2026'],
      timings: '10:00 AM - 1:30 PM',
      scheduleDetails: {
        part1: 'Part I: Sep 17-20 and Sep 24-27',
        part2: 'Part II: Oct 8-11 and Oct 15-18'
      },
      gcalLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=TASC+Essentials+Batch+66+Launch&dates=20260917T043000Z/20260917T080000Z&details=Erickson+Coaching+India+Batch+66+Weekend+Launch.+Part+I:+Sep+17-20+and+Sep+24-27.+Part+II:+Oct+8-11+and+Oct+15-18.&location=Online+Virtual',
      inviteDetails: `Program: Erickson ICF Certification\nTitle: TASC - Essentials (Part I & II)\nBatch: Batch 66 - Weekend Batches / Sat-Sun\nTimings: 10:00 AM - 1:30 PM (Virtual)\nPart I: Sep 17-20 and Sep 24-27\nPart II: Oct 8-11 and Oct 15-18\nJoin us for a transformative coaching journey!`
    },
    {
      id: 'batch-67',
      date: '2026-09-19T18:00:00',
      displayMonth: 'Sep',
      displayDay: '19',
      displayYear: '2026',
      program: 'Erickson ICF Certification',
      title: 'TASC - Essentials (Part I & II)',
      batch: 'Batch 67 - Thu-Sun',
      type: 'batch_launch' as const,
      badges: ['Certification', 'Virtual', 'Online', 'September 2026'],
      timings: '6:00 PM - 9:30 PM',
      scheduleDetails: {
        part1: 'Part I: Sep 19-20, Sep 26-27, Oct 3-4 and Oct 10-11',
        part2: 'Part II: Oct 17-18, Oct 24-25, Nov 14-15 and Nov 21-22'
      },
      gcalLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=TASC+Essentials+Batch+67+Launch&dates=20260919T123000Z/20260919T160000Z&details=Erickson+Coaching+India+Batch+67+Launch.+Part+I:+Sep+19-20,+Sep+26-27,+Oct+3-4+and+Oct+10-11.+Part+II:+Oct+17-18,+Oct+24-25,+Nov+14-15+and+Nov+21-22.&location=Online+Virtual',
      inviteDetails: `Program: Erickson ICF Certification\nTitle: TASC - Essentials (Part I & II)\nBatch: Batch 67 - Thu-Sun\nTimings: 6:00 PM - 9:30 PM (Virtual)\nPart I: Sep 19-20, Sep 26-27, Oct 3-4 and Oct 10-11\nPart II: Oct 17-18, Oct 24-25, Nov 14-15 and Nov 21-22\nJoin us for a transformative coaching journey!`
    },
    {
      id: 'batch-68',
      date: '2026-11-26T18:00:00',
      displayMonth: 'Nov',
      displayDay: '26',
      displayYear: '2026',
      program: 'Erickson ICF Certification',
      title: 'TASC - Essentials (Part I & II)',
      batch: 'Batch 68 - Thu-Sun',
      type: 'batch_launch' as const,
      badges: ['Certification', 'Virtual', 'Online', 'November 2026'],
      timings: '6:00 PM - 9:30 PM',
      scheduleDetails: {
        part1: 'Part I: Nov 26-29 and Dec 3-6',
        part2: 'Part II: Dec 10-13 and Dec 17-20'
      },
      gcalLink: 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=TASC+Essentials+Batch+68+Launch&dates=20261126T123000Z/20261126T160000Z&details=Erickson+Coaching+India+Batch+68+Launch.+Part+I:+Nov+26-29+and+Dec+3-6.+Part+II:+Dec+10-13+and+Dec+17-20.&location=Online+Virtual',
      inviteDetails: `Program: Erickson ICF Certification\nTitle: TASC - Essentials (Part I & II)\nBatch: Batch 68 - Thu-Sun\nTimings: 6:00 PM - 9:30 PM (Virtual)\nPart I: Nov 26-29 and Dec 3-6\nPart II: Dec 10-13 and Dec 17-20\nJoin us for a transformative coaching journey!`
    }
  ], []);

  useEffect(() => {
    const calc = () => {
      const now = new Date().getTime();
      const res: Record<string, string> = {};
      milestonesList.forEach(m => {
        const target = new Date(m.date).getTime();
        const diff = target - now;
        if (diff <= 0) {
          res[m.id] = 'Happening Now / Completed';
        } else {
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          
          let parts: string[] = [];
          if (days > 0) parts.push(`${days}d`);
          if (hours > 0 || days > 0) parts.push(`${hours}h`);
          parts.push(`${minutes}m`);
          res[m.id] = `${parts.join(' ')} remaining`;
        }
      });
      setTimelineCountdowns(res);
    };

    calc();
    const timer = setInterval(calc, 60000);
    return () => clearInterval(timer);
  }, [milestonesList]);

  const handleCopyInvite = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedMilestoneId(id);
      setTimeout(() => setCopiedMilestoneId(null), 2500);
    }).catch(err => {
      console.error('Clipboard copy failed:', err);
    });
  };

  const activeMilestones = useMemo(() => {
    return milestonesList.filter(m => !deletedMilestoneIds.includes(m.id));
  }, [milestonesList, deletedMilestoneIds]);

  const handleDeleteMilestone = (id: string) => {
    const updated = [...deletedMilestoneIds, id];
    setDeletedMilestoneIds(updated);
    localStorage.setItem('deleted_milestones', JSON.stringify(updated));
    if (milestoneIdConfirmingDelete === id) {
      setMilestoneIdConfirmingDelete(null);
    }
  };

  const nextLaunch = useMemo(() => {
    return activeMilestones.find(m => m.type === 'batch_launch') || activeMilestones[0];
  }, [activeMilestones]);

  const activeBatchesCount = useMemo(() => {
    return activeMilestones.filter(m => m.type === 'batch_launch').length;
  }, [activeMilestones]);

  const activeWebinarsCount = useMemo(() => {
    return activeMilestones.filter(m => m.type === 'webinar').length;
  }, [activeMilestones]);

  const activeEmailsCount = useMemo(() => {
    return activeMilestones.filter(m => m.type === 'email_trigger').length;
  }, [activeMilestones]);
  
  // Date Range/Quarter Filters
  const [roiData, setRoiData] = useState<{
    batches: any[];
    courseFee: number;
    useCrmConversions: boolean;
  }>({
    batches: [],
    courseFee: 160000,
    useCrmConversions: true,
  });
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');

  const isAdmin = currentUser === 'admin' || currentUser === 'marketing@xmonks.com';
  const isGlobalUser = isAdmin || currentUser === 'Sheena' || currentUser === 'Vikram';

  useEffect(() => {
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Participant[] = [];
      snapshot.forEach((doc) => {
        const p = doc.data() as Participant;
        if (isGlobalUser || p.clientPartner === currentUser) {
          data.push({ id: doc.id, ...p });
        }
      });
      setParticipants(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isGlobalUser]);

  // Listen to batch starting dates in settings/roiData
  useEffect(() => {
    const roiRef = doc(db, 'settings', 'roiData');
    const unsubscribeRoi = onSnapshot(roiRef, (snap) => {
      let dbBatches: any[] = [];
      let dbCourseFee = 160000;
      let dbUseCrmConversions = true;

      if (snap.exists()) {
        const data = snap.data();
        dbBatches = data.batches || [];
        dbCourseFee = data.courseFee !== undefined ? data.courseFee : 160000;
        dbUseCrmConversions = data.useCrmConversions !== undefined ? data.useCrmConversions : true;
      }

      // Merge defaults if missing
      const mergedBatches = [...dbBatches];
      DEFAULT_BATCH_RECORDS.forEach(defBatch => {
        if (!mergedBatches.some(b => b.id === defBatch.id)) {
          mergedBatches.push(defBatch);
        }
      });

      // Sort by id ascending
      mergedBatches.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));

      setRoiData({
        batches: mergedBatches,
        courseFee: dbCourseFee,
        useCrmConversions: dbUseCrmConversions,
      });
    }, (error) => {
      console.error("Error listening to roiData:", error);
    });

    return () => unsubscribeRoi();
  }, []);

  // Available Batches for filtering (all batches found in participants or configured in roiData)
  const availableBatches = useMemo(() => {
    const batches = new Set<string>();
    participants.forEach(p => {
      if (p.batchNumber) batches.add(p.batchNumber);
    });
    roiData.batches.forEach(b => {
      if (b.id) batches.add(b.id);
    });
    return Array.from(batches).sort((a, b) => parseInt(a) - parseInt(b));
  }, [participants, roiData.batches]);

  // Extract years from configured batches in roiData
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    roiData.batches.forEach(b => {
      if (b.startDate) {
        const year = b.startDate.split('-')[0];
        if (year && year.length === 4) {
          years.add(year);
        }
      }
    });
    // Fallback if empty
    if (years.size === 0) {
      years.add('2026');
      years.add('2025');
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [roiData.batches]);

  // Filter batches options dynamically based on the selected year & quarter
  const filteredAvailableBatches = useMemo(() => {
    return availableBatches.filter(batchId => {
      const batchConfig = roiData.batches.find(b => b.id === batchId);
      const startDate = batchConfig?.startDate;

      if (selectedYear !== 'all') {
        if (!startDate) return false;
        const year = startDate.split('-')[0];
        if (year !== selectedYear) return false;
      }

      if (selectedQuarter !== 'all') {
        if (!startDate) return false;
        const monthStr = startDate.split('-')[1];
        const month = parseInt(monthStr);
        if (isNaN(month)) return false;

        let q = '';
        if (month >= 1 && month <= 3) q = 'q1';
        else if (month >= 4 && month <= 6) q = 'q2';
        else if (month >= 7 && month <= 9) q = 'q3';
        else if (month >= 10 && month <= 12) q = 'q4';

        if (q !== selectedQuarter) return false;
      }

      return true;
    });
  }, [availableBatches, roiData.batches, selectedYear, selectedQuarter]);

  // Compute batches data for dashboard table
  const batchesTableData = useMemo(() => {
    const targetBatchIds = selectedBatch !== 'all' 
      ? [selectedBatch] 
      : filteredAvailableBatches;

    return targetBatchIds.map(batchId => {
      const batchConfig = roiData.batches.find(b => b.id === batchId);
      const startDate = batchConfig?.startDate || 'Not Configured';
      const batchName = batchConfig?.name || `Batch ${batchId}`;
      
      const batchParticipants = participants.filter(p => p.batchNumber === batchId);
      const enrollmentCount = batchParticipants.length;
      
      let marketingCount = 0;
      let otherCount = 0;
      
      batchParticipants.forEach(p => {
        const source = p.leadSource;
        if (!source) {
          otherCount++;
        } else {
          const s = source.trim().toLowerCase();
          if (s === 'self created' || s === 'self-created' || s === 'referrals' || s === 'referral') {
            otherCount++;
          } else {
            marketingCount++;
          }
        }
      });

      return {
        id: batchId,
        name: batchName,
        startDate,
        marketingCount,
        otherCount,
        enrollmentCount
      };
    }).sort((a, b) => {
      const aNum = parseInt(a.id) || 0;
      const bNum = parseInt(b.id) || 0;
      return bNum - aNum;
    });
  }, [selectedBatch, filteredAvailableBatches, roiData.batches, participants]);

  // Sliced batches data for the dashboard table (top 5 entries with Show More functionality)
  const visibleBatchesTableData = useMemo(() => {
    return showAllBatches ? batchesTableData : batchesTableData.slice(0, 5);
  }, [batchesTableData, showAllBatches]);

  // Reset selectedBatch to 'all' if the selected batch is no longer in the filtered list
  useEffect(() => {
    if (selectedBatch !== 'all' && !filteredAvailableBatches.includes(selectedBatch)) {
      setSelectedBatch('all');
    }
  }, [selectedBatch, filteredAvailableBatches]);

  // Aggregate Data
  const stats = useMemo(() => {
    if (participants.length === 0) return null;

    // Filter participants by Year, Quarter and Batch
    const filteredParticipants = participants.filter(p => {
      // 1. Batch filter
      if (selectedBatch !== 'all') {
        return p.batchNumber === selectedBatch;
      }

      // 2. Year & Quarter filters (applied to batch of participant)
      const pBatchId = p.batchNumber;
      if (!pBatchId) return false; // Exclude if unassigned and filters are active

      if (selectedYear !== 'all' || selectedQuarter !== 'all') {
        const batchConfig = roiData.batches.find(b => b.id === pBatchId);
        const startDate = batchConfig?.startDate;
        if (!startDate) return false; // Exclude if starting date is not configured

        if (selectedYear !== 'all') {
          const year = startDate.split('-')[0];
          if (year !== selectedYear) return false;
        }

        if (selectedQuarter !== 'all') {
          const monthStr = startDate.split('-')[1];
          const month = parseInt(monthStr);
          if (isNaN(month)) return false;

          let q = '';
          if (month >= 1 && month <= 3) q = 'q1';
          else if (month >= 4 && month <= 6) q = 'q2';
          else if (month >= 7 && month <= 9) q = 'q3';
          else if (month >= 10 && month <= 12) q = 'q4';

          if (q !== selectedQuarter) return false;
        }
      }

      return true;
    });

    if (filteredParticipants.length === 0) return null;

    const dataToProcess = filteredParticipants;

    // Batch Health: Enrollment Trends
    const batchCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const batch = p.batchNumber || 'Unassigned';
      batchCounts[batch] = (batchCounts[batch] || 0) + 1;
    });
    const batchData = Object.entries(batchCounts)
      .map(([name, count]) => ({ name: `Batch ${name}`, count }))
      .sort((a, b) => {
          const aNum = parseInt(a.name.replace('Batch ', '')) || 0;
          const bNum = parseInt(b.name.replace('Batch ', '')) || 0;
          return aNum - bNum;
      });

    // Demographic: Industry
    const industryCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const industry = p.industry || 'Unknown';
      industryCounts[industry] = (industryCounts[industry] || 0) + 1;
    });
    const industryData = Object.entries(industryCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    // Top 8 for the chart
    const topIndustries = industryData.slice(0, 8);

    // Demographic: Gender
    const genderCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const gender = p.gender || 'Not specified';
      genderCounts[gender] = (genderCounts[gender] || 0) + 1;
    });
    const genderData = Object.entries(genderCounts).map(([name, value]) => ({ name, value }));

    // Demographic: City
    const cityCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const city = p.city || 'Unknown';
      cityCounts[city] = (cityCounts[city] || 0) + 1;
    });
    const cityData = Object.entries(cityCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    
    const topCities = cityData.slice(0, 5);

    // Demographic: Lead Source
    const leadSourceCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const source = p.leadSource || 'Direct/Unknown';
      leadSourceCounts[source] = (leadSourceCounts[source] || 0) + 1;
    });
    const leadSourceData = Object.entries(leadSourceCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => item.name !== 'Direct/Unknown')
      .sort((a, b) => b.value - a.value);

    // Demographic: Client Partner
    const partnerCounts: Record<string, number> = {};
    dataToProcess.forEach(p => {
      const partner = p.clientPartner || 'Unassigned';
      partnerCounts[partner] = (partnerCounts[partner] || 0) + 1;
    });
    const allowedPartners = ['Rejna', 'Saurav', 'Gaurav', 'Preeti', 'Aakib'];
    const partnerData = Object.entries(partnerCounts)
      .map(([name, value]) => ({ name, value }))
      .filter(item => allowedPartners.includes(item.name))
      .sort((a, b) => b.value - a.value);

    // Journey Stats: ACC, PCC, Pathway
    let accCount = 0;
    let pccCount = 0;
    let pathwayCount = 0;

    dataToProcess.forEach(p => {
      const journey = (p.coachingJourney || '').toUpperCase();
      if (journey.includes('ACC') && !journey.includes('PATHWAY')) accCount++;
      if (journey.includes('PCC')) pccCount++;
      if (journey.includes('PATHWAY') || journey.includes('ACC PATHWAY')) pathwayCount++;
    });

    return {
      batchData,
      industryData: topIndustries,
      genderData,
      cityData: topCities,
      fullCityData: cityData,
      uniqueCitiesCount: Object.keys(cityCounts).length,
      uniqueIndustriesCount: Object.keys(industryCounts).length,
      totalParticipants: dataToProcess.length,
      accCount,
      pccCount,
      pathwayCount,
      leadSourceData,
      partnerData
    };
  }, [participants, selectedBatch, selectedYear, selectedQuarter, roiData.batches]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium italic">Generating insights...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-slate-100 shadow-sm">
        <Users className="w-16 h-16 text-slate-200 mx-auto mb-4" />
        <h3 className="text-xl font-bold text-slate-900">No data available</h3>
        <p className="text-slate-500 mt-2">Add participants to see advanced analytics and trends.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Bento Header: Glassmorphism Floating Header with Advanced Filtering */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-2 z-40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Program Insights Dashboard</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">Unified intelligence, demographic trends & batch analytics</p>
        </div>
        
        {/* Modern Bento Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Year Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Year</span>
            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Years</option>
              {availableYears.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>
          </div>

          {/* Quarter Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Quarter</span>
            <select 
              value={selectedQuarter} 
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Quarters</option>
              <option value="q1">Q1 (Jan-Mar)</option>
              <option value="q2">Q2 (Apr-Jun)</option>
              <option value="q3">Q3 (Jul-Sep)</option>
              <option value="q4">Q4 (Oct-Dec)</option>
            </select>
          </div>

          {/* Batch Select */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Batch</span>
            <select 
              value={selectedBatch} 
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Batches</option>
              {filteredAvailableBatches.map(batch => (
                <option key={batch} value={batch}>Batch {batch}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 🍱 MAIN BENTO GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: Hero Block - Total Footprint (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-8 rounded-3xl text-white shadow-xl relative overflow-hidden border border-slate-800/80 group hover:shadow-2xl transition-all duration-300 flex flex-col justify-between min-h-[220px]"
        >
          {/* Decorative glowing backdrops */}
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-blue-500/15 rounded-full blur-3xl group-hover:bg-blue-500/25 transition-all duration-500" />
          <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-blue-400 bg-blue-500/10 px-3 py-1.5 rounded-full border border-blue-500/20">
                Coaching Footprint
              </span>
              <Users className="w-5 h-5 text-slate-400" />
            </div>
            
            <div className="mt-6 flex items-baseline gap-4">
              <h3 className="text-6xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">
                {stats.totalParticipants}
              </h3>
              <div>
                <p className="text-xs font-bold text-slate-300">Enrolled Leaders</p>
                <p className="text-[10px] text-slate-400">Successfully assigned to programs</p>
              </div>
            </div>
          </div>

          <div className="relative z-10 border-t border-white/10 pt-4 mt-6 grid grid-cols-2 gap-4 text-xs">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Geographic Footprint</p>
              <p className="font-extrabold text-white mt-0.5 flex items-center gap-1">
                <Globe className="w-3.5 h-3.5 text-amber-400" />
                {stats.uniqueCitiesCount} Unique Cities
              </p>
            </div>
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">Industry Sectors</p>
              <p className="font-extrabold text-white mt-0.5 flex items-center gap-1">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                {stats.uniqueIndustriesCount} Industries
              </p>
            </div>
          </div>
        </motion.div>

        {/* CARD 2: ACC Credentials (Spans 1 col) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md transition-all duration-300"
        >
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-emerald-500/5 rounded-full blur-2xl group-hover:bg-emerald-500/10 transition-colors" />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-100">
              ACC Level
            </span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.accCount}</p>
            <h4 className="text-xs font-bold text-slate-800 mt-1">ACC Credentials</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {stats.totalParticipants > 0 ? Math.round((stats.accCount / stats.totalParticipants) * 100) : 0}% of total enrollees
            </p>
          </div>
        </motion.div>

        {/* CARD 3: PCC Credentials (Spans 1 col) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md transition-all duration-300"
        >
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-indigo-500/5 rounded-full blur-2xl group-hover:bg-indigo-500/10 transition-colors" />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2.5 py-1 rounded-xl border border-indigo-100">
              PCC Level
            </span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.pccCount}</p>
            <h4 className="text-xs font-bold text-slate-800 mt-1">PCC Credentials</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {stats.totalParticipants > 0 ? Math.round((stats.pccCount / stats.totalParticipants) * 100) : 0}% of total enrollees
            </p>
          </div>
        </motion.div>

        {/* CARD 4: Batch Enrollment Trends (Spans 3 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="lg:col-span-3 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Batch Enrollment Trends</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Enrollee volume sequence
            </span>
          </div>

          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.batchData} margin={{ left: -15, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="bentoColorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#bentoColorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CARD 5: Pathway to ACC (Spans 1 col) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden flex flex-col justify-between group hover:-translate-y-1 hover:shadow-md transition-all duration-300"
        >
          <div className="absolute -bottom-10 -right-10 w-28 h-28 bg-amber-500/5 rounded-full blur-2xl group-hover:bg-amber-500/10 transition-colors" />
          
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-100">
              Pathway
            </span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          
          <div className="mt-4">
            <p className="text-4xl font-extrabold text-slate-900 tracking-tight">{stats.pathwayCount}</p>
            <h4 className="text-xs font-bold text-slate-800 mt-1">Pathway to ACC</h4>
            <p className="text-[10px] text-slate-400 mt-1 font-medium">
              {stats.totalParticipants > 0 ? Math.round((stats.pathwayCount / stats.totalParticipants) * 100) : 0}% of total enrollees
            </p>
          </div>
        </motion.div>

        {/* CARD 6: Industry Distribution (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-950">Industry Representation</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Enrollee sectors
            </span>
          </div>

          <div className="h-[220px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.industryData} layout="vertical" margin={{ left: 10, right: 10, top: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f8fafc" />
                <XAxis type="number" hide />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  stroke="#64748b" 
                  fontSize={10} 
                  width={110} 
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip 
                  cursor={{fill: '#f8fafc'}}
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
                <Bar 
                  dataKey="value" 
                  radius={[0, 6, 6, 0]} 
                  barSize={16}
                >
                  {stats.industryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CARD 7: Geographic Reach (Spans 1 col) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div>
            <div className="flex items-center gap-2 mb-6">
              <Globe className="w-4.5 h-4.5 text-amber-600" />
              <h3 className="text-sm font-bold text-slate-950">Geographic Reach</h3>
            </div>
            
            <div className="space-y-4 max-h-[170px] overflow-y-auto pr-1 custom-scrollbar">
              {(showAllCities ? stats.fullCityData : stats.cityData).map((city, index) => {
                const percentage = ((city.value / stats.totalParticipants) * 100).toFixed(0);
                return (
                  <div key={city.name} className="space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="font-semibold text-slate-700">{city.name}</span>
                      <span className="text-slate-400 font-medium">{city.value} ({percentage}%)</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.2)]"
                        transition={{ duration: 1, delay: Math.min(index, 5) * 0.1 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {stats.uniqueCitiesCount > 5 && (
            <div className="border-t border-slate-50 pt-3 mt-4 text-center">
              <button 
                onClick={() => setShowAllCities(!showAllCities)}
                className="text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors flex items-center justify-center gap-1 mx-auto"
              >
                {showAllCities ? 'Show Less' : `+ ${stats.uniqueCitiesCount - 5} More Cities`}
              </button>
            </div>
          )}
        </motion.div>

        {/* CARD 8: Gender Distribution (Spans 1 col) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-4.5 h-4.5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-950">Gender Balance</h3>
          </div>

          <div className="h-[140px] w-full flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.genderData}
                  cx="50%"
                  cy="50%"
                  innerRadius={35}
                  outerRadius={55}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.genderData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Embedded Center Stat */}
            <div className="absolute text-center">
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ratio</p>
              <p className="text-sm font-extrabold text-slate-800">
                {stats.genderData.length > 0 ? stats.genderData[0].value : 0}:{stats.genderData.length > 1 ? stats.genderData[1].value : 0}
              </p>
            </div>
          </div>

          <div className="flex justify-center gap-4 mt-2 text-[10px] font-bold text-slate-500">
            {stats.genderData.map((entry, index) => (
              <div key={entry.name} className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#94a3b8' }} />
                <span>{entry.name} ({entry.value})</span>
              </div>
            ))}
          </div>
        </motion.div>

        {/* CARD 9: Lead Source Analytics (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
          className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Target className="w-4.5 h-4.5 text-rose-600" />
              <h3 className="text-sm font-bold text-slate-950">Lead Source Analytics</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Marketing efficiency
            </span>
          </div>

          <div className="h-[200px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.leadSourceData} margin={{ top: 10, bottom: 0, left: -20, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.05)' }}
                />
                <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={32}>
                  {stats.leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* CARD 10: Client Partner Performance (Spans 2 cols) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="lg:col-span-2 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4.5 h-4.5 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-950">Client Partner Distribution</h3>
            </div>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg uppercase tracking-wider">
              Assigned accounts
            </span>
          </div>

          <div className="h-[200px] w-full flex items-center justify-between">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.partnerData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.partnerData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="w-1/2 pr-4 space-y-2 max-h-[170px] overflow-y-auto custom-scrollbar">
              {stats.partnerData.map((entry, index) => (
                <div key={entry.name} className="flex items-center justify-between text-xs font-semibold text-slate-600 border-b border-slate-50 pb-1.5 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span>{entry.name}</span>
                  </div>
                  <span className="text-slate-900 font-bold">{entry.value}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* CARD 10.5: Interactive Launch & Webinar Timeline (Spans 4 cols - Full width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
          className="lg:col-span-4 bg-gradient-to-br from-white to-slate-50/50 p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6 group hover:shadow-md transition-all duration-300"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100/80 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </div>
                <h3 className="text-base font-black text-slate-900 tracking-tight">Interactive Launch & Webinar Timeline</h3>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-1">Countdown to next batch launches, live masterclasses, and pre-course orientation email triggers.</p>
            </div>
            
            {/* Quick Filter Info Badge */}
            <div className="flex items-center gap-2 text-xs">
              {deletedMilestoneIds.length > 0 && (
                <button
                  onClick={() => {
                    setDeletedMilestoneIds([]);
                    localStorage.removeItem('deleted_milestones');
                  }}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl border border-slate-200 font-bold transition-all active:scale-95 cursor-pointer"
                  title="Restore all removed milestones"
                >
                  Restore Deleted ({deletedMilestoneIds.length})
                </button>
              )}
              <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-xl border border-blue-100 font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                {activeMilestones.length} Milestones Scheduled
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Side: Countdown Summary & Highlights Card */}
            <div className="lg:col-span-4 flex flex-col justify-between bg-slate-900 text-white p-6 rounded-2xl border border-slate-800/60 relative overflow-hidden shadow-sm min-h-[250px]">
              <div className="absolute -top-12 -right-12 w-32 h-32 bg-blue-500/10 rounded-full blur-2xl" />
              <div className="absolute -bottom-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl" />

              <div className="relative z-10 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300/10 animate-pulse" />
                  <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Next Critical Launch</span>
                </div>
                
                {nextLaunch ? (
                  <>
                    <div>
                      <h4 className="text-lg font-black tracking-tight text-white line-clamp-1">{nextLaunch.title}</h4>
                      <p className="text-xs text-slate-400 font-medium mt-0.5">{nextLaunch.batch}</p>
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-4 mt-2">
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-blue-400" /> Time Remaining
                      </div>
                      <div className="text-xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-indigo-200">
                        {timelineCountdowns[nextLaunch.id] || 'Calculating...'}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs font-semibold">
                    No active milestones.
                  </div>
                )}
              </div>

              <div className="relative z-10 border-t border-white/10 pt-4 mt-6 space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Total Batches</span>
                  <span className="font-bold text-white">{activeBatchesCount} {activeBatchesCount === 1 ? 'Batch' : 'Batches'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Webinars Planned</span>
                  <span className="font-bold text-white">{activeWebinarsCount} {activeWebinarsCount === 1 ? 'Masterclass' : 'Masterclasses'}</span>
                </div>
                <div className="flex items-center justify-between text-xs font-semibold">
                  <span className="text-slate-400">Automation Campaign</span>
                  <span className="font-bold text-white">{activeEmailsCount} {activeEmailsCount === 1 ? 'Active Trigger' : 'Active Triggers'}</span>
                </div>
              </div>
            </div>

            {/* Right Side: Scrollable Elegant Vertical Timeline */}
            <div className="lg:col-span-8 space-y-6 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
              {activeMilestones.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center text-slate-400">
                  <Calendar className="w-10 h-10 text-slate-300 mb-2" />
                  <p className="text-sm font-bold text-slate-500">All milestones have been removed.</p>
                  {deletedMilestoneIds.length > 0 && (
                    <button
                      onClick={() => {
                        setDeletedMilestoneIds([]);
                        localStorage.removeItem('deleted_milestones');
                      }}
                      className="mt-4 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 border border-blue-200/50 font-bold text-xs transition-all active:scale-95 cursor-pointer"
                    >
                      Restore All Milestones
                    </button>
                  )}
                </div>
              ) : (
                activeMilestones.map((m, index) => {
                  const isFirst = index === 0;
                  const isLast = index === activeMilestones.length - 1;
                  const isEmailCampaign = m.type === 'email_trigger';
                  const isWebinarEvent = m.type === 'webinar';
                  
                  // Color configuration
                  let typeColor = 'bg-blue-600 text-white';
                  let tagColor = 'bg-blue-50 text-blue-700 border-blue-100';
                  let iconBg = 'bg-blue-50 text-blue-600 border-blue-200';
                  let badgeLabel = 'Batch Launch';

                  if (isEmailCampaign) {
                    typeColor = 'bg-purple-600 text-white';
                    tagColor = 'bg-purple-50 text-purple-700 border-purple-100';
                    iconBg = 'bg-purple-50 text-purple-600 border-purple-200';
                    badgeLabel = 'Email Trigger';
                  } else if (isWebinarEvent) {
                    typeColor = 'bg-emerald-600 text-white';
                    tagColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    iconBg = 'bg-emerald-50 text-emerald-600 border-emerald-200';
                    badgeLabel = 'Live Webinar';
                  }

                  return (
                    <div key={m.id} className="relative flex gap-6 group/item">
                      {/* Date Block Calendar Tile */}
                      <div className="flex flex-col items-center justify-center w-16 h-18 bg-slate-50 group-hover/item:bg-slate-100/80 border border-slate-200/60 rounded-2xl shadow-sm text-center select-none transition-colors duration-300 shrink-0">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{m.displayMonth}</span>
                        <span className="text-2xl font-black text-slate-800 tracking-tight leading-none mt-0.5">{m.displayDay}</span>
                        <span className="text-[9px] font-bold text-slate-400 mt-0.5">{m.displayYear}</span>
                      </div>

                      {/* Timeline Tracker Node with Vertical Connector */}
                      <div className="flex flex-col items-center shrink-0">
                        <div className={`w-3 h-3 rounded-full ${typeColor} ring-4 ring-white shadow-sm flex items-center justify-center relative z-10 mt-6`}>
                          {isFirst && (
                            <span className="absolute -inset-1 rounded-full border border-blue-500 animate-ping opacity-60" />
                          )}
                        </div>
                        {!isLast && (
                          <div className="w-0.5 grow bg-slate-100 group-hover/item:bg-slate-200/80 transition-colors my-2 border-dashed border-l" />
                        )}
                      </div>

                      {/* Milestone Details Card */}
                      <div className="grow bg-white group-hover/item:bg-slate-50/40 p-5 rounded-2xl border border-slate-100/80 hover:border-slate-200/60 transition-all duration-300 flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-lg border uppercase tracking-wider ${tagColor}`}>
                              {badgeLabel}
                            </span>
                            <span className="text-[10px] font-extrabold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-lg">
                              {m.program}
                            </span>
                          </div>

                          <div>
                            <h4 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover/item:text-blue-600 transition-colors">
                              {m.title}
                            </h4>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {m.batch}
                            </p>
                          </div>

                          {/* Timing and details blocks */}
                          <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1 text-[11px] text-slate-500 font-semibold">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              {m.timings}
                            </span>
                            
                            {isWebinarEvent ? (
                              <span className="flex items-center gap-1 text-emerald-600 font-bold bg-emerald-50/50 px-2 py-0.5 rounded-md">
                                <Video className="w-3.5 h-3.5" /> Live on Zoom
                              </span>
                            ) : isEmailCampaign ? (
                              <span className="flex items-center gap-1 text-purple-600 font-bold bg-purple-50/50 px-2 py-0.5 rounded-md">
                                <Bell className="w-3.5 h-3.5" /> System Automation
                              </span>
                            ) : (
                              <span className="flex items-center gap-1 text-blue-600 font-bold bg-blue-50/50 px-2 py-0.5 rounded-md">
                                <Video className="w-3.5 h-3.5" /> Virtual / Live
                              </span>
                            )}
                          </div>

                          {/* Part details schedule sub-boxes */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-50 text-[10px] text-slate-500">
                            <div className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 shrink-0" />
                              <span className="font-semibold">{m.scheduleDetails.part1}</span>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-1 shrink-0" />
                              <span className="font-semibold">{m.scheduleDetails.part2}</span>
                            </div>
                          </div>
                        </div>

                        {/* Quick Interactive Actions Right Panel */}
                        <div className="flex md:flex-col items-center justify-end gap-2 shrink-0 md:pl-4 md:border-l md:border-slate-50">
                          {/* Countdown Pill */}
                          <span className="text-[10px] font-mono font-bold px-2 py-1 bg-slate-50 border border-slate-100 rounded-lg text-slate-500 text-center w-full min-w-[110px]">
                            {timelineCountdowns[m.id] || 'Calculating...'}
                          </span>

                          {milestoneIdConfirmingDelete === m.id ? (
                            <div className="flex items-center gap-1.5 w-full mt-1">
                              <button
                                onClick={() => handleDeleteMilestone(m.id)}
                                className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-rose-600 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-sm active:scale-95 shrink-0 grow cursor-pointer font-extrabold text-[10px]"
                                title="Confirm Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span className="text-[9px] uppercase tracking-wider">Confirm</span>
                              </button>
                              <button
                                onClick={() => setMilestoneIdConfirmingDelete(null)}
                                className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-slate-600 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                                title="Cancel"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <div className="flex gap-2 w-full">
                              {/* Add to Calendar Link Button */}
                              <a 
                                href={m.gcalLink}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-blue-600 bg-slate-50 hover:bg-blue-50 border border-slate-200/50 hover:border-blue-200/60 transition-all shadow-sm active:scale-95 shrink-0"
                                title="Add to Google Calendar"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </a>

                              {/* Copy Invitation Short-cut */}
                              <button
                                onClick={() => handleCopyInvite(m.id, m.inviteDetails)}
                                className={`flex items-center justify-center p-2 rounded-xl border transition-all shadow-sm active:scale-95 shrink-0 grow ${
                                  copiedMilestoneId === m.id 
                                    ? 'bg-emerald-50 text-emerald-600 border-emerald-200' 
                                    : 'text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border-slate-200/50'
                                }`}
                                title="Copy Invitation Details"
                              >
                                {copiedMilestoneId === m.id ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {/* Delete Button */}
                              <button
                                onClick={() => setMilestoneIdConfirmingDelete(m.id)}
                                className="flex items-center justify-center p-2 rounded-xl text-slate-400 hover:text-rose-600 bg-slate-50 hover:bg-rose-50 border border-slate-200/50 hover:border-rose-200/60 transition-all shadow-sm active:scale-95 shrink-0 cursor-pointer"
                                title="Delete Milestone from timeline"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </motion.div>

        {/* CARD 11: Batch Summary Table (Spans 4 cols - Full width) */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55 }}
          className="lg:col-span-4 bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Calendar className="w-4.5 h-4.5 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-950">Batch Summary Intelligence</h3>
            </div>
            <div className="text-[10px] text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
              *Marketing = Excluding <span className="font-bold text-slate-600">Self Created</span> & <span className="font-bold text-slate-600">Referrals</span>
            </div>
          </div>

          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[700px]">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  <th className="pb-3 pr-4">Batch ID</th>
                  <th className="pb-3 px-4">Launch Date</th>
                  <th className="pb-3 px-4 text-center">Marketing Lead Enrollments</th>
                  <th className="pb-3 px-4 text-center">Other Lead Enrollments</th>
                  <th className="pb-3 pl-4 text-right">Total Enrollments</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs text-slate-700 font-semibold">
                {visibleBatchesTableData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-400 italic font-normal">
                      No matching batches found
                    </td>
                  </tr>
                ) : (
                  visibleBatchesTableData.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 pr-4 font-mono font-bold text-slate-900 text-sm">
                        Batch {b.id}
                      </td>
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {b.startDate}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                            {b.marketingCount}
                          </span>
                          <span className="text-[9px] text-emerald-600 font-bold">
                            {b.enrollmentCount > 0 ? Math.round((b.marketingCount / b.enrollmentCount) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                            {b.otherCount}
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold">
                            {b.enrollmentCount > 0 ? Math.round((b.otherCount / b.enrollmentCount) * 100) : 0}%
                          </span>
                        </div>
                      </td>
                      <td className="py-4 pl-4 text-right font-mono text-slate-900">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                          {b.enrollmentCount}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {batchesTableData.length > 5 && (
            <div className="mt-6 flex justify-center border-t border-slate-50 pt-4">
              <button
                onClick={() => setShowAllBatches(!showAllBatches)}
                className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-blue-600 hover:text-blue-700 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 rounded-xl transition-all shadow-sm cursor-pointer"
              >
                {showAllBatches ? (
                  <>
                    Show Less <ChevronUp className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <>
                    Show More ({batchesTableData.length - 5} more) <ChevronDown className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </motion.div>

      </div>
    </div>
  );
}
