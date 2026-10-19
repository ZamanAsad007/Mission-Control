import React, { useState, useMemo } from 'react';
import type { Asteroid } from '@/types';
import { kmToLd, formatKm, formatDate } from '@/lib/utils';

interface AsteroidTableProps {
  asteroids: Asteroid[];
  selectedAsteroid: Asteroid | null;
  onSelectAsteroid: (ast: Asteroid) => void;
}

type SortField = 'approach_date' | 'miss_distance_km' | 'velocity_kps' | 'diameter_max_m';

export const AsteroidTable: React.FC<AsteroidTableProps> = ({
  asteroids,
  selectedAsteroid,
  onSelectAsteroid,
}) => {
  const [search, setSearch] = useState('');
  const [hazardousOnly, setHazardousOnly] = useState(false);
  const [sortField, setSortField] = useState<SortField>('approach_date');
  const [sortAsc, setSortAsc] = useState(true);

  const filtered = useMemo(() => {
    return asteroids
      .filter((ast) => {
        if (hazardousOnly && !ast.hazardous) return false;
        if (search) {
          const q = search.toLowerCase();
          return ast.name.toLowerCase().includes(q) || ast.neo_id.includes(q);
        }
        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (sortField === 'miss_distance_km' || sortField === 'velocity_kps' || sortField === 'diameter_max_m') {
          valA = typeof valA === 'number' ? valA : parseFloat(valA) || 0;
          valB = typeof valB === 'number' ? valB : parseFloat(valB) || 0;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [asteroids, search, hazardousOnly, sortField, sortAsc]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 shadow-lg">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-72">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[1.125rem]">
            search
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, NEO ID..."
            className="w-full h-9 pl-9 pr-3 rounded-lg bg-surface-container border border-outline-variant/40 font-body-sm text-xs text-on-surface placeholder:text-on-surface-variant/50 focus:outline-none focus:border-primary transition-all"
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer self-start sm:self-auto">
          <input
            type="checkbox"
            checked={hazardousOnly}
            onChange={(e) => setHazardousOnly(e.target.checked)}
            className="w-4 h-4 rounded bg-surface-container border-outline-variant/50 text-rose-500 focus:ring-0 focus:ring-offset-0"
          />
          <span className="font-label-caps text-xs text-rose-400 font-semibold uppercase tracking-wider">
            Potentially Hazardous Only
          </span>
        </label>
      </div>

      {/* Accessible Table */}
      <div className="w-full overflow-x-auto rounded-lg border border-outline-variant/20">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-surface-container-high/60 border-b border-outline-variant/30 text-on-surface-variant font-label-caps uppercase tracking-wider">
              <th className="py-2.5 px-3">Designation</th>
              <th
                onClick={() => handleSort('approach_date')}
                className="py-2.5 px-3 cursor-pointer hover:text-primary transition-colors"
              >
                Approach Date {sortField === 'approach_date' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('miss_distance_km')}
                className="py-2.5 px-3 cursor-pointer hover:text-primary transition-colors"
              >
                Miss Distance {sortField === 'miss_distance_km' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('velocity_kps')}
                className="py-2.5 px-3 cursor-pointer hover:text-primary transition-colors"
              >
                Velocity {sortField === 'velocity_kps' && (sortAsc ? '▲' : '▼')}
              </th>
              <th
                onClick={() => handleSort('diameter_max_m')}
                className="py-2.5 px-3 cursor-pointer hover:text-primary transition-colors"
              >
                Est. Diameter {sortField === 'diameter_max_m' && (sortAsc ? '▲' : '▼')}
              </th>
              <th className="py-2.5 px-3">Classification</th>
              <th className="py-2.5 px-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20 font-data-sm">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-6 text-center text-on-surface-variant">
                  No near-Earth asteroids matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map((ast) => {
                const isSelected = selectedAsteroid?.neo_id === ast.neo_id;
                const minD = Math.round(Number(ast.diameter_min_m) || 0);
                const maxD = Math.round(Number(ast.diameter_max_m) || 0);

                return (
                  <tr
                    key={ast.neo_id}
                    onClick={() => onSelectAsteroid(ast)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-primary/10 border-l-2 border-primary'
                        : 'hover:bg-surface-container/60'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-semibold text-on-surface">
                      <div className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[1rem] text-secondary">
                          circle
                        </span>
                        <span>{ast.name}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {formatDate(ast.approach_date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="flex flex-col">
                        <span className="text-secondary font-bold">{kmToLd(ast.miss_distance_km)} LD</span>
                        <span className="text-[0.625rem] text-on-surface-variant/70">
                          {formatKm(ast.miss_distance_km)}
                        </span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 text-on-surface">
                      {Number(ast.velocity_kps).toFixed(1)} km/s
                    </td>
                    <td className="py-2.5 px-3 text-on-surface-variant">
                      {minD}m - {maxD}m
                    </td>
                    <td className="py-2.5 px-3">
                      {ast.hazardous ? (
                        <span className="px-2 py-0.5 rounded bg-rose-500/15 text-rose-400 font-label-caps text-[0.625rem] font-bold border border-rose-500/30">
                          HAZARDOUS (PHA)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-label-caps text-[0.625rem] border border-emerald-500/20">
                          NOMINAL
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectAsteroid(ast);
                        }}
                        className="px-2.5 py-1 rounded bg-surface-container hover:bg-surface-container-high border border-outline-variant/30 text-primary text-[0.6875rem] font-semibold"
                      >
                        Inspect
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
