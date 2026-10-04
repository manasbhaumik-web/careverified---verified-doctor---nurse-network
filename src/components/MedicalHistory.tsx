import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, FileText, Trash2, Eye, Download, Plus, Search, Filter, 
  Calendar, Building, AlertCircle, Lock, Tag, X, FileCheck, ShieldCheck, 
  ChevronRight, Info, HeartPulse
} from 'lucide-react';
import { motion } from 'motion/react';
import DocumentViewer from './DocumentViewer';

export interface MedicalRecord {
  id: string;
  title: string;
  category: 'Lab Result' | 'Vaccination Card' | 'Prescription' | 'Imaging/Scan' | 'Other';
  date: string;
  providerName: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  notes?: string;
  verifiedStatus: 'Verified ✅' | 'Awaiting Review' | 'Self-Uploaded';
  hash?: string;
  fileDataUrl?: string;
  structuredData?: {
    testName?: string;
    results?: { name: string; value: string; unit: string; range: string; status: 'Normal' | 'High' | 'Low' }[];
    vaccineName?: string;
    doses?: { doseNumber: number; date: string; batch: string; center: string }[];
    imagingFindings?: string;
  };
}

const INITIAL_RECORDS: MedicalRecord[] = [
  {
    id: 'rec-1',
    title: 'Fasting Blood Sugar & Lipid Profile',
    category: 'Lab Result',
    date: '2026-07-02',
    providerName: 'BP Clinical Laboratory, Kuala Lumpur',
    fileName: 'bp_lab_lipid_profile_02072026.pdf',
    fileSize: '1.4 MB',
    fileType: 'application/pdf',
    notes: 'Routine biannual checkup. Lipid profile shows slight elevation in LDL, rest is normal.',
    verifiedStatus: 'Verified ✅',
    hash: 'mc_sha256_8f51dfcf211ba71efb5e5f333a5da671f11c750b25e791b72a08f51a2e7cde22',
    structuredData: {
      testName: 'Lipid & Glucose Panel',
      results: [
        { name: 'Fasting Blood Sugar', value: '94', unit: 'mg/dL', range: '70 - 100', status: 'Normal' },
        { name: 'Total Cholesterol', value: '195', unit: 'mg/dL', range: '< 200', status: 'Normal' },
        { name: 'LDL Cholesterol', value: '112', unit: 'mg/dL', range: '< 100', status: 'High' },
        { name: 'HDL Cholesterol', value: '52', unit: 'mg/dL', range: '> 40', status: 'Normal' },
        { name: 'Triglycerides', value: '145', unit: 'mg/dL', range: '< 150', status: 'Normal' }
      ]
    }
  },
  {
    id: 'rec-2',
    title: 'COVID-19 Digital Immunisation Record',
    category: 'Vaccination Card',
    date: '2022-01-20',
    providerName: 'Ministry of Health, Malaysia (MySejahtera)',
    fileName: 'moh_vaccination_certificate_john_doe.pdf',
    fileSize: '820 KB',
    fileType: 'application/pdf',
    notes: 'Complete course of primary vaccination and initial booster shot.',
    verifiedStatus: 'Verified ✅',
    hash: 'mc_sha256_a3d24e5b9f7a8b6c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c',
    structuredData: {
      vaccineName: 'Comirnaty (Pfizer-BioNTech)',
      doses: [
        { doseNumber: 1, date: '2021-06-15', batch: 'AA0129', center: 'Kuala Lumpur Specialist Hospital' },
        { doseNumber: 2, date: '2021-07-06', batch: 'AA0135', center: 'Kuala Lumpur Specialist Hospital' },
        { doseNumber: 3, date: '2022-01-20', batch: 'BA0294', center: 'Metro Healthcare Bangsar' }
      ]
    }
  },
  {
    id: 'rec-3',
    title: 'Chest Radiograph (X-Ray) Report',
    category: 'Imaging/Scan',
    date: '2026-05-14',
    providerName: 'Kuala Lumpur Specialist Hospital Medical Imaging Dept',
    fileName: 'chest_xray_radiography_john_doe.png',
    fileSize: '4.8 MB',
    fileType: 'image/png',
    notes: 'Requested after recovering from acute bronchitis episode. Checked for residual infiltrates.',
    verifiedStatus: 'Verified ✅',
    hash: 'mc_sha256_bc11d22e33f445a55b66c77d88e99f00a11b22c33d44e55f66a77b88e99c00d1',
    structuredData: {
      testName: 'Chest PA View Radiography',
      imagingFindings: 'Lung fields are clear of active parenchymal infiltrates or consolidations. Pleural spaces are free. Cardiac silhouette is normal in size and configuration. The bony thorax and visualised soft tissues are unremarkable. IMPRESSION: Normal chest radiograph.'
    }
  }
];

