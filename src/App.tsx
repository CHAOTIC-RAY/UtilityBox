import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { motion, AnimatePresence } from 'motion/react';
import { get, set } from 'idb-keyval';
import { DropzoneArea } from './components/DropzoneArea';
import { LocationMap } from './components/LocationMap';
import { PhotoList } from './components/PhotoList';
import { BatchEditModal } from './components/BatchEditModal';
import { ExportModal } from './components/ExportModal';
import { MapExportTab } from './components/MapExportTab';
import { Dashboard } from './components/Dashboard';
import { CoordinateConverterTool } from './components/CoordinateConverterTool';
import { PdfToolsSuite, PdfToolType } from './components/PdfToolsSuite';
import { UniversalConverterTool, Category as ConverterCategory } from './components/UniversalConverterTool';
import { GraphCreatorTool } from './components/GraphCreatorTool';
import { VectraTool } from './components/VectraTool';
import { EzQrTool } from './components/EzQrTool';
import { BusinessCardPrintTool } from './components/BusinessCardPrintTool';
import { Photo } from './types';
import { fileToDataUrl, convertToJpegDataUrl, applyMetadata, convertFormat } from './utils/exif';
import { 
  Images, MapPin, Download, Home, Compass, FileText, BarChart3, Globe, Layers, 
  QrCode, ArrowRightLeft, Printer, ArrowLeft, Scissors, RotateCw, Trash2, FileArchive, 
  Image as ImageIcon, FileImage, Edit3, Type, PenTool, Lock, Unlock, Hash, EyeOff, 
  GitCompare, Crop as CropIcon, Minimize2, FileCode, FileSpreadsheet, Binary, Music, Zap, Merge as MergeIcon 
} from 'lucide-react';

const PDF_SUB_TOOLS: Array<{ id: PdfToolType; name: string; icon: any }> = [
  { id: 'rearrange', name: 'Reorder', icon: Layers },
  { id: 'merge', name: 'Merge', icon: MergeIcon },
  { id: 'split', name: 'Split', icon: Scissors },
  { id: 'rotate', name: 'Rotate', icon: RotateCw },
  { id: 'delete', name: 'Delete', icon: Trash2 },
  { id: 'compress', name: 'Compress', icon: FileArchive },
  { id: 'image2pdf', name: 'Img → PDF', icon: ImageIcon },
  { id: 'pdf2images', name: 'PDF → Img', icon: FileImage },
  { id: 'edit', name: 'Edit', icon: Edit3 },
  { id: 'watermark', name: 'Watermark', icon: Type },
  { id: 'sign', name: 'Sign', icon: PenTool },
  { id: 'protect', name: 'Protect', icon: Lock },
  { id: 'unlock', name: 'Unlock', icon: Unlock },
  { id: 'pagenumbers', name: 'Numbers', icon: Hash },
  { id: 'redact', name: 'Redact', icon: EyeOff },
  { id: 'compare', name: 'Compare', icon: GitCompare },
  { id: 'crop', name: 'Crop', icon: CropIcon },
  { id: 'flatten', name: 'Flatten', icon: Minimize2 },
  { id: 'extract', name: 'Extract', icon: FileCode },
  { id: 'text2pdf', name: 'Text → PDF', icon: FileSpreadsheet },
];

const CONVERTER_SUB_CATEGORIES: Array<{ id: ConverterCategory | 'ALL'; name: string; icon: any }> = [
  { id: 'ALL', name: 'All Presets', icon: Zap },
  { id: 'IMAGE', name: 'Images', icon: ImageIcon },
  { id: 'DOCUMENT', name: 'Documents', icon: FileSpreadsheet },
  { id: 'GIS', name: 'GIS & Maps', icon: MapPin },
  { id: 'ENCODING', name: 'Encoding', icon: Binary },
  { id: 'AUDIO', name: 'Audio Synth', icon: Music },
];

