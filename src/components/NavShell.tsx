import type { AppSection, BrainWeather } from '../types';
import {
  Sun,
  Target,
  BookOpen,
  CalendarDays,
  Compass,
  BarChart3,
  Settings,
  MessageSquare,
} from 'lucide-react';

interface NavShellProps {
  activeSection: AppSection;
  onSelectSection: (section: AppSection) => void;
  weather: BrainWeather;
  onOpenAssistant: () => void;
  missedCount: number;
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
  { id: 'insights', label: 'Insights', shortLabel: 'Insights', icon: BarChart3 },
  { id: 'privacy', label: 'Settings', shortLabel: 'Settings', icon: Settings },
];

export function NavShell({
  activeSection,
  onSelectSection,
  weather: _weather,
  onOpenAssistant,
  missedCount,
}: NavShellProps) {
  return (
    <>
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-56 lg:fixed lg:inset-y-0 lg:left-0 z-30 border-r border-[#242934] bg-[#14161C] px-3 py-5">
        <button
          type="button"
          onClick={() => onSelectSection('today')}
          className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left hover:bg-[#1A1D24] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A04A]/60"
        >
          <span
            aria-hidden="true"
            className="w-7 h-7 rounded-lg bg-[#1F232C] border border-[#2D3340] flex items-center justify-center shrink-0"
          >
            <span className="w-2.5 h-2.5 rounded-full border-2 border-[#D6A04A]" />
          </span>
          <div className="min-w-0">
            <div className="text-[15px] font-semibold tracking-tight text-[#F3F4F6] leading-tight">
              Orbit
            </div>
            <div className="text-[11px] font-normal text-[#8B93A1] truncate">
              Student workspace
            </div>
          </div>
        </button>

        <nav aria-label="Main sections" className="mt-6 flex-1 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeSection === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectSection(item.id)}
                aria-current={active ? 'page' : undefined}
                className={`w-full min-h-[40px] flex items-center justify-between gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A04A]/60 ${
                  active
                    ? 'bg-[#1F232C] text-[#F3F4F6] border border-[#2F3544]'
                    : 'text-[#9CA3AF] hover:text-[#F3F4F6] hover:bg-[#1A1D24] border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      active ? 'text-[#D6A04A]' : 'text-[#7A8291]'
                    }`}
                  />
                  <span className="truncate whitespace-nowrap">{item.label}</span>
                </span>
                {item.id === 'today' && missedCount > 0 && (
                  <span className="text-[11px] font-medium text-[#D6A04A] font-mono-tabular">
                    {missedCount}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="pt-3 border-t border-[#242934]">
          <button
            type="button"
            onClick={onOpenAssistant}
            className="w-full min-h-[40px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-[13px] px-3 py-2 flex items-center justify-center gap-2 transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A04A]"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Ask Assistant</span>
          </button>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="lg:hidden sticky top-0 z-30 border-b border-[#242934] bg-[#14161C]/95 backdrop-blur-md px-4 py-2.5 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onSelectSection('today')}
          className="inline-flex items-center gap-2.5 min-h-[40px] rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D6A04A]/60"
        >
          <span
            aria-hidden="true"
            className="w-6 h-6 rounded-lg bg-[#1F232C] border border-[#2D3340] flex items-center justify-center"
          >
            <span className="w-2 h-2 rounded-full border-2 border-[#D6A04A]" />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-[#F3F4F6]">Orbit</span>
        </button>

        <button
          type="button"
          onClick={onOpenAssistant}
          className="min-h-[38px] rounded-xl bg-[#D6A04A] hover:bg-[#E0AD5B] text-[#111318] font-semibold text-xs px-3.5 py-2 flex items-center gap-1.5 transition-colors whitespace-nowrap"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Assistant</span>
        </button>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav
        aria-label="Mobile sections"
        className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-[#242934] bg-[#14161C]/95 backdrop-blur-md pb-safe"
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
                className={`min-h-[46px] flex flex-col items-center justify-center gap-0.5 rounded-xl px-0.5 transition-colors ${
                  active ? 'text-[#D6A04A]' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="text-[10px] font-medium leading-tight truncate max-w-full">
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