export default function MedicalHistory() {
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  
  // Upload Record states
  const [isUploadingOpen, setIsUploadingOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Lab Result' | 'Vaccination Card' | 'Prescription' | 'Imaging/Scan' | 'Other'>('Lab Result');
  const [newProvider, setNewProvider] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newNotes, setNewNotes] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  
  // Drag and drop states
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Upload simulation states
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploadSuccess, setIsUploadSuccess] = useState(false);
  
  // Detailed document modal view
  const [activeRecordDetail, setActiveRecordDetail] = useState<MedicalRecord | null>(null);
  const [activePreviewRecord, setActivePreviewRecord] = useState<MedicalRecord | null>(null);
  const [attachedFileDataUrl, setAttachedFileDataUrl] = useState<string | null>(null);

  // Load records from LocalStorage or seed on mount
  useEffect(() => {
    const saved = localStorage.getItem('patient_medical_records');
    if (saved) {
      try {
        setRecords(JSON.parse(saved));
      } catch (e) {
        setRecords(INITIAL_RECORDS);
      }
    } else {
      setRecords(INITIAL_RECORDS);
      localStorage.setItem('patient_medical_records', JSON.stringify(INITIAL_RECORDS));
    }
  }, []);

  // Sync to local storage
  const saveRecordsToStorage = (updated: MedicalRecord[]) => {
    setRecords(updated);
    localStorage.setItem('patient_medical_records', JSON.stringify(updated));
  };

  // Filter records
  const filteredRecords = records.filter(rec => {
    const matchesSearch = rec.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          rec.providerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (rec.notes && rec.notes.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || rec.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Handle Drag Events
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    // Check file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      alert("Maximum file upload limit is 10MB. Please choose a smaller file.");
      return;
    }
    setAttachedFile(file);

    // Read file for document previewing
    const reader = new FileReader();
    reader.onload = (e) => {
      setAttachedFileDataUrl(e.target?.result as string);
    };
    reader.readAsDataURL(file);

    // Autofill title if empty
    if (!newTitle) {
      const cleanName = file.name.split('.').slice(0, -1).join('.')
        .replace(/[_-]/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
      setNewTitle(cleanName);
    }
  };

  // Handle document upload submit
  const handleUploadSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      alert("Please provide a title for the document.");
      return;
    }
    if (!newProvider.trim()) {
      alert("Please specify the medical facility or issuing provider.");
      return;
    }
    if (!newDate) {
      alert("Please enter the record date.");
      return;
    }
    if (!attachedFile) {
      alert("Please attach/upload a digital copy of the record.");
      return;
    }

    // Simulate upload progress
    setUploadProgress(10);
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev === null) return null;
        if (prev >= 100) {
          clearInterval(interval);
          completeUpload();
          return 100;
        }
        return prev + 15;
      });
    }, 150);
  };

  const completeUpload = () => {
    setTimeout(() => {
      // Mock File Size Helper
      const sizeStr = attachedFile 
        ? (attachedFile.size < 1024 * 1024 
          ? `${Math.round(attachedFile.size / 1024)} KB` 
          : `${(attachedFile.size / (1024 * 1024)).toFixed(1)} MB`)
        : '2.1 MB';

      const mockHash = 'mc_sha256_' + Array.from({length: 64}, () => Math.floor(Math.random()*16).toString(16)).join('');

      const newRecord: MedicalRecord = {
        id: `rec-${Date.now()}`,
        title: newTitle.trim(),
        category: newCategory,
        date: newDate,
        providerName: newProvider.trim(),
        fileName: attachedFile?.name || 'uploaded_medical_document.pdf',
        fileSize: sizeStr,
        fileType: attachedFile?.type || 'application/pdf',
        notes: newNotes.trim() || 'Uploaded securely by patient.',
        verifiedStatus: 'Self-Uploaded',
        hash: mockHash,
        fileDataUrl: attachedFileDataUrl || undefined
      };

      const updated = [newRecord, ...records];
      saveRecordsToStorage(updated);

      // Trigger success indicators
      setUploadProgress(null);
      setIsUploadSuccess(true);

      // Reset Form State
      setTimeout(() => {
        setIsUploadSuccess(false);
        setIsUploadingOpen(false);
        setNewTitle('');
        setNewProvider('');
        setNewDate('');
        setNewNotes('');
        setAttachedFile(null);
        setAttachedFileDataUrl(null);
      }, 1500);

    }, 500);
  };

  // Delete Record
  const handleDeleteRecord = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to permanently delete this clinical document? This action cannot be undone.")) return;
    
    const updated = records.filter(r => r.id !== id);
    saveRecordsToStorage(updated);
    if (activeRecordDetail?.id === id) {
      setActiveRecordDetail(null);
    }
  };

  return (
    <div className="space-y-6" id="medical-history-container">
      
      {/* SECTION HEADER */}
      <div className="border-b-2 border-slate-200/80 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
            <Lock className="h-4.5 w-4.5 text-[#DC2626]" />
            SECURED PATIENT CLINICAL HISTORY
          </h3>
          <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
            Store, catalog, and query clinical outcomes, vaccination histories, and lab certificates privately.
          </p>
        </div>
        <button
          onClick={() => setIsUploadingOpen(true)}
          className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold py-2.5 px-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 hover:scale-[1.01] shrink-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#DC2626]"
        >
          <Plus className="h-4 w-4" />
          Add Medical Record
        </button>
      </div>

      {/* FILTER & SEARCH ROW */}
      <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-4 shadow-xs grid grid-cols-1 md:grid-cols-12 gap-3">
        {/* Search Input */}
        <div className="md:col-span-5 relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search documents, diagnostics, or providers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full text-xs font-semibold pl-10 pr-4 py-2.5 bg-slate-50 border-2 border-slate-150 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150"
          />
        </div>

        {/* Categories Pills */}
        <div className="md:col-span-7 flex flex-wrap gap-1.5 items-center">
          <Filter className="h-4 w-4 text-slate-400 mr-1 hidden sm:block" />
          {['All', 'Lab Result', 'Vaccination Card', 'Imaging/Scan', 'Prescription', 'Other'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all duration-150 cursor-pointer border focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-rose-300 ${
                selectedCategory === cat 
                  ? 'bg-[#FFF0F2] border-[#FECDD3] text-[#B91C1C] font-extrabold' 
                  : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* DOCUMENTS GRID */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white border-2 border-slate-200/80 rounded-2xl p-16 text-center space-y-4">
          <FileText className="h-14 w-14 text-slate-200 mx-auto" />
          <div>
            <h4 className="text-sm font-extrabold text-slate-800">No medical records matched</h4>
            <p className="text-xs text-slate-500 font-semibold max-w-sm mx-auto mt-1 leading-normal">
              Try adjusting your query or upload your vaccination cards, blood test panel reports, or chest X-Rays directly.
            </p>
          </div>
          <button
            onClick={() => setIsUploadingOpen(true)}
            className="text-xs font-bold text-[#DC2626] hover:text-[#B91C1C] hover:bg-[#FFF0F2] px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            Upload first document
          </button>
        </div>
      ) : (
        <motion.div 
          initial="hidden"
          animate="show"
          variants={{
            hidden: { opacity: 0 },
            show: {
              opacity: 1,
              transition: {
                staggerChildren: 0.05
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filteredRecords.map((record) => {
            const isVerified = record.verifiedStatus === 'Verified ✅';
            return (
              <motion.div
                key={record.id}
                onClick={() => setActiveRecordDetail(record)}
                variants={{
                  hidden: { opacity: 0, y: 15 },
                  show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 220, damping: 22 } }
                }}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setActiveRecordDetail(record);
                  }
                }}
                className="bg-white border-2 border-slate-200/80 hover:border-[#FECDD3] rounded-2xl p-5 shadow-xs transition-all duration-200 flex flex-col justify-between hover:scale-[1.01] cursor-pointer group relative overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#DC2626]/20 focus:border-[#DC2626]"
              >
                {/* Visual Category Accent strip */}
                <div className={`absolute top-0 left-0 right-0 h-1 ${
                  record.category === 'Lab Result' ? 'bg-[#DC2626]' :
                  record.category === 'Vaccination Card' ? 'bg-emerald-500' :
                  record.category === 'Imaging/Scan' ? 'bg-[#DC2626]' :
                  record.category === 'Prescription' ? 'bg-amber-500' : 'bg-slate-400'
                }`} />

                <div className="space-y-4">
                  {/* Category & Status Badges */}
                  <div className="flex items-center justify-between">
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md tracking-wider ${
                      record.category === 'Lab Result' ? 'bg-[#FFF0F2] text-[#DC2626]' :
                      record.category === 'Vaccination Card' ? 'bg-emerald-50 text-emerald-700' :
                      record.category === 'Imaging/Scan' ? 'bg-[#FFF0F2] text-[#DC2626]' :
                      record.category === 'Prescription' ? 'bg-amber-50 text-amber-700' : 'bg-slate-50 text-slate-600'
                    }`}>
                      {record.category}
                    </span>
                    <span className={`text-[9px] font-bold ${
                      isVerified ? 'text-emerald-600 bg-emerald-50/50' :
                      record.verifiedStatus === 'Awaiting Review' ? 'text-amber-600 bg-amber-50/50' : 'text-slate-500 bg-slate-50'
                    } px-2 py-0.5 rounded-md`}>
                      {record.verifiedStatus}
                    </span>
                  </div>

                  {/* Document Title & Provider */}
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 group-hover:text-[#DC2626] transition-colors line-clamp-1">{record.title}</h4>
                    <p className="text-[10px] text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
                      <Building className="h-3 w-3 shrink-0" />
                      <span className="truncate">{record.providerName}</span>
                    </p>
                  </div>

                  {/* Date and File Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-bold text-slate-500 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-slate-400" />
                      <span>{record.date}</span>
                    </div>
                    <div className="flex items-center gap-1 justify-end">
                      <span className="text-[9px] font-semibold text-slate-400 truncate max-w-[80px]">{record.fileName}</span>
                      <span className="text-slate-400">({record.fileSize})</span>
                    </div>
                  </div>

                  {/* Notes summary */}
                  {record.notes && (
                    <p className="text-[10px] text-slate-500 font-medium line-clamp-2 italic bg-slate-50/50 p-2 rounded-lg">
                      "{record.notes}"
                    </p>
                  )}
                </div>

                {/* Card Actions */}
                <div className="border-t border-slate-100 pt-3.5 mt-4 flex items-center justify-between text-xs font-bold text-slate-600">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-[#DC2626] font-extrabold group-hover:underline flex items-center gap-1">
                      <Eye className="h-3 w-3" />
                      Review Report
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActivePreviewRecord(record);
                      }}
                      className="text-[9px] text-emerald-700 font-extrabold flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                      title="Open interactive document lightbox"
                    >
                      <FileText className="h-3.5 w-3.5" />
                      Preview File
                    </button>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteRecord(record.id, e)}
                    className="text-slate-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-400"
                    title="Delete record permanently"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>

              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* ================================================= */}
      {/* MODAL / DRAWER: UPLOAD SECURE DOCUMENT            */}
      {/* ================================================= */}
      {isUploadingOpen && (
        <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-lg border-2 border-slate-200/80 shadow-2xl overflow-hidden flex flex-col justify-between max-h-[90vh]">
            
            {/* Header */}
            <div className="bg-[#0F172A] text-white p-5 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <h4 className="text-sm font-extrabold tracking-tight flex items-center gap-1.5">
                  <UploadCloud className="h-4.5 w-4.5 text-rose-400" />
                  UPLOAD PATIENT HEALTH RECORD
                </h4>
                <p className="text-[10px] text-slate-300 font-semibold leading-relaxed">
                  Encryption-ready transit. Data is indexed locally on your device.
                </p>
              </div>
              <button 
                onClick={() => setIsUploadingOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Form Scroll Body */}
            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4 overflow-y-auto flex-grow">
              
              {/* FILE DROP ZONE */}
              <div className="space-y-1.5">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">1. Attach Digital Document</span>
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center space-y-2 ${
                    isDragging 
                      ? 'border-[#DC2626] bg-[#FFF0F2]' 
                      : attachedFile 
                        ? 'border-emerald-300 bg-emerald-50/10 hover:bg-emerald-50/20' 
                        : 'border-slate-300 bg-slate-50 hover:bg-slate-100/50'
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden" 
                  />

                  {attachedFile ? (
                    <>
                      <div className="bg-emerald-100 text-emerald-800 p-2.5 rounded-xs border border-emerald-200">
                        <FileCheck className="h-6 w-6" />
                      </div>
                      <div className="space-y-1 text-center">
                        <h5 className="text-xs font-bold text-slate-800 truncate max-w-[300px]">{attachedFile.name}</h5>
                        <p className="text-[10px] text-slate-400 font-semibold">
                          {(attachedFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Ready for indexing
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="bg-[#FFF0F2] text-[#DC2626] p-2.5 rounded-full border border-[#FECDD3]">
                        <UploadCloud className="h-6 w-6" />
                      </div>
                      <div className="space-y-1">
                        <p className="text-xs font-extrabold text-slate-700">Drag & Drop file here, or click to browse</p>
                        <p className="text-[10px] text-slate-400 font-semibold leading-relaxed">
                          Supports PDF, PNG, or JPG (Max file size: 10MB)
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* DOCUMENT DETAILS FORM */}
              <div className="space-y-4 pt-1">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">2. Categorisation & Provider</span>
                        {/* Document Name / Title */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Record / Document Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Fasting Lipid Panel, Pfizer Dose 3 Certificate"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 px-3 border-2 border-slate-200 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category Selector */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">Category</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full text-xs font-bold py-2.5 px-3 border-2 border-slate-200 rounded-xl bg-white focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150"
                    >
                      <option value="Lab Result">Lab Result</option>
                      <option value="Vaccination Card">Vaccination Card</option>
                      <option value="Prescription">Prescription</option>
                      <option value="Imaging/Scan">Imaging/Scan</option>
                      <option value="Other">Other Document</option>
                    </select>
                  </div>

                  {/* Record Date */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 block">Date of Record</label>
                    <input
                      type="date"
                      required
                      value={newDate}
                      onChange={(e) => setNewDate(e.target.value)}
                      className="w-full text-xs font-semibold py-2.5 px-3 border-2 border-slate-200 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150"
                    />
                  </div>
                </div>

                {/* Issuing Facility */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Medical Provider / Issuing Institution</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kuala Lumpur Specialist Hospital, Metro Lab"
                    value={newProvider}
                    onChange={(e) => setNewProvider(e.target.value)}
                    className="w-full text-xs font-semibold py-2.5 px-3 border-2 border-slate-200 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150"
                  />
                </div>

                {/* Notes */}
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 block">Clinical Summary / Personal Notes (Optional)</label>
                  <textarea
                    rows={2}
                    placeholder="Add brief details about the diagnostics, dosage rules, or clinician recommendations..."
                    value={newNotes}
                    onChange={(e) => setNewNotes(e.target.value)}
                    className="w-full text-xs font-semibold p-3 border-2 border-slate-200 rounded-xl focus:border-[#DC2626] focus:ring-2 focus:ring-[#DC2626]/20 focus:outline-none transition-all duration-150 resize-none"
                  />
                </div>
              </div>

              {/* Progress and status overlays */}
              {uploadProgress !== null && (
                <div className="bg-[#FFF0F2] border border-[#FECDD3] rounded-xl p-3 space-y-1.5">
                  <div className="flex justify-between items-center text-[10px] font-bold text-[#B91C1C]">
                    <span>Securing document files and hashing to MediCert Registry...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-[#FFF0F2] h-2 rounded-full overflow-hidden">
                    <div className="bg-[#DC2626] h-full transition-all duration-150" style={{ width: `${uploadProgress}%` }}></div>
                  </div>
                </div>
              )}

              {isUploadSuccess && (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 text-xs font-bold text-emerald-800 animate-pulse">
                  <ShieldCheck className="h-4.5 w-4.5 text-emerald-600" />
                  <span>Document securely synced and local hash record established!</span>
                </div>
              )}

            </form>

            {/* Actions footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
              <span className="text-[9px] text-slate-400 font-bold max-w-[200px]">
                🔒 Uploaded files are securely parsed on client-side and saved.
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setIsUploadingOpen(false)}
                  className="border-2 border-slate-200 text-slate-700 text-xs font-bold py-2.5 px-4 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleUploadSubmit}
                  disabled={uploadProgress !== null || isUploadSuccess}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all shadow-md flex items-center gap-1.5 disabled:opacity-55 disabled:cursor-not-allowed hover:scale-[1.01] cursor-pointer"
                >
                  <FileText className="h-4 w-4" />
                  Save Record
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ================================================= */}
      {/* MODAL: VIEW DETAILED STRUCTURED CLINICAL REPORT  */}
      {/* ================================================= */}
      {activeRecordDetail && (
        <div className="fixed inset-0 bg-slate-100/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-white rounded-3xl w-full max-w-2xl border-2 border-slate-200/80 shadow-2xl overflow-hidden flex flex-col justify-between max-h-[90vh]">
            
            {/* Topbar */}
            <div className="bg-[#0F172A] text-white p-5 flex justify-between items-center shrink-0">
              <div className="space-y-1">
                <span className="text-[9px] font-extrabold uppercase bg-[#DC2626]/25 text-rose-300 border border-[#DC2626]/30 px-2.5 py-0.5 rounded-full tracking-wider">
                  {activeRecordDetail.category}
                </span>
                <h4 className="text-sm font-extrabold tracking-tight mt-1">{activeRecordDetail.title}</h4>
              </div>
              <button 
                onClick={() => setActiveRecordDetail(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Scrollable Report Sheet */}
            <div className="p-6 space-y-6 overflow-y-auto flex-grow bg-slate-50/50">
              
              {/* Document Registry Header Verification */}
              <div className="bg-white border-2 border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-3.5">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="h-8.5 w-8.5 rounded-xl bg-[#FFF0F2] text-[#DC2626] flex items-center justify-center border border-[#FECDD3]">
                      <ShieldCheck className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wider leading-none">Security Registry</span>
                      <span className="text-[11px] font-bold text-slate-700 block mt-1">E-Health Verification Compliant</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full text-center shrink-0 ${
                    activeRecordDetail.verifiedStatus === 'Verified ✅' ? 'block' : 'hidden'
                  }`}>
                    {activeRecordDetail.verifiedStatus}
                  </span>
                  {activeRecordDetail.verifiedStatus !== 'Verified ✅' && (
                    <span className="text-[10px] font-extrabold text-slate-600 bg-slate-100 border border-slate-200/60 px-3 py-1 rounded-full text-center shrink-0">
                      Self-Uploaded Patient File
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold text-slate-600">
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wide text-slate-400 block">Facility / Registry</span>
                    <p className="flex items-center gap-1.5 text-slate-800 font-semibold">
                      <Building className="h-4 w-4 text-slate-400" />
                      {activeRecordDetail.providerName}
                    </p>
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[9px] uppercase tracking-wide text-slate-400 block">Clinical Date</span>
                    <p className="flex items-center gap-1.5 text-slate-800 font-semibold">
                      <Calendar className="h-4 w-4 text-slate-400" />
                      {activeRecordDetail.date}
                    </p>
                  </div>
                </div>

                {activeRecordDetail.hash && (
                  <div className="bg-slate-100 p-2.5 rounded-xl border border-slate-200 text-[9px] font-mono font-bold text-slate-500 break-all space-y-1 select-all">
                    <span className="text-[8px] uppercase font-sans tracking-wide text-slate-400 block font-bold">SHA-256 INTEGRITY HASH</span>
                    <span>{activeRecordDetail.hash}</span>
                  </div>
                )}
              </div>

              {/* REPORT DETAILS SHEET (DYNAMIC CONTENT) */}
              <div className="space-y-4">
                <span className="text-[10px] uppercase font-extrabold text-slate-500 tracking-wider block">Structured Diagnostics Summary</span>
                
                {/* CASE A: LAB RESULT RESULTS LIST */}
                {activeRecordDetail.structuredData?.results && (
                  <div className="bg-white border-2 border-slate-200/60 rounded-2xl overflow-hidden shadow-xs">
                    <div className="bg-[#0F172A] text-white px-4 py-2.5 text-[10px] font-extrabold uppercase tracking-wider">
                      {activeRecordDetail.structuredData.testName || 'Laboratory Analysis Breakdown'}
                    </div>
                    <div className="divide-y divide-slate-100">
                      {activeRecordDetail.structuredData.results.map((res, idx) => (
                        <div key={idx} className="p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-slate-50/55 transition-colors">
                          <span className="text-xs font-extrabold text-slate-800">{res.name}</span>
                          <div className="flex items-center gap-4 text-xs font-bold">
                            <div className="text-right">
                              <span className={`text-sm font-black ${
                                res.status === 'High' ? 'text-rose-600' :
                                res.status === 'Low' ? 'text-amber-600' : 'text-slate-900'
                              }`}>
                                {res.value}
                              </span>
                              <span className="text-[10px] text-slate-400 font-semibold ml-1">{res.unit}</span>
                            </div>
                            <div className="w-[100px] text-right text-[10px] text-slate-400 font-semibold">
                              Range: {res.range}
                            </div>
                            <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-md min-w-[65px] text-center ${
                              res.status === 'Normal' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' :
                              'bg-rose-50 text-rose-700 border border-rose-100'
                            }`}>
                              {res.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CASE B: VACCINATION DOSES SHEET */}
                {activeRecordDetail.structuredData?.doses && (
                  <div className="space-y-3.5">
                    <div className="bg-white border-2 border-slate-200/60 rounded-2xl p-4 shadow-xs">
                      <span className="text-[10px] uppercase font-extrabold text-slate-400 block tracking-wide">Vaccine Formulation</span>
                      <h5 className="text-xs font-extrabold text-slate-800 mt-1">{activeRecordDetail.structuredData.vaccineName}</h5>
                    </div>

                    <div className="space-y-2.5">
                      {activeRecordDetail.structuredData.doses.map((dose) => (
                        <div key={dose.doseNumber} className="bg-white border-2 border-slate-200/60 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 rounded-xs bg-emerald-50 text-emerald-600 flex items-center justify-center font-extrabold border border-emerald-100 text-xs">
                              #{dose.doseNumber}
                            </div>
                            <div>
                              <h6 className="text-xs font-extrabold text-slate-800">Dose {dose.doseNumber} Administered</h6>
                              <p className="text-[10px] text-slate-400 font-semibold mt-0.5">{dose.center}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-xs font-bold text-slate-600 text-right shrink-0 sm:min-w-[180px]">
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] uppercase tracking-wide text-slate-400 block">Batch</span>
                              <span className="text-slate-800 font-bold">{dose.batch}</span>
                            </div>
                            <div className="text-left sm:text-right">
                              <span className="text-[9px] uppercase tracking-wide text-slate-400 block">Date</span>
                              <span className="text-slate-800 font-bold">{dose.date}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* CASE C: IMAGING FINDINGS TEXT */}
                {activeRecordDetail.structuredData?.imagingFindings && (
                  <div className="bg-white border-2 border-slate-200/60 rounded-2xl p-4.5 shadow-xs space-y-3">
                    <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                      <span className="text-xs font-extrabold text-[#DC2626] bg-[#FFF0F2] px-2 py-0.5 rounded">PA View</span>
                      <span className="text-xs font-extrabold text-slate-800">{activeRecordDetail.structuredData.testName}</span>
                    </div>
                    <div className="text-xs text-slate-700 font-semibold leading-relaxed font-mono bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                      {activeRecordDetail.structuredData.imagingFindings}
                    </div>
                  </div>
                )}

                {/* GENERAL NOTE IF PRESENT */}
                {activeRecordDetail.notes && (
                  <div className="bg-white border-2 border-slate-200/60 rounded-2xl p-4 shadow-xs space-y-1.5">
                    <span className="text-[9px] uppercase font-extrabold text-slate-400 block tracking-wide">Patient Clinical Remarks</span>
                    <p className="text-xs text-slate-600 font-semibold italic">
                      "{activeRecordDetail.notes}"
                    </p>
                  </div>
                )}

                {/* DIGITAL FILE PREVIEW BOX */}
                <div className="bg-slate-100 border-2 border-slate-200 rounded-2xl p-5 text-center space-y-2.5">
                  <div className="bg-slate-200 text-slate-500 p-3 rounded-2xl inline-block">
                    <FileText className="h-8 w-8" />
                  </div>
                  <div>
                    <h5 className="text-xs font-bold text-slate-800">{activeRecordDetail.fileName}</h5>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      {activeRecordDetail.fileType} &bull; {activeRecordDetail.fileSize}
                    </p>
                  </div>
                  <div className="pt-2 flex justify-center gap-2 flex-wrap">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        setActivePreviewRecord(activeRecordDetail);
                      }}
                      className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-bold px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-xs focus:outline-none focus:ring-2 focus:ring-[#DC2626] focus:ring-offset-2"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Interactive Lightbox Preview
                    </button>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); alert("Preparing digital download zip with verified GPG signature hash..."); }}
                      className="bg-white border border-slate-200 hover:border-[#DC2626] hover:bg-[#FFF0F2] text-slate-700 hover:text-[#DC2626] text-xs font-bold px-3.5 py-2 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download Raw Document
                    </a>
                  </div>
                </div>

              </div>

            </div>

            {/* Actions Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-between items-center shrink-0">
              <span className="text-[9px] text-slate-400 font-mono font-bold">
                MediCert Secure Health Record Ledger
              </span>
              <div className="flex gap-2">
                <button
                  onClick={(e) => { handleDeleteRecord(activeRecordDetail.id, e); }}
                  className="border-2 border-rose-100 text-rose-600 hover:bg-rose-50 text-xs font-bold py-2.5 px-4 rounded-xl transition-all cursor-pointer"
                >
                  Delete Record
                </button>
                <button
                  onClick={() => setActiveRecordDetail(null)}
                  className="bg-[#DC2626] hover:bg-[#DC2626] text-white text-xs font-bold py-2.5 px-5 rounded-xl transition-all cursor-pointer"
                >
                  Close Report
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Lightbox Document Preview */}
      {activePreviewRecord && (
        <DocumentViewer 
          record={activePreviewRecord} 
          onClose={() => setActivePreviewRecord(null)} 
        />
      )}

    </div>
  );
}
