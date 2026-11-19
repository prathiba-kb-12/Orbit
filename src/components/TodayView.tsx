import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  Check,
  HelpCircle,
  SkipForward,
  Sparkles,
  Plus,
  Clock,
  RotateCcw,
  CloudRain,
  CloudSun,
  Zap,
  X,
} from 'lucide-react';
import type {
  BlockerReason,
  BrainWeather,
  OrbitState,
  OrbitTask,
  WinNote,
} from '../types';
import {
  getAdaptedMinutes,
  getInstantUnstickFallback,
  getTodayISO,
  getTodayQueue,
  getUnreviewedMissedTasks,
} from '../lib/orbitStore';
import { CircularRing, getWeatherAccent } from './CircularRing';

interface TodayViewProps {
  state: OrbitState;
  onChangeWeather: (weather: BrainWeather) => void;
  onChangeAvailableMinutes: (minutes: number) => void;
  onCompleteTask: (task: OrbitTask, minutesSpent: number) => void;
  onSkipTask: (task: OrbitTask) => void;
  onUnstickTask: (task: OrbitTask) => void;
  onReplanMissed: (reason: BlockerReason, missed: OrbitTask[]) => void;
  onAddQuickTask: (title: string, minutes: number) => void;
  onGoToGoals: () => void;
  onOpenAssistant: () => void;
  unstickLoading: boolean;
  replanLoading: boolean;
  latestWin: WinNote | null;
  replanMessage: string | null;
  onDismissWin: () => void;
  error: string | null;
}

const WEATHER_OPTIONS: Array<{
  id: BrainWeather;
  label: string;
  minutesLabel: string;
  hint: string;
  icon: typeof CloudRain;
}> = [
  { id: 'fried', label: 'Fried', minutesLabel: '5 min', hint: 'Tiny safe steps', icon: CloudRain },
  { id: 'okay', label: 'Okay', minutesLabel: '15 min', hint: 'Steady gentle pace', icon: CloudSun },
  { id: 'lockedIn', label: 'Locked-in', minutesLabel: '25 min', hint: 'Deep focus blocks', icon: Zap },
];

const TIME_OPTIONS = [15, 30, 45, 60, 90];

