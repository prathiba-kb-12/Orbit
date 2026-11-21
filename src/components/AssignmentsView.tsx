import { useState, type ChangeEvent } from 'react';
import {
  Upload,
  FileText,
  Check,
  ArrowUp,
  ArrowDown,
  Plus,
  Trash2,
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

    if (file.type.startsWith('text/') || /\.(txt|md|csv)$/i.test(file.name)) {
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
    <div className="max-w-5xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      <div>
        <p className="text-xs font-medium text-[#D6A04A]">Assignments &amp; Work</p>
        <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
          Assignments &amp; Exams
        </h1>
        <p className="text-sm text-[#9CA3AF] mt-1">
          Upload a PDF, image, screenshot, or syllabus note. Orbit breaks it into small editable steps.
        </p>
      </div>

      {error && (
        <div className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]">
          {error}
        </div>
      )}

      {/* Upload & Extract Card */}
      <form
        onSubmit={handleSubmit}
        className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 sm:p-6 space-y-4"
      >
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 text-sm font-medium text-[#D6A04A]">
            <Sparkles className="w-4 h-4" />
            <span>Drop an assignment prompt, exam notice, or file</span>
          </div>

          <label className="min-h-[38px] rounded-xl bg-[#14171D] hover:bg-[#222630] border border-[#262B36] px-3.5 py-2 text-xs font-medium text-[#E5E7EB] flex items-center gap-2 cursor-pointer transition-colors">
            <Upload className="w-4 h-4 text-[#9CA3AF]" />
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
          placeholder="Paste assignment instructions, exam syllabus, or portal message..."
          className="w-full rounded-xl bg-[#14171D] border border-[#262B36] p-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
        />

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={loading || (!text.trim() && !fileBase64)}
            className="min-h-[42px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-5 py-2 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Extracting & breaking down...' : 'Extract & Break Into Steps'}
          </button>
          {fileName && (
            <span className="text-xs text-teal-300 flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              <span>Attached: {fileName}</span>
            </span>
          )}
        </div>
      </form>

      {/* Assignment & Exam Cards */}
      {state.assignments.length === 0 ? (
        <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-8 text-center">
          <h2 className="text-lg font-semibold text-[#F3F4F6]">No assignments or exams yet</h2>
          <p className="text-sm text-[#9CA3AF] mt-1">
            Add one above and Orbit will split it into calm 10–25 minute steps without overloading any day.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {state.assignments.map((assignment: Assignment) => {
            const { tasks, completed, total, percent } = getAssignmentProgress(
              assignment,
              state.tasks
            );
            const daysLeft = daysBetweenISO(today, assignment.dueDate);

            return (
              <section
                key={assignment.id}
                className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div>
                    <div className="text-xs text-[#9CA3AF]">
                      <span className="uppercase text-[#D6A04A] font-medium">
                        {assignment.kind}
                      </span>
                      {' · '}
                      <span>{assignment.subject}</span>
                      {' · '}
                      <span className="font-mono-tabular">
                        Due {assignment.dueDate} ({daysLeft >= 0 ? `${daysLeft}d left` : 'past due'})
                      </span>
                      {assignment.sourceFileName ? ` · ${assignment.sourceFileName}` : ''}
                    </div>
                    <h2 className="text-lg font-semibold text-[#F3F4F6] mt-1">
                      {assignment.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="text-base font-semibold font-mono-tabular text-teal-300">
                        {percent}%
                      </div>
                      <div className="text-xs text-[#9CA3AF] font-mono-tabular">
                        {completed}/{total} steps
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onDeleteAssignment(assignment.id)}
                      aria-label={`Delete ${assignment.title}`}
                      className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#6B7280] hover:text-[#F3F4F6]"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {assignment.requirements.length > 0 && (
                  <div className="rounded-xl bg-[#14171D] border border-[#242934] p-3.5">
                    <div className="text-xs font-medium text-[#9CA3AF] mb-1.5">
                      Extracted Requirements
                    </div>
                    <ul className="text-xs text-[#D1D5DB] space-y-1 list-disc list-inside">
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
                        className="rounded-xl bg-[#14171D] border border-[#242934] px-3.5 py-2.5 flex items-center justify-between gap-2"
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
                              className="flex-1 min-h-[34px] rounded-lg bg-[#1A1D24] border border-[#2E3442] px-3 text-sm text-[#F3F4F6]"
                            />
                            <input
                              type="number"
                              min={5}
                              max={60}
                              value={editingMinutes}
                              onChange={(e) => setEditingMinutes(Number(e.target.value))}
                              className="w-20 min-h-[34px] rounded-lg bg-[#1A1D24] border border-[#2E3442] px-2 text-sm text-[#F3F4F6] font-mono-tabular"
                            />
                            <button
                              type="submit"
                              className="min-h-[34px] rounded-lg bg-[#D6A04A] text-[#111318] font-semibold text-xs px-3"
                            >
                              Save
                            </button>
                          </form>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => onToggleTaskDone(task)}
                              className="flex items-center gap-3 flex-1 text-left min-h-[34px]"
                            >
                              <span
                                className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                  done
                                    ? 'bg-teal-400 border-teal-400 text-[#111318]'
                                    : 'border-[#3B4252] bg-[#1A1D24] text-transparent'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </span>
                              <div>
                                <div
                                  className={`text-sm font-medium ${
                                    done ? 'line-through text-[#6B7280]' : 'text-[#F3F4F6]'
                                  }`}
                                >
                                  {task.title}
                                </div>
                                <div className="text-xs text-[#9CA3AF] font-mono-tabular">
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
                                className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#9CA3AF] disabled:opacity-30"
                              >
                                <ArrowUp className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                disabled={idx === tasks.length - 1}
                                onClick={() => onMoveTaskOrder(assignment.id, task.id, 'down')}
                                aria-label="Move down"
                                className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#9CA3AF] disabled:opacity-30"
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
                                className="min-h-[32px] rounded-lg hover:bg-[#222630] px-2 text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTask(task.id)}
                                aria-label="Delete step"
                                className="min-h-[32px] min-w-[32px] rounded-lg hover:bg-[#222630] flex items-center justify-center text-[#6B7280] hover:text-[#F3F4F6]"
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
                    className="flex-1 min-h-[38px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
                  />
                  <button
                    type="submit"
                    className="min-h-[38px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] px-3.5 text-xs font-medium text-[#F3F4F6] flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5 text-[#D6A04A]" />
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
