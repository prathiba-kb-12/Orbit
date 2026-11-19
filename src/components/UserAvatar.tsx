interface UserAvatarProps {
  name?: string;
  photoURL?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const COSMIC_AVATAR_PRESETS = [
  { id: 'preset:luna', label: 'Luna Crescent', gradient: 'from-amber-300 via-amber-400 to-orange-400', symbol: '🌙' },
  { id: 'preset:vega', label: 'Vega Star', gradient: 'from-teal-300 via-cyan-400 to-sky-500', symbol: '✦' },
  { id: 'preset:polaris', label: 'Polaris North', gradient: 'from-violet-300 via-indigo-400 to-purple-500', symbol: '✧' },
  { id: 'preset:nebula', label: 'Orbit Nebula', gradient: 'from-sky-300 via-teal-300 to-amber-300', symbol: '🪐' },
] as const;

export function UserAvatar({ name, photoURL, size = 'md' }: UserAvatarProps) {
  const sizeClass =
    size === 'sm'
      ? 'w-8 h-8 text-xs'
      : size === 'lg'
        ? 'w-16 h-16 text-xl'
        : 'w-10 h-10 text-sm';

  const preset = photoURL
    ? COSMIC_AVATAR_PRESETS.find((p) => p.id === photoURL)
    : undefined;

  if (preset) {
    return (
      <div
        aria-hidden="true"
        className={`${sizeClass} rounded-2xl bg-gradient-to-br ${preset.gradient} text-slate-950 font-extrabold flex items-center justify-center shrink-0 shadow-inner border border-white/25`}
      >
        <span>{preset.symbol}</span>
      </div>
    );
  }

  if (photoURL && (photoURL.startsWith('data:image/') || photoURL.startsWith('http'))) {
    return (
      <img
        src={photoURL}
        alt={name || 'User avatar'}
        className={`${sizeClass} rounded-2xl object-cover shrink-0 border border-white/20 bg-slate-900`}
      />
    );
  }

  const initials = (name || 'O')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');

  return (
    <div
      aria-hidden="true"
      className={`${sizeClass} rounded-2xl bg-gradient-to-br from-amber-300/90 via-teal-300/80 to-indigo-400/90 text-slate-950 font-extrabold flex items-center justify-center shrink-0 border border-white/25`}
    >
      {initials || 'O'}
    </div>
  );
}
