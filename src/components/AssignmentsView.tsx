import { useState, type ChangeEvent } from 'react';
import {
  Upload,
  FileText,
  Check,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
  Circle,
  Sparkles,
} from 'lucide-react';
import type { Assignment, OrbitState, OrbitTask } from '../types';
import { getAssignmentProgress, daysBetweenISO, getTodayISO } from '../lib/orbitStore';

interface AssignmentsViewProps {
  state: OrbitState;
  onExtractAssignment: (payload: {
    text?: string;
    fileBase64?: string;
    mimeType?: string;
    fileName?: string;
  }) => Promise<void>;
  onToggleTaskDone: (task: OrbitTask) => void;
  onUpdateTask: (taskId: string, patch: Partial<OrbitTask>) => void;
  onMoveTaskOrder: (assignmentId: string, taskId: string, direction: 'up' | 'down') => void;
  onAddTaskToAssignment: (assignmentId: string, title: string, minutes: number) => void;
  onDeleteTask: (taskId: string) => void;
  onDeleteAssignment: (assignmentId: string) => void;
  loading: boolean;
  error: string | null;
}

export function AssignmentsView({
  state,
  onExtractAssignment,
  onToggleTaskDone,
  onUpdateTask,
  onMoveTaskOrder,
  onAddTaskToAssignment,
  onDeleteTask,
  onDeleteAssignment,
  loading,
  error,
}: AssignmentsViewProps) {
  const [text, setText] = useState('');
  const [fileName, setFileName] = useState('');
  const [fileBase64, setFileBase64] = useState<string | undefined>();
  const [mimeType, setMimeType] = useState<string | undefined>();

  // Per-assignment add step inputs
  const [newStepText, setNewStepText] = useState<Record<string, string>>({});
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingMinutes, setEditingMinutes] = useState(15);

  const today = getTodayISO();

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);

    // If plain text / markdown / csv, read text directly for fastest reliability
    if (
      file.type.startsWith('text/') ||
      /\.(txt|md|csv)$/i.test(file.name)
    ) {
      const content = await file.text();
      setText((prev) => (prev ? `${prev}\n\n${content}` : content));
      setFileBase64(undefined);
      setMimeType(undefined);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      const base64 = result.includes(',') ? result.split(',')[1] : result;
      setFileBase64(base64);
      setMimeType(file.type || 'application/pdf');
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && !fileBase64) return;
    await onExtractAssignment({
      text: text.trim() || undefined,
      fileBase64,
      mimeType,
      fileName: fileName || undefined,
    });
    setText('');
    setFileName('');
    setFileBase64(undefined);
    setMimeType(undefined);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
          Assignments · Academic Workspace
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
          Assignments &amp; Exams
        </h1>
        <p className="text-sm text-slate-300 mt-1">
          Upload a PDF, image, screenshot, or syllabus note. Orbit breaks it into small editable steps and gently rebalances your daily schedule.
        </p>
      </div>

      {error && (
        <div className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100">
          {error}
        </div>
      )}

      {/* Upload & Extract Card */}
      <form onSubmit={handleSubmit} className="aurora-glass-card rounded-[28px] p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-extrabold text-amber-300">
            <Sparkles className="w-4 h-4" />
            <span>Drop an assignment prompt, exam notice, or file</span>
          </div>

          <label className="min-h-[42px] rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] border border-white/15 px-4 py-2 text-xs font-extrabold text-slate-100 flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            <span>{fileName ? fileName : 'Upload PDF / Image / Doc'}</span>
            <input
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp,.txt,.md,.csv,application/pdf,image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
        </div>

        <textarea
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Paste assignment instructions, exam syllabus, or portal message (e.g., 'CS204 Data Analysis Lab due next Friday — collect dataset, analyze correlations, plot charts, submit PDF')..."
          className="w-full rounded-2xl bg-white/[0.06] border border-white/12 p-4 text-sm text-slate-100 placeholder:text-slate-400"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || (!text.trim() && !fileBase64)}
            className="min-h-[46px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-6 py-2.5 disabled:opacity-50"
          >
            {loading ? 'Extracting & breaking down...' : 'Extract & Break Into Steps'}
          </button>
          {fileName && (
            <span className="text-xs text-teal-200 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Attached: {fileName}</span>
            </span>
          )}
        </div>
      </form>

      {/* Assignment & Exam Cards */}
      {state.assignments.length === 0 ? (
        <div className="aurora-glass-card rounded-[28px] p-8 text-center">
          <h2 className="text-xl font-extrabold text-slate-50">No assignments or exams yet</h2>
          <p className="text-sm text-slate-300 mt-1">
            Add one above and Orbit will split it into calm 10–25 minute steps without overloading any day.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {state.assignments.map((assignment: Assignment) => {
            const { tasks, completed, total, percent } = getAssignmentProgress(
              assignment,
              state.tasks
            );
            const daysLeft = daysBetweenISO(today, assignment.dueDate);

            return (
              <section
                key={assignment.id}
                className="aurora-glass-card rounded-[28px] p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="text-xs font-bold text-slate-300">
                      <span className="uppercase text-amber-300">{assignment.kind}</span>
                      {' · '}
                      <span>{assignment.subject}</span>
                      {' · '}
                      <span className="font-mono-tabular">
                        Due {assignment.dueDate} ({daysLeft >= 0 ? `${daysLeft}d left` : 'past due'})
                      </span>
                      {assignment.sourceFileName ? ` · ${assignment.sourceFileName}` : ''}
                    </div>
                    <h2 className="text-xl font-extrabold text-slate-50 mt-1">
                      {assignment.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-lg font-extrabold font-mono-tabular text-teal-300">
                        {percent}%
                      </div>
                      <div className="text-xs text-slate-400 font-mono-tabular">
                        {completed}/{total} steps
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAssignment(assignment.id)}
                      aria-label={`Delete ${assignment.title}`}
                      className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {assignment.requirements.length > 0 && (
                  <div className="rounded-2xl bg-white/[0.04] border border-white/10 p-3.5">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                      Extracted Requirements
                    </div>
                    <ul className="text-xs text-slate-300 space-y-1 list-disc list-inside">
                      {assignment.requirements.map((req, rIdx) => (
                        <li key={rIdx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Reorderable & Editable Steps */}
                <div className="space-y-2">
                  {tasks.map((task, idx) => {
                    const done = task.status === 'completed';
                    const isEditing = editingTaskId === task.id;

                    return (
                      <div
                        key={task.id}
                        className="rounded-2xl bg-white/[0.03] border border-white/10 px-3.5 py-2.5 flex items-center justify-between gap-2"
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => {
                              e.preventDefault();
                              onUpdateTask(task.id, {
                                title: editingTitle.trim() || task.title,
                                estimatedMinutes: editingMinutes,
                              });
                              setEditingTaskId(null);
                            }}
                            className="flex-1 flex flex-wrap items-center gap-2"
                          >
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="flex-1 min-h-[36px] rounded-xl bg-white/10 border border-white/20 px-3 text-sm text-white"
                            />
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={editingMinutes}
                              onChange={(e) => setEditingMinutes(Number(e.target.value))}
                              className="w-20 min-h-[36px] rounded-xl bg-white/10 border border-white/20 px-2 text-sm text-white font-mono-tabular"
                            />
                            <button
                              type="submit"
                              className="min-h-[36px] rounded-xl bg-amber-400 text-slate-950 font-extrabold text-xs px-3"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onToggleTaskDone(task)}
                              className="flex items-center gap-3 flex-1 text-left min-h-[36px]"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                                  done
                                    ? 'bg-teal-400 border-teal-300 text-slate-950'
                                    : 'border-white/30 bg-white/5 text-transparent'
                                }`}
                              >
                                {done ? <Check className="w-3.5 h-3.5" /> : <Circle className="w-3 h-3" />}
                              </span>
                              <div>
                                <div
                                  className={`text-sm font-bold ${
                                    done ? 'line-through text-slate-400' : 'text-slate-100'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-slate-400 font-mono-tabular">
                                  {task.estimatedMinutes}m · scheduled {task.scheduledDate}
                                </div>
                              </div>
                            </button>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={idx === 0}
                                onClick={() => onMoveTaskOrder(assignment.id, task.id, 'up')}
                                aria-label="Move up"
                                className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === tasks.length - 1}
                                onClick={() => onMoveTaskOrder(assignment.id, task.id, 'down')}
                                aria-label="Move down"
                                className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-300 disabled:opacity-30"
                              >
                                <ArrowDown className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTaskId(task.id);
                                  setEditingTitle(task.title);
                                  setEditingMinutes(task.estimatedMinutes);
                                }}
                                className="min-h-[34px] rounded-lg hover:bg-white/10 px-2 text-xs font-bold text-slate-300"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                aria-label="Delete step"
                                className="min-h-[34px] min-w-[34px] rounded-lg hover:bg-white/10 flex items-center justify-center text-slate-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Add Step */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const stepTitle = (newStepText[assignment.id] || '').trim();
                    if (!stepTitle) return;
                    onAddTaskToAssignment(assignment.id, stepTitle, 15);
                    setNewStepText((prev) => ({ ...prev, [assignment.id]: '' }));
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={newStepText[assignment.id] || ''}
                    onChange={(e) =>
                      setNewStepText((prev) => ({ ...prev, [assignment.id]: e.target.value }))
                    }
                    placeholder="Add another small step..."
                    className="flex-1 min-h-[40px] rounded-xl bg-white/[0.05] border border-white/10 px-3.5 text-sm text-slate-100"
                  />
                  <button
                    type="submit"
                    className="min-h-[40px] rounded-xl bg-white/10 hover:bg-white/15 px-3.5 text-xs font-extrabold text-slate-100 flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Step</span>
                  </button>
                </form>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
