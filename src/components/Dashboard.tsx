import React, { useState } from 'react';
import { 
  MapPin, Map, FileText, Compass, BarChart3, Layers, QrCode, Search, ShieldCheck, ArrowRightLeft, Printer
} from 'lucide-react';
import { Photo } from '../types';

interface DashboardProps {
  onSelectTool: (toolId: string) => void;
  photos: Photo[];
}

export const Dashboard: React.FC<DashboardProps> = ({ onSelectTool, photos }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<'ALL' | 'GEOSPATIAL' | 'DOCUMENTS' | 'UTILITIES'>('ALL');

  const taggedCount = photos.filter(p => p.lat !== null && p.lng !== null).length;

  const tools = [
    {
      id: 'cardprint',
      title: 'Card to Print Sheet',
      category: 'DOCUMENTS',
      icon: Printer,
      badge: 'Duplex Imposition',
      description: 'Business card to print-ready PDF imposition: N-up duplex registration, crop marks & bleed calculation.'
    },
    {
      id: 'geotagger',
      title: 'Geo Tagger',
      category: 'GEOSPATIAL',
      icon: MapPin,
      badge: 'Batch EXIF',
      description: 'Batch geotag photo metadata, inspect GPS coordinates & export tagged EXIF photos.'
    },
    {
      id: 'mapexport',
      title: 'Map Export',
      category: 'GEOSPATIAL',
      icon: Map,
      badge: 'GIS Layering',
      description: 'Layer satellite imagery, Esri maps & export high-resolution canvas snapshots.'
    },
    {
      id: 'pdfsuite',
      title: 'PDF Tools',
      category: 'DOCUMENTS',
      icon: FileText,
      badge: '20 PDF Tools',
      description: 'Full suite of 20 PDF utilities: Merge, Split, Compress, Edit, Convert, Sign, Protect & OCR.'
    },
    {
      id: 'converter',
      title: 'Universal Converter',
      category: 'UTILITIES',
      icon: ArrowRightLeft,
      badge: 'CloudConvert Suite',
      description: 'Any-to-Any multi-format converter: Images, CSV/JSON/XML, GeoJSON/KML, Base64 & Audio WAV.'
    },
    {
      id: 'coordinates',
      title: 'Coordinate Converter',
      category: 'GEOSPATIAL',
      icon: Compass,
      badge: 'GPS / MGRS',
      description: 'Convert between DD, DMS, DDM, UTM, MGRS, Geohash & Plus Codes instantly.'
    },
    {
      id: 'graphcreator',
      title: 'Graph Creator',
      category: 'UTILITIES',
      icon: BarChart3,
      badge: 'MakeMyGraph Suite',
      description: 'Interactive chart builder: Bar, Line, Pie, Donut, Radar, Scatter & Math Function Plotter.'
    },
    {
      id: 'vectra',
      title: 'Vectra SVG Engine',
      category: 'UTILITIES',
      icon: Layers,
      badge: 'Vector Processing',
      description: 'SVG path transformer, vector shape builder & matrix editor.'
    },
    {
      id: 'ezqr',
      title: 'EzQR vCard Studio',
      category: 'UTILITIES',
      icon: QrCode,
      badge: 'Brand Presets',
      description: 'vCard QR generator with logo overlays, custom frame presets & saved brand styles.'
    },
  ];

  const filteredTools = tools.filter(tool => {
    const matchesCategory = activeCategory === 'ALL' || tool.category === activeCategory;
    const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Brutalist Header Banner */}
      <div className="border border-brand-border p-6 bg-brand-surface relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-accent bg-black px-2.5 py-1 border border-brand-border">
                CHAOSBOX V4.0
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" /> CLIENT-SIDE TOOLBOX
              </span>
            </div>
            
            <div className="flex items-center gap-3">
              <img src="/logo.svg" alt="ChaosBox Logo" className="h-9 object-contain" />
            </div>
            <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] mt-2 max-w-2xl leading-relaxed">
              Geospatial intelligence, format conversions, vector engineering, & 20-in-1 PDF tools suite.
            </p>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-black border border-brand-border p-4 shrink-0 min-w-[280px]">
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500">QUEUE</div>
              <div className="text-lg font-black text-white">{photos.length}</div>
            </div>
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500">TAGGED</div>
              <div className="text-lg font-black text-brand-accent">{taggedCount}</div>
            </div>
            <div>
              <div className="text-[8px] font-mono uppercase tracking-[0.2em] text-zinc-500">TOOLS</div>
              <div className="text-lg font-black text-amber-400">8</div>
            </div>
          </div>
        </div>
      </div>

      {/* Simplified Search & Category Filter Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 border-b border-brand-border pb-4">
        {/* Search Field */}
        <div className="relative flex-grow max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="SEARCH TOOLS (e.g. PDF, MAP, QR, EXIF)..."
            className="w-full bg-black border border-brand-border pl-10 pr-4 py-2 text-xs text-white uppercase tracking-wider focus:outline-none focus:border-brand-accent placeholder:text-zinc-600 font-mono"
          />
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto scrollbar-none py-1">
          {(['ALL', 'GEOSPATIAL', 'DOCUMENTS', 'UTILITIES'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer ${
                activeCategory === cat
                  ? 'bg-brand-accent text-black border-brand-accent'
                  : 'bg-black text-zinc-400 border-brand-border hover:text-white hover:border-zinc-500'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Simplified Grid of Tools Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => onSelectTool(tool.id)}
              className="p-5 bg-brand-surface border border-brand-border hover:border-brand-accent transition-all cursor-pointer flex flex-col justify-between group relative overflow-hidden"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 bg-black border border-brand-border group-hover:border-brand-accent flex items-center justify-center transition-colors">
                    <Icon className="w-5 h-5 text-brand-accent" />
                  </div>
                  <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-black border border-brand-border text-brand-accent">
                    {tool.badge}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black uppercase tracking-wider text-white group-hover:text-brand-accent transition-colors">
                    {tool.title}
                  </h3>
                  <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1 leading-relaxed">
                    {tool.description}
                  </p>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-brand-border flex items-center justify-between text-[10px] font-mono font-bold uppercase text-brand-accent group-hover:translate-x-1 transition-transform">
                <span>LAUNCH TOOL →</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
