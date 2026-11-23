import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc } from 'firebase/firestore';
import { db } from '../firebase';
import { Calendar, ChevronDown, ChevronUp, Activity, Loader2, Users, Download, TrendingUp, Target } from 'lucide-react';
import { motion } from 'motion/react';
import { saveAs } from 'file-saver';
import { normalizeClientPartner, matchesClientPartner } from '../utils/clientPartner';
import { normalizeLeadSource } from '../utils/leadSource';

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
}

interface SummaryIntelligenceViewProps {
  currentUser?: string;
}

const DEFAULT_BATCH_RECORDS = [
  {
    id: '66',
    name: 'Batch 66',
    startDate: '2026-09-17',
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ['2026-09', '2026-10'],
  },
  {
    id: '67',
    name: 'Batch 67',
    startDate: '2026-09-19',
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ['2026-09', '2026-10'],
  },
  {
    id: '68',
    name: 'Batch 68',
    startDate: '2026-11-26',
    conversions: { Google: 0, Youtube: 0, Whatsapp: 0, Meta: 0, Linkedin: 0, Openai: 0, OTT: 0 },
    spendMonths: ['2026-11', '2026-12'],
  },
];

const WEEKEND_BATCH_IDS = new Set(['67']);
const isWeekendBatch = (batchId: string) => WEEKEND_BATCH_IDS.has(String(batchId).trim());
const getBatchCapacityTarget = (batchId: string) => (isWeekendBatch(batchId) ? 18 : 36);
const getOwnerBatchTarget = (batchId: string) => (isWeekendBatch(batchId) ? 6 : 12);
const getBatchPipelineTargets = (batchId: string) =>
  isWeekendBatch(batchId) ? { marketing: 11, self: 7 } : { marketing: 22, self: 14 };

