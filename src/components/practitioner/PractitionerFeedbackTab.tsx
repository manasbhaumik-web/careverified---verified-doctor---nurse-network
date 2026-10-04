import React from 'react';
import { Star, MessageSquare, ShieldCheck, Shield, X, Loader, Send } from 'lucide-react';
import { Review } from '../../types';

interface PractitionerFeedbackTabProps {
  myReviews: Review[];
  hasReviews: boolean;
  avgOverall: string | null;
  avgComm: string;
  avgPunct: string;
  avgSatis: string;
  replyTextMap: Record<string, string>;
  replyingMap: Record<string, boolean>;
  replyExpandedId: string | null;
  onStartReply: (reviewId: string) => void;
  onCancelReply: () => void;
  onReplyTextChange: (reviewId: string, text: string) => void;
  onPublishReply: (reviewId: string) => void;
}

export default function PractitionerFeedbackTab({
  myReviews,
  hasReviews,
  avgOverall,
  avgComm,
  avgPunct,
  avgSatis,
  replyTextMap,
  replyingMap,
  replyExpandedId,
  onStartReply,
  onCancelReply,
  onReplyTextChange,
  onPublishReply
}: PractitionerFeedbackTabProps) {
  return (
    <div id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" tabIndex={0} className="space-y-6 animate-fade-in">
      {/* Reviews Metric Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-[#FECDD3] p-5 rounded-none shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Overall Clinical Rating</span>
          <div className="flex items-center gap-2">
            <span className="font-mono tabular-nums text-2xl font-bold text-slate-900">{avgOverall ?? "—"}</span>
            <div className="flex text-amber-400 shrink-0">
              <Star className="h-4.5 w-4.5 fill-current" />
            </div>
          </div>
          <p className="text-[9px] text-slate-500 font-semibold">
            {hasReviews ? `Based on ${myReviews.length} verified review${myReviews.length === 1 ? '' : 's'}.` : 'Awaiting your first patient review.'}
          </p>
        </div>

        <div className="bg-white border border-[#FECDD3] p-5 rounded-none shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Bedside Manners</span>
          <span className="font-mono tabular-nums text-xl font-bold text-[#DC2626]">{hasReviews ? `${avgComm} / 5.0` : '—'}</span>
          <div className="h-1 bg-slate-100 rounded-none overflow-hidden mt-1.5">
            <div className="bg-[#DC2626] h-full rounded-none" style={{ width: `${hasReviews ? (Number(avgComm)/5)*100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#FECDD3] p-5 rounded-none shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Clinic Punctuality</span>
          <span className="font-mono tabular-nums text-xl font-bold text-[#DC2626]">{hasReviews ? `${avgPunct} / 5.0` : '—'}</span>
          <div className="h-1 bg-slate-100 rounded-none overflow-hidden mt-1.5">
            <div className="bg-[#DC2626] h-full rounded-none" style={{ width: `${hasReviews ? (Number(avgPunct)/5)*100 : 0}%` }}></div>
          </div>
        </div>

        <div className="bg-white border border-[#FECDD3] p-5 rounded-none shadow-3xs space-y-1">
          <span className="text-[10px] text-slate-400 font-bold uppercase block">Care Satisfaction</span>
          <span className="font-mono tabular-nums text-xl font-bold text-emerald-700">{hasReviews ? `${avgSatis} / 5.0` : '—'}</span>
          <div className="h-1 bg-slate-100 rounded-none overflow-hidden mt-1.5">
            <div className="bg-emerald-600 h-full rounded-none" style={{ width: `${hasReviews ? (Number(avgSatis)/5)*100 : 0}%` }}></div>
          </div>
        </div>
      </div>

      {/* List of Patient Feedback */}
      <div className="bg-white border border-[#FECDD3] rounded-none p-6 shadow-3xs space-y-5">
        <div className="border-b border-[#FECDD3] pb-3">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-wider">Patient Care Logbook</h3>
          <p className="text-[11px] text-slate-500 font-medium mt-0.5">Below are verified experiences left by patients post-treatment.</p>
        </div>

        {myReviews.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <MessageSquare className="h-10 w-10 text-slate-300 mx-auto" />
            <h4 className="text-sm font-bold text-slate-700">No Patient Reviews Logged Yet</h4>
            <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">Reviews left on your public practitioner specialty page will compile here for clinical moderation.</p>
          </div>
        ) : (
          <div className="space-y-6 divide-y divide-slate-100">
            {myReviews.map((rev) => {
              const isReplying = replyingMap[rev.id];
              const isExpanded = replyExpandedId === rev.id;

              return (
                <div key={rev.id} className={`pt-5 first:pt-0 space-y-3.5`}>
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3 items-center">
                      <div className="w-9 h-9 bg-slate-100 rounded-none flex items-center justify-center font-bold text-slate-700 text-xs shrink-0">
                        {rev.patientName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-extrabold text-slate-800">{rev.patientName}</h4>
                          {rev.isVerifiedPatient && (
                            <span className="bg-[#FFF0F2]/50 text-[#DC2626] border border-[#FECDD3] text-[8px] font-bold px-1.5 py-0.5 rounded-none uppercase tracking-wider">Verified Patient</span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-semibold font-mono tabular-nums">{rev.date}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 bg-amber-50/50 border border-amber-100/50 px-2 py-0.5 rounded-none text-xs font-extrabold text-amber-700 shrink-0">
                      <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500 shrink-0" />
                      <span className="font-mono tabular-nums">{rev.rating.toFixed(1)}</span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed font-semibold bg-slate-50/40 border border-[#FECDD3]/30 p-3 rounded-none italic">
                    "{rev.comment}"
                  </p>

                  {/* Individual Ratings Grid */}
                  <div className="grid grid-cols-3 gap-2 text-[9px] font-bold text-slate-500 max-w-md bg-slate-50/30 p-2 rounded-none">
                    <div>Communication: <span className="font-mono tabular-nums text-slate-800 font-extrabold">{rev.communication || rev.rating}/5</span></div>
                    <div>Punctuality: <span className="font-mono tabular-nums text-slate-800 font-extrabold">{rev.punctuality || rev.rating}/5</span></div>
                    <div>Care Satisfaction: <span className="font-mono tabular-nums text-slate-800 font-extrabold">{rev.satisfaction || rev.rating}/5</span></div>
                  </div>

                  {/* Reply Container */}
                  {rev.replyText ? (
                    <div className="bg-[#FFF0F2]/40 border border-[#FECDD3]/60 p-4 rounded-none space-y-1 ml-4 sm:ml-8">
                      <div className="flex items-center gap-2 text-[10px] font-black text-[#DC2626] uppercase tracking-wider">
                        <ShieldCheck className="h-3.5 w-3.5 text-[#DC2626]" />
                        <span>Your Clinical Clarification Reply</span>
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-medium">
                        {rev.replyText}
                      </p>
                    </div>
                  ) : (
                    <div className="ml-4 sm:ml-8">
                      {!isExpanded ? (
                        <button
                          onClick={() => onStartReply(rev.id)}
                          className="text-xs font-bold text-[#DC2626] hover:text-[#DC2626] cursor-pointer flex items-center gap-1.5 hover:underline"
                        >
                          <MessageSquare className="h-3.5 w-3.5" />
                          <span>Add Professional Reply</span>
                        </button>
                      ) : (
                        <div className="bg-slate-50 border border-[#FECDD3] rounded-none p-4 space-y-3.5 animate-fade-in max-w-xl">
                          <div className="flex justify-between items-center border-b border-[#FECDD3] pb-2">
                            <span className="text-[10px] font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                              <Shield className="h-3.5 w-3.5 text-slate-500" />
                              Draft Practitioner Response
                            </span>
                            <button
                              onClick={onCancelReply}
                              className="p-1 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-none transition-all cursor-pointer"
                            >
                              <X className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <textarea
                            rows={3}
                            value={replyTextMap[rev.id] || ''}
                            onChange={(e) => onReplyTextChange(rev.id, e.target.value)}
                            className="w-full text-xs border border-slate-250 bg-white rounded-none p-3 outline-none focus:ring-1 focus:ring-[#DC2626] font-semibold text-slate-700"
                            placeholder="Address feedback objectively and respect confidentiality guidelines..."
                            required
                          />

                          <div className="flex justify-between items-center gap-2">
                            <p className="text-[9px] text-slate-400 font-medium max-w-[300px]">
                              Responses are published directly on your public specialty profile card.
                            </p>
                            <button
                              onClick={() => onPublishReply(rev.id)}
                              disabled={isReplying || !replyTextMap[rev.id]?.trim()}
                              className="bg-[#DC2626] hover:bg-[#B91C1C] border border-[#B91C1C] disabled:bg-slate-300 text-white text-[10px] font-extrabold py-2 px-4 rounded-none transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
                            >
                              {isReplying ? (
                                <Loader className="h-3 w-3 animate-spin" />
                              ) : (
                                <Send className="h-3 w-3" />
                              )}
                              <span>Publish Reply</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
