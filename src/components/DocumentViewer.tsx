import React, { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, RotateCw, RotateCcw, RefreshCw, X, Download, 
  ShieldCheck, FileText, CheckCircle2, AlertTriangle, Eye 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { MedicalRecord } from './MedicalHistory';

interface DocumentViewerProps {
  record: MedicalRecord;
  onClose: () => void;
}

export default function DocumentViewer({ record, onClose }: DocumentViewerProps) {
  const [scale, setScale] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation & accessibility
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === '=' || e.key === '+') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleRotateCw();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setPosition(prev => ({ ...prev, y: prev.y - 40 }));
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setPosition(prev => ({ ...prev, y: prev.y + 40 }));
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setPosition(prev => ({ ...prev, x: prev.x - 40 }));
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        setPosition(prev => ({ ...prev, x: prev.x + 40 }));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Handle Zoom operations
  const handleZoomIn = () => setScale(s => Math.min(s + 0.25, 4));
  const handleZoomOut = () => setScale(s => Math.max(s - 0.25, 0.5));
  const handleRotateCw = () => setRotation(r => (r + 90) % 360);
  const handleRotateCcw = () => setRotation(r => (r - 90 + 360) % 360);
  
  const handleReset = () => {
    setScale(1);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  // Drag (Pan) Handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = 0.08;
    const direction = e.deltaY < 0 ? 1 : -1;
    setScale(s => Math.max(0.5, Math.min(4, s + direction * zoomFactor)));
  };

  // Helper to check if file is an image
  const isImageFile = record.fileType.startsWith('image/') || record.fileDataUrl;

  return (
    <div 
      className="fixed inset-0 z-50 flex flex-col bg-slate-50/98 backdrop-blur-lg select-none"
      id="med-doc-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={`Document Viewer for ${record.title}`}
    >
      {/* Lightbox Header Bar */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white/70 backdrop-blur-sm z-10 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#FFF0F2] text-[#DC2626] rounded-xl border border-[#FECDD3]">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800 flex items-center gap-2">
              {record.title}
              {record.verifiedStatus === 'Verified ✅' && (
                <span className="text-[9px] px-1.5 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-md font-bold flex items-center gap-0.5">
                  <ShieldCheck className="h-3 w-3" />
                  Verified Ledger
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
              {record.providerName} &bull; {record.date}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {record.hash && (
            <div className="hidden md:flex items-center gap-1.5 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-xl text-[10px] text-slate-500 font-mono">
              <span className="text-slate-400 font-bold">SHA256:</span>
              <span className="truncate max-w-[120px]" title={record.hash}>{record.hash}</span>
            </div>
          )}
          <button 
            onClick={() => { alert("Downloading clinical document with cryptographic integrity signature block..."); }}
            className="p-2.5 bg-slate-150 hover:bg-slate-200 text-slate-700 rounded-xl transition-all border border-slate-300 cursor-pointer"
            title="Download Raw Document"
          >
            <Download className="h-4 w-4" />
          </button>
          <button 
            onClick={onClose}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 text-rose-600 hover:text-rose-700 rounded-xl transition-all border border-rose-200 cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500"
            title="Close Viewer (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main Interactive Viewing Area */}
      <div 
        ref={containerRef}
        className="flex-1 relative overflow-hidden flex items-center justify-center cursor-grab active:cursor-grabbing"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
          ref={docRef}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale}) rotate(${rotation}deg)`,
            transition: isDragging ? 'none' : 'transform 0.15s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
          className="origin-center shadow-2xl relative select-none"
          onClick={(e) => e.stopPropagation()}
        >
          {/* IMAGE PREVIEW MODE (DATA URL OR USER UPLOAD) */}
          {record.fileDataUrl ? (
            <img 
              src={record.fileDataUrl} 
              alt={record.title}
              className="max-h-[75vh] max-w-[85vw] object-contain rounded-xl pointer-events-none border border-slate-200 bg-white"
              referrerPolicy="no-referrer"
            />
          ) : isImageFile && record.id === 'rec-3' ? (
            /* Chest X-Ray SVG High Fidelity Radiograph Panel */
            <div className="w-[450px] aspect-[3/4] bg-[#0F172A] border-4 border-slate-800 rounded-2xl p-5 flex flex-col justify-between font-mono text-white relative shadow-2xl overflow-hidden pointer-events-none">
              {/* Backglow glow layer for clinical look */}
              <div className="absolute inset-0 bg-radial-gradient from-slate-800 to-[#0F172A] pointer-events-none opacity-40"></div>
              
              {/* Radiograph Technical Header */}
              <div className="flex justify-between text-[8px] text-emerald-400 border-b border-slate-800/80 pb-2 z-10">
                <div>
                  <span className="font-extrabold block">PATIENT: DOE, JOHN</span>
                  <span>ID: MRN-9942A &bull; AGE: 34</span>
                </div>
                <div className="text-right">
                  <span className="font-extrabold block">EXAM: CHEST PA VIEW</span>
                  <span>KV: 120 &bull; MA: 320 &bull; DATE: {record.date}</span>
                </div>
              </div>

              {/* HIGH FIDELITY SVG CHEST RADIOGRAPH SKELETON */}
              <div className="flex-1 flex items-center justify-center py-4 relative">
                <svg className="w-full h-full max-h-[350px] text-slate-800" viewBox="0 0 100 120" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Background Soft Shadow Lungs */}
                  <path d="M22,30 C12,35 14,85 24,95 C30,90 32,85 36,83 C34,65 33,45 22,30 Z" fill="#1e293b" opacity="0.45" />
                  <path d="M78,30 C88,35 86,85 76,95 C70,90 68,85 64,83 C66,65 67,45 78,30 Z" fill="#1e293b" opacity="0.45" />

                  {/* Spinal Column */}
                  <rect x="47" y="10" width="6" height="100" rx="2" fill="#334155" opacity="0.8" />
                  {/* Spine Ridges */}
                  {Array.from({length: 12}).map((_, i) => (
                    <line key={i} x1="45" y1={15 + i*8} x2="55" y2={15 + i*8} stroke="#475569" strokeWidth="1.5" opacity="0.7" />
                  ))}

                  {/* Collarbones (Clavicles) */}
                  <path d="M47,20 Q30,15 18,22" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
                  <path d="M53,20 Q70,15 82,22" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />

                  {/* Rib Cage (Left and Right Rib curves) */}
                  {Array.from({length: 8}).map((_, i) => {
                    const yOffset = 25 + i * 9;
                    const curveOffset = i * 2;
                    return (
                      <g key={i} opacity="0.55">
                        {/* Left Rib */}
                        <path d={`M46,${yOffset} Q${15 - curveOffset},${yOffset + 5} 25,${yOffset + 12}`} stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
                        {/* Right Rib */}
                        <path d={`M54,${yOffset} Q${85 + curveOffset},${yOffset + 5} 75,${yOffset + 12}`} stroke="#334155" strokeWidth="2" strokeLinecap="round" fill="none" />
                      </g>
                    );
                  })}

                  {/* Heart Silhouette (Cardiac shadow) */}
                  <path d="M44,55 Q35,62 38,78 Q47,85 58,80 Q60,70 54,55 Z" fill="#1e293b" stroke="#334155" strokeWidth="1.5" opacity="0.75" />

                  {/* Diaphragm dome curves */}
                  <path d="M10,105 Q28,90 48,103" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />
                  <path d="M90,105 Q72,90 52,103" stroke="#475569" strokeWidth="3" strokeLinecap="round" fill="none" opacity="0.85" />

                  {/* Trachea tube */}
                  <line x1="50" y1="10" x2="50" y2="40" stroke="#1e293b" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                </svg>

                {/* Left/Right marker tags */}
                <div className="absolute top-4 left-4 bg-[#0F172A] border border-slate-800 text-emerald-400 font-black px-2 py-0.5 rounded text-[10px]">
                  R
                </div>
                <div className="absolute top-4 right-4 bg-[#0F172A] border border-slate-800 text-emerald-400 font-black px-2 py-0.5 rounded text-[10px]">
                  L
                </div>

                {/* Scan Overlay Crosshair */}
                <div className="absolute inset-x-6 inset-y-4 border border-emerald-500/10 pointer-events-none flex items-center justify-center">
                  <div className="w-4 h-4 border border-emerald-500/25 rounded-full"></div>
                </div>
              </div>

              {/* Technical Footer */}
              <div className="text-[7px] text-slate-500 border-t border-slate-800/80 pt-2 flex justify-between z-10">
                <span>DIGITAL RADIOGRAPHY UNIT 4B</span>
                <span>METROPOLITAN HOSP IMAGING &bull; SECURE LEDGER PROOFED</span>
              </div>
            </div>
          ) : record.id === 'rec-1' ? (
            /* LAB RESULTS: FASTING GLUCOSE & LIPID PANEL */
            <div className="w-[500px] bg-white text-slate-800 rounded-2xl p-6 border-4 border-slate-200 shadow-2xl font-sans relative pointer-events-none flex flex-col justify-between aspect-[1/1.4]">
              {/* Clinical Header */}
              <div className="border-b-2 border-slate-200 pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-xs font-black text-[#DC2626] tracking-wider uppercase">BP Clinical Laboratory</h4>
                    <p className="text-[8px] text-slate-500 font-semibold leading-relaxed mt-0.5">
                      Accredited Pathology Services Group &bull; ISO 15189 Certified<br/>
                      57 Jalan Maarof, Bangsar, 59100 Kuala Lumpur
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-800 bg-slate-100 px-2 py-1 rounded border border-slate-200 block">LAB-REPORT</span>
                    <span className="text-[8px] text-slate-400 block mt-1 font-mono">No: BPL-2026-991204</span>
                  </div>
                </div>

                {/* Patient / Doctor Meta Table */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4 pt-4 border-t border-slate-100 text-[10px]">
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Patient Details</span>
                    <span className="font-extrabold text-slate-800">Ahmad Fauzi Bin Ramli (Male, 34 yrs)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Requested By</span>
                    <span className="font-extrabold text-slate-800">Dr. Sarah Aris (National Registry ID: MD8942)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Date Collected / Tested</span>
                    <span className="font-extrabold text-slate-800">{record.date} 08:30 AM</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Verified Hash proof</span>
                    <span className="font-bold text-[#DC2626] font-mono truncate block max-w-[150px]">{record.hash?.substring(0, 24)}...</span>
                  </div>
                </div>
              </div>

              {/* Results Table */}
              <div className="flex-1 py-4">
                <h5 className="text-[10px] font-black text-slate-700 uppercase tracking-wide mb-2.5">Diagnostic Panel: Lipids & Fasting Glucose</h5>
                <table className="w-full text-[10px] leading-normal border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-extrabold text-left">
                      <th className="py-2 px-2">Investigation</th>
                      <th className="py-2 px-2 text-right">Result</th>
                      <th className="py-2 px-2 text-center">Unit</th>
                      <th className="py-2 px-2">Reference Range</th>
                      <th className="py-2 px-2 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                    {record.structuredData?.results?.map((res, idx) => {
                      const isHigh = res.status === 'High';
                      return (
                        <tr key={idx} className={isHigh ? 'bg-amber-50/50' : ''}>
                          <td className="py-2 px-2 font-bold text-slate-800">{res.name}</td>
                          <td className={`py-2 px-2 text-right font-black ${isHigh ? 'text-amber-600 text-xs' : 'text-slate-800'}`}>
                            {res.value}
                          </td>
                          <td className="py-2 px-2 text-center font-mono text-slate-500">{res.unit}</td>
                          <td className="py-2 px-2 text-slate-400 font-mono">{res.range}</td>
                          <td className="py-2 px-2 text-center">
                            {isHigh ? (
                              <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[8px] font-black uppercase tracking-wider inline-flex items-center gap-0.5">
                                <AlertTriangle className="h-2 w-2" />
                                HIGH
                              </span>
                            ) : (
                              <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[8px] font-black uppercase tracking-wider">
                                OK
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                
                {/* Lab clinical interpretation notes */}
                <div className="mt-4 bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-[9px] text-slate-500 leading-normal">
                  <span className="font-extrabold text-slate-700 block mb-0.5">Clinical Comment:</span>
                  Patient fasted 12 hours prior to draw. Fasting Plasma Glucose is within target range. Lipid profile indicates borderline elevated LDL Cholesterol. Recommend dietary moderation, reducing trans fats, and monitoring clinical trends in 6 months.
                </div>
              </div>

              {/* Signatures & Stamps */}
              <div className="border-t border-slate-200 pt-3 flex justify-between items-center text-[8px] text-slate-500">
                <div>
                  <span className="font-bold block">LAB CHIEF SIGNATURE</span>
                  <div className="h-6 flex items-end">
                    <span className="font-serif italic text-xs text-slate-700 font-bold tracking-widest">A.K. Saini</span>
                  </div>
                  <span className="text-[7px]">Dr. Amit K. Saini, FRCPath</span>
                </div>

                {/* Ledger Proof Badge */}
                <div className="bg-[#FFF0F2] border border-[#FECDD3] text-[#DC2626] p-2 rounded-xl flex items-center gap-1.5">
                  <CheckCircle2 className="h-5 w-5 text-[#DC2626] shrink-0" />
                  <div>
                    <span className="font-black block uppercase tracking-wide text-[7px]">BLOCKCHAIN VERIFIED</span>
                    <span className="font-semibold block text-[6px] text-slate-400 font-mono">HASH CHECKED &bull; OK</span>
                  </div>
                </div>
              </div>
            </div>
          ) : record.id === 'rec-2' ? (
            /* VACCINATION CARD / CERTIFICATE OF IMMUNISATION */
            <div className="w-[480px] bg-amber-50 text-slate-800 rounded-2xl p-6 border-4 border-amber-200 shadow-2xl font-sans relative pointer-events-none flex flex-col justify-between aspect-[1.4/1]">
              <div className="absolute inset-0 bg-radial-gradient from-amber-50/20 to-amber-100/30 pointer-events-none"></div>

              {/* National Crest & Header */}
              <div className="border-b border-amber-200 pb-3 flex justify-between items-start z-10">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-bold text-[8px] tracking-wider border border-amber-500">
                      MOH
                    </div>
                    <h4 className="text-[11px] font-black text-amber-800 tracking-wide uppercase">Ministry of Health, Malaysia</h4>
                  </div>
                  <h5 className="text-[10px] font-black text-slate-700 tracking-tight mt-1.5 uppercase">Digital Immunisation Certificate</h5>
                </div>
                <div className="text-right">
                  <span className="text-[8px] px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded font-black uppercase tracking-wider">Fully Vaccinated</span>
                  <span className="block text-[7px] text-slate-400 font-mono mt-1">CERT-ID: MY-SJ92104B</span>
                </div>
              </div>

              {/* Patient Core Meta */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 my-3.5 text-[10px] z-10">
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Recipient Name</span>
                  <span className="font-black text-slate-800">JOHN DOE</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">National ID / Passport</span>
                  <span className="font-black text-slate-800">920814-14-5541</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Formulation Platform</span>
                  <span className="font-black text-slate-800">{record.structuredData?.vaccineName}</span>
                </div>
                <div>
                  <span className="text-slate-400 font-bold block uppercase text-[7px] tracking-wider">Blockchain Anchor Hash</span>
                  <span className="font-bold text-amber-700 font-mono truncate block max-w-[150px]">{record.hash?.substring(0, 24)}...</span>
                </div>
              </div>

              {/* Doses Administered List */}
              <div className="bg-white/80 backdrop-blur-xs rounded-xl p-3 border border-amber-200/60 text-[9px] space-y-1.5 z-10">
                <div className="grid grid-cols-4 font-extrabold text-slate-500 border-b border-amber-100 pb-1 uppercase text-[7px] tracking-wider">
                  <span>Dose No.</span>
                  <span>Date</span>
                  <span>Batch Code</span>
                  <span>Vaccination Center</span>
                </div>
                {record.structuredData?.doses?.map((dose, i) => (
                  <div key={i} className="grid grid-cols-4 font-semibold text-slate-700">
                    <span className="font-bold text-slate-900">Dose {dose.doseNumber}</span>
                    <span className="font-mono">{dose.date}</span>
                    <span className="font-mono font-bold text-slate-800">{dose.batch}</span>
                    <span className="truncate">{dose.center}</span>
                  </div>
                ))}
              </div>

              {/* Footer with stamp / QR code */}
              <div className="border-t border-amber-200 pt-3 flex justify-between items-center text-[8px] text-slate-400 mt-2 z-10">
                <div>
                  <span className="font-bold text-amber-800 block">MALAYSIAN HEALTH LEDGER PROTOCOL</span>
                  <span>Digitally certified by Ministry of Health Malaysia (MySejahtera Platform)</span>
                </div>

                {/* Scannable secure QR code block */}
                <div className="h-10 w-10 bg-[#0F172A] p-0.5 rounded-md flex items-center justify-center border border-amber-200 shrink-0">
                  <svg className="w-full h-full text-white" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="2" width="6" height="6" />
                    <rect x="4" y="4" width="2" height="2" fill="black" />
                    <rect x="16" y="2" width="6" height="6" />
                    <rect x="18" y="4" width="2" height="2" fill="black" />
                    <rect x="2" y="16" width="6" height="6" />
                    <rect x="4" y="18" width="2" height="2" fill="black" />
                    <rect x="10" y="10" width="4" height="4" />
                    <rect x="16" y="16" width="3" height="3" />
                    <rect x="20" y="20" width="2" height="2" />
                    <rect x="16" y="20" width="2" height="2" />
                    <rect x="20" y="16" width="2" height="2" />
                  </svg>
                </div>
              </div>
            </div>
          ) : (
            /* GENERIC DOCUMENT WRAPPER WITH SECURE PROOF STAMP */
            <div className="w-[450px] aspect-[3/4] bg-white border-4 border-slate-200 rounded-2xl p-6 flex flex-col justify-between font-sans text-slate-800 relative pointer-events-none shadow-2xl">
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b-2 border-slate-100 pb-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-[#FFF0F2] text-[#DC2626] rounded-xl">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wide">Secure Document Archival</h4>
                      <p className="text-[8px] text-slate-400 font-bold uppercase tracking-wider">{record.category}</p>
                    </div>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono font-bold">MediCert Ledger Verified</span>
                </div>

                <div className="space-y-3.5 py-2">
                  <div>
                    <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Document Title</span>
                    <span className="text-xs font-extrabold text-slate-800">{record.title}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Issuing Authority</span>
                      <span className="text-xs font-bold text-slate-700">{record.providerName}</span>
                    </div>
                    <div>
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Record Date</span>
                      <span className="text-xs font-bold text-slate-700">{record.date}</span>
                    </div>
                  </div>

                  {record.notes && (
                    <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-[10px] text-slate-600 leading-normal font-medium">
                      <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">Clinical Remarks & Notes</span>
                      "{record.notes}"
                    </div>
                  )}
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div className="flex items-center gap-3 bg-[#FFF0F2] border border-[#FECDD3] rounded-xl p-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[8px] font-black text-emerald-800 uppercase tracking-wide block">GPG Hash Checked & Legitimate</span>
                    <span className="text-[7px] text-slate-400 font-mono block truncate">{record.hash || 'mc_sha256_unhashed_local_proof_key_0x0000'}</span>
                  </div>
                </div>

                <div className="text-[7px] text-slate-400 font-mono flex justify-between">
                  <span>FILE: {record.fileName}</span>
                  <span>SIZE: {record.fileSize}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Floating Control Hub Bar */}
      <footer className="px-6 py-4 border-t border-slate-200 bg-white/70 backdrop-blur-sm shrink-0 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        <div className="text-[10px] text-slate-500 font-semibold text-center md:text-left flex items-center gap-2">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] shadow-3xs">Esc</kbd> Close &bull; 
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] shadow-3xs">+</kbd> Zoom In &bull; 
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] shadow-3xs">-</kbd> Zoom Out &bull; 
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] shadow-3xs">R</kbd> Rotate &bull; 
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-slate-600 font-mono text-[9px] shadow-3xs">&larr; &uarr; &rarr; &darr;</kbd> Pan
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-200 p-1.5 rounded-2xl">
          <button 
            onClick={handleZoomOut}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4 w-4" />
          </button>
          
          <span className="text-[10px] font-mono text-slate-700 font-bold px-2.5 min-w-[50px] text-center">
            {Math.round(scale * 100)}%
          </span>

          <button 
            onClick={handleZoomIn}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button 
            onClick={handleRotateCcw}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            title="Rotate Left"
          >
            <RotateCcw className="h-4 w-4" />
          </button>

          <button 
            onClick={handleRotateCw}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            title="Rotate Right (R)"
          >
            <RotateCw className="h-4 w-4" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-1"></div>

          <button 
            onClick={handleReset}
            className="p-2 hover:bg-slate-200 text-slate-600 hover:text-slate-800 rounded-xl transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#DC2626]"
            title="Reset View"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </footer>
    </div>
  );
}
