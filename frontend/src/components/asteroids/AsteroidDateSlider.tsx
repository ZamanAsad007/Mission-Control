import React, { useState, useEffect } from 'react';
import { formatDate } from '@/lib/utils';

interface AsteroidDateSliderProps {
  currentDayOffset: number;
  onChangeOffset: (offset: number) => void;
}

export const AsteroidDateSlider: React.FC<AsteroidDateSliderProps> = ({
  currentDayOffset,
  onChangeOffset,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onChangeOffset((currentDayOffset + 1) % 8);
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying, currentDayOffset, onChangeOffset]);

  const targetDate = new Date(Date.now() + currentDayOffset * 86400000).toISOString().split('T')[0];

  return (
    <div className="flex flex-col gap-2 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-md">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-1.5 rounded-lg bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 text-primary transition-all flex items-center justify-center"
            title={isPlaying ? 'Pause Timeline' : 'Play Timeline Orbit Simulation'}
          >
            <span className="material-symbols-outlined text-[1.25rem]">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </button>
          <span className="font-label-caps text-xs text-on-surface uppercase tracking-wider font-semibold">
            Orbital Approach Timeline Scrub
          </span>
        </div>

        <div className="flex items-center gap-2 font-data-sm text-xs">
          <span className="text-on-surface-variant">Active Approach Window:</span>
          <span className="text-primary font-bold">{formatDate(targetDate)}</span>
          <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary text-[0.625rem]">
            {currentDayOffset === 0 ? 'TODAY' : `+${currentDayOffset}D`}
          </span>
        </div>
      </div>

      {/* Slider Track */}
      <div className="flex flex-col gap-1.5 pt-2">
        <input
          type="range"
          min={0}
          max={7}
          step={1}
          value={currentDayOffset}
          onChange={(e) => {
            setIsPlaying(false);
            onChangeOffset(Number(e.target.value));
          }}
          className="w-full accent-[#22d3ee] bg-surface-container h-2 rounded-lg cursor-pointer"
        />

        {/* Day Tick Labels */}
        <div className="flex justify-between font-data-sm text-[0.625rem] text-on-surface-variant/70 px-1">
          {Array.from({ length: 8 }).map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIsPlaying(false);
                onChangeOffset(i);
              }}
              className={`hover:text-primary transition-colors ${
                currentDayOffset === i ? 'text-primary font-bold' : ''
              }`}
            >
              {i === 0 ? 'Today' : `+${i}d`}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
