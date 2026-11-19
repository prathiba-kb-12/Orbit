import type { ReactNode } from 'react';
import type { BrainWeather } from '../types';

interface CircularRingProps {
  progress: number; // 0 to 1
  size?: number;
  strokeWidth?: number;
  weather: BrainWeather;
  isFocusing?: boolean;
  isCompletedGlow?: boolean;
  reduceMotion?: boolean;
  children?: ReactNode;
}

export function getWeatherAccent(weather: BrainWeather) {
  if (weather === 'fried') {
    return {
      stroke: '#2DD4BF',
      glow: 'rgba(45, 212, 191, 0.42)',
      text: 'text-teal-300',
      softBg: 'bg-teal-400/15',
      border: 'border-teal-300/30',
      button: 'bg-teal-400 text-slate-950 hover:bg-teal-300',
      ringDot: 'bg-teal-300',
    };
  }
  if (weather === 'okay') {
    return {
      stroke: '#FBBF24',
      glow: 'rgba(251, 191, 36, 0.38)',
      text: 'text-amber-300',
      softBg: 'bg-amber-400/15',
      border: 'border-amber-300/30',
      button: 'bg-amber-400 text-slate-950 hover:bg-amber-300',
      ringDot: 'bg-amber-300',
    };
  }
  return {
    stroke: '#A78BFA',
    glow: 'rgba(167, 139, 250, 0.45)',
    text: 'text-violet-300',
    softBg: 'bg-violet-400/15',
    border: 'border-violet-300/30',
    button: 'bg-violet-400 text-slate-950 hover:bg-violet-300',
    ringDot: 'bg-violet-300',
  };
}

export function CircularRing({
  progress,
  size = 200,
  strokeWidth = 8,
  weather,
  isFocusing = false,
  isCompletedGlow = false,
  reduceMotion = false,
  children,
}: CircularRingProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - clamped);
  const accent = getWeatherAccent(weather);

  return (
    <div
      className="relative inline-flex items-center justify-center"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
        style={{
          filter:
            isFocusing || isCompletedGlow
              ? `drop-shadow(0 0 14px ${accent.glow})`
              : `drop-shadow(0 0 6px ${accent.glow})`,
          transition: reduceMotion ? 'none' : 'filter 500ms ease',
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255, 255, 255, 0.08)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={accent.stroke}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          style={{
            transition: reduceMotion
              ? 'none'
              : 'stroke-dashoffset 600ms cubic-bezier(0.16, 1, 0.3, 1), stroke 400ms ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        {children}
      </div>
    </div>
  );
}
