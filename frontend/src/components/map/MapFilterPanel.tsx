import React from 'react';

interface MapFilterPanelProps {
  selectedCategory: string;
  onSelectCategory: (category: string) => void;
  dateRange: '24h' | '7d' | '30d';
  onSelectDateRange: (range: '24h' | '7d' | '30d') => void;
  categoryCounts: Record<string, number>;
  searchQuery: string;
  onSearchQueryChange: (q: string) => void;
}

export const MapFilterPanel: React.FC<MapFilterPanelProps> = ({
  selectedCategory,
  onSelectCategory,
  dateRange,
  onSelectDateRange,
  categoryCounts,
  searchQuery,
  onSearchQueryChange,
}) => {
  const categories = [
    { id: 'all', label: 'All Hazards', icon: 'public', color: 'text-primary' },
    { id: 'wildfires', label: 'Wildfires', icon: 'local_fire_department', color: 'text-rose-400' },
    { id: 'severeStorms', label: 'Severe Storms', icon: 'air', color: 'text-blue-400' },
    { id: 'volcanoes', label: 'Volcanoes', icon: 'volcano', color: 'text-fuchsia-400' },
    { id: 'seaLakeIce', label: 'Sea & Lake Ice', icon: 'ac_unit', color: 'text-cyan-300' },
    { id: 'floods', label: 'Floods', icon: 'flood', color: 'text-teal-400' },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 backdrop-blur-md shadow-lg">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[1.25rem] text-primary">tune</span>
          <span className="font-headline-sm text-sm font-semibold text-on-surface">
            Geospatial Filters
          </span>
        </div>

        {/* Date Range Toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg bg-surface-container border border-outline-variant/20">
          {(['24h', '7d', '30d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => onSelectDateRange(range)}
              className={`px-2 py-0.5 rounded text-[0.6875rem] font-label-caps uppercase tracking-wider transition-all ${
                dateRange === range
                  ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative">
        <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[1.125rem]">
          search
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          placeholder="Filter map by event title, location..."
          className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-all"
        />
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap gap-2 pt-1">
        {categories.map((cat) => {
          const count = categoryCounts[cat.id] || 0;
          const isSelected = selectedCategory === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => onSelectCategory(cat.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border font-label-caps text-xs transition-all ${
                isSelected
                  ? 'bg-primary-container text-on-primary-container border-primary font-bold shadow-sm'
                  : 'bg-surface-container text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high border-outline-variant/30'
              }`}
            >
              <span className={`material-symbols-outlined text-[1rem] ${isSelected ? 'text-on-primary-container' : cat.color}`}>
                {cat.icon}
              </span>
              <span>{cat.label}</span>
              <span className={`px-1.5 py-0.2 rounded text-[0.625rem] ${isSelected ? 'bg-on-primary-container/20 text-on-primary-container' : 'bg-surface-container-highest text-on-surface-variant'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
