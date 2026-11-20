import { useState } from 'react';
import { ShieldCheck, EyeOff, Trash2, Mic, ClipboardCheck } from 'lucide-react';
import type { OrbitState } from '../types';

interface PrivacyViewProps {
  state: OrbitState;
  onToggleReduceMotion: (enabled: boolean) => void;
  onToggleOnePasteCapture: (enabled: boolean) => void;
  onToggleVoiceAssistant: (enabled: boolean) => void;
  onDeleteAllData: () => void;
}

export function PrivacyView({
  state,
  onToggleReduceMotion,
  onToggleOnePasteCapture,
  onToggleVoiceAssistant,
  onDeleteAllData,
}: PrivacyViewProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Privacy · Transparency &amp; Comfort
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
          Your Data, Your Device
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Orbit stores all goals, tasks, assignments, and insights inside your browser&apos;s localStorage only.
        </p>
      </div>

      {/* Data Transparency Ledger */}
      <section className="aurora-glass-card rounded-[28px] p-6 space-y-4">
        <div className="flex items-center gap-2 text-teal-300 text-sm font-extrabold">
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy Ledger</span>
        </div>

        <div className="space-y-3 text-sm text-slate-200">
          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <div className="font-extrabold text-slate-50">Browser localStorage Only</div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Your goals ({state.goals.length}), tasks ({state.tasks.length}), assignments ({state.assignments.length}), opportunities ({state.opportunities.length}), and wins ({state.wins.length}) are persisted locally under key <code className="font-mono-tabular text-amber-200">orbit_copilot_state_v2</code>. Orbit has no external user account or tracking profile.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <div className="font-extrabold text-slate-50">Gemini AI Stateless Processing</div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              When you ask Orbit Assistant, break down a goal, or extract an assignment/opportunity file, only the prompt or attached file for that single request is sent to Gemini via server-side API routes for structured extraction — nothing is stored on Orbit&apos;s servers.
            </p>
          </div>

          <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4">
            <div className="font-extrabold text-slate-50">GitHub Public API (Optional)</div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Only queried when you manually enter a public GitHub handle in Insights to summarize recent public push dates and languages.
            </p>
          </div>
        </div>
      </section>

      {/* Consent & Accessibility Controls */}
      <section className="aurora-glass-card rounded-[28px] p-6 space-y-3">
        <h2 className="text-base font-extrabold text-slate-50">Consent &amp; Sensory Comfort</h2>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <EyeOff className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-slate-100">Reduce motion</div>
              <div className="text-xs text-slate-300">
                Disables background star twinkle and smooth transition animations.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.reduceMotion}
            onClick={() => onToggleReduceMotion(!state.preferences.reduceMotion)}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-extrabold border ${
              state.preferences.reduceMotion
                ? 'bg-teal-400/20 border-teal-300/40 text-teal-100'
                : 'bg-white/5 border-white/15 text-slate-300'
            }`}
          >
            {state.preferences.reduceMotion ? 'On' : 'Off'}
          </button>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-slate-100">One-Paste Opportunity Capture</div>
              <div className="text-xs text-slate-300">
                Allow sending pasted emails/screenshots to Gemini for confirmation extraction.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.onePasteCaptureEnabled}
            onClick={() => onToggleOnePasteCapture(!state.preferences.onePasteCaptureEnabled)}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-extrabold border ${
              state.preferences.onePasteCaptureEnabled
                ? 'bg-teal-400/20 border-teal-300/40 text-teal-100'
                : 'bg-white/5 border-white/15 text-slate-300'
            }`}
          >
            {state.preferences.onePasteCaptureEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mic className="w-5 h-5 text-slate-300 mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-extrabold text-slate-100">Voice Dictation in Assistant</div>
              <div className="text-xs text-slate-300">
                Uses your browser&apos;s built-in SpeechRecognition when you tap the mic button.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.voiceAssistantEnabled}
            onClick={() => onToggleVoiceAssistant(!state.preferences.voiceAssistantEnabled)}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-extrabold border ${
              state.preferences.voiceAssistantEnabled
                ? 'bg-teal-400/20 border-teal-300/40 text-teal-100'
                : 'bg-white/5 border-white/15 text-slate-300'
            }`}
          >
            {state.preferences.voiceAssistantEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      {/* Delete All Data */}
      <section className="aurora-glass-card rounded-[28px] p-6 border border-amber-300/25 space-y-3">
        <h2 className="text-base font-extrabold text-slate-50">Reset &amp; Erase Local Data</h2>
        <p className="text-xs text-slate-300">
          Clears everything stored in this browser immediately with no remote backup left behind.
        </p>

        {confirmOpen ? (
          <div className="rounded-2xl bg-amber-400/12 border border-amber-300/35 p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-bold text-amber-100">
              Erase all Orbit goals, tasks, assignments, opportunities, and wins from this browser?
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteAllData();
                  setConfirmOpen(false);
                }}
                className="min-h-[40px] rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-4"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-[40px] rounded-xl bg-white/10 text-slate-200 font-bold text-xs px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="min-h-[44px] rounded-2xl bg-amber-400/18 hover:bg-amber-400/28 border border-amber-300/35 px-5 text-sm font-extrabold text-amber-100 inline-flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" />
            <span>Delete all my data</span>
          </button>
        )}
      </section>
    </div>
  );
}
