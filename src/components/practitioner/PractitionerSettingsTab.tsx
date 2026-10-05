import React from 'react';
import {
  Edit, Bold, Italic, List, Quote, X, Plus, Calendar, CheckCircle2, Loader, Save,
  Shield, MapPin, DollarSign
} from 'lucide-react';
import { DoctorProfile, NurseProfile } from '../../types';

interface PractitionerSettingsTabProps {
  matchedProfile: DoctorProfile | NurseProfile;
  isVerified: boolean;
  isDoc: boolean;
  avgOverall: string | null;
  reviewCount: number;
  editBio: string;
  setEditBio: React.Dispatch<React.SetStateAction<string>>;
  editFee: number;
  setEditFee: (value: number) => void;
  editAddress: string;
  setEditAddress: (value: string) => void;
  editCity: string;
  setEditCity: (value: string) => void;
  certifications: string[];
  setCertifications: (value: string[]) => void;
  newCert: string;
  setNewCert: (value: string) => void;
  editDays: string[];
  setEditDays: (value: string[]) => void;
  editSlots: string[];
  setEditSlots: (value: string[]) => void;
  newTimeSlot: string;
  setNewTimeSlot: (value: string) => void;
  savingSettings: boolean;
  settingsSuccess: boolean;
  onSubmit: (e: React.FormEvent) => void;
  showToast: (msg: string) => void;
}

