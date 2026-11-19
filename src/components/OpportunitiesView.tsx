import { useState, type ChangeEvent } from 'react';
import {
  Compass,
  Upload,
  Check,
  ExternalLink,
  Bell,
  Plus,
  Trash2,
  Sparkles,
} from 'lucide-react';
import type {
  Opportunity,
  OpportunityCategory,
  OpportunityStatus,
  OrbitState,
} from '../types';
import { daysBetweenISO, getTodayISO } from '../lib/orbitStore';

interface ExtractedOpportunityDraft {
  title: string;
  organization: string;
  category: OpportunityCategory;
  applicationDeadline: string;
  eventDate?: string;
  registrationLink?: string;
  eligibility?: string;
  requirements?: string;
  reminderDaysBefore: number;
  prepTasks: Array<{
    title: string;
    estimatedMinutes: number;
    firstAction: string;
    selected: boolean;
  }>;
}

interface OpportunitiesViewProps {
  state: OrbitState;
  onExtractOpportunity: (payload: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
  }) => Promise<Omit<ExtractedOpportunityDraft, 'reminderDaysBefore' | 'prepTasks'> & {
    prepTasks: Array<{ title: string; estimatedMinutes: number; firstAction: string }>;
  }>;
  onSaveOpportunity: (draft: ExtractedOpportunityDraft) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  onDeleteOpportunity: (id: string) => void;
  onAddPrepTaskToToday: (opp: Opportunity) => void;
  loading: boolean;
  error: string | null;
}

const STATUS_OPTIONS: OpportunityStatus[] = [
  'Interested',
  'To Apply',
  'Applied',
  'Registered',
  'Completed',
  'Expired',
];

const CATEGORIES: OpportunityCategory[] = [
  'Internship',
  'Hackathon',
  'Course',
  'Scholarship',
  'Competition',
];

