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
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <p className="text-xs font-medium text-[#D6A04A]">Settings &amp; Privacy</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
          Workspace Preferences &amp; Data
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Orbit stores all goals, tasks, assignments, and insights inside your browser&apos;s localStorage only.
        </p>
      </div>

      {/* Data Transparency Ledger */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-3">
        <div className="flex items-center gap-2 text-teal-300 text-sm font-semibold">
          <ShieldCheck className="w-4 h-4" />
          <span>Privacy Ledger</span>
        </div>

        <div className="space-y-2.5 text-sm text-[#D1D5DB]">
          <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4">
            <div className="font-medium text-[#F3F4F6]">Browser localStorage Only</div>
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
              Your goals ({state.goals.length}), tasks ({state.tasks.length}), assignments (
              {state.assignments.length}), opportunities ({state.opportunities.length}), and wins (
              {state.wins.length}) are persisted locally under key{' '}
              <code className="font-mono-tabular text-[#D6A04A]">orbit_copilot_state_v2</code>.
            </p>
          </div>

          <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4">
            <div className="font-medium text-[#F3F4F6]">Gemini AI Stateless Processing</div>
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
              When you ask Orbit Assistant, break down a goal, or extract an assignment/opportunity file, only that single request is processed via server-side API routes — nothing is stored remotely.
            </p>
          </div>

          <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4">
            <div className="font-medium text-[#F3F4F6]">GitHub Public API (Optional)</div>
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">
              Only queried when you manually enter a public GitHub handle in Insights to summarize recent public push dates and languages.
            </p>
          </div>
        </div>
      </section>

      {/* Consent & Accessibility Controls */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#F3F4F6]">Consent &amp; Sensory Comfort</h2>

        <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <EyeOff className="w-4 h-4 text-[#9CA3AF] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-[#F3F4F6]">Reduce motion</div>
              <div className="text-xs text-[#9CA3AF]">
                Disables smooth transition animations across timers and cards.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.reduceMotion}
            onClick={() => onToggleReduceMotion(!state.preferences.reduceMotion)}
            className={`min-h-[36px] px-4 rounded-lg text-xs font-medium border transition-colors ${
              state.preferences.reduceMotion
                ? 'bg-[#D6A04A] border-[#D6A04A] text-[#111318] font-semibold'
                : 'bg-[#1A1D24] border-[#2E3442] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            {state.preferences.reduceMotion ? 'On' : 'Off'}
          </button>
        </div>

        <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <ClipboardCheck className="w-4 h-4 text-[#9CA3AF] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-[#F3F4F6]">
                One-Paste Opportunity Capture
              </div>
              <div className="text-xs text-[#9CA3AF]">
                Allow sending pasted emails/screenshots to Gemini for confirmation extraction.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.onePasteCaptureEnabled}
            onClick={() =>
              onToggleOnePasteCapture(!state.preferences.onePasteCaptureEnabled)
            }
            className={`min-h-[36px] px-4 rounded-lg text-xs font-medium border transition-colors ${
              state.preferences.onePasteCaptureEnabled
                ? 'bg-[#D6A04A] border-[#D6A04A] text-[#111318] font-semibold'
                : 'bg-[#1A1D24] border-[#2E3442] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            {state.preferences.onePasteCaptureEnabled ? 'On' : 'Off'}
          </button>
        </div>

        <div className="rounded-xl bg-[#14171D] border border-[#242934] p-4 flex items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <Mic className="w-4 h-4 text-[#9CA3AF] mt-0.5 shrink-0" />
            <div>
              <div className="text-sm font-medium text-[#F3F4F6]">
                Voice Dictation in Assistant
              </div>
              <div className="text-xs text-[#9CA3AF]">
                Uses your browser&apos;s built-in SpeechRecognition when you tap the mic button.
              </div>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={state.preferences.voiceAssistantEnabled}
            onClick={() => onToggleVoiceAssistant(!state.preferences.voiceAssistantEnabled)}
            className={`min-h-[36px] px-4 rounded-lg text-xs font-medium border transition-colors ${
              state.preferences.voiceAssistantEnabled
                ? 'bg-[#D6A04A] border-[#D6A04A] text-[#111318] font-semibold'
                : 'bg-[#1A1D24] border-[#2E3442] text-[#9CA3AF] hover:text-[#F3F4F6]'
            }`}
          >
            {state.preferences.voiceAssistantEnabled ? 'On' : 'Off'}
          </button>
        </div>
      </section>

      {/* Delete All Data */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-6 space-y-3">
        <h2 className="text-sm font-semibold text-[#F3F4F6]">Reset &amp; Erase Local Data</h2>
        <p className="text-xs text-[#9CA3AF]">
          Clears everything stored in this browser immediately with no remote backup left behind.
        </p>

        {confirmOpen ? (
          <div className="rounded-xl bg-[#14171D] border border-[#D6A04A]/40 p-4 flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm font-medium text-[#F3F4F6]">
              Erase all Orbit goals, tasks, assignments, opportunities, and wins from this browser?
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  onDeleteAllData();
                  setConfirmOpen(false);
                }}
                className="min-h-[36px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-xs px-4"
              >
                Yes, Delete Everything
              </button>
              <button
                type="button"
                onClick={() => setConfirmOpen(false)}
                className="min-h-[36px] rounded-xl bg-[#222630] text-[#E5E7EB] font-medium text-xs px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="min-h-[40px] rounded-xl bg-[#D6A04A]/15 hover:bg-[#D6A04A]/25 border border-[#D6A04A]/35 px-4 text-xs font-semibold text-[#F5DEB3] inline-flex items-center gap-2 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5 text-[#D6A04A]" />
            <span>Delete all my data</span>
          </button>
        )}
      </section>
    </div>
  );
}
