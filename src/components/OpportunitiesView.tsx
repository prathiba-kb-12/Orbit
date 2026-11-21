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
  }) => Promise<
    Omit<ExtractedOpportunityDraft, 'reminderDaysBefore' | 'prepTasks'> & {
      prepTasks: Array<{ title: string; estimatedMinutes: number; firstAction: string }>;
    }
  >;
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <p className="text-xs font-medium text-[#D6A04A]">Opportunities · External Deadlines</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
          Internships, Hackathons &amp; Scholarships
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Paste an email, forward, or upload a screenshot. Review and edit details before saving.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]">
          {error}
        </div>
      )}

      {/* One-Paste Capture */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 sm:p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-[#D6A04A]">
            <Sparkles className="w-4 h-4" />
            <span>One-Paste Capture</span>
          </div>
          {state.preferences.onePasteCaptureEnabled && (
            <label className="min-h-[38px] rounded-xl bg-[#14171D] hover:bg-[#222630] border border-[#262B36] px-3.5 py-2 text-xs font-medium text-[#E5E7EB] flex items-center gap-2 cursor-pointer transition-colors">
              <Upload className="w-4 h-4 text-[#9CA3AF]" />
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
          <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-[#9CA3AF]">
              AI One-Paste Capture is turned off in Settings. You can still add opportunities manually below.
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
              className="min-h-[38px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] text-[#F3F4F6] font-medium text-xs px-4 py-2"
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
              placeholder="Paste internship email, hackathon announcement, or scholarship details..."
              className="w-full rounded-xl bg-[#14171D] border border-[#262B36] p-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
            />
            <div className="flex flex-wrap gap-2.5">
              <button
                type="submit"
                disabled={loading || (!pasteText.trim() && !fileBase64)}
                className="min-h-[42px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-5 py-2 disabled:opacity-50 transition-colors"
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
                className="min-h-[42px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] text-[#E5E7EB] font-medium text-sm px-4 py-2"
              >
                Add Manually
              </button>
            </div>
          </form>
        )}

        {/* Confirmation Screen Before Saving */}
        {draft && (
          <div className="mt-4 rounded-xl bg-[#14171D] border border-[#D6A04A]/40 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[#D6A04A]">
                Confirm &amp; Edit Before Saving
              </h2>
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
              >
                Cancel
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">Title</label>
                <input
                  type="text"
                  value={draft.title}
                  onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={draft.organization}
                  onChange={(e) => setDraft({ ...draft, organization: e.target.value })}
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">Category</label>
                <select
                  value={draft.category}
                  onChange={(e) =>
                    setDraft({ ...draft, category: e.target.value as OpportunityCategory })
                  }
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                  Application Deadline
                </label>
                <input
                  type="date"
                  value={draft.applicationDeadline}
                  onChange={(e) => setDraft({ ...draft, applicationDeadline: e.target.value })}
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                  Registration Link (optional)
                </label>
                <input
                  type="url"
                  value={draft.registrationLink || ''}
                  onChange={(e) => setDraft({ ...draft, registrationLink: e.target.value })}
                  placeholder="https://..."
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[#9CA3AF] mb-1">
                  Remind me before deadline
                </label>
                <select
                  value={draft.reminderDaysBefore}
                  onChange={(e) =>
                    setDraft({ ...draft, reminderDaysBefore: Number(e.target.value) })
                  }
                  className="w-full min-h-[38px] rounded-xl bg-[#1A1D24] border border-[#262B36] px-3 text-sm text-[#F3F4F6]"
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
                <div className="text-xs font-medium text-[#9CA3AF]">
                  Suggested small prep tasks to schedule into Today:
                </div>
                {draft.prepTasks.map((pt, idx) => (
                  <label
                    key={idx}
                    className="flex items-center gap-2.5 text-xs text-[#E5E7EB] cursor-pointer"
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
              className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Save Opportunity</span>
            </button>
          </div>
        )}
      </section>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-1.5">
        {(['all', ...STATUS_OPTIONS] as const).map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`min-h-[34px] rounded-xl px-3 text-xs font-medium transition-colors ${
              statusFilter === st
                ? 'bg-[#D6A04A] text-[#111318] font-semibold'
                : 'bg-[#1A1D24] border border-[#262B36] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            {st === 'all' ? 'All' : st}
          </button>
        ))}
      </div>

      {/* Saved Opportunities */}
      {filteredOpps.length === 0 ? (
        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-8 text-center">
          <Compass className="w-7 h-7 text-[#D6A04A] mx-auto mb-2" />
          <h2 className="text-lg font-semibold text-[#F3F4F6]">No opportunities saved yet</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
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
                className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#9CA3AF]">
                      <span className="text-[#D6A04A] font-medium uppercase">{opp.category}</span>
                      {' · '}
                      <span>{opp.organization}</span>
                      {' · '}
                      <span className="font-mono-tabular">
                        Due {opp.applicationDeadline} ({daysLeft >= 0 ? `${daysLeft}d left` : 'past'})
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-[#F3F4F6] mt-1">{opp.title}</h3>
                  </div>

                  <button
                    type="button"
                    onClick={() => onDeleteOpportunity(opp.id)}
                    aria-label={`Delete ${opp.title}`}
                    className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#6B7280] hover:text-[#F3F4F6]"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {reminderActive && (
                  <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-3 py-2 text-xs font-medium text-[#F5DEB3] flex items-center gap-2">
                    <Bell className="w-3.5 h-3.5 text-[#D6A04A] shrink-0" />
                    <span>
                      Reminder window open ({daysLeft === 0 ? 'due today' : `${daysLeft}d left`})
                    </span>
                  </div>
                )}

                {opp.requirements && (
                  <p className="text-xs text-[#9CA3AF]">{opp.requirements}</p>
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
                      className="min-h-[34px] rounded-lg bg-[#14171D] border border-[#262B36] px-2.5 text-xs font-medium text-[#F3F4F6]"
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
                      className="min-h-[34px] rounded-lg bg-[#14171D] border border-[#262B36] px-2 text-xs text-[#9CA3AF]"
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
                        className="min-h-[34px] rounded-lg bg-[#222630] hover:bg-[#2A2F3B] px-3 text-xs font-medium text-[#E5E7EB] inline-flex items-center gap-1"
                      >
                        <span>Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                    <button
                      type="button"
                      onClick={() => onAddPrepTaskToToday(opp)}
                      className="min-h-[34px] rounded-lg bg-[#D6A04A]/15 hover:bg-[#D6A04A]/25 border border-[#D6A04A]/35 px-3 text-xs font-medium text-[#F5DEB3] inline-flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#D6A04A]" />
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
