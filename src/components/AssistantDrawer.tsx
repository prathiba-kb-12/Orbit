import { useRef, useState, type ChangeEvent } from 'react';
import {
  X,
  Send,
  Mic,
  MicOff,
  Plus,
  Sparkles,
  Check,
  FileText,
} from 'lucide-react';
import type { AssistantActionProposal, AssistantMessage } from '../types';

interface AssistantDrawerProps {
  open: boolean;
  onClose: () => void;
  messages: AssistantMessage[];
  loading: boolean;
  voiceEnabled: boolean;
  onSendMessage: (payload: {
    message?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => Promise<void>;
  onConfirmProposal: (messageId: string, proposal: AssistantActionProposal) => Promise<void>;
  onCancelProposal: (messageId: string) => void;
}

export function AssistantDrawer({
  open,
  onClose,
  messages,
  loading,
  voiceEnabled,
  onSendMessage,
  onConfirmProposal,
  onCancelProposal,
}: AssistantDrawerProps) {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [mimeType, setMimeType] = useState<string | undefined>();
  const recognitionRef = useRef<any>(null);

  if (!open) return null;

  const toggleMic = () => {
    if (!voiceEnabled) return;
    const SpeechRec =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (listening && recognitionRef.current) {
      recognitionRef.current.stop();
      setListening(false);
      return;
    }

    const rec = new SpeechRec();
    rec.lang = 'en-US';
    rec.interimResults = false;
    rec.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript || '';
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
      setListening(false);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    setListening(true);
    rec.start();
  };

  const handleAttach = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const res = typeof reader.result === 'string' ? reader.result : '';
      setFileBase64(res.includes(',') ? res.split(',')[1] : res);
      setMimeType(file.type || 'image/png');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !fileBase64) || loading) return;
    const msg = input.trim();
    const b64 = fileBase64;
    const mt = mimeType;
    const fn = fileName;
    setInput('');
    setFileName('');
    setFileBase64(undefined);
    setMimeType(undefined);
    await onSendMessage({ message: msg || undefined, fileBase64: b64, mimeType: mt, fileName: fn || undefined });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Orbit Personal Assistant"
      className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-sm flex justify-end"
    >
      <div className="w-full max-w-lg h-full bg-[#080d24] border-l border-white/15 flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Sparkles className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-base font-extrabold text-slate-50">Orbit Assistant</h2>
              <p className="text-xs text-slate-400">
                Knows your goals, assignments, deadlines &amp; asks before major edits
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close assistant"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 space-y-2.5">
              <p className="text-sm font-bold text-slate-100">
                Try speaking or typing naturally:
              </p>
              <div className="flex flex-wrap gap-2">
                {[
                  'I have an exam next Thursday',
                  'I have only 30 minutes today',
                  "I couldn't finish yesterday's tasks",
                  'Break my Python goal into smaller steps',
                ].map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setInput(prompt)}
                    className="rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 px-3 py-1.5 text-xs text-slate-200 text-left"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  m.role === 'user'
                    ? 'bg-amber-400/20 border border-amber-300/30 text-slate-50'
                    : 'bg-white/[0.06] border border-white/10 text-slate-100'
                }`}
              >
                {m.hasAttachment && (
                  <div className="text-[11px] font-bold text-amber-200 mb-1 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    <span>{m.attachmentName || 'Attached file'}</span>
                  </div>
                )}
                <p>{m.text}</p>

                {m.pendingConfirmation && !m.confirmationResolved && (
                  <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                    <div className="text-xs font-extrabold text-amber-300">
                      Confirm change: {m.pendingConfirmation.confirmationSummary}
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onConfirmProposal(m.id, m.pendingConfirmation!)}
                        className="min-h-[36px] rounded-xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-xs px-3.5 inline-flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Apply Change</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onCancelProposal(m.id)}
                        className="min-h-[36px] rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 font-bold text-xs px-3.5"
                      >
                        Keep as-is
                      </button>
                    </div>
                  </div>
                )}

                {m.confirmationResolved && (
                  <div className="mt-2 text-[11px] font-bold text-teal-300">
                    {m.confirmationResolved === 'confirmed'
                      ? 'Applied to your Orbit schedule.'
                      : 'Left your schedule unchanged.'}
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-xs text-slate-400">Orbit is thinking...</div>
          )}
        </div>

        {/* Input Bar */}
        <form onSubmit={handleSubmit} className="p-4 border-t border-white/10 space-y-2">
          {fileName && (
            <div className="text-xs text-teal-200 flex items-center justify-between bg-white/[0.05] rounded-xl px-3 py-1.5">
              <span>Attached: {fileName}</span>
              <button
                type="button"
                onClick={() => {
                  setFileName('');
                  setFileBase64(undefined);
                  setMimeType(undefined);
                }}
                className="text-slate-400 hover:text-white"
              >
                Remove
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <label
              title="Attach image or PDF"
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-white/[0.07] hover:bg-white/[0.14] border border-white/12 flex items-center justify-center text-slate-200 cursor-pointer shrink-0"
            >
              <Plus className="w-5 h-5" />
              <input
                type="file"
                accept="image/*,.pdf,application/pdf"
                onChange={handleAttach}
                className="hidden"
              />
            </label>

            {voiceEnabled && (
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Stop voice input' : 'Start voice input'}
                className={`min-h-[44px] min-w-[44px] rounded-2xl border flex items-center justify-center shrink-0 transition-colors ${
                  listening
                    ? 'bg-amber-400 text-slate-950 border-amber-300'
                    : 'bg-white/[0.07] hover:bg-white/[0.14] border-white/12 text-slate-200'
                }`}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}

            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Orbit or tell me what changed..."
              className="flex-1 min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-300/50"
            />

            <button
              type="submit"
              disabled={loading || (!input.trim() && !fileBase64)}
              aria-label="Send message"
              className="min-h-[44px] min-w-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 flex items-center justify-center shrink-0 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