export function OpportunitiesView({
  state,
  onExtractOpportunity,
  onSaveOpportunity,
  onUpdateOpportunity,
  onDeleteOpportunity,
  onAddPrepTaskToToday,
  loading,
  error,
}: OpportunitiesViewProps) {
  const [pasteText, setPasteText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [mimeType, setMimeType] = useState<string | undefined>();
  const [draft, setDraft] = useState<ExtractedOpportunityDraft | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | OpportunityStatus>('all');
  const today = getTodayISO();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      const b64 = res.includes(',') ? res.split(',')[1] : res;
      setFileBase64(b64);
      setMimeType(file.type || 'image/png');
    };
    reader.readAsDataURL(file);
  };

  const handleExtract = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasteText.trim() && !fileBase64) return;
    const extracted = await onExtractOpportunity({
      text: pasteText.trim() || undefined,
      fileBase64,
      mimeType,
    });
    setDraft({
      ...extracted,
      reminderDaysBefore: 3,
      prepTasks: extracted.prepTasks.map((t) => ({ ...t, selected: true })),
    });
  };

  const filteredOpps = state.opportunities.filter((o) =>
    statusFilter === 'all' ? true : o.status === statusFilter
  );

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Opportunities · External Deadlines
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
          Internships, Hackathons &amp; Scholarships
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Paste any college WhatsApp forward, email, or upload a screenshot. Review &amp; edit before saving.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

        {/* One-Paste Capture */}
      <section className="aurora-glass-card rounded-[28px] p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>One-Paste Capture</span>
          </div>
          {state.preferences.onePasteCaptureEnabled && (
            <label className="min-h-[40px] rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-3.5 py-2 text-xs font-extrabold text-slate-100 flex items-center gap-2 cursor-pointer">
              <Upload className="w-4 h-4" />
              <span>{fileName ? fileName : 'Upload Screenshot / PDF'}</span>
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </label>
          )}
        </div>

        {!state.preferences.onePasteCaptureEnabled ? (
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-300">
              AI One-Paste Capture is turned off in Privacy. You can still add opportunities manually below or re-enable capture in Privacy.
            </p>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  title: '',
                  organization: '',
                  category: 'Internship',
                  applicationDeadline: today,
                  eventDate: '',
                  registrationLink: '',
                  eligibility: '',
                  requirements: '',
                  reminderDaysBefore: 3,
                  prepTasks: [],
                })
              }
              className="min-h-[40px] rounded-2xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-xs px-4 py-2"
            >
              Add Manually
            </button>
          </div>
        ) : (
        <form onSubmit={handleExtract} className="space-y-3">
          <textarea
            rows={3}
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder="Paste internship email, hackathon announcement, or scholarship link details..."
            className="w-full rounded-2xl bg-white/[0.06] border border-white/12 p-4 text-sm text-slate-100 placeholder:text-slate-400"
          />
          <div className="flex flex-wrap gap-2.5">
            <button
              type="submit"
              disabled={loading || (!pasteText.trim() && !fileBase64)}
              className="min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-5 py-2 disabled:opacity-50"
            >
              {loading ? 'Extracting details...' : 'Extract for Confirmation'}
            </button>
            <button
              type="button"
              onClick={() =>
                setDraft({
                  title: '',
                  organization: '',
                  category: 'Internship',
                  applicationDeadline: today,
                  eventDate: '',
                  registrationLink: '',
                  eligibility: '',
                  requirements: '',
                  reminderDaysBefore: 3,
                  prepTasks: [],
                })
              }
              className="min-h-[44px] rounded-2xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-sm px-4 py-2"
            >
              Add Manually
            </button>
          </div>
        </form>
        )}

        {/* Confirmation Screen Before Saving */}
        {draft && (
          <div className="mt-4 rounded-2xl bg-[#0b102d] border border-amber-300/35 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-extrabold text-amber-200">
                Confirm &amp; Edit Before Saving
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-xs font-bold text-slate-400 hover:text-slate-200"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Title</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full min-h-[40px] rounded-xl bg-white/[0.06] border border-white/12 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Organization</label>
                <input
                  type="text"
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  className="w-full min-h-[40px] rounded-xl bg-white/[0.06] border border-white/12 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Category</label>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as OpportunityCategory })
                  }
                  className="w-full min-h-[40px] rounded-xl bg-[#101638] border border-white/12 px-3 text-sm text-white"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={draft.applicationDeadline}
                  onChange={(e) => setDraft({ ...draft, applicationDeadline: e.target.value })}
                  className="w-full min-h-[40px] rounded-xl bg-white/[0.06] border border-white/12 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Registration Link (optional)
                </label>
                <input
                  type="url"
                  value={draft.registrationLink || ''}
                  onChange={(e) => setDraft({ ...draft, registrationLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full min-h-[40px] rounded-xl bg-white/[0.06] border border-white/12 px-3 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Remind me before deadline
                </label>
                <select
                  value={draft.reminderDaysBefore}
                  onChange={(e) =>
                    setDraft({ ...draft, reminderDaysBefore: Number(e.target.value) })
                  }
                  className="w-full min-h-[40px] rounded-xl bg-[#101638] border border-white/12 px-3 text-sm text-white"
                >
                  <option value={1}>1 day before</option>
                  <option value={3}>3 days before</option>
                  <option value={7}>7 days before</option>
                  <option value={14}>14 days before</option>
                </select>
              </div>
            </div>

            {draft.prepTasks.length > 0 && (
              <div className="space-y-2">
                <div className="text-xs font-bold text-slate-300">
                  Suggested small prep tasks to schedule into Today:
                </div>
                {draft.prepTasks.map((pt, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-slate-200 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={pt.selected}
                      onChange={() =>
                        setDraft({
                          ...draft,
                          prepTasks: draft.prepTasks.map((x, i) =>
                            i === idx ? { ...x, selected: !x.selected } : x
                          ),
                        })
                      }
                    />
                    <span>
                      {pt.title} ({pt.estimatedMinutes}m)
                    </span>
                  </label>
                ))}
              </div>
            )}

            <button
              type="button"
              disabled={!draft.title.trim()}
              onClick={() => {
                onSaveOpportunity(draft);
                setDraft(null);
                setPasteText('');
                setFileName('');
                setFileBase64(undefined);
                setMimeType(undefined);
              }}
              className="min-h-[44px] rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-sm px-5 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Opportunity</span>
            </button>
          </div>
        )}
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {(['all', ...STATUS_OPTIONS] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`min-h-[36px] rounded-xl px-3 text-xs font-extrabold transition-colors ${
              statusFilter === st
                ? 'bg-amber-400 text-slate-950'
                : 'bg-white/[0.06] text-slate-300 hover:text-white'
            }`}
          >
            {st === 'all' ? 'All' : st}
          </button>
        ))}
      </div>

      {/* Saved Opportunities */}
      {filteredOpps.length === 0 ? (
        <div className="aurora-glass-card rounded-[28px] p-8 text-center">
          <Compass className="w-8 h-8 text-amber-300 mx-auto mb-2" />
          <h2 className="text-xl font-extrabold text-slate-50">No opportunities saved yet</h2>
          <p className="text-sm text-slate-300 mt-1">
            Use One-Paste Capture above whenever a hackathon, internship, or scholarship pops up.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOpps.map((opp) => {
            const daysLeft = daysBetweenISO(today, opp.applicationDeadline);
            const reminderActive =
              daysLeft >= 0 &&
              daysLeft <= opp.reminderDaysBefore &&
              opp.status !== 'Applied' &&
              opp.status !== 'Registered' &&
              opp.status !== 'Completed';

            return (
              <article
                key={opp.id}
                className="aurora-glass-card rounded-[24px] p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-300">
                      <span className="text-amber-300 uppercase">{opp.category}</span>
                      {' · '}
                      <span>{opp.organization}</span>
                      {' · '}
                      <span className="font-mono-tabular">
                        Due {opp.applicationDeadline} (
                        {daysLeft >= 0 ? `${daysLeft}d left` : 'past'})
                      </span>
                    </div>
                    <h3 className="text-lg font-extrabold text-slate-50 mt-1">{opp.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteOpportunity(opp.id)}
                    aria-label={`Delete ${opp.title}`}
                    className="min-h-[36px] min-w-[36px] rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {reminderActive && (
                  <div className="rounded-xl bg-amber-400/12 border border-amber-300/30 px-3 py-2 text-xs font-bold text-amber-200 flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      Reminder window open ({daysLeft === 0 ? 'due today' : `${daysLeft}d left`})
                    </span>
                  </div>
                )}

                {opp.requirements && (
                  <p className="text-xs text-slate-300">{opp.requirements}</p>
                )}

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                  <div className="flex items-center gap-2">
                    <select
                      value={opp.status}
                      onChange={(e) =>
                        onUpdateOpportunity(opp.id, {
                          status: e.target.value as OpportunityStatus,
                        })
                      }
                      aria-label="Opportunity status"
                      className="min-h-[36px] rounded-xl bg-[#101638] border border-white/15 px-2.5 text-xs font-extrabold text-slate-100"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>

                    <select
                      value={opp.reminderDaysBefore}
                      onChange={(e) =>
                        onUpdateOpportunity(opp.id, {
                          reminderDaysBefore: Number(e.target.value),
                        })
                      }
                      aria-label="Reminder timing"
                      className="min-h-[36px] rounded-xl bg-[#101638] border border-white/15 px-2 text-xs font-bold text-slate-300"
                    >
                      <option value={1}>1d alert</option>
                      <option value={3}>3d alert</option>
                      <option value={7}>7d alert</option>
                      <option value={14}>14d alert</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    {opp.registrationLink && (
                      <a
                        href={opp.registrationLink}
                        target="_blank"
                        rel="noreferrer"
                        className="min-h-[36px] rounded-xl bg-white/10 hover:bg-white/15 px-3 text-xs font-bold text-slate-100 inline-flex items-center gap-1"
                      >
                        <span>Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddPrepTaskToToday(opp)}
                      className="min-h-[36px] rounded-xl bg-teal-400/18 hover:bg-teal-400/28 border border-teal-300/30 px-3 text-xs font-extrabold text-teal-100 inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Prep in Today</span>
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
