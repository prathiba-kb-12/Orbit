import type { AppSection, BrainWeather, UserProfile } from '../types';
import {
  Sun,
  Target,
  BookOpen,
  CalendarDays,
  Compass,
  BarChart3,
  ShieldCheck,
  Sparkles,
  LogOut,
} from 'lucide-react';
import { getWeatherAccent } from './CircularRing';
import { UserAvatar } from './UserAvatar';

interface NavShellProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  weather: BrainWeather;
  onOpenAssistant: () => void;
  missedCount: number;
  profile?: UserProfile | null;
  onSignOut?: () => void;
}

const NAV_ITEMS: Array<{
  id: AppSection;
  label: string;
  shortLabel: string;
  icon: typeof Sun;
}> = [
  { id: 'today', label: 'Today', shortLabel: 'Today', icon: Sun },
  { id: 'goals', label: 'Goals', shortLabel: 'Goals', icon: Target },
  { id: 'assignments', label: 'Assignments', shortLabel: 'Work', icon: BookOpen },
  { id: 'planner', label: 'Planner', shortLabel: 'Plan', icon: CalendarDays },
  { id: 'opportunities', label: 'Opportunities', shortLabel: 'Opps', icon: Compass },
  { id: 'insights', label: 'Insights', shortLabel: 'Stats', icon: BarChart3 },
  { id: 'privacy', label: 'Privacy', shortLabel: 'Privacy', icon: ShieldCheck },
];

export function NavShell({
  activeSection,
  onSelectSection,
  weather,
  onOpenAssistant,
  missedCount,
  profile,
  onSignOut,
}: NavShellProps) {
  const accent = getWeatherAccent(weather);

  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-white/10 bg-[#070a1e]/85 backdrop-blur-2xl px-4 py-6">
        <button
          type="button"
          onClick={() => onSelectSection('today')}
          className="flex items-center gap-3 px-3 py-2 rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
        >
          <span
            aria-hidden="true"
            className={`w-3.5 h-3.5 rounded-full ${accent.ringDot}`}
            style={{ boxShadow: `0 0 14px ${accent.glow}` }}
          />
          <div>
            <div className="text-xl font-extrabold tracking-tight text-slate-50 leading-none">
              Orbit
            </div>
            <div className="text-[11px] font-semibold text-slate-400 mt-1">
              Gentle Student Copilot
            </div>
          </div>
        </button>

        <nav aria-label="Main sections" className="mt-7 flex-1 space-y-1.5 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[44px] flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-2xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
                  active
                    ? `${accent.softBg} ${accent.text} border ${accent.border}`
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </span>
                {item.id === 'today' && missedCount > 0 && (
                  <span className="text-xs font-extrabold text-violet-200 font-mono-tabular">
                    {missedCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-4 border-t border-white/10 space-y-3">
          {profile && (
            <div
              className={`rounded-2xl border p-2 flex items-center justify-between gap-2 transition-colors ${
                activeSection === 'profile'
                  ? `${accent.softBg} ${accent.border}`
                  : 'bg-white/[0.04] border-white/10 hover:bg-white/[0.07]'
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectSection('profile')}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left rounded-xl"
                title="Open profile & account settings"
              >
                <UserAvatar
                  name={profile.displayName}
                  photoURL={profile.photoURL}
                  size="sm"
                />
                <div className="min-w-0">
                  <div className="text-xs font-extrabold text-slate-100 truncate">
                    {profile.displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {profile.email}
                  </div>
                </div>
              </button>
              {onSignOut && (
                <button
                  type="button"
                  onClick={onSignOut}
                  aria-label="Sign out"
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-amber-200 hover:bg-white/10 shrink-0"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={onOpenAssistant}
            className="w-full min-h-[48px] rounded-2xl bg-amber-400/90 hover:bg-amber-300 text-slate-950 font-extrabold text-sm px-4 py-2.5 flex items-center justify-center gap-2 transition-colors shadow-lg shadow-amber-500/10"
          >
            <Sparkles className="w-4 h-4" />
            <span>Ask Orbit Assistant</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-white/10 bg-[#06081a]/85 backdrop-blur-xl px-4 py-2.5 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onSelectSection('today')}
          className="inline-flex items-center gap-2.5 min-h-[44px] px-1 rounded-xl"
        >
          <span
            aria-hidden="true"
            className={`w-3 h-3 rounded-full ${accent.ringDot}`}
            style={{ boxShadow: `0 0 12px ${accent.glow}` }}
          />
          <span className="text-lg font-extrabold tracking-tight text-slate-50">Orbit</span>
        </button>

        <div className="flex items-center gap-2">
          {profile && (
            <button
              type="button"
              onClick={() => onSelectSection('profile')}
              aria-label="Open profile and account settings"
              className={`p-1 rounded-2xl border transition-colors ${
                activeSection === 'profile'
                  ? 'border-amber-300/60 bg-amber-400/15'
                  : 'border-white/15 bg-white/[0.05]'
              }`}
            >
              <UserAvatar name={profile.displayName} photoURL={profile.photoURL} size="sm" />
            </button>
          )}
          <button
            type="button"
            onClick={onOpenAssistant}
            className="min-h-[40px] rounded-2xl bg-amber-400/90 hover:bg-amber-300 text-slate-950 font-extrabold text-xs px-3.5 py-2 flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistant</span>
          </button>
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile sections"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/12 bg-[#070b22]/92 backdrop-blur-2xl pb-safe"
      >
        <div className="grid grid-cols-7 max-w-xl mx-auto px-1 py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors ${
                  active ? accent.text : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-bold leading-tight truncate max-w-full">
                  {item.shortLabel}
                </span>
              </button>
            );
          })}
        </div>
      </nav>
    </>
  );
}
