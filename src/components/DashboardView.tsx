import React, { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { db } from '../firebase';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { Users, Activity, Globe, TrendingUp, PieChart as PieChartIcon, Loader2, Briefcase, CheckCircle2, Target, UserCheck } from 'lucide-react';
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
}

interface DashboardViewProps {
  currentUser?: string;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export default function DashboardView({ currentUser = 'admin' }: DashboardViewProps) {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<string>('all');
  const [showAllCities, setShowAllCities] = useState(false);

  const isAdmin = currentUser === 'admin' || currentUser === 'marketing@xmonks.com';

  useEffect(() => {
    const q = query(collection(db, 'participants'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Participant[] = [];
      snapshot.forEach((doc) => {
        const p = doc.data() as Participant;
        if (isAdmin || p.clientPartner === currentUser) {
          data.push({ id: doc.id, ...p });
        }
      });
      setParticipants(data);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser, isAdmin]);

  // Available Batches for filtering
  const availableBatches = useMemo(() => {
    const batches = new Set<string>();
    participants.forEach(p => {
      if (p.batchNumber) batches.add(p.batchNumber);
    });
    return Array.from(batches).sort((a, b) => parseInt(a) - parseInt(b));
  }, [participants]);

  // Aggregate Data
  const stats = useMemo(() => {
    if (participants.length === 0) return null;

    // Filter participants by batch if selected
    const filteredParticipants = selectedBatch === 'all' 
      ? participants 
      : participants.filter(p => p.batchNumber === selectedBatch);

    if (filteredParticipants.length === 0 && selectedBatch !== 'all') return null;

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
  }, [participants, selectedBatch]);

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
      {/* Dashboard Filter Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Program Insights</h2>
          <p className="text-sm text-slate-500">Real-time analytics for your coaching batches</p>
        </div>
        <div className="flex items-center gap-3">
          <TrendingUp className="w-4 h-4 text-slate-400" />
          <select 
            value={selectedBatch} 
            onChange={(e) => setSelectedBatch(e.target.value)}
            className="px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="all">All Batches</option>
            {availableBatches.map(batch => (
              <option key={batch} value={batch}>Batch {batch}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Credentialing Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-50 rounded-2xl">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-500">Total Enrollment</p>
              <p className="text-2xl font-bold text-slate-900">{stats.totalParticipants}</p>
            </div>
          </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-emerald-600 p-6 rounded-3xl shadow-lg shadow-emerald-100 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-xs font-bold uppercase tracking-wider mb-1">ACC Credentials</p>
              <p className="text-3xl font-bold">{stats.accCount}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <CheckCircle2 className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-indigo-600 p-6 rounded-3xl shadow-lg shadow-indigo-100 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-wider mb-1">PCC Credentials</p>
              <p className="text-3xl font-bold">{stats.pccCount}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <TrendingUp className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>

        <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-amber-500 p-6 rounded-3xl shadow-lg shadow-amber-100 text-white"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-amber-50 text-xs font-bold uppercase tracking-wider mb-1">Pathway to ACC</p>
              <p className="text-3xl font-bold">{stats.pathwayCount}</p>
            </div>
            <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md">
              <Activity className="w-6 h-6 text-white" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 gap-8">
        {/* Batch Health Chart */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-slate-900">Batch Enrollment Trends</h3>
            </div>
            <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-wider">Per Batch Count</span>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.batchData}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCount)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Demographics Row (Updated Industry UI) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Industry Chart - Enhanced UI */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm lg:col-span-2">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-3">
                <Briefcase className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900">Industry Distribution</h3>
              </div>
              <span className="text-xs font-bold text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-wider">Top Sectors</span>
            </div>
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.industryData} layout="vertical" margin={{ left: 40, right: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                  <XAxis type="number" hide />
                  <YAxis 
                    type="category" 
                    dataKey="name" 
                    stroke="#475569" 
                    fontSize={12} 
                    width={120} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip 
                    cursor={{fill: '#f8fafc'}}
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[0, 8, 8, 0]} 
                    barSize={24}
                  >
                    {stats.industryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
        </div>

        {/* City distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Globe className="w-5 h-5 text-amber-600" />
              <h3 className="font-bold text-slate-900">Geographic Reach</h3>
            </div>
            <div className="space-y-6 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {(showAllCities ? stats.fullCityData : stats.cityData).map((city, index) => {
                const percentage = ((city.value / stats.totalParticipants) * 100).toFixed(0);
                return (
                  <div key={city.name} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-700">{city.name}</span>
                      <span className="text-slate-400 font-medium">{city.value} ({percentage}%)</span>
                    </div>
                    <div className="h-2.5 bg-slate-50 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        className="h-full bg-amber-400 rounded-full shadow-[0_0_8px_rgba(251,191,36,0.5)]"
                        transition={{ duration: 1.2, delay: Math.min(index, 10) * 0.1, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
              {stats.uniqueCitiesCount > 5 && (
                <div className="pt-2 text-center">
                  <button 
                    onClick={() => setShowAllCities(!showAllCities)}
                    className="text-sm font-medium text-amber-600 hover:text-amber-700 transition-colors"
                  >
                    {showAllCities ? 'Show Less' : `+ Load ${stats.uniqueCitiesCount - 5} More Cities`}
                  </button>
                </div>
              )}
            </div>
        </div>

      </div>

      {/* Lead Source and Partner Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lead Source Distribution */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <Target className="w-5 h-5 text-rose-600" />
            <h3 className="font-bold text-slate-900">Lead Source Analytics</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.leadSourceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {stats.leadSourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Client Partner Performance */}
        <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3 mb-8">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            <h3 className="font-bold text-slate-900">Client Partner Distribution</h3>
          </div>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={stats.partnerData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {stats.partnerData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Diversity Row */}
      <div className="grid grid-cols-1 gap-8">
         {/* Gender Distribution */}
         <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm">
            <div className="flex items-center gap-3 mb-8">
              <Users className="w-5 h-5 text-emerald-600" />
              <h3 className="font-bold text-slate-900">Gender Distribution</h3>
            </div>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.genderData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {stats.genderData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : index === 1 ? '#3b82f6' : '#94a3b8'} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
        </div>
      </div>
    </div>
  );
}