export default function PractitionerSettingsTab({
  matchedProfile,
  isVerified,
  isDoc,
  avgOverall,
  reviewCount,
  editBio,
  setEditBio,
  editFee,
  setEditFee,
  editAddress,
  setEditAddress,
  editCity,
  setEditCity,
  certifications,
  setCertifications,
  newCert,
  setNewCert,
  editDays,
  setEditDays,
  editSlots,
  setEditSlots,
  newTimeSlot,
  setNewTimeSlot,
  savingSettings,
  settingsSuccess,
  onSubmit,
  showToast
}: PractitionerSettingsTabProps) {
  const addCertification = () => {
    const trimmed = newCert.trim();
    if (trimmed) {
      if (certifications.includes(trimmed)) {
        showToast("Certification already exists!");
      } else {
        setCertifications([...certifications, trimmed]);
        setNewCert('');
        showToast(`Added certification: ${trimmed}`);
      }
    }
  };

  const addTimeSlot = () => {
    const trimmed = newTimeSlot.trim();
    if (trimmed && !editSlots.includes(trimmed)) {
      setEditSlots([...editSlots, trimmed]);
      setNewTimeSlot('');
      showToast(`Added timeslot: ${trimmed}`);
    }
  };

  return (
    <div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings" tabIndex={0} className="flex flex-col xl:flex-row gap-6 animate-fade-in items-start w-full">

      {/* LEFT PANE: Configuration Form */}
      <div className="flex-1 bg-white border border-[#FECDD3] rounded-none p-6 sm:p-8 shadow-xs w-full">
        <div className="border-b border-[#FECDD3] pb-3.5 mb-6">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Edit className="h-4.5 w-4.5 text-[#DC2626]" />
            Registry Listing Configuration
          </h3>
          <p className="text-[11px] text-slate-500 font-medium">Update the public information patients find when searching the registry.</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-6">

          {/* Biography & Philosophy with formatting tools */}
          <div className="space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <label className="block text-xs font-black text-slate-700">Clinical Biography & Care Philosophy</label>

              {/* Formatting Tools */}
              <div className="flex flex-wrap gap-1 bg-slate-100 p-1 rounded-none">
                <button
                  type="button"
                  onClick={() => {
                    setEditBio(prev => prev + " **Clinical Focus:** ");
                    showToast("Added Bold template");
                  }}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-none text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Add Bold section header"
                >
                  <Bold className="h-3 w-3" />
                  <span>Bold</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditBio(prev => prev + " *[Patient Centered care]* ");
                    showToast("Added Italic template");
                  }}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-none text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Add Italic emphasis"
                >
                  <Italic className="h-3 w-3" />
                  <span>Italic</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditBio(prev => prev + "\n- Pediatric Primary Care\n- Child Development Milestones");
                    showToast("Added Bullet List template");
                  }}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-none text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Add Bullet Points"
                >
                  <List className="h-3 w-3" />
                  <span>List</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditBio(prev => prev + '\n> "My clinical philosophy is pediatric wellness."');
                    showToast("Added Quote template");
                  }}
                  className="p-1 hover:bg-white text-slate-600 hover:text-slate-900 rounded-none text-[10px] font-bold transition-colors flex items-center gap-0.5 cursor-pointer"
                  title="Add Blockquote Quote"
                >
                  <Quote className="h-3 w-3" />
                  <span>Quote</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEditBio('');
                    showToast("Cleared biography");
                  }}
                  className="p-1 hover:bg-rose-50 text-rose-600 hover:text-rose-700 rounded-none text-[10px] font-extrabold transition-colors cursor-pointer"
                >
                  Clear
                </button>
              </div>
            </div>

            <textarea
              rows={5}
              value={editBio}
              onChange={(e) => setEditBio(e.target.value)}
              className="w-full text-xs border border-[#FECDD3] rounded-none p-3.5 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-700 leading-relaxed bg-white"
              placeholder="Explain your approach to care, clinical experience, and focus areas..."
              required
            />
          </div>

          {/* Medical Certifications Tag Manager */}
          <div className="space-y-2 pt-2 border-t border-[#FECDD3]">
            <label className="block text-xs font-black text-slate-700">Active Medical Certifications</label>
            <p className="text-[10px] text-slate-500 font-semibold">Verify specialized training tags displayed on your public patient card.</p>

            <div className="flex flex-wrap gap-1.5 mb-2">
              {certifications.map(cert => (
                <span key={cert} className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] font-extrabold text-[11px] px-3 py-1.5 rounded-none flex items-center gap-1.5 shadow-3xs">
                  <span>{cert}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setCertifications(certifications.filter(c => c !== cert));
                      showToast(`Removed certification: ${cert}`);
                    }}
                    className="text-rose-500 hover:text-rose-600 font-black cursor-pointer p-0.5 rounded-none transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {certifications.length === 0 && (
                <span className="text-xs text-slate-400 italic">No certifications listed. Add tags below.</span>
              )}
            </div>

            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                placeholder="e.g. Advanced Pediatric Life Support"
                value={newCert}
                onChange={(e) => setNewCert(e.target.value)}
                className="text-xs border border-[#FECDD3] rounded-none py-2 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-700 flex-1 bg-white"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addCertification();
                  }
                }}
              />
              <button
                type="button"
                onClick={addCertification}
                className="bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-extrabold px-4 py-2 rounded-none transition-all cursor-pointer flex items-center gap-1 whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Tag
              </button>
            </div>
          </div>

          {/* Professional Fee, City & Clinical Center */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-[#FECDD3]">
            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">
                {isDoc ? "Standard Co-Pay Fee (RM)" : "Hourly Clinical Service Fee (RM)"}
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-black">RM</span>
                <input
                  type="number"
                  value={editFee}
                  onChange={(e) => setEditFee(Number(e.target.value))}
                  className="w-full text-xs border border-[#FECDD3] rounded-none py-2.5 pl-9 pr-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-700 bg-white"
                  placeholder="e.g. 150"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-1.5">Registered Practice City</label>
              <select
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                className="w-full text-xs border border-[#FECDD3] rounded-none py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-700 bg-white"
              >
                <option value="Kuala Lumpur">Kuala Lumpur</option>
                <option value="Petaling Jaya">Petaling Jaya</option>
                <option value="Penang">Penang</option>
                <option value="Johor Bahru">Johor Bahru</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-700 mb-1.5">Practice Address / Clinical Center</label>
            <input
              type="text"
              value={editAddress}
              onChange={(e) => setEditAddress(e.target.value)}
              className="w-full text-xs border border-[#FECDD3] rounded-none py-2.5 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-700 bg-white"
              placeholder="e.g. Metropolitan Specialist Center, 8 Bukit Pantai"
              required
            />
          </div>

          {/* Dynamic Availability Matrix Config */}
          <div className="border-t border-[#FECDD3] pt-5 space-y-4">
            <div>
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Calendar className="h-4 w-4 text-[#DC2626]" />
                Availability & Timeslot Configuration
              </h4>
              <p className="text-[10px] text-slate-500 font-semibold mb-3">Define the days and times patients are allowed to book consultations with you.</p>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">Practice Days of the Week</label>
              <div className="flex flex-wrap gap-1.5">
                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                  const isActive = editDays.includes(day);
                  return (
                    <button
                      key={day}
                      type="button"
                      onClick={() => {
                        if (isActive) {
                          setEditDays(editDays.filter(d => d !== day));
                        } else {
                          setEditDays([...editDays, day]);
                        }
                      }}
                      className={`text-[11px] font-bold py-1.5 px-3 rounded-none border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-[#DC2626] text-white border-[#DC2626] shadow-3xs'
                          : 'bg-white text-slate-600 border-[#FECDD3] hover:bg-slate-50'
                      }`}
                    >
                      {day.substring(0, 3)}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-slate-700 mb-2">Configure Time Slots</label>
              <div className="flex gap-2 mb-3 max-w-sm">
                <input
                  type="text"
                  placeholder="e.g. 10:00 AM"
                  value={newTimeSlot}
                  onChange={(e) => setNewTimeSlot(e.target.value)}
                  className="text-xs border border-[#FECDD3] rounded-none py-2 px-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-bold text-slate-700 flex-1 bg-white"
                />
                <button
                  type="button"
                  onClick={addTimeSlot}
                  className="bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C] text-white text-[11px] font-bold px-4 py-2 rounded-none transition-all cursor-pointer flex items-center gap-1 shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Slot
                </button>
              </div>

              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto p-1.5 bg-slate-50 border border-[#FECDD3] rounded-none">
                {editSlots.length === 0 ? (
                  <span className="text-[10px] text-slate-400 font-semibold p-2">No custom scheduling slots configured. Click 'Add Slot' above.</span>
                ) : (
                  editSlots.map(slot => (
                    <span key={slot} className="bg-white border border-[#FECDD3] rounded-none px-2.5 py-1 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-3xs font-mono">
                      <span>{slot}</span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditSlots(editSlots.filter(s => s !== slot));
                          showToast(`Removed timeslot: ${slot}`);
                        }}
                        className="text-slate-400 hover:text-rose-600 cursor-pointer p-0.5 rounded-none transition-colors"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          {settingsSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs font-bold py-2.5 px-4 rounded-none flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              <span>Public registry file updated successfully. Updates are now live nationwide.</span>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={savingSettings}
              className="bg-[#DC2626] hover:bg-[#B91C1C] disabled:bg-slate-300 text-white text-xs font-black py-2.5 px-6 rounded-none transition-all flex items-center gap-2 shadow-xs cursor-pointer"
            >
              {savingSettings ? (
                <>
                  <Loader className="h-3.5 w-3.5 animate-spin" />
                  <span>Saving changes...</span>
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  <span>Save Profile Updates</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT PANE: Patient-Facing Live Preview Card */}
      <div className="w-full xl:w-[380px] shrink-0 space-y-4 lg:sticky lg:top-24">
        <div className="bg-white border-2 border-dashed border-[#FECDD3] rounded-none p-5 shadow-xs relative overflow-hidden space-y-4">
          <div className="bg-[#FFF0F2] text-[#DC2626] border border-[#FECDD3] text-[9px] font-black uppercase py-1 px-3 rounded-full flex items-center gap-1.5 w-max">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
            Live Patient Search Card Preview
          </div>

          <div className="border border-[#FECDD3] rounded-none p-4 shadow-3xs space-y-4 bg-white relative">
            <div className="flex gap-3 items-start">
              <img
                src={matchedProfile.avatar}
                alt={matchedProfile.name}
                className="h-14 w-14 rounded-full object-cover border-2 border-[#FECDD3] shadow-3xs shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="space-y-1 flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <h4 className="font-sans text-sm font-semibold text-slate-850 truncate leading-snug">{matchedProfile.name}</h4>
                  {isVerified && <Shield className="h-3.5 w-3.5 text-emerald-500 fill-emerald-500 shrink-0" />}
                </div>

                <p className="text-[10px] text-[#DC2626] font-extrabold uppercase tracking-wide">
                  {matchedProfile.specialization}
                </p>

                <div className="flex items-center gap-1 text-[11px] font-extrabold text-slate-500">
                  <span className="text-amber-500">â˜…</span>
                  <span className="text-slate-800">{avgOverall ?? "New"}</span>
                  <span>({reviewCount} Patient Review{reviewCount === 1 ? '' : 's'})</span>
                </div>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 font-medium leading-relaxed italic bg-slate-50 p-2.5 rounded-none border border-[#FECDD3] line-clamp-3">
              {editBio || "No clinical biography provided. Please write a description to engage patients..."}
            </p>

            {/* Certifications displayed as patient-facing badges */}
            {certifications.length > 0 && (
              <div className="space-y-1">
                <span className="text-[9px] text-slate-400 font-bold block uppercase">Clinical Credentials</span>
                <div className="flex flex-wrap gap-1">
                  {certifications.map(cert => (
                    <span key={cert} className="bg-slate-100 text-slate-700 text-[9px] font-bold px-2 py-0.5 rounded-none">
                      {cert}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-[#FECDD3] flex flex-col gap-1.5 text-[11px] text-slate-600 font-semibold">
              <div className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                <span className="truncate">{editAddress || "Metropolitan Specialist Center"}, {editCity}</span>
              </div>
              <div className="flex items-center gap-1.5 justify-between">
                <div className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span>Base consultation co-pay:</span>
                </div>
                <strong className="text-slate-800 text-xs font-black">RM {editFee || 120}</strong>
              </div>
            </div>

            <button
              type="button"
              className="w-full py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-[11px] font-black rounded-none transition-all shadow-3xs cursor-not-allowed mt-2"
              disabled
            >
              Book Appointment (Preview)
            </button>
          </div>

          <p className="text-[10px] text-slate-400 font-medium text-center italic">
            Changes above reflect instantly in the live doctor directory.
          </p>
        </div>
      </div>

    </div>
  );
}