const TOOL_INFO: Record<string, { name: string; icon: any; desc: string }> = {
  geotagger: { name: 'Geo Tagger', icon: MapPin, desc: 'EXIF Metadata & Location Injector' },
  mapexport: { name: 'Map & GIS Export', icon: Download, desc: 'Vector KML, GeoJSON & Shapefile' },
  coordinates: { name: 'Coordinates', icon: Compass, desc: 'Lat/Lng, UTM & MGRS Converter' },
  graphcreator: { name: 'Graph Creator', icon: BarChart3, desc: 'Interactive Chart & Palette Builder' },
  vectra: { name: 'Vectra', icon: Layers, desc: 'Vector SVG Engineering & Tracing' },
  ezqr: { name: 'EzQR vCard', icon: QrCode, desc: 'Branded Contact QR Code Studio' },
  cardprint: { name: 'Card to Print', icon: Printer, desc: 'Press-Ready Imposition & Cut Marks' },
  pdfsuite: { name: 'PDF Tools', icon: FileText, desc: '20-in-1 Client-Side PDF Utilities' },
  converter: { name: 'Universal Converter', icon: ArrowRightLeft, desc: 'Multi-Format Conversion Engine' },
};



const LoadingScreen = () => (
  <motion.div 
    initial={{ opacity: 1 }}
    exit={{ opacity: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } }}
    className="fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden"
  >
    <div className="relative">
      <motion.div
        initial={{ y: 100, opacity: 0, skewY: 10 }}
        animate={{ y: 0, opacity: 1, skewY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="flex flex-col items-center"
      >
        <motion.span 
          initial={{ opacity: 0, letterSpacing: "1em" }}
          animate={{ opacity: 1, letterSpacing: "0.4em" }}
          transition={{ delay: 0.3, duration: 1 }}
          className="text-[9px] uppercase font-bold text-brand-muted mb-4 ml-2"
        >
          UTILITYBOX BY CHAOS INITIALIZING
        </motion.span>
        
        <img 
          src="/logo.svg" 
          alt="Utilitybox by Chaos" 
          className="h-[40px] md:h-[60px] object-contain select-none" 
        />
        
        <div className="w-full h-[1px] bg-brand-border mt-8 relative overflow-hidden">
          <motion.div 
            initial={{ left: "-100%" }}
            animate={{ left: "100%" }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            className="absolute top-0 bottom-0 w-1/3 bg-brand-accent shadow-[0_0_20px_rgba(183,0,255,0.6)]"
          />
        </div>
      </motion.div>
    </div>
  </motion.div>
);

export default function App() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selectedLocation, setSelectedLocation] = useState<{lat: number, lng: number} | null>(null);
  const [isBatchModalOpen, setIsBatchModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [editingPhotoId, setEditingPhotoId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  
  // Active tool state: dashboard, geotagger, mapexport, coordinates, pdfsuite, converter, graphcreator, vectra, ezqr, cardprint
  const [activeTool, setActiveTool] = useState<string>('dashboard');
  const [pdfActiveTool, setPdfActiveTool] = useState<PdfToolType>('rearrange');
  const [converterCategory, setConverterCategory] = useState<ConverterCategory | 'ALL'>('ALL');

  useEffect(() => {
    get<Photo[]>('gextag_queue').then((val) => {
      if (val) {
        setPhotos(val);
      }
      setTimeout(() => setIsLoaded(true), 1500);
    }).catch(err => {
      console.error("Failed to load queue from IndexedDB", err);
      setTimeout(() => setIsLoaded(true), 1500);
    });
  }, []);

  useEffect(() => {
    if (isLoaded) {
      set('gextag_queue', photos).catch(err => console.error("Failed to save queue", err));
    }
  }, [photos, isLoaded]);

  const [lastBatchData, setLastBatchData] = useState<any>(null);
  const [activePresetData, setActivePresetData] = useState<any>(null);

  const [presets, setPresets] = useState<Array<any>>(() => {
    try {
      const savedPresets = localStorage.getItem('gextag_presets');
      if (savedPresets) return JSON.parse(savedPresets);
      const savedLocations = localStorage.getItem('gextag_locations');
      return savedLocations ? JSON.parse(savedLocations) : [];
    } catch {
      return [];
    }
  });

  const handleSavePreset = (additionalData?: any) => {
    const isEvent = additionalData && typeof additionalData === 'object' && 'nativeEvent' in additionalData;
    const dataToSave = (additionalData && !isEvent && Object.keys(additionalData).length > 0) ? additionalData : (lastBatchData || {});
    
    const latToSave = dataToSave.lat !== undefined ? dataToSave.lat : (selectedLocation?.lat || null);
    const lngToSave = dataToSave.lng !== undefined ? dataToSave.lng : (selectedLocation?.lng || null);

    if (latToSave === null && lngToSave === null && Object.keys(dataToSave).length === 0) {
       alert("No edits or location to save as preset.");
       return;
    }

    const name = window.prompt("ENTER A NAME FOR THIS PRESET:");
    if (!name || name.trim() === '') return;
    
    const newPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name: name.trim(),
      lat: latToSave,
      lng: lngToSave,
      description: dataToSave.description || '',
      artist: dataToSave.artist || '',
      copyright: dataToSave.copyright || '',
      keywords: dataToSave.keywords || [],
      datetime: dataToSave.datetime || ''
    };
    
    const updated = [...presets, newPreset];
    setPresets(updated);
    localStorage.setItem('gextag_presets', JSON.stringify(updated));
  };

  const handleFilesAccepted = async (files: File[]) => {
    const newPhotos: Photo[] = [];
    for (const file of files) {
      try {
        const rawDataUrl = await fileToDataUrl(file);
        const jpegDataUrl = await convertToJpegDataUrl(rawDataUrl);
        newPhotos.push({
          id: Math.random().toString(36).substr(2, 9),
          file,
          dataUrl: jpegDataUrl,
          name: file.name.replace(/\.[^/.]+$/, "") + ".jpg",
          type: 'image/jpeg',
          size: file.size,
          lat: null,
          lng: null,
          keywords: [],
          description: ''
        });
      } catch (err) {
        console.error("Failed to process file", file.name, err);
      }
    }
    setPhotos(prev => [...prev, ...newPhotos]);
  };

  const handleDeletePhoto = (id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
  };

  const handleTagAll = () => {
    if (!selectedLocation) {
      alert("Please select a location on the map first.");
      return;
    }
    setPhotos(prev => prev.map(p => ({
      ...p,
      lat: selectedLocation.lat,
      lng: selectedLocation.lng
    })));
  };

  const handleBatchApply = (data: { keywords: string[], description: string, lat: number | null, lng: number | null, artist: string, copyright: string, datetime: string }) => {
    if (editingPhotoId) {
      setPhotos(prev => prev.map(p => 
        p.id === editingPhotoId ? { ...p, ...data } : p
      ));
    } else {
      setLastBatchData(data);
      setPhotos(prev => prev.map(p => ({
        ...p,
        ...data
      })));
    }
    setEditingPhotoId(null);
  };

  const handleReset = () => {
    if (window.confirm("ARE YOU SURE YOU WANT TO CLEAR ALL PHOTOS?")) {
      setPhotos([]);
      setSelectedLocation(null);
    }
  };

  const handleDownloadZip = async (format: 'jpg' | 'png' | 'webp', baseName: string, suffix: string) => {
    if (photos.length === 0) return;
    setIsProcessing(true);
    try {
      const zip = new JSZip();
      for (let i = 0; i < photos.length; i++) {
        const photo = photos[i];
        const metadataDataUrl = applyMetadata(
          photo.dataUrl, 
          photo.lat, 
          photo.lng, 
          photo.description, 
          photo.keywords,
          photo.artist,
          photo.copyright,
          photo.datetime
        );
        
        let finalDataUrl = metadataDataUrl;
        if (format !== 'jpg') {
          finalDataUrl = await convertFormat(metadataDataUrl, format);
        }
        
        const base64Data = finalDataUrl.replace(/^data:image\/(png|jpeg|jpg|webp);base64,/, "");
        const ext = format === 'jpg' ? 'jpg' : format;
        
        let originalNameWithoutExt = photo.name.replace(/\.[^/.]+$/, "");
        let newNameWithoutExt = baseName.trim() ? `${baseName.trim()}_${String(i + 1).padStart(3, '0')}` : originalNameWithoutExt;
        
        const finalName = `${newNameWithoutExt}${suffix}.${ext}`;
        zip.file(finalName, base64Data, { base64: true });
      }
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "geotagged_photos.zip");

      if (lastBatchData) {
        const exists = presets.some(p => 
          p.lat === lastBatchData.lat && 
          p.lng === lastBatchData.lng && 
          p.description === lastBatchData.description &&
          p.artist === lastBatchData.artist &&
          p.copyright === lastBatchData.copyright
        );
        if (!exists) {
          if (window.confirm("Do you want to save the applied batch metadata as a new preset?")) {
            handleSavePreset(lastBatchData);
          }
        }
      }
    } catch (err) {
      console.error("Error generating zip", err);
      alert("There was an error creating the zip file.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePhotoMove = (id: string, lat: number, lng: number) => {
    setPhotos(prev => prev.map(p => p.id === id ? { ...p, lat, lng } : p));
  };

  return (
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-brand-bg text-white">
      <AnimatePresence>
        {!isLoaded && <LoadingScreen key="loader" />}
      </AnimatePresence>

      {/* Context-Aware Dynamic Header */}
      {activeTool === 'dashboard' ? (
        /* Dashboard Home Header: Clean Branding Only, NO Navigation Tabs */
        <header className="border-b border-brand-border flex flex-row items-center justify-between p-4 md:p-5 gap-4 shrink-0 bg-brand-bg relative z-10">
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-start cursor-pointer" onClick={() => setActiveTool('dashboard')}>
              <span className="text-[9px] md:text-[11px] uppercase tracking-[0.2em] text-brand-muted font-mono">Utilitybox by Chaos v4.0</span>
              <img src="/logo.svg" alt="Utilitybox Logo" className="h-[22px] sm:h-[28px] md:h-[40px] object-contain mt-0.5" />
            </div>
          </div>

          {/* Center: Intentionally Empty - No tabs on Dashboard Home */}
          <div className="hidden md:flex items-center gap-2 text-zinc-500 text-[11px] font-mono tracking-widest uppercase">
            <span className="text-zinc-400">Select any utility below to launch workbench</span>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-black border border-brand-border text-[10px] font-mono uppercase tracking-widest text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
              <span>Client-Side Sandbox</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-black border border-brand-accent/60 text-[10px] font-mono font-bold uppercase tracking-wider text-brand-accent">
              <span>8+ Suite Tools</span>
            </div>
          </div>
        </header>
      ) : (
        /* Tool-Specific Contextual Header */
        <header className="border-b border-brand-border flex flex-row items-center justify-between px-3 md:px-5 py-2.5 md:py-3 gap-3 md:gap-4 shrink-0 bg-brand-bg relative z-10 min-h-[58px]">
          {/* Left: Button to return to Dashboard + Current Tool Title */}
          <div className="flex items-center gap-3 shrink-0">
            <button 
              onClick={() => setActiveTool('dashboard')} 
              className="flex items-center gap-2 px-3 py-1.5 border border-brand-border bg-black hover:bg-brand-surface hover:border-brand-accent text-zinc-300 hover:text-white font-mono text-[11px] font-bold uppercase tracking-[0.15em] transition-all group cursor-pointer"
              title="Return to Dashboard Home"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-brand-accent group-hover:-translate-x-0.5 transition-transform" />
              <span>Dashboard</span>
            </button>

            <div className="hidden sm:block h-4 w-[1px] bg-brand-border shrink-0" />

            {/* Current Active Tool Title */}
            {TOOL_INFO[activeTool] && (
              <div className="hidden sm:flex items-center gap-2 shrink-0">
                {React.createElement(TOOL_INFO[activeTool].icon, { className: 'w-4 h-4 text-brand-accent shrink-0' })}
                <span className="font-bold text-xs uppercase tracking-wider text-white whitespace-nowrap">
                  {TOOL_INFO[activeTool].name}
                </span>
              </div>
            )}
          </div>

          {/* Middle: Tool-Specific Contextual Tabs */}
          {activeTool === 'pdfsuite' && (
            <div className="flex-grow flex items-center overflow-x-auto scrollbar-none gap-1 px-2 mx-1 max-w-full">
              {PDF_SUB_TOOLS.map((tool) => {
                const Icon = tool.icon;
                const isActive = pdfActiveTool === tool.id;
                return (
                  <button
                    key={tool.id}
                    onClick={() => setPdfActiveTool(tool.id)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-brand-accent text-black border-brand-accent font-black shadow-[0_0_10px_rgba(0,255,102,0.25)]'
                        : 'bg-black text-zinc-400 border-brand-border hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isActive ? 'text-black' : 'text-brand-accent'}`} />
                    <span>{tool.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {activeTool === 'converter' && (
            <div className="flex-grow flex items-center overflow-x-auto scrollbar-none gap-1.5 px-2 mx-1 max-w-full">
              {CONVERTER_SUB_CATEGORIES.map((cat) => {
                const Icon = cat.icon;
                const isActive = converterCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setConverterCategory(cat.id)}
                    className={`flex items-center gap-1.5 px-3 py-1 text-[10px] font-mono font-bold uppercase tracking-wider shrink-0 transition-colors cursor-pointer border ${
                      isActive
                        ? 'bg-brand-accent text-black border-brand-accent font-black shadow-[0_0_10px_rgba(0,255,102,0.25)]'
                        : 'bg-black text-zinc-400 border-brand-border hover:text-white hover:border-zinc-500'
                    }`}
                  >
                    <Icon className={`w-3 h-3 ${isActive ? 'text-black' : 'text-brand-accent'}`} />
                    <span>{cat.name}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tools that don't need sub-tabs: Spacer only */}
          {activeTool !== 'pdfsuite' && activeTool !== 'converter' && (
            <div className="flex-grow" />
          )}

          {/* Right Status Badge */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-black border border-brand-border text-[9px] font-mono uppercase tracking-widest text-zinc-400">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-accent animate-pulse" />
              <span>{TOOL_INFO[activeTool]?.desc || 'Client-Side Engine'}</span>
            </div>
          </div>
        </header>
      )}

      {/* Main Content Router */}
      <main className="flex-grow flex flex-col overflow-hidden relative">
        {activeTool === 'dashboard' && (
          <div className="flex-grow overflow-y-auto">
            <Dashboard onSelectTool={setActiveTool} photos={photos} />
          </div>
        )}

        {activeTool === 'coordinates' && (
          <div className="flex-grow overflow-y-auto">
            <CoordinateConverterTool />
          </div>
        )}

        {activeTool === 'pdfsuite' && (
          <div className="flex-grow overflow-y-auto">
            <PdfToolsSuite 
              onNavigateToCardPrint={() => setActiveTool('cardprint')}
              activeToolId={pdfActiveTool}
              onSelectTool={setPdfActiveTool}
            />
          </div>
        )}

        {activeTool === 'converter' && (
          <div className="flex-grow overflow-y-auto">
            <UniversalConverterTool 
              activeCategory={converterCategory}
              onSelectCategory={setConverterCategory}
            />
          </div>
        )}

        {activeTool === 'graphcreator' && (
          <div className="flex-grow overflow-y-auto">
            <GraphCreatorTool />
          </div>
        )}

        {activeTool === 'vectra' && (
          <div className="flex-grow overflow-y-auto">
            <VectraTool />
          </div>
        )}

        {activeTool === 'ezqr' && (
          <div className="flex-grow overflow-y-auto">
            <EzQrTool />
          </div>
        )}

        {activeTool === 'cardprint' && (
          <div className="flex-grow overflow-y-auto">
            <BusinessCardPrintTool />
          </div>
        )}

        {activeTool === 'geotagger' && (
          <div className="flex-grow flex flex-col md:flex-row overflow-hidden w-full h-full">
            <section className="flex order-2 md:order-1 flex-col h-[40dvh] md:h-auto md:w-[320px] lg:w-[400px] border-b md:border-b-0 md:border-r border-brand-border shrink-0 overflow-hidden">
              <div className="p-[15px_20px] text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border flex justify-between shrink-0 bg-brand-bg">
                <span>Batch Queue</span>
                <span className="text-white">{photos.length.toString().padStart(2, '0')} Files</span>
              </div>
              <div className="overflow-y-auto flex-grow bg-black">
                <div className="p-4 border-b border-brand-border bg-brand-surface sticky top-0 z-10">
                  <DropzoneArea onFilesAccepted={handleFilesAccepted} />
                </div>
                <PhotoList 
                  photos={photos} 
                  onDelete={handleDeletePhoto} 
                  onEdit={(id) => {
                    setEditingPhotoId(id);
                    setIsBatchModalOpen(true);
                  }} 
                />
              </div>
            </section>

            <section className="flex flex-col flex-grow w-full h-full order-1 md:order-2 relative bg-black shrink-0 md:shrink overflow-hidden min-h-0">
              <div className="h-auto md:h-[46px] px-5 py-2 md:py-0 text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border bg-brand-bg shrink-0 flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex h-[30px] md:h-full gap-4 items-center w-full md:w-auto">
                  <span className="font-bold text-white">GEOTAGGER WORKBENCH</span>
                </div>
                <div className="flex gap-4 items-center w-full md:w-auto justify-between md:justify-end">
                  {presets.length > 0 && (
                    <select 
                      className="bg-black text-white border border-brand-border text-[10px] p-[4px_8px] uppercase tracking-widest outline-none cursor-pointer"
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val.startsWith('del_')) {
                          const id = val.replace('del_', '');
                          if (window.confirm("Are you sure you want to delete this preset?")) {
                             const updated = presets.filter(p => p.id !== id);
                             setPresets(updated);
                             localStorage.setItem('gextag_presets', JSON.stringify(updated));
                          }
                        } else if (val) {
                          const p = presets.find(l => l.id === val);
                          if (p) {
                            setSelectedLocation({ lat: p.lat, lng: p.lng });
                            setActivePresetData(p);
                            setEditingPhotoId(null);
                            setIsBatchModalOpen(true);
                          }
                        }
                        e.target.value = "";
                      }}
                      value=""
                    >
                      <option value="" disabled>Presets...</option>
                      <optgroup label="Load">
                        {presets.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </optgroup>
                      <optgroup label="Delete">
                        {presets.map(p => (
                          <option key={`del_${p.id}`} value={`del_${p.id}`}>Delete: {p.name}</option>
                        ))}
                      </optgroup>
                    </select>
                  )}
                  {selectedLocation && (
                    <button 
                      onClick={handleSavePreset} 
                      className="text-brand-accent hover:text-white transition-colors"
                      title="Save current location as preset"
                    >
                      + SAVE PRESET
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-grow relative z-0 flex flex-col h-full overflow-hidden">
                 <LocationMap location={selectedLocation} onLocationSelect={setSelectedLocation} photos={photos} onPhotoMove={handlePhotoMove} />
              </div>
            </section>
          </div>
        )}

        {activeTool === 'mapexport' && (
          <div className="flex-grow flex flex-col overflow-hidden w-full h-full relative">
            <div className="h-[46px] px-5 text-[10px] uppercase tracking-[0.3em] text-brand-muted border-b border-brand-border bg-brand-bg shrink-0 flex justify-between items-center">
              <span className="font-bold text-white">MAP & GIS EXPORT WORKBENCH</span>
            </div>
            <div className="flex-grow relative z-0 flex flex-col h-full overflow-hidden">
              <MapExportTab location={selectedLocation} />
            </div>
          </div>
        )}
      </main>

      {/* Footer / Action Bar for Geotagger */}
      {activeTool === 'geotagger' && (
        <footer className="shrink-0 flex flex-col bg-brand-bg border-t border-brand-border">
          <div className="min-h-[60px] md:min-h-[80px] p-2 md:p-[0_20px] flex flex-col md:flex-row items-center justify-between border-b border-[#111] gap-2">
            <div className="flex w-full md:w-auto justify-between md:justify-start items-center shrink-0">
              <span className="text-brand-muted text-[12px] mr-5 uppercase tracking-widest font-bold">
                Selected: {selectedLocation ? `${selectedLocation.lat.toFixed(4)}, ${selectedLocation.lng.toFixed(4)}` : 'None'}
              </span>
              <button onClick={handleReset} className="bg-transparent text-white border border-[#333] p-[10px_20px] font-black uppercase text-[12px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface hover:text-brand-pin transition-colors">
                Clear All
              </button>
            </div>
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto scrollbar-none py-1 justify-end shrink-0">
               <button onClick={() => {
                  setEditingPhotoId(null);
                  setIsBatchModalOpen(true);
                }} className="bg-transparent text-white border border-[#333] p-[8px_15px] md:p-[12px_30px] font-black uppercase text-[10px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-surface transition-colors whitespace-nowrap">
                Batch Edit
              </button>
              <button onClick={handleTagAll} className="bg-brand-surface text-brand-accent border border-brand-accent p-[8px_15px] md:p-[12px_30px] font-black uppercase text-[10px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-brand-accent hover:text-black transition-colors whitespace-nowrap">
                Tag Queue
              </button>
              <button disabled={isProcessing} onClick={() => setIsExportModalOpen(true)} className="bg-white text-black border-none p-[8px_15px] md:p-[12px_30px] font-black uppercase text-[10px] md:text-[14px] tracking-[0.1em] cursor-pointer hover:bg-gray-200 transition-colors disabled:opacity-50 whitespace-nowrap">
                {isProcessing ? "Wait..." : `Export (${photos.length.toString().padStart(2, '0')})`}
              </button>
            </div>
          </div>
        </footer>
      )}

      {/* Bottom Mobile Navigation Bar */}
      <nav className="md:hidden shrink-0 bg-brand-bg border-t border-brand-border h-[64px] flex justify-around items-center px-2 z-50">
        <button
          onClick={() => setActiveTool('dashboard')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'dashboard' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <Home size={18} />
          <span className="text-[9px] uppercase tracking-wider">Home</span>
        </button>
        <button
          onClick={() => setActiveTool('geotagger')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'geotagger' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <MapPin size={18} />
          <span className="text-[9px] uppercase tracking-wider">Tagger</span>
        </button>
        <button
          onClick={() => setActiveTool('mapexport')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'mapexport' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <Download size={18} />
          <span className="text-[9px] uppercase tracking-wider">GIS</span>
        </button>
        <button
          onClick={() => setActiveTool('pdfsuite')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'pdfsuite' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <FileText size={18} />
          <span className="text-[9px] uppercase tracking-wider">PDF Tools</span>
        </button>
        <button
          onClick={() => setActiveTool('converter')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'converter' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <ArrowRightLeft size={18} />
          <span className="text-[9px] uppercase tracking-wider">Convert</span>
        </button>
        <button
          onClick={() => setActiveTool('coordinates')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'coordinates' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <Compass size={18} />
          <span className="text-[9px] uppercase tracking-wider">Coords</span>
        </button>
        <button
          onClick={() => setActiveTool('vectra')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'vectra' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <Layers size={18} />
          <span className="text-[9px] uppercase tracking-wider">Vectra</span>
        </button>
        <button
          onClick={() => setActiveTool('ezqr')}
          className={`flex flex-col items-center justify-center gap-1 flex-1 h-full transition-colors ${activeTool === 'ezqr' ? 'text-brand-accent font-black' : 'text-brand-muted'}`}
        >
          <QrCode size={18} />
          <span className="text-[9px] uppercase tracking-wider">EzQR</span>
        </button>
      </nav>

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        onExport={handleDownloadZip}
        count={photos.length}
      />

      <BatchEditModal 
        isOpen={isBatchModalOpen}
        onClose={() => {
          setIsBatchModalOpen(false);
          setEditingPhotoId(null);
          setActivePresetData(null);
        }}
        onApply={handleBatchApply}
        isSingleEdit={!!editingPhotoId}
        initialData={editingPhotoId ? {
          keywords: photos.find(p => p.id === editingPhotoId)?.keywords || [],
          description: photos.find(p => p.id === editingPhotoId)?.description || '',
          lat: photos.find(p => p.id === editingPhotoId)?.lat || null,
          lng: photos.find(p => p.id === editingPhotoId)?.lng || null,
          artist: photos.find(p => p.id === editingPhotoId)?.artist || '',
          copyright: photos.find(p => p.id === editingPhotoId)?.copyright || '',
          datetime: photos.find(p => p.id === editingPhotoId)?.datetime || '',
        } : activePresetData || undefined}
      />
    </div>
  );
}
