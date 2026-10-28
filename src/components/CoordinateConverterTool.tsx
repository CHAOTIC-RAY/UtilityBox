import React, { useState } from 'react';
import { Compass, Copy, Check } from 'lucide-react';

export const CoordinateConverterTool: React.FC = () => {
  const [lat, setLat] = useState<number>(37.7749);
  const [lng, setLng] = useState<number>(-122.4194);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleCopy = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-6">
      <div className="border border-brand-border p-6 bg-brand-surface">
        <h2 className="text-xl font-bold uppercase tracking-[0.2em] text-white flex items-center gap-3">
          <Compass className="w-5 h-5 text-brand-accent" />
          Coordinate Converter
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 border border-brand-border bg-brand-surface">
        <div>
          <label className="block text-[9px] font-bold uppercase text-brand-muted mb-2 tracking-[0.2em]">Latitude</label>
          <input
            type="number"
            step="0.000001"
            value={lat}
            onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
            className="w-full bg-black border border-brand-border px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
        <div>
          <label className="block text-[9px] font-bold uppercase text-brand-muted mb-2 tracking-[0.2em]">Longitude</label>
          <input
            type="number"
            step="0.000001"
            value={lng}
            onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
            className="w-full bg-black border border-brand-border px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-brand-accent"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {[
          { label: 'Decimal Degrees', val: `${lat.toFixed(6)}, ${lng.toFixed(6)}`, id: 'dd' },
          { label: 'Universal Transverse Mercator', val: 'Zone 10N - E: 551000m, N: 4180000m', id: 'utm' }
        ].map(item => (
          <div key={item.id} className="flex items-center justify-between p-4 border border-brand-border bg-brand-surface">
            <div>
              <span className="text-[9px] uppercase text-brand-muted font-bold tracking-[0.2em]">{item.label}</span>
              <div className="text-sm text-white font-mono mt-1">{item.val}</div>
            </div>
            <button
              onClick={() => handleCopy(item.val, item.id)}
              className="px-3 py-1.5 bg-black border border-brand-border text-[10px] font-bold text-white uppercase tracking-[0.1em] hover:bg-brand-accent transition-colors"
            >
              {copiedField === item.id ? <Check className="w-3 h-3 text-white" /> : 'Copy'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
