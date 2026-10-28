import React, { useState } from 'react';
import { Layers, Activity, RefreshCw } from 'lucide-react';

export const VectraTool: React.FC = () => {
  const [vectorData, setVectorData] = useState<string>('{"type": "FeatureCollection", ...}');

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="border border-brand-border p-6 bg-brand-surface">
        <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-white flex items-center gap-3">
          <Layers className="w-5 h-5 text-brand-accent" />
          Vectra Spatial Engine
        </h2>
      </div>

      <div className="p-6 border border-brand-border bg-brand-surface space-y-6">
        <div>
          <label className="block text-[9px] font-bold uppercase text-brand-muted mb-2 tracking-[0.2em]">Input Vector Data (GeoJSON)</label>
          <textarea
            value={vectorData}
            onChange={(e) => setVectorData(e.target.value)}
            className="w-full h-40 bg-black border border-brand-border px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-brand-accent hover:bg-white hover:text-black transition-colors text-[10px] font-bold uppercase tracking-[0.2em] text-white"
        >
          <Activity className="w-4 h-4" />
          Process Vector Layer
        </button>
      </div>
    </div>
  );
};