export default function SummaryIntelligenceView({ currentUser = 'admin' }: SummaryIntelligenceViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('all');
  const [selectedSchedule, setSelectedSchedule] = useState<'all' | 'weekday' | 'weekend'>('all');
  const [showAllBatches, setShowAllBatches] = useState(false);
  const [expandedBatchIds, setExpandedBatchIds] = useState<string[]>(['68']);
  const [reportYear, setReportYear] = useState<string>('2026');
  const [expandedOwnerNames, setExpandedOwnerNames] = useState<string[]>([]);
  const [roiBatches, setRoiBatches] = useState<any[]>(DEFAULT_BATCH_RECORDS);

  const isAdmin = currentUser === 'admin' || currentUser === 'marketing@xmonks.com';
  const isGlobalUser = isAdmin || currentUser === 'Sheena' || currentUser === 'Vikram';

  useEffect(() => {
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const data: Participant[] = [];
        snapshot.forEach((docSnap) => {
          const p = docSnap.data() as Participant;
          if (isGlobalUser || matchesClientPartner(p.clientPartner, currentUser)) {
            data.push({ id: docSnap.id, ...p });
          }
        });
        setParticipants(data);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to participants in SummaryIntelligenceView:', error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentUser, isGlobalUser]);

  useEffect(() => {
    const roiRef = doc(db, 'settings', 'roiData');
    const unsubscribeRoi = onSnapshot(
      roiRef,
      (snap) => {
        let dbBatches: any[] = [];
        if (snap.exists()) {
          const data = snap.data();
          dbBatches = data.batches || [];
        }

        const mergedBatches = [...dbBatches];
        DEFAULT_BATCH_RECORDS.forEach((defBatch) => {
          if (!mergedBatches.some((b) => b.id === defBatch.id)) {
            mergedBatches.push(defBatch);
          }
        });

        mergedBatches.sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
        setRoiBatches(mergedBatches);
      },
      (error) => {
        console.error('Error listening to roiData in SummaryIntelligenceView:', error);
      }
    );

    return () => unsubscribeRoi();
  }, []);

  // Available Batches for filtering (all batches found in participants or configured in roiData)
  const availableBatches = useMemo(() => {
    const batches = new Set<string>();
    participants.forEach((p) => {
      if (p.batchNumber) batches.add(p.batchNumber);
    });
    roiBatches.forEach((b) => {
      if (b.id) batches.add(b.id);
    });
    return Array.from(batches).sort((a, b) => (parseInt(a) || 0) - (parseInt(b) || 0));
  }, [participants, roiBatches]);

  // Extract years from configured batches in roiData
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    roiBatches.forEach((b) => {
      if (b.startDate) {
        const year = b.startDate.split('-')[0];
        if (year && year.length === 4) {
          years.add(year);
        }
      }
    });
    if (years.size === 0) {
      years.add('2026');
      years.add('2025');
    }
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [roiBatches]);

  // Filter batch options dynamically based on selected year & quarter
  const filteredAvailableBatches = useMemo(() => {
    return availableBatches.filter((batchId) => {
      const batchConfig = roiBatches.find((b) => b.id === batchId);
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

      if (selectedSchedule === 'weekend' && !isWeekendBatch(batchId)) return false;
      if (selectedSchedule === 'weekday' && isWeekendBatch(batchId)) return false;

      return true;
    });
  }, [availableBatches, roiBatches, selectedYear, selectedQuarter, selectedSchedule]);

  // Reset selectedBatch to 'all' if the selected batch is no longer in the filtered list
  useEffect(() => {
    if (selectedBatch !== 'all' && !filteredAvailableBatches.includes(selectedBatch)) {
      setSelectedBatch('all');
    }
  }, [selectedBatch, filteredAvailableBatches]);

  // Compute batches data for SI table
  const batchesTableData = useMemo(() => {
    const targetBatchIds = selectedBatch !== 'all' ? [selectedBatch] : filteredAvailableBatches;

    return targetBatchIds
      .map((batchId) => {
        const batchConfig = roiBatches.find((b) => b.id === batchId);
        const startDate = batchConfig?.startDate || 'Not Configured';
        const batchName = batchConfig?.name || `Batch ${batchId}`;

        const batchParticipants = participants.filter((p) => p.batchNumber === batchId);
        const enrollmentCount = batchParticipants.length;

        let marketingCount = 0;
        let otherCount = 0;

        let rejnaCount = 0;
        let sauravCount = 0;
        let aakibCount = 0;

        const marketingSourceCounts: Record<string, number> = {};

        batchParticipants.forEach((p) => {
          const source = normalizeLeadSource(p.leadSource);
          if (!source) {
            otherCount++;
          } else {
            const s = source.toLowerCase();
            if (s === 'self created' || s === 'referrals') {
              otherCount++;
            } else {
              marketingCount++;
              marketingSourceCounts[source] = (marketingSourceCounts[source] || 0) + 1;
            }
          }

          const partner = normalizeClientPartner(p.clientPartner);
          if (partner === 'Rejna') {
            rejnaCount++;
          } else if (partner === 'Saurav') {
            sauravCount++;
          } else if (partner === 'Aakib') {
            aakibCount++;
          }
        });

        const marketingSources = Object.entries(marketingSourceCounts)
          .map(([sourceName, count]) => ({
            name: sourceName,
            count,
            pctOfMarketing: marketingCount > 0 ? Math.round((count / marketingCount) * 100) : 0,
            pctOfTotal: enrollmentCount > 0 ? Math.round((count / enrollmentCount) * 100) : 0,
          }))
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

        const weekend = isWeekendBatch(batchId);
        const capacityTarget = getBatchCapacityTarget(batchId);
        const ownerTarget = getOwnerBatchTarget(batchId);
        const pipelineTargets = getBatchPipelineTargets(batchId);

        return {
          id: batchId,
          name: batchName,
          startDate,
          isWeekend: weekend,
          capacityTarget,
          ownerTarget,
          pipelineTargets,
          marketingCount,
          otherCount,
          enrollmentCount,
          rejnaCount,
          sauravCount,
          aakibCount,
          marketingSources,
        };
      })
      .sort((a, b) => {
        const aNum = parseInt(a.id) || 0;
        const bNum = parseInt(b.id) || 0;
        return bNum - aNum;
      });
  }, [selectedBatch, filteredAvailableBatches, roiBatches, participants]);

  // Auto-expand first visible batch when selecting a single batch
  useEffect(() => {
    if (selectedBatch !== 'all') {
      setExpandedBatchIds((prev) => (prev.includes(selectedBatch) ? prev : [...prev, selectedBatch]));
    }
  }, [selectedBatch]);

  const visibleBatchesTableData = useMemo(() => {
    return showAllBatches ? batchesTableData : batchesTableData.slice(0, 5);
  }, [batchesTableData, showAllBatches]);

  // Active year for the Lead Owner-Wise Yearly Report
  const activeReportYear = useMemo(() => {
    if (selectedYear !== 'all') return selectedYear;
    if (selectedBatch !== 'all') {
      const cfg = roiBatches.find((b) => b.id === selectedBatch);
      const yr = cfg?.startDate?.split('-')[0];
      if (yr && yr.length === 4) return yr;
    }
    if (availableYears.includes(reportYear)) return reportYear;
    return availableYears[0] || '2026';
  }, [selectedYear, selectedBatch, roiBatches, availableYears, reportYear]);

  // Chronological batches for the active report year (respecting quarter & batch filters if applied)
  const yearlyReportBatches = useMemo(() => {
    return roiBatches
      .filter((b) => {
        if (!b.startDate) return false;
        const [yr, monthStr] = b.startDate.split('-');
        if (yr !== activeReportYear) return false;

        if (selectedQuarter !== 'all') {
          const month = parseInt(monthStr);
          if (isNaN(month)) return false;
          let q = '';
          if (month >= 1 && month <= 3) q = 'q1';
          else if (month >= 4 && month <= 6) q = 'q2';
          else if (month >= 7 && month <= 9) q = 'q3';
          else if (month >= 10 && month <= 12) q = 'q4';
          if (q !== selectedQuarter) return false;
        }

        if (selectedSchedule === 'weekend' && !isWeekendBatch(b.id)) return false;
        if (selectedSchedule === 'weekday' && isWeekendBatch(b.id)) return false;

        if (selectedBatch !== 'all' && b.id !== selectedBatch) return false;

        return true;
      })
      .sort((a, b) => (parseInt(a.id) || 0) - (parseInt(b.id) || 0));
  }, [roiBatches, activeReportYear, selectedQuarter, selectedSchedule, selectedBatch]);

  // Lead Owner-wise yearly report data
  const leadOwnerYearlyReport = useMemo(() => {
    const CORE_OWNERS = ['Rejna', 'Saurav', 'Aakib'] as const;
    const batchIdSet = new Set(yearlyReportBatches.map((b) => b.id));
    const batchCount = yearlyReportBatches.length;
    const perOwnerAnnualTarget = yearlyReportBatches.reduce((sum, b) => sum + getOwnerBatchTarget(b.id), 0);

    interface OwnerAccumulator {
      owner: string;
      isCore: boolean;
      total: number;
      marketingCount: number;
      nonMarketingCount: number;
      batchCounts: Record<string, number>;
      sourceBreakdown: Record<string, { count: number; isMarketing: boolean }>;
    }

    const ownerMap = new Map<string, OwnerAccumulator>();

    const ensureOwner = (owner: string, isCore: boolean): OwnerAccumulator => {
      let existing = ownerMap.get(owner);
      if (!existing) {
        const batchCounts: Record<string, number> = {};
        yearlyReportBatches.forEach((b) => {
          batchCounts[b.id] = 0;
        });
        existing = {
          owner,
          isCore,
          total: 0,
          marketingCount: 0,
          nonMarketingCount: 0,
          batchCounts,
          sourceBreakdown: {},
        };
        ownerMap.set(owner, existing);
      }
      return existing;
    };

    CORE_OWNERS.forEach((coreOwner) => {
      if (isGlobalUser || matchesClientPartner(coreOwner, currentUser)) {
        ensureOwner(coreOwner, true);
      }
    });

    const columnBatchTotals: Record<string, number> = {};
    yearlyReportBatches.forEach((b) => {
      columnBatchTotals[b.id] = 0;
    });

    let yearlyTotal = 0;
    let totalMarketing = 0;
    let totalNonMarketing = 0;

    participants.forEach((p) => {
      if (!batchIdSet.has(p.batchNumber)) return;

      const owner = normalizeClientPartner(p.clientPartner);
      const isCore = (CORE_OWNERS as readonly string[]).includes(owner);
      const entry = ensureOwner(owner, isCore);

      const normalizedSource = normalizeLeadSource(p.leadSource);
      const sourceLabel = normalizedSource || 'Unspecified';
      const isMarketing =
        Boolean(normalizedSource) &&
        normalizedSource.toLowerCase() !== 'self created' &&
        normalizedSource.toLowerCase() !== 'referrals';

      entry.total += 1;
      entry.batchCounts[p.batchNumber] = (entry.batchCounts[p.batchNumber] || 0) + 1;

      if (isMarketing) {
        entry.marketingCount += 1;
        totalMarketing += 1;
      } else {
        entry.nonMarketingCount += 1;
        totalNonMarketing += 1;
      }

      if (!entry.sourceBreakdown[sourceLabel]) {
        entry.sourceBreakdown[sourceLabel] = { count: 0, isMarketing };
      }
      entry.sourceBreakdown[sourceLabel].count += 1;

      columnBatchTotals[p.batchNumber] = (columnBatchTotals[p.batchNumber] || 0) + 1;
      yearlyTotal += 1;
    });

    const rows = Array.from(ownerMap.values())
      .map((entry) => {
        const target = entry.isCore ? perOwnerAnnualTarget : null;
        const targetPct = target && target > 0 ? Math.round((entry.total / target) * 100) : null;
        const sharePct = yearlyTotal > 0 ? (entry.total / yearlyTotal) * 100 : 0;
        const avgPerBatch = batchCount > 0 ? entry.total / batchCount : 0;
        const sources = Object.entries(entry.sourceBreakdown)
          .map(([name, info]) => ({ name, count: info.count, isMarketing: info.isMarketing }))
          .sort((a, b) => b.count - a.count);

        return {
          ...entry,
          target,
          targetPct,
          sharePct,
          avgPerBatch,
          sources,
        };
      })
      .sort((a, b) => {
        const aCoreIdx = (CORE_OWNERS as readonly string[]).indexOf(a.owner);
        const bCoreIdx = (CORE_OWNERS as readonly string[]).indexOf(b.owner);
        if (aCoreIdx !== -1 && bCoreIdx !== -1) return aCoreIdx - bCoreIdx;
        if (aCoreIdx !== -1) return -1;
        if (bCoreIdx !== -1) return 1;
        if (a.owner === 'Unassigned') return 1;
        if (b.owner === 'Unassigned') return -1;
        if (b.total !== a.total) return b.total - a.total;
        return a.owner.localeCompare(b.owner);
      });

    const coreRows = rows.filter((r) => r.isCore);
    const totalCoreTarget = yearlyReportBatches.reduce((sum, b) => sum + getBatchCapacityTarget(b.id), 0);

    return {
      rows,
      coreRows,
      columnBatchTotals,
      yearlyTotal,
      totalMarketing,
      totalNonMarketing,
      totalCoreTarget,
      batchCount,
    };
  }, [yearlyReportBatches, participants, isGlobalUser, currentUser]);

  const handleExportLeadOwnerCsv = () => {
    const escapeCsv = (val: string | number) => {
      const str = String(val ?? '');
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const headers = [
      'Lead Owner',
      'Team',
      'Marketing Leads',
      'Non-Marketing Leads',
      ...yearlyReportBatches.map((b) => `Batch ${b.id} (${isWeekendBatch(b.id) ? 'Weekend' : 'Weekday'})`),
      `Total (${activeReportYear})`,
      'Annual Target',
      'Target Attainment %',
      'Yearly Share %',
      'Avg / Batch',
    ];

    const lines = [headers.map(escapeCsv).join(',')];

    leadOwnerYearlyReport.rows.forEach((row) => {
      lines.push(
        [
          row.owner,
          row.isCore ? 'Core Team' : 'Support / Other',
          row.marketingCount,
          row.nonMarketingCount,
          ...yearlyReportBatches.map((b) => row.batchCounts[b.id] || 0),
          row.total,
          row.target ?? '-',
          row.targetPct !== null ? `${row.targetPct}%` : '-',
          `${row.sharePct.toFixed(1)}%`,
          row.avgPerBatch.toFixed(1),
        ]
          .map(escapeCsv)
          .join(',')
      );
    });

    lines.push(
      [
        'Total',
        'All Owners',
        leadOwnerYearlyReport.totalMarketing,
        leadOwnerYearlyReport.totalNonMarketing,
        ...yearlyReportBatches.map((b) => leadOwnerYearlyReport.columnBatchTotals[b.id] || 0),
        leadOwnerYearlyReport.yearlyTotal,
        leadOwnerYearlyReport.totalCoreTarget,
        leadOwnerYearlyReport.totalCoreTarget > 0
          ? `${Math.round((leadOwnerYearlyReport.yearlyTotal / leadOwnerYearlyReport.totalCoreTarget) * 100)}%`
          : '-',
        leadOwnerYearlyReport.yearlyTotal > 0 ? '100.0%' : '0.0%',
        leadOwnerYearlyReport.batchCount > 0
          ? (leadOwnerYearlyReport.yearlyTotal / leadOwnerYearlyReport.batchCount).toFixed(1)
          : '0.0',
      ]
        .map(escapeCsv)
        .join(',')
    );

    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `SI_Lead_Owner_Yearly_Report_${activeReportYear}.csv`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-200px)]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium italic">Loading Summary Intelligence...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12">
      {/* Bento Header: Glassmorphism Floating Header with Year, Quarter & Batch Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-6 rounded-3xl border border-slate-100 shadow-sm sticky top-2 z-40">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse" />
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Summary Intelligence (SI)</h2>
          </div>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Upcoming program capacity, counselor targets & cohort summary intelligence
          </p>
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
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
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

          {/* Schedule Type Select (Weekday vs Weekend) */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Schedule</span>
            <select
              value={selectedSchedule}
              onChange={(e) => setSelectedSchedule(e.target.value as 'all' | 'weekday' | 'weekend')}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
            >
              <option value="all">All Schedules</option>
              <option value="weekday">Weekday (Target 36)</option>
              <option value="weekend">Weekend (Target 18)</option>
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
              {filteredAvailableBatches.map((batch) => (
                <option key={batch} value={batch}>
                  Batch {batch} {isWeekendBatch(batch) ? '(Weekend)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Copied Card: Batch Summary Intelligence */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between group hover:shadow-md transition-all duration-300"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-2">
            <Calendar className="w-4.5 h-4.5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-950">Batch Summary Intelligence</h3>
          </div>
          <div className="text-[10px] text-slate-400 font-semibold bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
            *Marketing = Excluding <span className="font-bold text-slate-600">Self Created</span> &{' '}
            <span className="font-bold text-slate-600">Referrals</span>
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
                <th className="pb-3 px-4 text-center">Total Enrollments</th>
                <th className="pb-3 pl-4 text-right">Health Diagnostics</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
              {visibleBatchesTableData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 italic font-normal">
                    No matching batches found
                  </td>
                </tr>
              ) : (
                visibleBatchesTableData.map((b) => {
                  const isExpanded = expandedBatchIds.includes(b.id);
                  const toggleRow = () => {
                    setExpandedBatchIds((prev) =>
                      prev.includes(b.id) ? prev.filter((id) => id !== b.id) : [...prev, b.id]
                    );
                  };

                  const todayStr = new Date().toISOString().split('T')[0];
                  const hasNotBegun = b.startDate && b.startDate !== 'Not Configured' && b.startDate > todayStr;
                  const capTarget = b.capacityTarget;
                  const healthyThreshold = Math.round(capTarget * 0.75);
                  const moderateThreshold = Math.round(capTarget * 0.5);

                  let healthBadgeBg = 'bg-rose-50 text-rose-700 border-rose-100';
                  let healthText = 'Underperforming (<50%)';
                  if (hasNotBegun) {
                    healthBadgeBg = 'bg-slate-50 text-slate-500 border-slate-200';
                    healthText = 'Upcoming (Not Begun)';
                  } else if (b.enrollmentCount >= capTarget) {
                    healthBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                    healthText = 'Target Reached (100%+)';
                  } else if (b.enrollmentCount >= healthyThreshold) {
                    healthBadgeBg = 'bg-teal-50 text-teal-700 border-teal-100';
                    healthText = 'Healthy (75%+)';
                  } else if (b.enrollmentCount >= moderateThreshold) {
                    healthBadgeBg = 'bg-amber-50 text-amber-700 border-amber-100';
                    healthText = 'Moderate (50%+)';
                  }

                  return (
                    <React.Fragment key={b.id}>
                      <tr
                        onClick={toggleRow}
                        className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                      >
                        <td className="py-4 pr-4 font-mono font-bold text-slate-900 text-sm flex items-center gap-2">
                          <span className="p-1 rounded-md bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </span>
                          <span>Batch {b.id}</span>
                          <span
                            className={`text-[9px] font-sans font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded-md border ${
                              b.isWeekend
                                ? 'bg-violet-50 text-violet-700 border-violet-200'
                                : 'bg-slate-50 text-slate-500 border-slate-200'
                            }`}
                          >
                            {b.isWeekend ? 'Weekend' : 'Weekday'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-medium">{b.startDate}</td>
                        <td className="py-4 px-4 text-center font-mono">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-lg border border-emerald-100">
                              {b.marketingCount}
                            </span>
                            <span className="text-[9px] text-emerald-600 font-bold">
                              {b.enrollmentCount > 0 ? Math.round((b.marketingCount / b.enrollmentCount) * 100) : 0}% of total
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono">
                          <div className="flex flex-col items-center gap-0.5">
                            <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-lg border border-slate-200">
                              {b.otherCount}
                            </span>
                            <span className="text-[9px] text-slate-500 font-bold">
                              {b.enrollmentCount > 0 ? Math.round((b.otherCount / b.enrollmentCount) * 100) : 0}% of total
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center font-mono text-slate-900">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-50 text-blue-700 text-[10px] font-bold rounded-lg border border-blue-100">
                            {b.enrollmentCount}
                          </span>
                        </td>
                        <td className="py-4 pl-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold border ${healthBadgeBg}`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  hasNotBegun
                                    ? 'bg-slate-400'
                                    : b.enrollmentCount >= capTarget
                                    ? 'bg-emerald-500'
                                    : b.enrollmentCount >= healthyThreshold
                                    ? 'bg-teal-500'
                                    : b.enrollmentCount >= moderateThreshold
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                              />
                              {healthText}
                            </span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleRow();
                              }}
                              className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-all active:scale-95"
                              title="View detailed diagnostics"
                            >
                              <Activity className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={6} className="p-4 sm:p-6 border-l-2 border-blue-500">
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white border border-slate-100 rounded-2xl p-6 space-y-6 shadow-sm"
                            >
                              {/* Diagnostic Header */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
                                <div>
                                  <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                                    <Activity className="w-4.5 h-4.5 text-blue-600 animate-pulse" />
                                    <span>Diagnostic Health Report: Batch {b.id}</span>
                                    <span
                                      className={`text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                                        b.isWeekend
                                          ? 'bg-violet-50 text-violet-700 border-violet-200'
                                          : 'bg-slate-100 text-slate-600 border-slate-200'
                                      }`}
                                    >
                                      {b.isWeekend ? 'Weekend (18 Target)' : 'Weekday (36 Target)'}
                                    </span>
                                  </h4>
                                  <p className="text-[10px] text-slate-500 font-medium mt-0.5">
                                    Full cohort capability scorecards, lead flow pipelines & counselor contributions.
                                  </p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-400">ROI Status:</span>
                                  {hasNotBegun ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-slate-100 text-slate-600 border border-slate-200">
                                      Upcoming Cohort
                                    </span>
                                  ) : b.enrollmentCount >= capTarget ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                                      Target Achieved
                                    </span>
                                  ) : b.enrollmentCount >= moderateThreshold ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                                      Growing Margin
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-extrabold bg-rose-100 text-rose-800 border border-rose-200 animate-pulse">
                                      Underperforming Spend
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Bento Diagnostic Grid */}
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 text-xs">
                                {/* Metric Block 1: Seat Capacity */}
                                <div className="lg:col-span-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner flex flex-col justify-between">
                                  <div>
                                    <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      <span>Capacity (Seats filled)</span>
                                      <span className="text-slate-900">Target: {capTarget}</span>
                                    </div>
                                    <div className="flex items-baseline gap-1 mt-2">
                                      <span className="text-3xl font-black text-slate-900">{b.enrollmentCount}</span>
                                      <span className="text-slate-400 font-bold">/ {capTarget} enrolled</span>
                                    </div>
                                  </div>

                                  <div className="mt-4">
                                    <div className="w-full bg-slate-200/70 h-2 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all duration-500 ${
                                          hasNotBegun
                                            ? 'bg-slate-300'
                                            : b.enrollmentCount >= capTarget
                                            ? 'bg-emerald-500'
                                            : b.enrollmentCount >= healthyThreshold
                                            ? 'bg-teal-500'
                                            : b.enrollmentCount >= moderateThreshold
                                            ? 'bg-amber-500'
                                            : 'bg-rose-500'
                                        }`}
                                        style={{ width: `${Math.min(100, Math.round((b.enrollmentCount / capTarget) * 100))}%` }}
                                      />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 mt-1.5">
                                      <span>{Math.round((b.enrollmentCount / capTarget) * 100)}% capacity</span>
                                      <span>
                                        {capTarget - b.enrollmentCount > 0 ? `${capTarget - b.enrollmentCount} seats left` : 'Fully Booked'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Metric Block 2: Counselor Targets */}
                                <div className="lg:col-span-8 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner flex flex-col justify-between">
                                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-2 mb-3">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      Counselor Conversion Targets
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold italic">
                                      Target: {b.ownerTarget} per lead owner
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    {/* Counselor Rejna */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm flex flex-col justify-between">
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Rejna</p>
                                        <p className="text-lg font-black text-slate-900 mt-1">
                                          {b.rejnaCount} / {b.ownerTarget}
                                        </p>
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              b.rejnaCount >= b.ownerTarget
                                                ? 'bg-emerald-500'
                                                : b.rejnaCount >= Math.ceil(b.ownerTarget * 0.66)
                                                ? 'bg-blue-500'
                                                : 'bg-amber-500'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.round((b.rejnaCount / b.ownerTarget) * 100))}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold">
                                          {Math.round((b.rejnaCount / b.ownerTarget) * 100)}% of Target
                                        </span>
                                      </div>
                                    </div>

                                    {/* Counselor Saurav */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm flex flex-col justify-between">
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Saurav</p>
                                        <p className="text-lg font-black text-slate-900 mt-1">
                                          {b.sauravCount} / {b.ownerTarget}
                                        </p>
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              b.sauravCount >= b.ownerTarget
                                                ? 'bg-emerald-500'
                                                : b.sauravCount >= Math.ceil(b.ownerTarget * 0.66)
                                                ? 'bg-blue-500'
                                                : b.sauravCount >= Math.ceil(b.ownerTarget * 0.33)
                                                ? 'bg-amber-500'
                                                : 'bg-slate-400'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.round((b.sauravCount / b.ownerTarget) * 100))}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold">
                                          {Math.round((b.sauravCount / b.ownerTarget) * 100)}% of Target
                                        </span>
                                      </div>
                                    </div>

                                    {/* Counselor Aakib */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100/80 shadow-sm flex flex-col justify-between">
                                      <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">Aakib</p>
                                        <p className="text-lg font-black text-slate-900 mt-1">
                                          {b.aakibCount} / {b.ownerTarget}
                                        </p>
                                      </div>
                                      <div className="mt-2 space-y-1">
                                        <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                          <div
                                            className={`h-full rounded-full ${
                                              b.aakibCount >= b.ownerTarget
                                                ? 'bg-emerald-500'
                                                : b.aakibCount >= Math.ceil(b.ownerTarget * 0.66)
                                                ? 'bg-blue-500'
                                                : b.aakibCount >= Math.ceil(b.ownerTarget * 0.33)
                                                ? 'bg-amber-500'
                                                : 'bg-slate-400'
                                            }`}
                                            style={{ width: `${Math.min(100, Math.round((b.aakibCount / b.ownerTarget) * 100))}%` }}
                                          />
                                        </div>
                                        <span className="text-[9px] text-slate-400 font-bold">
                                          {Math.round((b.aakibCount / b.ownerTarget) * 100)}% of Target
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Metric Block 3: Marketing vs Non-Marketing Pipelines */}
                                <div className="lg:col-span-12 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner flex flex-col justify-between">
                                  <div className="flex justify-between items-center border-b border-slate-200/50 pb-2 mb-3">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      Source Type Pipeline Distribution
                                    </span>
                                    <span className="text-[9px] text-slate-400 font-bold">
                                      Marketing Target: {b.pipelineTargets.marketing} | Self / Non-Marketing Target:{' '}
                                      {b.pipelineTargets.self}
                                    </span>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* Marketing Pipeline */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
                                        <span>Marketing Leads</span>
                                        <span className="font-extrabold text-slate-900">
                                          {b.marketingCount} / {b.pipelineTargets.marketing}
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            b.marketingCount >= b.pipelineTargets.marketing
                                              ? 'bg-emerald-500'
                                              : b.marketingCount >= Math.round(b.pipelineTargets.marketing * 0.72)
                                              ? 'bg-blue-500'
                                              : 'bg-amber-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.round((b.marketingCount / b.pipelineTargets.marketing) * 100)
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      <p className="text-[9px] text-slate-400 font-extrabold text-right mt-1.5">
                                        {Math.round((b.marketingCount / b.pipelineTargets.marketing) * 100)}% of target
                                      </p>
                                    </div>

                                    {/* Non-Marketing Pipeline */}
                                    <div className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm">
                                      <div className="flex justify-between items-center mb-1 text-[10px] font-bold text-slate-500">
                                        <span>Self / Non-Marketing</span>
                                        <span className="font-extrabold text-slate-900">
                                          {b.otherCount} / {b.pipelineTargets.self}
                                        </span>
                                      </div>
                                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                        <div
                                          className={`h-full rounded-full ${
                                            b.otherCount >= b.pipelineTargets.self
                                              ? 'bg-emerald-500'
                                              : b.otherCount >= Math.round(b.pipelineTargets.self * 0.72)
                                              ? 'bg-blue-500'
                                              : 'bg-amber-500'
                                          }`}
                                          style={{
                                            width: `${Math.min(
                                              100,
                                              Math.round((b.otherCount / b.pipelineTargets.self) * 100)
                                            )}%`,
                                          }}
                                        />
                                      </div>
                                      <p className="text-[9px] text-slate-400 font-extrabold text-right mt-1.5">
                                        {Math.round((b.otherCount / b.pipelineTargets.self) * 100)}% of target
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Metric Block 5: Marketing Lead Source Breakdown */}
                                <div className="lg:col-span-12 bg-slate-50/50 p-4 rounded-xl border border-slate-100 shadow-inner flex flex-col gap-3">
                                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/50 pb-2">
                                    <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
                                      Marketing Lead Source Breakdown
                                    </span>
                                    <span className="text-[10px] font-bold text-slate-500">
                                      {b.marketingCount} marketing enrollments across{' '}
                                      <span className="text-slate-900 font-extrabold">
                                        {b.marketingSources.length}{' '}
                                        {b.marketingSources.length === 1 ? 'source' : 'sources'}
                                      </span>
                                    </span>
                                  </div>

                                  {b.marketingSources.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-2">
                                      No marketing lead source enrollments recorded for this batch.
                                    </p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                                      {b.marketingSources.map((src) => (
                                        <div
                                          key={src.name}
                                          className="bg-white p-3 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between gap-2"
                                        >
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1.5 truncate">
                                              <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
                                              <span className="truncate" title={src.name}>
                                                {src.name}
                                              </span>
                                            </span>
                                            <span className="font-mono text-sm font-black text-slate-900 shrink-0">
                                              {src.count}
                                            </span>
                                          </div>
                                          <div className="space-y-1">
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                                                style={{ width: `${src.pctOfMarketing}%` }}
                                              />
                                            </div>
                                            <div className="flex items-center justify-between text-[9px] font-bold text-slate-400">
                                              <span>{src.pctOfMarketing}% of marketing</span>
                                              <span>{src.pctOfTotal}% of batch</span>
                                            </div>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
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

      {/* Section 2: Lead Owner-Wise Yearly Report */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm flex flex-col gap-6 hover:shadow-md transition-all duration-300"
      >
        {/* Header & Year Scope Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-5">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-black text-slate-950 tracking-tight">
                  Lead Owner-Wise Yearly Report ({activeReportYear})
                </h3>
                <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                  Annual counselor enrollment breakdown, target progress & batch-by-batch performance across{' '}
                  <span className="font-bold text-slate-700">
                    {leadOwnerYearlyReport.batchCount}{' '}
                    {leadOwnerYearlyReport.batchCount === 1 ? 'cohort' : 'cohorts'}
                  </span>
                  {selectedQuarter !== 'all' ? ` · ${selectedQuarter.toUpperCase()}` : ''}
                  {selectedSchedule !== 'all'
                    ? ` · ${selectedSchedule === 'weekend' ? 'Weekend' : 'Weekday'}`
                    : ''}
                  {selectedBatch !== 'all' ? ` · Batch ${selectedBatch}` : ''}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Report Year Selector */}
            <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 px-3 py-1.5 rounded-2xl">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Report Year</span>
              <select
                value={activeReportYear}
                onChange={(e) => {
                  const nextYear = e.target.value;
                  setReportYear(nextYear);
                  if (selectedYear !== 'all') {
                    setSelectedYear(nextYear);
                  }
                }}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer pr-1"
              >
                {availableYears.map((yr) => (
                  <option key={yr} value={yr}>
                    {yr}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExportLeadOwnerCsv}
              disabled={leadOwnerYearlyReport.batchCount === 0}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-xs font-bold rounded-2xl transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              Export CSV
            </button>
          </div>
        </div>

        {/* Core Team & Yearly Overview KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Yearly Overview Card */}
          <div className="bg-slate-50/70 p-4 rounded-2xl border border-slate-100 flex flex-col justify-between">
            <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              <span>{activeReportYear} Total Enrolled</span>
              <span className="inline-flex items-center gap-1 text-blue-600">
                <Target className="w-3 h-3" />
                Target: {leadOwnerYearlyReport.totalCoreTarget}
              </span>
            </div>
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-3xl font-black text-slate-900">{leadOwnerYearlyReport.yearlyTotal}</span>
              <span className="text-xs font-bold text-slate-400">
                / {leadOwnerYearlyReport.totalCoreTarget} seats
              </span>
            </div>
            <div className="mt-3 space-y-1.5">
              <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    leadOwnerYearlyReport.totalCoreTarget > 0 &&
                    leadOwnerYearlyReport.yearlyTotal >= leadOwnerYearlyReport.totalCoreTarget
                      ? 'bg-emerald-500'
                      : leadOwnerYearlyReport.totalCoreTarget > 0 &&
                        leadOwnerYearlyReport.yearlyTotal >= leadOwnerYearlyReport.totalCoreTarget * 0.75
                      ? 'bg-blue-600'
                      : 'bg-amber-500'
                  }`}
                  style={{
                    width: `${
                      leadOwnerYearlyReport.totalCoreTarget > 0
                        ? Math.min(
                            100,
                            Math.round((leadOwnerYearlyReport.yearlyTotal / leadOwnerYearlyReport.totalCoreTarget) * 100)
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                <span className="text-emerald-600">Mktg: {leadOwnerYearlyReport.totalMarketing}</span>
                <span>Non-Mktg: {leadOwnerYearlyReport.totalNonMarketing}</span>
              </div>
            </div>
          </div>

          {/* Core Lead Owner Cards (Rejna, Saurav, Aakib) */}
          {leadOwnerYearlyReport.coreRows.map((ownerRow) => {
            const pct = ownerRow.targetPct ?? 0;
            return (
              <div
                key={ownerRow.owner}
                onClick={() =>
                  setExpandedOwnerNames((prev) =>
                    prev.includes(ownerRow.owner)
                      ? prev.filter((name) => name !== ownerRow.owner)
                      : [...prev, ownerRow.owner]
                  )
                }
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-800 uppercase tracking-wider">
                    {ownerRow.owner}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                    {ownerRow.sharePct.toFixed(1)}% share
                  </span>
                </div>

                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-black text-slate-900">{ownerRow.total}</span>
                  <span className="text-xs font-bold text-slate-400">/ {ownerRow.target ?? 0} target</span>
                </div>

                <div className="mt-3 space-y-1.5">
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        pct >= 100
                          ? 'bg-emerald-500'
                          : pct >= 75
                          ? 'bg-blue-500'
                          : pct >= 50
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                    <span>{pct}% of annual target</span>
                    <span>Avg {ownerRow.avgPerBatch.toFixed(1)}/batch</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Lead Owner × Batch Matrix Table */}
        <div className="overflow-x-auto custom-scrollbar">
          <table className="w-full text-left border-collapse min-w-[820px]">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                <th className="pb-3 pr-4">Lead Owner</th>
                <th className="pb-3 px-3 text-center">Marketing</th>
                <th className="pb-3 px-3 text-center">Non-Mktg</th>
                {yearlyReportBatches.map((batch) => {
                  const monthNum = parseInt(batch.startDate?.split('-')[1] || '0');
                  const monthLabel =
                    monthNum >= 1 && monthNum <= 12
                      ? ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
                          monthNum - 1
                        ]
                      : '';
                  const weekend = isWeekendBatch(batch.id);
                  return (
                    <th key={batch.id} className="pb-3 px-2.5 text-center">
                      <div className="text-slate-700 font-extrabold flex items-center justify-center gap-1">
                        <span>B{batch.id}</span>
                        {weekend && (
                          <span className="text-[8px] font-extrabold uppercase px-1 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-200">
                            Wknd
                          </span>
                        )}
                      </div>
                      {monthLabel && <div className="text-[9px] text-slate-400 font-semibold">{monthLabel}</div>}
                    </th>
                  );
                })}
                <th className="pb-3 px-3 text-center">Year Total</th>
                <th className="pb-3 px-3 text-center">Target Progress</th>
                <th className="pb-3 pl-3 text-right">Share / Avg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-slate-700 font-semibold">
              {yearlyReportBatches.length === 0 ? (
                <tr>
                  <td
                    colSpan={6 + yearlyReportBatches.length}
                    className="py-10 text-center text-slate-400 italic font-normal"
                  >
                    No cohorts found for {activeReportYear} with the current filters
                  </td>
                </tr>
              ) : (
                leadOwnerYearlyReport.rows.map((row) => {
                  const isExpanded = expandedOwnerNames.includes(row.owner);
                  const toggleOwner = () => {
                    setExpandedOwnerNames((prev) =>
                      prev.includes(row.owner) ? prev.filter((n) => n !== row.owner) : [...prev, row.owner]
                    );
                  };

                  return (
                    <React.Fragment key={row.owner}>
                      <tr
                        onClick={toggleOwner}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 pr-4">
                          <div className="flex items-center gap-2.5">
                            <span className="p-1 rounded-md bg-slate-50 group-hover:bg-blue-50 text-slate-400 group-hover:text-blue-600 transition-colors">
                              {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                            </span>
                            <span className="w-7 h-7 rounded-full bg-slate-100 text-slate-700 font-extrabold text-[11px] flex items-center justify-center">
                              {row.owner.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{row.owner}</span>
                                {row.isCore && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">
                                    Core
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[11px] font-bold rounded-lg border border-emerald-100">
                            {row.marketingCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span className="inline-flex items-center justify-center px-2 py-0.5 bg-slate-100 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-200">
                            {row.nonMarketingCount}
                          </span>
                        </td>

                        {yearlyReportBatches.map((batch) => {
                          const count = row.batchCounts[batch.id] || 0;
                          const batchTarget = row.isCore ? getOwnerBatchTarget(batch.id) : null;
                          const batchPct = batchTarget ? Math.round((count / batchTarget) * 100) : null;

                          if (!row.isCore || batchTarget === null) {
                            return (
                              <td key={batch.id} className="py-3.5 px-2.5 text-center font-mono">
                                {count === 0 ? (
                                  <span className="text-slate-300 font-normal">0</span>
                                ) : (
                                  <span className="text-slate-800 font-bold">{count}</span>
                                )}
                              </td>
                            );
                          }

                          return (
                            <td key={batch.id} className="py-3.5 px-2 text-center font-mono">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span
                                  className={`inline-flex items-baseline justify-center px-2 py-0.5 rounded-md border text-[11px] font-bold ${
                                    count >= batchTarget
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : count >= Math.ceil(batchTarget * 0.66)
                                      ? 'bg-blue-50/70 text-blue-700 border-blue-100'
                                      : count > 0
                                      ? 'bg-amber-50/70 text-amber-700 border-amber-100'
                                      : 'bg-slate-50 text-slate-400 border-slate-100'
                                  }`}
                                >
                                  <span>{count}</span>
                                  <span className="text-[9px] font-semibold opacity-70 ml-0.5">/{batchTarget}</span>
                                </span>
                                <span
                                  className={`text-[9px] font-bold ${
                                    (batchPct ?? 0) >= 100
                                      ? 'text-emerald-600'
                                      : (batchPct ?? 0) >= 67
                                      ? 'text-blue-600'
                                      : count > 0
                                      ? 'text-amber-600'
                                      : 'text-slate-300'
                                  }`}
                                >
                                  {batchPct}%
                                </span>
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-3.5 px-3 text-center font-mono">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-black rounded-lg border border-blue-100">
                            {row.total}
                          </span>
                        </td>

                        <td className="py-3.5 px-3 text-center">
                          {row.target !== null && row.targetPct !== null ? (
                            <div className="flex flex-col items-center gap-1 min-w-[90px]">
                              <span className="text-[11px] font-bold text-slate-800 font-mono">
                                {row.total} / {row.target}{' '}
                                <span
                                  className={
                                    row.targetPct >= 100
                                      ? 'text-emerald-600'
                                      : row.targetPct >= 75
                                      ? 'text-blue-600'
                                      : 'text-amber-600'
                                  }
                                >
                                  ({row.targetPct}%)
                                </span>
                              </span>
                              <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    row.targetPct >= 100
                                      ? 'bg-emerald-500'
                                      : row.targetPct >= 75
                                      ? 'bg-blue-500'
                                      : 'bg-amber-500'
                                  }`}
                                  style={{ width: `${Math.min(100, row.targetPct)}%` }}
                                />
                              </div>
                            </div>
                          ) : (
                            <span className="text-[10px] font-semibold text-slate-400">Support / Other</span>
                          )}
                        </td>

                        <td className="py-3.5 pl-3 text-right font-mono">
                          <div className="flex flex-col items-end">
                            <span className="font-bold text-slate-900">{row.sharePct.toFixed(1)}%</span>
                            <span className="text-[10px] text-slate-400 font-semibold">
                              {row.avgPerBatch.toFixed(1)} / batch
                            </span>
                          </div>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-slate-50/40">
                          <td
                            colSpan={6 + yearlyReportBatches.length}
                            className="p-4 sm:p-5 border-l-2 border-blue-500"
                          >
                            <motion.div
                              initial={{ opacity: 0, y: -4 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="bg-white border border-slate-100 rounded-2xl p-5 grid grid-cols-1 lg:grid-cols-12 gap-5 shadow-sm"
                            >
                              {/* Batch Trajectory with Target Comparison */}
                              <div className="lg:col-span-7 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                                    <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                                    {row.owner} — {activeReportYear} Batch-Wise Target Comparison
                                  </h4>
                                  {row.isCore && (
                                    <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                                      {selectedSchedule === 'weekend'
                                        ? 'Weekend Target: 6 / batch'
                                        : selectedSchedule === 'weekday'
                                        ? 'Weekday Target: 12 / batch'
                                        : 'Target: 12 (Wkdy) / 6 (Wknd)'}
                                    </span>
                                  )}
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
                                  {yearlyReportBatches.map((batch) => {
                                    const done = row.batchCounts[batch.id] || 0;
                                    const weekend = isWeekendBatch(batch.id);
                                    const target = row.isCore ? getOwnerBatchTarget(batch.id) : null;
                                    const pct = target ? Math.round((done / target) * 100) : null;
                                    const diff = target !== null ? done - target : null;
                                    const fillPct = target
                                      ? Math.min(100, pct ?? 0)
                                      : row.total > 0
                                      ? Math.min(100, Math.round((done / row.total) * 100))
                                      : 0;

                                    return (
                                      <div
                                        key={batch.id}
                                        className={`border rounded-xl p-3 flex flex-col justify-between transition-colors ${
                                          row.isCore && target !== null && done >= target
                                            ? 'bg-emerald-50/40 border-emerald-200/80'
                                            : weekend
                                            ? 'bg-violet-50/30 border-violet-200/70'
                                            : 'bg-slate-50/80 border-slate-100'
                                        }`}
                                      >
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[11px] font-extrabold text-slate-700 flex items-center gap-1">
                                            <span>Batch {batch.id}</span>
                                            {weekend && (
                                              <span className="text-[8px] uppercase font-extrabold px-1 py-0.5 rounded bg-violet-100 text-violet-700">
                                                Wknd
                                              </span>
                                            )}
                                          </span>
                                          {pct !== null ? (
                                            <span
                                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                                pct >= 100
                                                  ? 'bg-emerald-100 text-emerald-700'
                                                  : pct >= 67
                                                  ? 'bg-blue-100 text-blue-700'
                                                  : done > 0
                                                  ? 'bg-amber-100 text-amber-700'
                                                  : 'bg-slate-200/70 text-slate-500'
                                              }`}
                                            >
                                              {pct}%
                                            </span>
                                          ) : null}
                                        </div>

                                        {target !== null ? (
                                          <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-slate-500 font-semibold">
                                                Done:{' '}
                                                <span className="font-mono font-black text-slate-900">{done}</span>
                                              </span>
                                              <span className="text-slate-500 font-semibold">
                                                Target:{' '}
                                                <span className="font-mono font-bold text-slate-700">{target}</span>
                                              </span>
                                            </div>
                                            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className={`h-full rounded-full transition-all duration-300 ${
                                                  done >= target
                                                    ? 'bg-emerald-500'
                                                    : done >= Math.ceil(target * 0.66)
                                                    ? 'bg-blue-500'
                                                    : done > 0
                                                    ? 'bg-amber-500'
                                                    : 'bg-slate-300'
                                                }`}
                                                style={{ width: `${fillPct}%` }}
                                              />
                                            </div>
                                            <div className="text-[10px] font-bold text-right">
                                              {diff !== null && diff > 0 ? (
                                                <span className="text-emerald-600">+{diff} above target</span>
                                              ) : diff === 0 ? (
                                                <span className="text-emerald-600">Target met</span>
                                              ) : (
                                                <span className="text-slate-400">{Math.abs(diff ?? 0)} to target</span>
                                              )}
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="mt-2 space-y-1.5">
                                            <div className="flex items-center justify-between text-[11px]">
                                              <span className="text-slate-500 font-semibold">Done</span>
                                              <span className="font-mono font-black text-slate-900">{done}</span>
                                            </div>
                                            <div className="w-full bg-slate-200/70 h-1.5 rounded-full overflow-hidden">
                                              <div
                                                className="h-full rounded-full bg-blue-500"
                                                style={{ width: `${fillPct}%` }}
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Lead Source Mix */}
                              <div className="lg:col-span-5 space-y-3 border-t lg:border-t-0 lg:border-l border-slate-100 pt-4 lg:pt-0 lg:pl-5">
                                <div className="flex items-center justify-between">
                                  <h4 className="text-xs font-black text-slate-900">Lead Source Mix</h4>
                                  <span className="text-[10px] font-bold text-slate-400">
                                    {row.total} total enrollments
                                  </span>
                                </div>

                                {row.sources.length === 0 ? (
                                  <p className="text-xs text-slate-400 italic">No enrollments recorded</p>
                                ) : (
                                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                                    {row.sources.map((src) => {
                                      const srcPct = row.total > 0 ? Math.round((src.count / row.total) * 100) : 0;
                                      return (
                                        <div key={src.name} className="space-y-1">
                                          <div className="flex items-center justify-between text-[11px]">
                                            <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                                              <span
                                                className={`w-1.5 h-1.5 rounded-full ${
                                                  src.isMarketing ? 'bg-emerald-500' : 'bg-slate-400'
                                                }`}
                                              />
                                              {src.name}
                                            </span>
                                            <span className="font-mono font-bold text-slate-900">
                                              {src.count}{' '}
                                              <span className="text-[10px] text-slate-400 font-semibold">
                                                ({srcPct}%)
                                              </span>
                                            </span>
                                          </div>
                                          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full rounded-full ${
                                                src.isMarketing ? 'bg-emerald-500' : 'bg-slate-400'
                                              }`}
                                              style={{ width: `${srcPct}%` }}
                                            />
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
            {yearlyReportBatches.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-slate-200 bg-slate-50/70 text-xs font-extrabold text-slate-900">
                  <td className="py-3.5 pr-4 rounded-bl-xl">Yearly Total ({activeReportYear})</td>
                  <td className="py-3.5 px-3 text-center font-mono text-emerald-700">
                    {leadOwnerYearlyReport.totalMarketing}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-600">
                    {leadOwnerYearlyReport.totalNonMarketing}
                  </td>
                  {yearlyReportBatches.map((batch) => {
                    const batchTotal = leadOwnerYearlyReport.columnBatchTotals[batch.id] || 0;
                    const batchTarget = getBatchCapacityTarget(batch.id);
                    const batchPct = Math.round((batchTotal / batchTarget) * 100);
                    return (
                      <td key={batch.id} className="py-3.5 px-2 text-center font-mono">
                        <div className="text-slate-900 font-extrabold">
                          {batchTotal}
                          <span className="text-[10px] font-semibold text-slate-400">/{batchTarget}</span>
                        </div>
                        <div
                          className={`text-[9px] font-bold ${
                            batchPct >= 100
                              ? 'text-emerald-600'
                              : batchPct >= 75
                              ? 'text-blue-600'
                              : 'text-amber-600'
                          }`}
                        >
                          {batchPct}%
                        </div>
                      </td>
                    );
                  })}
                  <td className="py-3.5 px-3 text-center font-mono text-blue-700">
                    {leadOwnerYearlyReport.yearlyTotal}
                  </td>
                  <td className="py-3.5 px-3 text-center font-mono text-slate-700">
                    {leadOwnerYearlyReport.yearlyTotal} / {leadOwnerYearlyReport.totalCoreTarget} (
                    {leadOwnerYearlyReport.totalCoreTarget > 0
                      ? Math.round((leadOwnerYearlyReport.yearlyTotal / leadOwnerYearlyReport.totalCoreTarget) * 100)
                      : 0}
                    %)
                  </td>
                  <td className="py-3.5 pl-3 text-right font-mono rounded-br-xl">
                    <div>{leadOwnerYearlyReport.yearlyTotal > 0 ? '100.0%' : '0.0%'}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">
                      {leadOwnerYearlyReport.batchCount > 0
                        ? (leadOwnerYearlyReport.yearlyTotal / leadOwnerYearlyReport.batchCount).toFixed(1)
                        : '0.0'}{' '}
                      / batch
                    </div>
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </motion.div>
    </div>
  );
}
