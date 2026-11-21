import type { BrainWeather } from '../types';

interface CosmosBackdropProps {
  weather: BrainWeather;
  reduceMotion: boolean;
}

export function CosmosBackdrop({ weather: _weather, reduceMotion: _reduceMotion }: CosmosBackdropProps) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 bg-[#111318] select-none"
    />
  );
}
