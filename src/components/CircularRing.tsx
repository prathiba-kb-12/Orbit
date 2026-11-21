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
      stroke: '#5EEAD4',
      glow: 'rgba(94, 234, 212, 0.16)',
      text: 'text-teal-300',
      softBg: 'bg-teal-400/10',
      border: 'border-teal-400/30',
      button: 'bg-[#D6A04A] text-[#111318] hover:bg-[#E0AD5B]',
      ringDot: 'bg-teal-300',
    };
  }
  if (weather === 'okay') {
    return {
      stroke: '#D6A04A',
      glow: 'rgba(214, 160, 74, 0.18)',
      text: 'text-[#D6A04A]',
      softBg: 'bg-[#D6A04A]/10',
      border: 'border-[#D6A04A]/35',
      button: 'bg-[#D6A04A] text-[#111318] hover:bg-[#E0AD5B]',
      ringDot: 'bg-[#D6A04A]',
    };
  }
  return {
    stroke: '#A5B4FC',
    glow: 'rgba(165, 180, 252, 0.16)',
    text: 'text-indigo-300',
    softBg: 'bg-indigo-400/10',
    border: 'border-indigo-400/30',
    button: 'bg-[#D6A04A] text-[#111318] hover:bg-[#E0AD5B]',
    ringDot: 'bg-indigo-300',
  };
}

export function CircularRing({
  progress,
  size = 176,
  strokeWidth = 7,
  weather,
  isFocusing: _isFocusing = false,
  isCompletedGlow: _isCompletedGlow = false,
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
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#262B36"
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
              : 'stroke-dashoffset 300ms cubic-bezier(0.16, 1, 0.3, 1), stroke 250ms ease',
          }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
        {children}
      </div>
    </div>
  );
}
