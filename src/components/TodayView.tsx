import { useEffect, useMemo, useState } from 'react';
import {
  Play,
  Pause,
  Check,
  HelpCircle,
  SkipForward,
  Plus,
  Clock,
  RotateCcw,
  CloudRain,
  CloudSun,
  Zap,
  X,
  ArrowRight,
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
import { CircularRing } from './CircularRing';

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
  { id: 'fried', label: 'Fried', minutesLabel: '5m cap', hint: 'Tiny safe steps', icon: CloudRain },
  { id: 'okay', label: 'Okay', minutesLabel: '15m cap', hint: 'Steady pace', icon: CloudSun },
  { id: 'lockedIn', label: 'Locked-in', minutesLabel: '25m cap', hint: 'Deep blocks', icon: Zap },
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

function formatTodayHeading(isoDate: string): string {
  const parsed = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return isoDate;
  return parsed.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  });
}

function formatPriorityLabel(priority: OrbitTask['priority']): string {
  if (priority === 'high') return 'High';
  if (priority === 'medium') return 'Medium';
  return 'Low';
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
  const todayISO = getTodayISO();
  const formattedDate = useMemo(() => formatTodayHeading(todayISO), [todayISO]);

  const { tasks: queueTasks, totalAdaptedMinutes, pausedGoalCount } = useMemo(
    () => getTodayQueue(state),
    [state]
  );

  const missedTasks = useMemo(() => getUnreviewedMissedTasks(state), [state]);

  // 2-minute starter state
  const [starterTaskId, setStarterTaskId] = useState<string | null>(null);
  const [phase, setPhase] = useState<'two_min' | 'two_min_done' | 'extended'>('two_min');
  const [secondsLeft, setSecondsLeft] = useState(120);
  const [totalSeconds, setTotalSeconds] = useState(120);
  const [isRunning, setIsRunning] = useState(false);

  // Quick-add input
  const [quickTitle, setQuickTitle] = useState('');
  const [quickMinutes, setQuickMinutes] = useState(15);

  // Unstick inline expansion per task
  const [unstuckTaskId, setUnstuckTaskId] = useState<string | null>(null);

  const activeStarterTask = useMemo(
    () => queueTasks.find((t) => t.id === starterTaskId) ?? null,
    [queueTasks, starterTaskId]
  );

  const focusPreviewTask = activeStarterTask ?? queueTasks[0] ?? null;

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
    return state.tasks.filter(
      (t) =>
        t.status === 'completed' &&
        (t.completedAt ? t.completedAt.slice(0, 10) === todayISO : t.scheduledDate === todayISO)
    ).length;
  }, [state.tasks, todayISO]);

  const progressFraction =
    totalSeconds > 0 ? Math.max(0, Math.min(1, (totalSeconds - secondsLeft) / totalSeconds)) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 sm:py-8 space-y-6">
      {/* Welcome & Daily Controls */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#D6A04A]">{formattedDate}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-[#F3F4F6] mt-1">
              Welcome back
            </h1>
            <p className="text-sm text-[#9CA3AF] mt-1">
              <span className="font-medium text-[#E5E7EB] tabular-nums">
                {queueTasks.length}
              </span>{' '}
              manageable task{queueTasks.length === 1 ? '' : 's'}
              <span aria-hidden="true"> · </span>
              <span className="font-mono-tabular">{totalAdaptedMinutes}m</span> total
              <span aria-hidden="true"> · </span>
              <span className="font-mono-tabular">{todayCompletedCount}</span> done today
              {pausedGoalCount > 0 ? ` · ${pausedGoalCount} paused goal hidden` : ''}
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center">
            <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
            <span className="text-xs font-medium text-[#9CA3AF]">Time:</span>
            <div className="flex items-center gap-1 rounded-xl bg-[#14171D] border border-[#262B36] p-1">
              {TIME_OPTIONS.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeAvailableMinutes(mins)}
                  className={`min-h-[30px] px-2.5 rounded-lg text-xs font-medium font-mono-tabular transition-colors ${
                    state.preferences.availableMinutesToday === mins
                      ? 'bg-[#D6A04A] text-[#111318] font-semibold'
                      : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                  }`}
                >
                  {mins}m
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Energy / Brain Weather Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          {WEATHER_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const active = weather === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onChangeWeather(opt.id)}
                className={`min-h-[52px] rounded-xl px-3.5 py-2.5 text-left flex items-center justify-between gap-3 border transition-colors ${
                  active
                    ? 'bg-[#21252F] border-[#D6A04A]/50 text-[#F3F4F6]'
                    : 'bg-[#14171D] border-[#242934] text-[#9CA3AF] hover:border-[#323846] hover:text-[#E5E7EB]'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#D6A04A]' : 'text-[#7A8291]'
                    }`}
                  />
                  <span>
                    <span className="block text-sm font-medium text-[#F3F4F6]">{opt.label}</span>
                    <span className="block text-xs text-[#9CA3AF]">{opt.hint}</span>
                  </span>
                </span>
                <span className="text-xs font-mono-tabular text-[#9CA3AF]">
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
          className="rounded-xl bg-[#D6A04A]/10 border border-[#D6A04A]/35 px-4 py-3 text-sm text-[#F5DEB3]"
        >
          {error}
        </div>
      )}

      {/* Win Note Banner */}
      {latestWin && (
        <section className="bg-[#1A1D24] border border-[#D6A04A]/35 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-[#D6A04A]">
              Win logged · {latestWin.minutes} min
            </p>
            <p className="text-sm sm:text-base font-medium text-[#F3F4F6] mt-1">
              {latestWin.note}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismissWin}
            aria-label="Dismiss celebration"
            className="min-h-[36px] min-w-[36px] rounded-lg hover:bg-[#242934] flex items-center justify-center text-[#9CA3AF] hover:text-[#F3F4F6]"
          >
            <X className="w-4 h-4" />
          </button>
        </section>
      )}

      {/* Replan Confirmation Message */}
      {replanMessage && (
        <div className="rounded-xl bg-teal-500/10 border border-teal-500/25 px-4 py-3 text-sm text-teal-200">
          {replanMessage}
        </div>
      )}

      {/* Guilt-Free Restart for Missed Tasks */}
      {missedTasks.length > 0 && (
        <section className="bg-[#1A1D24] border border-[#2E3442] rounded-2xl p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <RotateCcw className="w-4 h-4 text-[#D6A04A] shrink-0 mt-1" />
            <div className="flex-1">
              <p className="text-xs font-medium text-[#D6A04A]">
                Gentle restart · {missedTasks.length} carried over
              </p>
              <h2 className="text-base font-semibold text-[#F3F4F6] mt-1">
                What got in the way?
              </h2>
              <p className="text-sm text-[#9CA3AF] mt-1">
                No streaks lost. Pick what happened and Orbit will resize or shift them calmly.
              </p>
              <div className="mt-2.5 text-xs text-[#9CA3AF] space-y-1">
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
                    className="min-h-[48px] rounded-xl bg-[#14171D] hover:bg-[#20242E] border border-[#262B36] px-3.5 py-2.5 text-left transition-colors disabled:opacity-60"
                  >
                    <div className="text-sm font-medium text-[#F3F4F6]">{r.label}</div>
                    <div className="text-xs text-[#9CA3AF]">{r.helper}</div>
                  </button>
                ))}
              </div>
              {replanLoading && (
                <p className="text-xs text-[#9CA3AF] mt-3">Resizing your plan gently...</p>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Single Clear Daily Focus Card */}
      {activeStarterTask ? (
        <section
          aria-label="Daily focus session"
          className="bg-[#1A1D24] border border-[#D6A04A]/40 rounded-2xl p-5 sm:p-6"
        >
          <div className="flex flex-col md:flex-row items-center gap-6">
            <CircularRing
              progress={progressFraction}
              size={164}
              strokeWidth={7}
              weather={weather}
              isFocusing={isRunning}
              isCompletedGlow={phase === 'two_min_done'}
              reduceMotion={state.preferences.reduceMotion}
            >
              <span className="text-[11px] font-medium text-[#9CA3AF]">
                {phase === 'two_min'
                  ? '2-min starter'
                  : phase === 'two_min_done'
                    ? 'Starter done'
                    : 'Focus timer'}
              </span>
              <span className="text-2xl font-semibold font-mono-tabular text-[#F3F4F6] mt-0.5">
                {formatTimer(secondsLeft)}
              </span>
            </CircularRing>

            <div className="flex-1 text-center md:text-left min-w-0">
              <p className="text-xs font-medium text-[#D6A04A]">
                Daily focus · {activeStarterTask.category}
              </p>
              <h2 className="text-lg sm:text-xl font-semibold text-[#F3F4F6] mt-1">
                {activeStarterTask.title}
              </h2>
              <div className="mt-2.5 rounded-xl bg-[#14171D] border border-[#242934] px-3.5 py-2.5 text-sm text-[#D1D5DB]">
                <span className="font-medium text-[#D6A04A]">First step: </span>
                {activeStarterTask.firstAction}
              </div>

              {phase === 'two_min_done' ? (
                <div className="mt-4 space-y-2.5">
                  <p className="text-sm text-teal-300">
                    Inertia broken. Continue, pause, or mark it complete.
                  </p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => extendSession(15)}
                      className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 py-2 transition-colors"
                    >
                      Continue 15m
                    </button>
                    <button
                      type="button"
                      onClick={() => extendSession(25)}
                      className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2F3544] text-[#F3F4F6] font-medium text-sm px-4 py-2 transition-colors"
                    >
                      Continue 25m
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRunning(false);
                        setStarterTaskId(null);
                      }}
                      className="min-h-[40px] rounded-xl bg-[#14171D] hover:bg-[#20242E] border border-[#262B36] text-[#9CA3AF] font-medium text-sm px-4 py-2"
                    >
                      Pause
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        onCompleteTask(activeStarterTask, 2);
                        setStarterTaskId(null);
                        setIsRunning(false);
                      }}
                      className="min-h-[40px] rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 text-teal-200 font-semibold text-sm px-4 py-2"
                    >
                      Finish &amp; Log Win
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex flex-wrap justify-center md:justify-start gap-2">
                  <button
                    type="button"
                    onClick={() => setIsRunning((r) => !r)}
                    className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 py-2 flex items-center gap-1.5 transition-colors"
                  >
                    {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    <span>{isRunning ? 'Pause' : 'Resume'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => extendSession(15)}
                    className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] px-3.5 py-2 text-xs font-medium text-[#E5E7EB]"
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
                    className="min-h-[40px] rounded-xl bg-teal-500/15 hover:bg-teal-500/25 border border-teal-500/30 px-3.5 py-2 text-sm font-medium text-teal-200 flex items-center gap-1.5"
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
                    className="min-h-[40px] rounded-xl px-3 py-2 text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6]"
                  >
                    Stop
                  </button>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        focusPreviewTask && (
          <section
            aria-label="Daily focus"
            className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
          >
            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-center gap-2 text-xs text-[#9CA3AF]">
                <span className="font-medium text-[#D6A04A]">Daily focus</span>
                <span aria-hidden="true">·</span>
                <span className="font-mono-tabular">
                  {getAdaptedMinutes(focusPreviewTask, weather)}m
                </span>
                <span aria-hidden="true">·</span>
                <span>{formatPriorityLabel(focusPreviewTask.priority)} priority</span>
              </div>
              <h2 className="text-lg font-semibold text-[#F3F4F6] truncate">
                {focusPreviewTask.title}
              </h2>
              <p className="text-sm text-[#9CA3AF] truncate">
                First step: {focusPreviewTask.firstAction}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => startTwoMinuteSession(focusPreviewTask)}
                className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 py-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Play className="w-4 h-4" />
                <span>Start 2m focus</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onCompleteTask(focusPreviewTask, getAdaptedMinutes(focusPreviewTask, weather))
                }
                className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] text-[#E5E7EB] font-medium text-sm px-3.5 py-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
              >
                <Check className="w-4 h-4 text-teal-300" />
                <span>Complete</span>
              </button>
            </div>
          </section>
        )
      )}

      {/* Today's Task List */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#F3F4F6]">Today&apos;s Tasks</h2>
          <button
            type="button"
            onClick={onOpenAssistant}
            className="text-xs font-medium text-[#D6A04A] hover:text-[#E0AD5B] inline-flex items-center gap-1 transition-colors"
          >
            <span>Adjust with Assistant</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {queueTasks.length === 0 ? (
          <div className="bg-[#1A1D24] border border-[#262B36] rounded-2xl p-8 text-center space-y-3">
            <h3 className="text-lg font-semibold text-[#F3F4F6]">Your queue is clear</h3>
            <p className="text-sm text-[#9CA3AF] max-w-md mx-auto">
              Create a goal, add an assignment, or drop in a quick task below when you are ready.
            </p>
            <div className="flex flex-wrap justify-center gap-2.5 pt-1">
              <button
                type="button"
                onClick={onGoToGoals}
                className="min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-sm px-4 py-2 transition-colors"
              >
                Create a Goal
              </button>
              <button
                type="button"
                onClick={onOpenAssistant}
                className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2A2F3B] border border-[#2E3442] text-[#E5E7EB] font-medium text-sm px-4 py-2 transition-colors"
              >
                Open Assistant
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-2.5">
            {queueTasks.map((task) => {
              const adaptedMin = getAdaptedMinutes(task, weather);
              const isStuckOpen = unstuckTaskId === task.id;
              const instantCue = getInstantUnstickFallback(task, weather);

              return (
                <article
                  key={task.id}
                  className="bg-[#1A1D24] border border-[#262B36] hover:border-[#323846] rounded-xl px-4 py-3.5 transition-colors"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={false}
                        aria-label={`Mark "${task.title}" done`}
                        onClick={() => onCompleteTask(task, adaptedMin)}
                        className="mt-0.5 w-6 h-6 min-w-[24px] rounded-md border border-[#3B4252] bg-[#14171D] hover:border-[#D6A04A] hover:bg-[#D6A04A]/10 flex items-center justify-center text-transparent hover:text-[#D6A04A] transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A04A]"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>

                      <div className="min-w-0 flex-1">
                        <h3 className="text-[15px] font-medium text-[#F3F4F6] leading-snug">
                          {task.title}
                        </h3>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-[#9CA3AF]">
                          <span className="font-mono-tabular">{adaptedMin}m</span>
                          <span aria-hidden="true">·</span>
                          <span
                            className={
                              task.priority === 'high' ? 'text-[#D6A04A] font-medium' : 'text-[#9CA3AF]'
                            }
                          >
                            {formatPriorityLabel(task.priority)}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span className="capitalize">{task.category}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 shrink-0 pl-9 sm:pl-0">
                      <button
                        type="button"
                        onClick={() => startTwoMinuteSession(task)}
                        className="min-h-[36px] rounded-lg bg-[#222630] hover:bg-[#2B303D] border border-[#2F3544] px-3 py-1.5 text-xs font-medium text-[#F3F4F6] flex items-center gap-1.5 transition-colors"
                      >
                        <Play className="w-3.5 h-3.5 text-[#D6A04A]" />
                        <span>Start 2m</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setUnstuckTaskId(isStuckOpen ? null : task.id);
                          onUnstickTask(task);
                        }}
                        className={`min-h-[36px] rounded-lg border px-2.5 py-1.5 text-xs font-medium flex items-center gap-1 transition-colors ${
                          isStuckOpen
                            ? 'bg-[#D6A04A]/15 border-[#D6A04A]/40 text-[#D6A04A]'
                            : 'bg-[#14171D] hover:bg-[#20242E] border-[#262B36] text-[#9CA3AF] hover:text-[#F3F4F6]'
                        }`}
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>I&apos;m stuck</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => onSkipTask(task)}
                        aria-label={`Skip ${task.title}`}
                        className="min-h-[36px] rounded-lg px-2.5 py-1.5 text-xs font-medium text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#20242E] flex items-center gap-1 transition-colors"
                      >
                        <SkipForward className="w-3.5 h-3.5" />
                        <span>Skip</span>
                      </button>
                    </div>
                  </div>

                  {isStuckOpen && (
                    <div className="mt-3 ml-9 rounded-xl bg-[#14171D] border border-[#262B36] p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-[#D6A04A]">
                          2-Minute Micro-Breakdown
                        </span>
                        {unstickLoading && (
                          <span className="text-xs text-[#9CA3AF]">Refining...</span>
                        )}
                      </div>
                      <p className="text-xs font-medium text-[#F3F4F6]">
                        First physical step: {instantCue.firstPhysicalAction}
                      </p>
                      <ol className="list-decimal list-inside text-xs text-[#9CA3AF] space-y-1">
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

      {/* Quick Add Custom Task */}
      <section className="bg-[#1A1D24] border border-[#262B36] rounded-xl p-3.5 sm:p-4">
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
            placeholder="Add a quick task for today..."
            className="flex-1 min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3.5 text-sm text-[#F3F4F6] placeholder:text-[#6B7280] focus:outline-none focus:border-[#D6A04A]"
          />
          <select
            value={quickMinutes}
            onChange={(e) => setQuickMinutes(Number(e.target.value))}
            aria-label="Estimated minutes"
            className="min-h-[40px] rounded-xl bg-[#14171D] border border-[#262B36] px-3 text-xs font-medium text-[#F3F4F6] focus:outline-none focus:border-[#D6A04A]"
          >
            <option value={5}>5 min</option>
            <option value={10}>10 min</option>
            <option value={15}>15 min</option>
            <option value={25}>25 min</option>
          </select>
          <button
            type="submit"
            className="min-h-[40px] rounded-xl bg-[#222630] hover:bg-[#2B303D] border border-[#2F3544] px-4 text-xs font-semibold text-[#F3F4F6] flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5 text-[#D6A04A]" />
            <span>Add Task</span>
          </button>
        </form>
      </section>
    </div>
  );
}