const BLOCKER_REASONS: Array<{ id: BlockerReason; label: string; helper: string }> = [
  { id: 'too_big', label: 'Too big', helper: 'Split into smaller pieces' },
  { id: 'exam', label: 'Exam or assignment', helper: 'Shift non-urgent steps' },
  { id: 'too_tired', label: 'Too tired', helper: 'Keep today super light' },
  { id: 'forgot', label: 'Forgot', helper: 'Simplify into one cue' },
];

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function TodayView({
  state,
  onChangeWeather,
  onChangeAvailableMinutes,
  onCompleteTask,
  onSkipTask,
  onUnstickTask,
  onReplanMissed,
  onAddQuickTask,
  onGoToGoals,
  onOpenAssistant,
  unstickLoading,
  replanLoading,
  latestWin,
  replanMessage,
  onDismissWin,
  error,
}: TodayViewProps) {
  const weather = state.preferences.brainWeather;
  const accent = getWeatherAccent(weather);

  const { tasks: queueTasks, totalAdaptedMinutes, pausedGoalCount } = useMemo(
    () => getTodayQueue(state),
    [state]
  );

  const missedTasks = useMemo(() => getUnreviewedMissedTasks(state), [state]);

  // 2-minute starter state (ONLY in Today)
  const [starterTaskId, setStarterTaskId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'two_min' | 'two_min_done' | 'extended'>('two_min');
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [totalSeconds, setTotalSeconds] = useState(120);
  const [isRunning, setIsRunning] = useState(false);

  // Quick-add input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickMinutes, setQuickMinutes] = useState(15);

  // Unstick modal/expansion per task
  const [unstuckTaskId, setUnstuckTaskId] = useState<string | null>(null);

  const activeStarterTask = useMemo(
    () => queueTasks.find((t) => t.id === starterTaskId) ?? null,
    [queueTasks, starterTaskId]
  );

  useEffect(() => {
    if (!isRunning || !activeStarterTask) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setIsRunning(false);
          if (phase === 'two_min') {
            setPhase('two_min_done');
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, activeStarterTask, phase]);

  const startTwoMinuteSession = (task: OrbitTask) => {
    setStarterTaskId(task.id);
    setPhase('two_min');
    setTotalSeconds(120);
    setSecondsLeft(120);
    setIsRunning(true);
  };

  const extendSession = (minutes: number) => {
    const secs = minutes * 60;
    setPhase('extended');
    setTotalSeconds(secs);
    setSecondsLeft(secs);
    setIsRunning(true);
  };

  const todayCompletedCount = useMemo(() => {
    const today = getTodayISO();
    return state.tasks.filter(
      (t) =>
        t.status === 'completed' &&
        (t.completedAt ? t.completedAt.slice(0, 10) === today : t.scheduledDate === today)
    ).length;
  }, [state.tasks]);

  const progressFraction =
    totalSeconds > 0 ? Math.max(0, Math.min(1, (totalSeconds - secondsLeft) / totalSeconds)) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header & Brain Weather */}
      <section className="aurora-glass-card rounded-[28px] p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300/90">
              Today · Daily Action Centre
            </p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 mt-1">
              One calm start at a time
            </h1>
            <p className="text-sm text-slate-300 mt-1">
              {queueTasks.length} manageable task{queueTasks.length === 1 ? '' : 's'} ·{' '}
              <span className="font-mono-tabular">{totalAdaptedMinutes}m</span> adapted total ·{' '}
              <span className="font-mono-tabular">{todayCompletedCount}</span> done today
              {pausedGoalCount > 0 ? ` · ${pausedGoalCount} paused goal hidden` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            <Clock className="w-4 h-4 text-slate-300 shrink-0" />
            <span className="text-xs font-bold text-slate-300">Available:</span>
            <div className="flex items-center gap-1 rounded-2xl bg-white/[0.05] border border-white/10 p-1">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeAvailableMinutes(mins)}
                  className={`min-h-[34px] px-2.5 rounded-xl text-xs font-extrabold font-mono-tabular transition-colors ${
                    state.preferences.availableMinutesToday === mins
                      ? `${accent.button}`
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Brain Weather Selector */}
        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {WEATHER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = weather === opt.id;
            const optAccent = getWeatherAccent(opt.id);
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeWeather(opt.id)}
                className={`min-h-[56px] rounded-2xl px-4 py-3 text-left flex items-center justify-between gap-3 border transition-colors ${
                  active
                    ? `${optAccent.softBg} ${optAccent.border} text-white`
                    : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${active ? optAccent.text : 'text-slate-400'}`} />
                  <span>
                    <span className="block text-sm font-extrabold">{opt.label}</span>
                    <span className="block text-xs text-slate-300">{opt.hint}</span>
                  </span>
                </span>
                <span className="text-xs font-extrabold font-mono-tabular text-slate-200">
                  {opt.minutesLabel}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {error && (
        <div
          role="alert"
          className="rounded-2xl bg-amber-400/12 border border-amber-300/30 px-4 py-3 text-sm text-amber-100"
        >
          {error}
        </div>
      )}

      {/* Win Note Banner */}
      {latestWin && (
        <section className="aurora-glass-card rounded-[24px] p-5 border border-amber-300/30 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-amber-300 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                Win Logged · {latestWin.minutes} min
              </p>
              <p className="text-sm sm:text-base font-bold text-slate-50 mt-1">
                {latestWin.note}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onDismissWin}
            aria-label="Dismiss celebration"
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* Replan Confirmation Message */}
      {replanMessage && (
        <div className="rounded-2xl bg-teal-400/12 border border-teal-300/30 px-4 py-3 text-sm text-teal-100">
          {replanMessage}
        </div>
      )}

      {/* Guilt-Free Restart for Missed Tasks */}
      {missedTasks.length > 0 && (
        <section className="aurora-glass-card rounded-[28px] p-5 sm:p-6 border border-violet-300/30">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-5 h-5 text-violet-300 shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-bold uppercase tracking-wider text-violet-200">
                Guilt-Free Restart · {missedTasks.length} didn&apos;t happen
              </p>
              <h2 className="text-lg font-extrabold text-slate-50 mt-1">
                What got in the way?
              </h2>
              <p className="text-sm text-slate-300 mt-1">
                No streaks lost. Pick what happened and Orbit will gently resize or shift them.
              </p>
              <div className="mt-3 text-xs text-slate-300 space-y-1">
                {missedTasks.slice(0, 3).map((mt) => (
                  <div key={mt.id}>· {mt.title}</div>
                ))}
              </div>

              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {BLOCKER_REASONS.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    disabled={replanLoading}
                    onClick={() => onReplanMissed(r.id, missedTasks)}
                    className="min-h-[52px] rounded-2xl bg-violet-400/15 hover:bg-violet-400/25 border border-violet-300/30 px-4 py-2.5 text-left transition-colors disabled:opacity-60"
                  >
                    <div className="text-sm font-extrabold text-violet-100">{r.label}</div>
                    <div className="text-xs text-slate-300">{r.helper}</div>
                  </button>
                ))}
              </div>
              {replanLoading && (
                <p className="text-xs text-violet-200 mt-3">
                  Resizing your plan gently...
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Active 2-Minute Starter Focus Ring (ONLY in Today) */}
      {activeStarterTask && (
        <section
          aria-label="2-minute starter session"
          className="aurora-glass-card rounded-[28px] p-6 border border-amber-300/35"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CircularRing
              progress={progressFraction}
              size={184}
              strokeWidth={10}
              weather={weather}
              isFocusing={isRunning}
              isCompletedGlow={phase === 'two_min_done'}
              reduceMotion={state.preferences.reduceMotion}
            >
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-300">
                {phase === 'two_min'
                  ? '2-min starter'
                  : phase === 'two_min_done'
                    ? 'Starter done'
                    : 'Focus session'}
              </span>
              <span className="text-3xl font-extrabold font-mono-tabular text-slate-50 mt-0.5">
                {formatTimer(secondsLeft)}
              </span>
            </CircularRing>

            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                {activeStarterTask.sourceType} · {activeStarterTask.category}
              </p>
              <h2 className="text-xl font-extrabold text-slate-50 mt-1">
                {activeStarterTask.title}
              </h2>
              <div className="mt-2 rounded-2xl bg-white/[0.05] border border-white/10 p-3.5 text-sm text-slate-200">
                <span className="font-extrabold text-amber-200">Smallest first action: </span>
                {activeStarterTask.firstAction}
              </div>

              {phase === 'two_min_done' ? (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm font-bold text-teal-200">
                    You broke the inertia! Want to keep going, pause here, or mark it finished?
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2.5">
                    <button
                      type="button"
                      onClick={() => extendSession(15)}
                      className="min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-4 py-2 transition-colors"
                    >
                      Continue 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => extendSession(25)}
                      className="min-h-[44px] rounded-2xl bg-violet-400 hover:bg-violet-300 text-slate-950 font-extrabold text-sm px-4 py-2 transition-colors"
                    >
                      Continue 25m
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRunning(false);
                        setStarterTaskId(null);
                      }}
                      className="min-h-[44px] rounded-2xl bg-white/10 hover:bg-white/15 text-slate-100 font-bold text-sm px-4 py-2"
                    >
                      Pause for now
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCompleteTask(activeStarterTask, 2);
                        setStarterTaskId(null);
                        setIsRunning(false);
                      }}
                      className="min-h-[44px] rounded-2xl bg-teal-400 hover:bg-teal-300 text-slate-950 font-extrabold text-sm px-4 py-2"
                    >
                      Finish &amp; Log Win
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2.5">
                  <button
                    type="button"
                    onClick={() => setIsRunning((r) => !r)}
                    className={`min-h-[44px] rounded-2xl px-4 py-2 font-extrabold text-sm flex items-center gap-2 ${accent.button}`}
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? 'Pause' : 'Resume'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => extendSession(15)}
                    className="min-h-[44px] rounded-2xl bg-white/[0.07] hover:bg-white/[0.12] border border-white/15 px-3.5 py-2 text-xs font-extrabold text-slate-200"
                  >
                    Switch to 15m
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const spent = Math.max(
                        1,
                        Math.round((totalSeconds - secondsLeft) / 60) || 2
                      );
                      onCompleteTask(activeStarterTask, spent);
                      setIsRunning(false);
                      setStarterTaskId(null);
                    }}
                    className="min-h-[44px] rounded-2xl bg-teal-400/20 hover:bg-teal-400/30 border border-teal-300/30 px-4 py-2 text-sm font-extrabold text-teal-100 flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Finish</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsRunning(false);
                      setStarterTaskId(null);
                    }}
                    className="min-h-[44px] rounded-2xl bg-white/5 hover:bg-white/10 px-3.5 py-2 text-xs font-bold text-slate-300"
                  >
                    Stop quietly
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Daily Task Queue */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-slate-100">Today&apos;s Queue</h2>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="text-xs font-extrabold text-amber-300 hover:text-amber-200"
          >
            Ask assistant to adjust →
          </button>
        </div>

        {queueTasks.length === 0 ? (
          <div className="aurora-glass-card rounded-[28px] p-8 text-center space-y-4">
            <h3 className="text-xl font-extrabold text-slate-50">
              Your Today queue is clear
            </h3>
            <p className="text-sm text-slate-300 max-w-md mx-auto">
              Add a long-term goal, drop in an assignment, or add a quick 10-minute task below to begin.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-1">
              <button
                type="button"
                onClick={onGoToGoals}
                className="min-h-[44px] rounded-2xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-5 py-2.5"
              >
                Create a Goal
              </button>
              <button
                type="button"
                onClick={onOpenAssistant}
                className="min-h-[44px] rounded-2xl bg-white/10 hover:bg-white/15 border border-white/15 text-slate-100 font-bold text-sm px-5 py-2.5"
              >
                Talk to Orbit Assistant
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {queueTasks.map((task) => {
              const adaptedMin = getAdaptedMinutes(task, weather);
              const isStuckOpen = unstuckTaskId === task.id;
              const instantCue = getInstantUnstickFallback(task, weather);

              return (
                <article
                  key={task.id}
                  className="aurora-glass-card rounded-[24px] p-5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                    <div className="space-y-1.5 flex-1">
                      <div className="text-xs font-bold text-slate-300">
                        <span
                          className={
                            task.priority === 'high'
                              ? 'text-amber-300'
                              : task.priority === 'medium'
                                ? 'text-teal-300'
                                : 'text-slate-400'
                          }
                        >
                          {task.priority.toUpperCase()} priority
                        </span>
                        {' · '}
                        <span className="font-mono-tabular">{adaptedMin}m</span>
                        {adaptedMin < task.estimatedMinutes && (
                          <span className="text-slate-400"> (resized from {task.estimatedMinutes}m)</span>
                        )}
                        {' · '}
                        <span className="capitalize">{task.category}</span>
                        {' · '}
                        <span className="capitalize">{task.sourceType}</span>
                        {' · '}
                        <span>{task.status.replace('_', ' ')}</span>
                      </div>

                      <h3 className="text-lg font-extrabold text-slate-50">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-slate-300">{task.description}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => startTwoMinuteSession(task)}
                        className={`min-h-[44px] rounded-2xl px-4 py-2 text-sm font-extrabold flex items-center gap-1.5 ${accent.button}`}
                      >
                        <Play className="w-4 h-4" />
                        <span>Start 2m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onCompleteTask(task, adaptedMin)}
                        className="min-h-[44px] rounded-2xl bg-teal-400/18 hover:bg-teal-400/28 border border-teal-300/30 px-3.5 py-2 text-sm font-extrabold text-teal-100 flex items-center gap-1.5"
                      >
                        <Check className="w-4 h-4" />
                        <span>Done</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUnstuckTaskId(isStuckOpen ? null : task.id);
                          onUnstickTask(task);
                        }}
                        className="min-h-[44px] rounded-2xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 px-3.5 py-2 text-xs font-extrabold text-slate-200 flex items-center gap-1.5"
                      >
                        <HelpCircle className="w-4 h-4" />
                        <span>I&apos;m stuck</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSkipTask(task)}
                        className="min-h-[44px] rounded-2xl bg-white/[0.04] hover:bg-white/[0.09] px-3 py-2 text-xs font-bold text-slate-300 flex items-center gap-1"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>Skip</span>
                      </button>
                    </div>
                  </div>

                  {isStuckOpen && (
                    <div className="mt-4 rounded-2xl bg-white/[0.05] border border-white/12 p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold uppercase tracking-wider text-amber-300">
                          2-Minute Micro-Breakdown
                        </span>
                        {unstickLoading && (
                          <span className="text-xs text-slate-400">Refining with AI...</span>
                        )}
                      </div>
                      <p className="text-sm font-bold text-slate-100">
                        First physical step: {instantCue.firstPhysicalAction}
                      </p>
                      <ol className="list-decimal list-inside text-xs text-slate-300 space-y-1">
                        {instantCue.microSteps.map((step, sIdx) => (
                          <li key={sIdx}>{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* Quick Add Custom Task for Today */}
      <section className="aurora-glass-card rounded-[24px] p-4 sm:p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!quickTitle.trim()) return;
            onAddQuickTask(quickTitle.trim(), quickMinutes);
            setQuickTitle('');
          }}
          className="flex flex-col sm:flex-row gap-2.5"
        >
          <input
            type="text"
            value={quickTitle}
            onChange={(e) => setQuickTitle(e.target.value)}
            placeholder="Add a quick task for today (e.g., Read 5 pages of biology notes)..."
            className="flex-1 min-h-[44px] rounded-2xl bg-white/[0.06] border border-white/12 px-4 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:border-amber-300/50"
          />
          <select
            value={quickMinutes}
            onChange={(e) => setQuickMinutes(Number(e.target.value))}
            aria-label="Estimated minutes"
            className="min-h-[44px] rounded-2xl bg-[#101638] border border-white/12 px-3 text-sm font-bold text-slate-100"
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={25}>25 min</option>
          </select>
          <button
            type="submit"
            className="min-h-[44px] rounded-2xl bg-white/12 hover:bg-white/20 border border-white/15 px-4 text-sm font-extrabold text-slate-100 flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Task</span>
          </button>
        </form>
      </section>
    </div>
  );
}
