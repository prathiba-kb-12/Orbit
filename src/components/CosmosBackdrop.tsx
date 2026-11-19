import type { BrainWeather } from '../types';

interface CosmosBackdropProps {
  weather: BrainWeather;
  reduceMotion: boolean;
}

const STARS = [
  { top: '7%', left: '14%', size: 2, delay: '0s', opacity: 0.45 },
  { top: '13%', left: '81%', size: 2.5, delay: '1.2s', opacity: 0.55 },
  { top: '21%', left: '32%', size: 1.5, delay: '2.4s', opacity: 0.35 },
  { top: '27%', left: '90%', size: 2, delay: '0.6s', opacity: 0.4 },
  { top: '38%', left: '9%', size: 1.5, delay: '3.1s', opacity: 0.3 },
  { top: '45%', left: '68%', size: 2, delay: '1.8s', opacity: 0.4 },
  { top: '56%', left: '21%', size: 2.5, delay: '2.9s', opacity: 0.45 },
  { top: '62%', left: '85%', size: 1.5, delay: '0.4s', opacity: 0.35 },
  { top: '75%', left: '47%', size: 2, delay: '3.6s', opacity: 0.4 },
  { top: '82%', left: '15%', size: 1.5, delay: '2.1s', opacity: 0.3 },
  { top: '88%', left: '74%', size: 2, delay: '1.1s', opacity: 0.4 },
];

export function CosmosBackdrop({ weather, reduceMotion }: CosmosBackdropProps) {
  const topLeftRibbon =
    weather === 'fried'
      ? 'radial-gradient(ellipse at 25% 22%, rgba(56, 189, 248, 0.34), rgba(45, 212, 191, 0.18) 38%, transparent 70%)'
      : weather === 'okay'
        ? 'radial-gradient(ellipse at 25% 22%, rgba(56, 189, 248, 0.24), rgba(251, 191, 36, 0.22) 40%, transparent 70%)'
        : 'radial-gradient(ellipse at 25% 22%, rgba(96, 165, 250, 0.32), rgba(56, 189, 248, 0.18) 40%, transparent 70%)';

  const centerAuroraRibbon =
    weather === 'fried'
      ? 'radial-gradient(ellipse at 65% 32%, rgba(45, 212, 191, 0.3), rgba(129, 140, 248, 0.18) 45%, transparent 72%)'
      : weather === 'okay'
        ? 'radial-gradient(ellipse at 65% 32%, rgba(251, 191, 36, 0.26), rgba(244, 114, 182, 0.14) 45%, transparent 72%)'
        : 'radial-gradient(ellipse at 65% 32%, rgba(192, 132, 252, 0.36), rgba(217, 70, 239, 0.22) 42%, transparent 72%)';

  const bottomRightRibbon =
    weather === 'fried'
      ? 'radial-gradient(ellipse at 72% 76%, rgba(56, 189, 248, 0.25), rgba(45, 212, 191, 0.14) 45%, transparent 70%)'
      : weather === 'okay'
        ? 'radial-gradient(ellipse at 72% 76%, rgba(251, 146, 60, 0.22), rgba(167, 139, 250, 0.16) 45%, transparent 70%)'
        : 'radial-gradient(ellipse at 72% 76%, rgba(217, 70, 239, 0.28), rgba(56, 189, 248, 0.2) 48%, transparent 72%)';

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 overflow-hidden select-none"
    >
      {/* Flowing Aurora Ribbons inspired by luminous cyan-indigo-violet frosted card */}
      <div
        className={`absolute -inset-10 blur-3xl ${reduceMotion ? '' : 'aurora-drift transition-all duration-700'}`}
        style={{ background: topLeftRibbon }}
      />
      <div
        className={`absolute -inset-10 blur-3xl ${reduceMotion ? '' : 'transition-all duration-700'}`}
        style={{ background: centerAuroraRibbon }}
      />
      <div
        className={`absolute -inset-10 blur-3xl ${reduceMotion ? '' : 'transition-all duration-700'}`}
        style={{ background: bottomRightRibbon }}
      />

      {/* Diagonal sweeping light band */}
      <div
        className={`absolute -left-1/4 top-1/4 w-[150%] h-56 -rotate-12 blur-3xl opacity-35 ${
          reduceMotion ? '' : 'transition-all duration-700'
        }`}
        style={{
          background:
            weather === 'fried'
              ? 'linear-gradient(90deg, transparent, rgba(56,189,248,0.45), rgba(45,212,191,0.4), transparent)'
              : weather === 'okay'
                ? 'linear-gradient(90deg, transparent, rgba(251,191,36,0.38), rgba(167,139,250,0.32), transparent)'
                : 'linear-gradient(90deg, transparent, rgba(56,189,248,0.4), rgba(217,70,239,0.45), transparent)',
        }}
      />

      {/* Faint Stars */}
      {STARS.map((star, idx) => (
        <span
          key={idx}
          className={`absolute rounded-full bg-slate-100 ${reduceMotion ? '' : 'star-twinkle'}`}
          style={{
            top: star.top,
            left: star.left,
            width: `${star.size}px`,
            height: `${star.size}px`,
            opacity: star.opacity,
            animationDelay: star.delay,
          }}
        />
      ))}
    </div>
  );
}
