import React, { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, orderBy, writeBatch, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Search, Filter, X, ChevronDown, ChevronUp, Download, Upload, Loader2, Mail, Phone, MapPin, Building2, Briefcase, GraduationCap, Linkedin, Plus, Send, Trash2, AlertCircle } from 'lucide-react';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { motion, AnimatePresence } from 'motion/react';

// Types
interface Participant {
  id: string;
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
  createdAt: string;
  profilePicture?: string;
}

interface FilterState {
  gender: string[];
  batchNumber: string[];
  industry: string[];
  coachingJourney: string[];
  otherPrograms: string[];
  city: string[];
  cmm: string[];
  tcc: string[];
  tlc: string[];
}

export default function ParticipantsView() {
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterState>({
    gender: [],
    batchNumber: [],
    industry: [],
    coachingJourney: [],
    otherPrograms: [],
    city: [],
    cmm: [],
    tcc: [],
    tlc: []
  });
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: keyof Participant; direction: 'asc' | 'desc' } | null>({
    key: 'firstName',
    direction: 'asc'
  });

  // Upload State
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    created: number;
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Selected Participant State
  const [selectedParticipant, setSelectedParticipant] = useState<Participant | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [editForm, setEditForm] = useState<Partial<Participant>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ type: 'success' | 'error' | null; message: string }>({ type: null, message: '' });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Bulk Edit State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [bulkEditForm, setBulkEditForm] = useState<Partial<Participant>>({});

  // Import Config State
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState({ createNew: true, updateExisting: true });

  const handleAddNewClick = () => {
    setSelectedParticipant(null);
    setEditForm({});
    setIsAddingNew(true);
  };

  const handleEditClick = () => {
    setEditForm(selectedParticipant || {});
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setIsAddingNew(false);
    setEditForm({});
    setEmailStatus({ type: null, message: '' });
    setShowDeleteConfirm(false);
  };

  const handleDeleteParticipant = async () => {
    if (!selectedParticipant) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'participants', selectedParticipant.id));
      setSelectedParticipant(null);
      setShowDeleteConfirm(false);
    } catch (error) {
      console.error("Error deleting participant:", error);
      setEmailStatus({ type: 'error', message: 'Failed to delete participant.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSendWelcomeEmail = async () => {
    if (!selectedParticipant || !selectedParticipant.email) {
      setEmailStatus({ type: 'error', message: 'Participant does not have an email address.' });
      return;
    }

    setIsSendingEmail(true);
    setEmailStatus({ type: null, message: '' });

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: `${selectedParticipant.firstName || ''} ${selectedParticipant.lastName || ''}`.trim(),
          clientEmail: selectedParticipant.email,
          isTest: false,
          ccEmail: ""
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setEmailStatus({ type: 'success', message: 'Welcome email sent successfully!' });
      } else {
        setEmailStatus({ type: 'error', message: data.error || 'Failed to send email.' });
      }
    } catch (error) {
      setEmailStatus({ type: 'error', message: 'An unexpected error occurred.' });
    } finally {
      setIsSendingEmail(false);
      // Auto-hide success message after 3 seconds
      setTimeout(() => {
        setEmailStatus(prev => prev.type === 'success' ? { type: null, message: '' } : prev);
      }, 3000);
    }
  };

  const handleSaveEdit = async () => {
    if (!isAddingNew && !selectedParticipant) return;

    if (!editForm.firstName || !editForm.email) {
      alert('First Name and Email are required.');
      return;
    }

    setIsSaving(true);
    try {
      if (isAddingNew) {
        const docRef = doc(collection(db, 'participants'));
        const newParticipant = {
          ...editForm,
          createdAt: new Date().toISOString()
        };
        await setDoc(docRef, newParticipant);
        setIsAddingNew(false);
      } else if (selectedParticipant) {
        const docRef = doc(db, 'participants', selectedParticipant.id);
        await updateDoc(docRef, editForm);
        setSelectedParticipant({ ...selectedParticipant, ...editForm } as Participant);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error saving participant:', error);
      alert('Failed to save participant');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkEditSubmit = async () => {
    // Filter out empty string values to only update fields the user filled in
    const fieldsToUpdate = Object.fromEntries(
      Object.entries(bulkEditForm).filter(([_, v]) => v !== '')
    );

    if (Object.keys(fieldsToUpdate).length === 0) {
      alert("Please specify at least one field to update.");
      return;
    }
    
    setIsSaving(true);
    try {
      const batchSize = 400;
        
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = selectedIds.slice(i, i + batchSize);
        
        currentBatch.forEach((id) => {
          const docRef = doc(db, 'participants', id);
          batch.update(docRef, { ...fieldsToUpdate, updatedAt: new Date().toISOString() });
        });
        
        await batch.commit();
      }
      setIsBulkEditing(false);
      setBulkEditForm({});
      setSelectedIds([]);
      // Reload is handled by onSnapshot
    } catch (err) {
      console.error(err);
      alert("Error performing bulk edit.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkDeleteSubmit = async () => {
    setIsSaving(true);
    try {
      const batchSize = 400;
        
      for (let i = 0; i < selectedIds.length; i += batchSize) {
        const batch = writeBatch(db);
        const currentBatch = selectedIds.slice(i, i + batchSize);
        
        currentBatch.forEach((id) => {
          batch.delete(doc(db, 'participants', id));
        });
        
        await batch.commit();
      }
      setShowBulkDeleteConfirm(false);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      alert("Error deleting participants.");
    } finally {
      setIsSaving(false);
    }
  };

  // Fetch data from Firestore
  useEffect(() => {
    const q = query(collection(db, 'participants'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data: Participant[] = [];
      snapshot.forEach((doc) => {
        data.push({ id: doc.id, ...doc.data() } as Participant);
      });
      setParticipants(data);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching participants:", err);
      setError("Failed to load participants data.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Extract unique values for filters
  const filterOptions = useMemo(() => {
    const options = {
      gender: new Set<string>(),
      batchNumber: new Set<string>(),
      industry: new Set<string>(),
      coachingJourney: new Set<string>(),
      otherPrograms: new Set<string>(),
      city: new Set<string>(),
      cmm: new Set<string>(),
      tcc: new Set<string>(),
      tlc: new Set<string>()
    };

    participants.forEach(p => {
      if (p.gender) options.gender.add(p.gender);
      if (p.batchNumber) options.batchNumber.add(p.batchNumber);
      if (p.industry) options.industry.add(p.industry);
      if (p.coachingJourney) options.coachingJourney.add(p.coachingJourney);
      if (p.otherPrograms) options.otherPrograms.add(p.otherPrograms);
      if (p.city) options.city.add(p.city);
      if (p.cmm) options.cmm.add(p.cmm);
      if (p.tcc) options.tcc.add(p.tcc);
      if (p.tlc) options.tlc.add(p.tlc);
    });

    return {
      gender: Array.from(options.gender).sort(),
      batchNumber: Array.from(options.batchNumber).sort((a, b) => parseInt(a) - parseInt(b)),
      industry: Array.from(options.industry).sort(),
      coachingJourney: Array.from(options.coachingJourney).sort(),
      otherPrograms: Array.from(options.otherPrograms).sort(),
      city: Array.from(options.city).sort(),
      cmm: Array.from(options.cmm).sort(),
      tcc: Array.from(options.tcc).sort(),
      tlc: Array.from(options.tlc).sort()
    };
  }, [participants]);

  // Handle filter changes
  const toggleFilter = (category: keyof FilterState, value: string) => {
    setFilters(prev => {
      const current = prev[category];
      const updated = current.includes(value)
        ? current.filter(item => item !== value)
        : [...current, value];
      return { ...prev, [category]: updated };
    });
  };

  const clearFilters = () => {
    setFilters({
      gender: [],
      batchNumber: [],
      industry: [],
      coachingJourney: [],
      otherPrograms: [],
      city: [],
      cmm: [],
      tcc: [],
      tlc: []
    });
    setSearchTerm('');
  };

  const handleSort = (key: keyof Participant) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Apply search, filters, and sorting
  const filteredAndSortedParticipants = useMemo(() => {
    let result = participants;

    // Search
    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      result = result.filter(p => 
        (p.firstName || '').toLowerCase().includes(lowerSearch) ||
        (p.lastName || '').toLowerCase().includes(lowerSearch) ||
        (p.email || '').toLowerCase().includes(lowerSearch) ||
        (p.company || '').toLowerCase().includes(lowerSearch) ||
        (p.industry || '').toLowerCase().includes(lowerSearch) ||
        (p.designation || '').toLowerCase().includes(lowerSearch)
      );
    }

    // Filters
    if (filters.gender.length > 0) {
      result = result.filter(p => filters.gender.includes(p.gender));
    }
    if (filters.batchNumber.length > 0) {
      result = result.filter(p => filters.batchNumber.includes(p.batchNumber));
    }
    if (filters.industry.length > 0) {
      result = result.filter(p => filters.industry.includes(p.industry));
    }
    if (filters.coachingJourney.length > 0) {
      result = result.filter(p => filters.coachingJourney.includes(p.coachingJourney));
    }
    if (filters.otherPrograms.length > 0) {
      result = result.filter(p => filters.otherPrograms.includes(p.otherPrograms));
    }
    if (filters.city.length > 0) {
      result = result.filter(p => filters.city.includes(p.city));
    }
    if (filters.cmm.length > 0) {
      result = result.filter(p => filters.cmm.includes(p.cmm));
    }
    if (filters.tcc.length > 0) {
      result = result.filter(p => filters.tcc.includes(p.tcc));
    }
    if (filters.tlc.length > 0) {
      result = result.filter(p => filters.tlc.includes(p.tlc));
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        const aValue = a[sortConfig.key] || '';
        const bValue = b[sortConfig.key] || '';
        
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [participants, searchTerm, filters, sortConfig]);

  const activeFilterCount = Object.values(filters).reduce((acc: number, current: any) => acc + (current?.length || 0), 0) as number;

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredAndSortedParticipants.map(p => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (e: React.ChangeEvent<HTMLInputElement>, id: string) => {
    if (e.target.checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(filteredAndSortedParticipants.map(p => ({
      'First Name': p.firstName,
      'Last Name': p.lastName,
      'Email': p.email,
      'Phone': `+${p.countryCode} ${p.phone}`,
      'Company': p.company,
      'Designation': p.designation,
      'Gender': p.gender,
      'Batch Number': p.batchNumber,
      'City': p.city,
      'Industry': p.industry,
      'LinkedIn': p.linkedIn,
      'Coaching Journey': p.coachingJourney,
      'Other Programs': p.otherPrograms,
      'CMM': p.cmm,
      'TCC': p.tcc,
      'TLC': p.tlc,
      'Profile Picture URL': p.profilePicture || ''
    })));
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Participants");
    XLSX.writeFile(workbook, "Participants_Export.xlsx");
  };

  const downloadTemplate = () => {
    const headers = [
      'First Name', 'Last Name', 'Email', 'Country Code', 'Phone', 
      'Company', 'Designation', 'Gender', 'Batch Number', 'City', 
      'Industry', 'LinkedIn', 'Coaching Journey', 'Any other program done from us?', 
      'CMM', 'TCC', 'TLC', 'Profile Picture URL'
    ];
    
    const csvContent = Papa.unparse({
      fields: headers,
      data: [{
        'First Name': 'John',
        'Last Name': 'Doe',
        'Email': 'john.doe@example.com',
        'Country Code': '1',
        'Phone': '5551234567',
        'Company': 'Acme Corp',
        'Designation': 'Manager',
        'Gender': 'Male',
        'Batch Number': '1',
        'City': 'New York',
        'Industry': 'Technology',
        'LinkedIn': 'https://linkedin.com/in/johndoe',
        'Coaching Journey': 'Started',
        'Any other program done from us?': 'None',
        'CMM': 'Yes',
        'TCC': 'No',
        'TLC': 'Yes',
        'Profile Picture URL': 'https://example.com/photo.jpg'
      }]
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'Participant_Import_Template.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    setPendingImportFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const processImport = () => {
    if (!pendingImportFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setImportSummary(null);

    Papa.parse(pendingImportFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const records = results.data;
          const batchSize = 400; // Safe limit under 500
          
          let createdCount = 0;
          let updatedCount = 0;
          let failedCount = 0;
          const errorMessages: string[] = [];
          
          // Create a map of existing emails to IDs for upsert
          const emailToIdMap = new Map<string, string>();
          participants.forEach(p => {
            if (p.email) emailToIdMap.set(p.email.toLowerCase().trim(), p.id);
          });
          
          for (let i = 0; i < records.length; i += batchSize) {
            const batch = writeBatch(db);
            const currentBatch = records.slice(i, i + batchSize);
            
            currentBatch.forEach((record: any, index: number) => {
              const email = (record['Email'] || '').trim();
              
              if (!email) {
                failedCount++;
                errorMessages.push(`Row ${i + index + 2}: Missing required Email.`);
                return; // Skip this record
              }

              // Extract only valid/provided fields
              const extractValidFields = (rec: any) => {
                const data: any = {};
                const setIfValid = (key: string, val: string | undefined) => {
                   const trimmed = (val || '').trim();
                   if (trimmed) data[key] = trimmed;
                };
                setIfValid('firstName', rec['First Name']);
                setIfValid('lastName', rec['Last Name '] || rec['Last Name']);
                setIfValid('countryCode', rec['Country Code '] || rec['Country Code']);
                setIfValid('phone', rec['Phone']);
                setIfValid('company', rec['Company']);
                setIfValid('designation', rec['Designation']);
                setIfValid('gender', rec['Gender']);
                setIfValid('batchNumber', rec['Batch Number']);
                setIfValid('city', rec['City']);
                setIfValid('industry', rec['Industry']);
                setIfValid('linkedIn', rec['LinkedIn']);
                setIfValid('coachingJourney', rec['Coaching Journey']);
                setIfValid('otherPrograms', rec['Any other program done from us?']);
                setIfValid('cmm', rec['CMM']);
                setIfValid('tcc', rec['TCC']);
                setIfValid('tlc', rec['TLC']);
                setIfValid('profilePicture', rec['Profile Picture URL']);
                return data;
              };

              const emailKey = email.toLowerCase();
              const validFields = extractValidFields(record);
              
              if (emailToIdMap.has(emailKey)) {
                // Update existing
                if (importConfig.updateExisting) {
                  const existingId = emailToIdMap.get(emailKey)!;
                  const docRef = doc(db, 'participants', existingId);
                  batch.set(docRef, { ...validFields, updatedAt: new Date().toISOString() }, { merge: true });
                  updatedCount++;
                } else {
                  errorMessages.push(`Row ${i + index + 2}: Skipped (Update existing disabled for email ${email}).`);
                  failedCount++;
                }
              } else {
                // Create new
                if (importConfig.createNew) {
                  const docRef = doc(collection(db, 'participants'));
                  batch.set(docRef, { 
                    firstName: '', lastName: '', countryCode: '', phone: '', company: '', designation: '', gender: '', batchNumber: '', city: '', industry: '', linkedIn: '', coachingJourney: '', otherPrograms: '', cmm: '', tcc: '', tlc: '', profilePicture: '',
                    ...validFields, 
                    email: email, 
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  });
                  createdCount++;
                } else {
                  errorMessages.push(`Row ${i + index + 2}: Skipped (Create new disabled for email ${email}).`);
                  failedCount++;
                }
              }
            });
            
            await batch.commit();
            setUploadProgress(Math.round(((i + currentBatch.length) / records.length) * 100));
          }
          
          setImportSummary({
            total: records.length,
            created: createdCount,
            updated: updatedCount,
            failed: failedCount,
            errors: errorMessages
          });
          
        } catch (err) {
          console.error('Error uploading:', err);
          alert('Error uploading data.');
        } finally {
          setIsUploading(false);
          setUploadProgress(0);
          setPendingImportFile(null);
        }
      },
      error: (error) => {
        console.error('Error parsing CSV:', error);
        alert('Error parsing CSV file.');
        setIsUploading(false);
        setPendingImportFile(null);
      }
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-red-600">
        <p className="text-xl font-semibold">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Participant Directory</h1>
            <p className="text-gray-500 mt-1">Showing {filteredAndSortedParticipants.length} of {participants.length} participants</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <button 
              onClick={handleAddNewClick}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Participant
            </button>
            <button 
              onClick={downloadTemplate}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Template
            </button>
            <input
              type="file"
              accept=".csv"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
            >
              {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {isUploading ? `Uploading ${uploadProgress}%` : 'Import CSV'}
            </button>
            <button 
              onClick={exportToExcel}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>

        {/* Search and Filter Bar */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search by name, email, company, industry, or role..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
              />
            </div>
            <button
              onClick={() => setIsFilterOpen(!isFilterOpen)}
              className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition-all ${
                isFilterOpen || activeFilterCount > 0 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Filter className="w-4 h-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-blue-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>

          {/* Expanded Filters */}
          {isFilterOpen && (
            <div className="pt-4 border-t border-gray-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              
              {/* Batch Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Batch Number</h3>
                  {filters.batchNumber.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.batchNumber.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.batchNumber.map(batch => (
                    <button
                      key={batch}
                      onClick={() => toggleFilter('batchNumber', batch)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.batchNumber.includes(batch)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Batch {batch}
                    </button>
                  ))}
                </div>
              </div>

              {/* Journey Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Coaching Journey</h3>
                  {filters.coachingJourney.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.coachingJourney.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.coachingJourney.filter(Boolean).map(journey => (
                    <button
                      key={journey}
                      onClick={() => toggleFilter('coachingJourney', journey)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.coachingJourney.includes(journey)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {journey}
                    </button>
                  ))}
                </div>
              </div>

              {/* Gender Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Gender</h3>
                  {filters.gender.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.gender.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.gender.filter(Boolean).map(gender => (
                    <button
                      key={gender}
                      onClick={() => toggleFilter('gender', gender)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.gender.includes(gender)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {gender}
                    </button>
                  ))}
                </div>
              </div>

              {/* City Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">City</h3>
                  {filters.city.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.city.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.city.filter(Boolean).map(city => (
                    <button
                      key={city}
                      onClick={() => toggleFilter('city', city)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.city.includes(city)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>

              {/* Industry Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Industry</h3>
                  {filters.industry.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.industry.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.industry.filter(Boolean).map(industry => (
                    <button
                      key={industry}
                      onClick={() => toggleFilter('industry', industry)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.industry.includes(industry)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {industry}
                    </button>
                  ))}
                </div>
              </div>

              {/* Other Programs Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Other Programs</h3>
                  {filters.otherPrograms.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.otherPrograms.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.otherPrograms.filter(Boolean).map(program => (
                    <button
                      key={program}
                      onClick={() => toggleFilter('otherPrograms', program)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.otherPrograms.includes(program)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {program}
                    </button>
                  ))}
                </div>
              </div>

              {/* CMM Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">CMM</h3>
                  {filters.cmm.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.cmm.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.cmm.filter(Boolean).map(cmm => (
                    <button
                      key={cmm}
                      onClick={() => toggleFilter('cmm', cmm)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.cmm.includes(cmm)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {cmm}
                    </button>
                  ))}
                </div>
              </div>

              {/* TCC Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">TCC</h3>
                  {filters.tcc.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.tcc.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.tcc.filter(Boolean).map(tcc => (
                    <button
                      key={tcc}
                      onClick={() => toggleFilter('tcc', tcc)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.tcc.includes(tcc)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tcc}
                    </button>
                  ))}
                </div>
              </div>

              {/* TLC Filter */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">TLC</h3>
                  {filters.tlc.length > 0 && (
                    <span className="text-xs text-blue-600 font-medium">{filters.tlc.length} selected</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
                  {filterOptions.tlc.filter(Boolean).map(tlc => (
                    <button
                      key={tlc}
                      onClick={() => toggleFilter('tlc', tlc)}
                      className={`px-3 py-1.5 text-xs rounded-lg border transition-all duration-200 ${
                        filters.tlc.includes(tlc)
                          ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-200'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {tlc}
                    </button>
                  ))}
                </div>
              </div>

              {/* Clear Filters */}
              <div className="flex items-end justify-end lg:col-span-4">
                <button
                  onClick={clearFilters}
                  className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors flex items-center gap-1"
                >
                  <X className="w-4 h-4" />
                  Clear all filters
                </button>
              </div>

            </div>
          )}
        </div>

        {/* Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-100">
                  <th className="p-4 w-12 text-center text-xs">
                    <input 
                      type="checkbox" 
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                      checked={filteredAndSortedParticipants.length > 0 && selectedIds.length === filteredAndSortedParticipants.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th 
                    className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('firstName')}
                  >
                    <div className="flex items-center gap-1">
                      Name
                      {sortConfig?.key === 'firstName' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th 
                    className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('company')}
                  >
                    <div className="flex items-center gap-1">
                      Company & Role
                      {sortConfig?.key === 'company' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('batchNumber')}
                  >
                    <div className="flex items-center gap-1">
                      Batch
                      {sortConfig?.key === 'batchNumber' && (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />
                      )}
                    </div>
                  </th>
                  <th className="p-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Journey</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAndSortedParticipants.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-gray-500">
                      No participants found matching your criteria.
                    </td>
                  </tr>
                ) : (
                  filteredAndSortedParticipants.map((participant) => (
                    <tr 
                      key={participant.id} 
                      onClick={() => setSelectedParticipant(participant)}
                      className="hover:bg-gray-50/50 transition-colors cursor-pointer"
                    >
                      <td className="p-4 w-12 text-center" onClick={(e) => e.stopPropagation()}>
                        <input 
                          type="checkbox" 
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          checked={selectedIds.includes(participant.id)}
                          onChange={(e) => handleSelectOne(e, participant.id)}
                        />
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <img 
                            src={participant.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((participant.firstName || '') + ' ' + (participant.lastName || ''))}&background=random&color=fff`} 
                            alt={participant.firstName} 
                            className="w-10 h-10 rounded-full shadow-sm object-cover"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{participant.firstName} {participant.lastName}</div>
                            <div className="text-sm text-gray-500 mt-0.5">{participant.city}</div>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm text-gray-900">{participant.email}</div>
                        <div className="text-sm text-gray-500 mt-0.5">+{participant.countryCode} {participant.phone}</div>
                      </td>
                      <td className="p-4">
                        <div className="text-sm font-medium text-gray-900">{participant.company}</div>
                        <div className="text-sm text-gray-500 mt-0.5">{participant.designation}</div>
                        {participant.industry && (
                          <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-600 text-[10px] rounded font-medium">
                            {participant.industry}
                          </span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full">
                          Batch {participant.batchNumber}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1.5">
                          {participant.coachingJourney && (
                            <span className="px-2 py-1 bg-green-50 text-green-700 text-xs font-medium rounded border border-green-100">
                              {participant.coachingJourney}
                            </span>
                          )}
                          {participant.cmm && (
                            <span className="px-2 py-1 bg-purple-50 text-purple-700 text-xs font-medium rounded border border-purple-100">
                              CMM
                            </span>
                          )}
                          {participant.tcc && (
                            <span className="px-2 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded border border-orange-100">
                              TCC
                            </span>
                          )}
                          {participant.tlc && (
                            <span className="px-2 py-1 bg-pink-50 text-pink-700 text-xs font-medium rounded border border-pink-100">
                              TLC
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>

      {/* Participant Details Modal */}
      <AnimatePresence>
        {(selectedParticipant || isAddingNew) && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setSelectedParticipant(null);
                setIsEditing(false);
                setIsAddingNew(false);
              }}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="flex items-start justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <div className="flex items-center gap-4">
                  {!isEditing && !isAddingNew && selectedParticipant && (
                    <img 
                      src={selectedParticipant.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent((selectedParticipant.firstName || '') + ' ' + (selectedParticipant.lastName || ''))}&background=random&color=fff&size=128`} 
                      alt={selectedParticipant.firstName} 
                      className="w-16 h-16 rounded-full shadow-md border-2 border-white object-cover"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">
                      {isAddingNew ? 'New Participant' : isEditing ? 'Edit Participant' : `${selectedParticipant?.firstName} ${selectedParticipant?.lastName}`}
                    </h2>
                    {!isEditing && !isAddingNew && selectedParticipant && (
                      <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
                        <Briefcase className="w-4 h-4" />
                        {selectedParticipant.designation} {selectedParticipant.company ? `at ${selectedParticipant.company}` : ''}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setSelectedParticipant(null);
                    setIsEditing(false);
                    setIsAddingNew(false);
                  }}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto custom-scrollbar">
                {isEditing || isAddingNew ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">First Name</label>
                        <input type="text" value={editForm.firstName || ''} onChange={e => setEditForm({...editForm, firstName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Last Name</label>
                        <input type="text" value={editForm.lastName || ''} onChange={e => setEditForm({...editForm, lastName: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                        <input type="email" value={editForm.email || ''} onChange={e => setEditForm({...editForm, email: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="flex gap-2">
                        <div className="w-1/3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Code</label>
                          <input type="text" value={editForm.countryCode || ''} onChange={e => setEditForm({...editForm, countryCode: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                          <input type="text" value={editForm.phone || ''} onChange={e => setEditForm({...editForm, phone: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                        <input type="text" value={editForm.company || ''} onChange={e => setEditForm({...editForm, company: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Designation</label>
                        <input type="text" value={editForm.designation || ''} onChange={e => setEditForm({...editForm, designation: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Industry</label>
                        <input type="text" value={editForm.industry || ''} onChange={e => setEditForm({...editForm, industry: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">City</label>
                        <input type="text" value={editForm.city || ''} onChange={e => setEditForm({...editForm, city: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Profile Picture URL</label>
                        <input type="url" value={editForm.profilePicture || ''} onChange={e => setEditForm({...editForm, profilePicture: e.target.value})} placeholder="https://media.licdn.com/..." className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Gender</label>
                        <input type="text" value={editForm.gender || ''} onChange={e => setEditForm({...editForm, gender: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-700 mb-1">LinkedIn URL</label>
                        <input type="text" value={editForm.linkedIn || ''} onChange={e => setEditForm({...editForm, linkedIn: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100">
                      <h3 className="text-sm font-semibold text-gray-900 mb-4">Program Details</h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Batch Number</label>
                          <input type="text" value={editForm.batchNumber || ''} onChange={e => setEditForm({...editForm, batchNumber: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">CMM</label>
                          <input type="text" value={editForm.cmm || ''} onChange={e => setEditForm({...editForm, cmm: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">TCC</label>
                          <input type="text" value={editForm.tcc || ''} onChange={e => setEditForm({...editForm, tcc: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">TLC</label>
                          <input type="text" value={editForm.tlc || ''} onChange={e => setEditForm({...editForm, tlc: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Coaching Journey</label>
                          <input type="text" value={editForm.coachingJourney || ''} onChange={e => setEditForm({...editForm, coachingJourney: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">Other Programs</label>
                          <input type="text" value={editForm.otherPrograms || ''} onChange={e => setEditForm({...editForm, otherPrograms: e.target.value})} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : selectedParticipant ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  
                  {/* Contact Information */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Contact Info</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-gray-600">
                        <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Email</p>
                          <a href={`mailto:${selectedParticipant.email}`} className="text-sm text-blue-600 hover:underline break-all">
                            {selectedParticipant.email}
                          </a>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-gray-600">
                        <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Phone</p>
                          <p className="text-sm">+{selectedParticipant.countryCode} {selectedParticipant.phone}</p>
                        </div>
                      </div>
                      {selectedParticipant.linkedIn && (
                        <div className="flex items-start gap-3 text-gray-600">
                          <Linkedin className="w-5 h-5 text-gray-400 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">LinkedIn</p>
                            <a href={selectedParticipant.linkedIn} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline break-all">
                              View Profile
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Professional Details */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">Professional Details</h3>
                    <div className="space-y-3">
                      <div className="flex items-start gap-3 text-gray-600">
                        <Building2 className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">Industry</p>
                          <p className="text-sm">{selectedParticipant.industry || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-gray-600">
                        <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">City</p>
                          <p className="text-sm">{selectedParticipant.city || 'Not specified'}</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3 text-gray-600">
                        <div className="w-5 h-5 flex items-center justify-center text-gray-400 mt-0.5">
                          <span className="text-sm font-bold">G</span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Gender</p>
                          <p className="text-sm">{selectedParticipant.gender || 'Not specified'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Coaching Program Details */}
                  <div className="md:col-span-2 space-y-4 pt-6 border-t border-gray-100">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                      <GraduationCap className="w-5 h-5 text-gray-400" />
                      Program Details
                    </h3>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">Batch Number</p>
                        <p className="font-semibold text-gray-900">{selectedParticipant.batchNumber || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">CMM</p>
                        <p className="font-semibold text-gray-900">{selectedParticipant.cmm || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">TCC</p>
                        <p className="font-semibold text-gray-900">{selectedParticipant.tcc || '-'}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg border border-gray-100">
                        <p className="text-xs text-gray-500 font-medium mb-1">TLC</p>
                        <p className="font-semibold text-gray-900">{selectedParticipant.tlc || '-'}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                      <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                        <p className="text-sm font-medium text-blue-900 mb-1">Coaching Journey</p>
                        <p className="text-sm text-blue-800">{selectedParticipant.coachingJourney || 'Not specified'}</p>
                      </div>
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                        <p className="text-sm font-medium text-gray-900 mb-1">Other Programs</p>
                        <p className="text-sm text-gray-600">{selectedParticipant.otherPrograms || 'None'}</p>
                      </div>
                    </div>
                  </div>

                </div>
                ) : null}
              </div>
              
              {/* Modal Footer */}
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-3">
                <div className="w-full sm:w-auto">
                  {emailStatus.message && (
                    <p className={`text-sm font-medium ${emailStatus.type === 'success' ? 'text-emerald-600' : 'text-rose-600'}`}>
                      {emailStatus.message}
                    </p>
                  )}
                </div>
                <div className="flex justify-end gap-3 w-full sm:w-auto">
                  {isEditing || isAddingNew ? (
                    <>
                      <button
                        onClick={handleCancelEdit}
                        disabled={isSaving}
                        className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                      >
                        {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                        Save Changes
                      </button>
                    </>
                  ) : (
                    <>
                      {showDeleteConfirm ? (
                        <div className="flex items-center gap-2 mr-2">
                          <span className="text-sm text-rose-600 font-medium mr-2">Are you sure?</span>
                          <button
                            onClick={() => setShowDeleteConfirm(false)}
                            disabled={isDeleting}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleDeleteParticipant}
                            disabled={isDeleting}
                            className="flex items-center gap-2 px-3 py-1.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                          >
                            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                            Yes, Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="flex items-center gap-2 px-4 py-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition-colors font-medium text-sm shadow-sm mr-auto sm:mr-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          Delete
                        </button>
                      )}
                      
                      {!showDeleteConfirm && (
                        <>
                          <button
                            onClick={handleSendWelcomeEmail}
                            disabled={isSendingEmail}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                          >
                            {isSendingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            Send Welcome Email
                          </button>
                          <button
                            onClick={handleEditClick}
                            className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => {
                              setSelectedParticipant(null);
                              setEmailStatus({ type: null, message: '' });
                              setShowDeleteConfirm(false);
                            }}
                            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm"
                          >
                            Close
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Summary Modal */}
      <AnimatePresence>
        {importSummary && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Import Summary</h2>
                <button
                  onClick={() => setImportSummary(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-center">
                    <p className="text-xs font-medium text-gray-500 mb-1">Total Rows</p>
                    <p className="text-2xl font-bold text-gray-900">{importSummary.total}</p>
                  </div>
                  <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 text-center">
                    <p className="text-xs font-medium text-emerald-700 mb-1">Created</p>
                    <p className="text-2xl font-bold text-emerald-600">{importSummary.created}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-center">
                    <p className="text-xs font-medium text-blue-700 mb-1">Updated</p>
                    <p className="text-2xl font-bold text-blue-600">{importSummary.updated}</p>
                  </div>
                  <div className="bg-rose-50 p-4 rounded-xl border border-rose-100 text-center">
                    <p className="text-xs font-medium text-rose-700 mb-1">Failed</p>
                    <p className="text-2xl font-bold text-rose-600">{importSummary.failed}</p>
                  </div>
                </div>

                {importSummary.errors.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-500" />
                      Errors ({importSummary.errors.length})
                    </h3>
                    <div className="bg-rose-50/50 border border-rose-100 rounded-lg p-3 max-h-48 overflow-y-auto custom-scrollbar">
                      <ul className="space-y-1.5">
                        {importSummary.errors.map((err, i) => (
                          <li key={i} className="text-sm text-rose-700 flex items-start gap-2">
                            <span className="mt-1.5 w-1 h-1 rounded-full bg-rose-400 shrink-0"></span>
                            {err}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
                <button
                  onClick={() => setImportSummary(null)}
                  className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium text-sm shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Bulk Actions Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900 text-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.2)] border border-gray-700 px-6 py-4 flex items-center gap-6 z-40 w-[90%] max-w-3xl justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                {selectedIds.length}
              </div>
              <span className="font-medium hidden sm:inline">Participants selected</span>
            </div>
            <div className="flex items-center gap-2 sm:gap-3">
              {showBulkDeleteConfirm ? (
                <div className="flex items-center gap-2 bg-rose-900/50 rounded-full pl-4 pr-1 py-1 mr-2 border border-rose-800 absolute right-full md:relative md:right-auto pr-3 md:pr-1">
                  <span className="text-sm font-medium text-rose-200 hidden md:inline">Are you sure?</span>
                  <button 
                    onClick={() => setShowBulkDeleteConfirm(false)}
                    className="px-3 py-1 text-xs md:text-sm bg-gray-800 text-gray-300 rounded-full hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={handleBulkDeleteSubmit} 
                    disabled={isSaving} 
                    className="px-3 py-1 text-xs md:text-sm bg-rose-600 text-white rounded-full hover:bg-rose-500 flex items-center gap-1 transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-3 h-3 animate-spin"/> : <Trash2 className="w-3 h-3"/>}
                    Delete {selectedIds.length}
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => setShowBulkDeleteConfirm(true)}
                  className="px-4 py-2 text-sm font-medium text-rose-400 hover:text-rose-300 hover:bg-rose-900/30 rounded-full transition-colors flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" /> <span className="hidden sm:inline">Delete</span>
                </button>
              )}
              
              <button 
                onClick={() => {
                  setSelectedIds([]);
                  setShowBulkDeleteConfirm(false);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-300 hover:text-white hover:bg-gray-800 rounded-full transition-colors"
              >
                Clear
              </button>
              <button
                onClick={() => setIsBulkEditing(true)}
                className="px-5 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-full shadow-sm shadow-blue-900 transition-colors"
              >
                Bulk Edit
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Edit Modal */}
      <AnimatePresence>
        {isBulkEditing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsBulkEditing(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-100 bg-gray-50/50">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Bulk Edit Participants</h2>
                  <p className="text-sm text-gray-500 mt-1">Editing {selectedIds.length} selected participants</p>
                </div>
                <button
                  onClick={() => setIsBulkEditing(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
                <div className="bg-blue-50 text-blue-800 p-4 rounded-xl text-sm mb-4">
                  Only the fields you fill out below will be updated. Empty fields will remain unchanged for the selected participants.
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Company</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.company || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, company: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.city || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, city: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.industry || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, industry: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.batchNumber || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, batchNumber: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Coaching Journey</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.coachingJourney || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, coachingJourney: e.target.value })}
                    >
                      <option value="">No Change</option>
                      <option value="Not Started">Not Started</option>
                      <option value="In Progress">In Progress</option>
                      <option value="Completed">Completed</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Other Programs</label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.otherPrograms || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, otherPrograms: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 border-t border-gray-100 pt-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">CMM</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.cmm || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, cmm: e.target.value })}
                    >
                      <option value="">No Change</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TCC</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.tcc || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, tcc: e.target.value })}
                    >
                      <option value="">No Change</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">TLC</label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      value={bulkEditForm.tlc || ''}
                      onChange={e => setBulkEditForm({ ...bulkEditForm, tlc: e.target.value })}
                    >
                      <option value="">No Change</option>
                      <option value="Yes">Yes</option>
                      <option value="No">No</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10">
                <button
                  onClick={() => setIsBulkEditing(false)}
                  disabled={isSaving}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkEditSubmit}
                  disabled={isSaving}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                  {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                  Apply Changes
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Import Config Modal */}
      <AnimatePresence>
        {pendingImportFile && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col"
            >
              <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                <h2 className="text-xl font-bold text-gray-900">Import Configuration</h2>
                <button
                  onClick={() => setPendingImportFile(null)}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <p className="text-sm text-gray-600">
                  You are about to import <span className="font-semibold">{pendingImportFile.name}</span>. How would you like to process the records? Match is based on Email.
                </p>

                <div className="space-y-4">
                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={importConfig.createNew}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, createNew: e.target.checked }))}
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Create New Records</div>
                      <div className="text-xs text-gray-500 mt-0.5">Add participants if their email does not exist in the system.</div>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      className="mt-1 w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      checked={importConfig.updateExisting}
                      onChange={(e) => setImportConfig(prev => ({ ...prev, updateExisting: e.target.checked }))}
                    />
                    <div>
                      <div className="font-medium text-gray-900 text-sm">Update Existing Records</div>
                      <div className="text-xs text-gray-500 mt-0.5">Update matched participants. Only filled columns will be updated. Empty columns are ignored.</div>
                    </div>
                  </label>
                </div>

                {!importConfig.createNew && !importConfig.updateExisting && (
                  <div className="p-3 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    You must select at least one operation to proceed.
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3 z-10">
                <button
                  onClick={() => setPendingImportFile(null)}
                  disabled={isUploading}
                  className="px-4 py-2 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={processImport}
                  disabled={isUploading || (!importConfig.createNew && !importConfig.updateExisting)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm shadow-sm disabled:opacity-50"
                >
                  {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {isUploading ? `Processing...` : 'Start Import'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
