import React, { useState, useRef } from 'react';
import { 
  BarChart, Bar, LineChart, Line, AreaChart, Area, PieChart, Pie, Cell, 
  ScatterChart, Scatter, RadarChart, Radar, PolarGrid, PolarAngleAxis, 
  PolarRadiusAxis, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { 
  BarChart3, LineChart as LineChartIcon, PieChart as PieChartIcon, 
  Activity, Radar as RadarIcon, Plus, Trash2, Download, Upload, 
  Sparkles, RefreshCw, Layers, FileSpreadsheet, FileJson, Copy, 
  Check, Sliders, Palette, Eye, Hash, FunctionSquare, X, Pencil
} from 'lucide-react';
import { toPng } from 'html-to-image';

export type ChartType = 'bar' | 'horizontal-bar' | 'stacked-bar' | 'line' | 'area' | 'pie' | 'donut' | 'scatter' | 'radar' | 'function';

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[];
  isCustom?: boolean;
}

interface SeriesConfig {
  key: string;
  label: string;
  color: string;
}

interface DataRow {
  category: string;
  [key: string]: string | number;
}

// Preset color palettes
export const DEFAULT_PALETTES: ColorPalette[] = [
  { id: 'brutalist-neon', name: 'Brutalist Neon', colors: ['#b700ff', '#00f0ff', '#ff0055', '#ccff00', '#ff9900', '#00ff66'] },
  { id: 'cyber-matrix', name: 'Cyber Matrix', colors: ['#00ff66', '#00f0ff', '#3b82f6', '#a855f7', '#ec4899', '#f59e0b'] },
  { id: 'sunset-warmth', name: 'Sunset Warmth', colors: ['#f97316', '#ef4444', '#ec4899', '#8b5cf6', '#eab308', '#10b981'] },
  { id: 'corporate-dark', name: 'Corporate Dark', colors: ['#38bdf8', '#818cf8', '#c084fc', '#f472b6', '#34d399', '#fbbf24'] },
  { id: 'monochrome', name: 'Monochrome', colors: ['#ffffff', '#a1a1aa', '#71717a', '#52525b', '#3f3f46', '#27272a'] }
];

// Default Preset Data
const PRESETS: { [key: string]: { title: string; subtitle: string; chartType: ChartType; series: SeriesConfig[]; data: DataRow[] } } = {
  revenue: {
    title: 'QUARTERLY FINANCIAL PERFORMANCE',
    subtitle: 'Revenue vs Expenses breakdown for FY 2024 (in $ USD)',
    chartType: 'bar',
    series: [
      { key: 'revenue', label: 'Revenue ($)', color: '#00f0ff' },
      { key: 'expenses', label: 'Expenses ($)', color: '#ff0055' },
      { key: 'profit', label: 'Net Profit ($)', color: '#00ff66' }
    ],
    data: [
      { category: 'Q1 Jan-Mar', revenue: 125000, expenses: 82000, profit: 43000 },
      { category: 'Q2 Apr-Jun', revenue: 168000, expenses: 94000, profit: 74000 },
      { category: 'Q3 Jul-Sep', revenue: 195000, expenses: 105000, profit: 90000 },
      { category: 'Q4 Oct-Dec', revenue: 240000, expenses: 118000, profit: 122000 }
    ]
  },
  marketShare: {
    title: 'GLOBAL BROWSER ENGINE SHARE',
    subtitle: 'Desktop & Mobile market distribution percentage 2024',
    chartType: 'pie',
    series: [
      { key: 'share', label: 'Market Share (%)', color: '#b700ff' }
    ],
    data: [
      { category: 'Chrome', share: 64.5 },
      { category: 'Safari', share: 18.2 },
      { category: 'Edge', share: 5.3 },
      { category: 'Firefox', share: 3.1 },
      { category: 'Opera', share: 2.4 },
      { category: 'Others', share: 6.5 }
    ]
  },
  growthLine: {
    title: 'ACTIVE USER ACQUISITION METRICS',
    subtitle: 'Monthly active users vs paid subscribers trend',
    chartType: 'line',
    series: [
      { key: 'mau', label: 'Active Users', color: '#00f0ff' },
      { key: 'paid', label: 'Paid Members', color: '#b700ff' }
    ],
    data: [
      { category: 'Jan', mau: 12000, paid: 1800 },
      { category: 'Feb', mau: 19000, paid: 2900 },
      { category: 'Mar', mau: 27000, paid: 4500 },
      { category: 'Apr', mau: 38000, paid: 6800 },
      { category: 'May', mau: 51000, paid: 9400 },
      { category: 'Jun', mau: 68000, paid: 13200 }
    ]
  },
  skillsRadar: {
    title: 'SYSTEM ARCHITECTURE CAPABILITIES',
    subtitle: 'Benchmark comparison across core technical pillars (0-100)',
    chartType: 'radar',
    series: [
      { key: 'teamA', label: 'System Alpha', color: '#00f0ff' },
      { key: 'teamB', label: 'System Beta', color: '#ff0055' }
    ],
    data: [
      { category: 'Latency', teamA: 92, teamB: 78 },
      { category: 'Throughput', teamA: 85, teamB: 95 },
      { category: 'Security', teamA: 98, teamB: 88 },
      { category: 'Scalability', teamA: 88, teamB: 92 },
      { category: 'Fault Tolerance', teamA: 90, teamB: 84 },
      { category: 'Cost Efficiency', teamA: 75, teamB: 90 }
    ]
  }
};

export const GraphCreatorTool: React.FC = () => {
  const chartPreviewRef = useRef<HTMLDivElement>(null);

  // General Graph Settings
  const [title, setTitle] = useState<string>('MAKE MY GRAPH BUILDER');
  const [subtitle, setSubtitle] = useState<string>('Interactive data visualization & custom chart editor');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxisLabel, setXAxisLabel] = useState<string>('Categories');
  const [yAxisLabel, setYAxisLabel] = useState<string>('Values');
  const [unitSuffix, setUnitSuffix] = useState<string>('');
  
  // Customization Toggles
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [showLegend, setShowLegend] = useState<boolean>(true);
  const [legendPosition, setLegendPosition] = useState<'top' | 'bottom' | 'right'>('top');
  const [showValuesOnChart, setShowValuesOnChart] = useState<boolean>(false);
  const [chartBg, setChartBg] = useState<string>('#000000');
  const [isCurvedLine, setIsCurvedLine] = useState<boolean>(true);

  // Custom Palettes state with localStorage persistence
  const [customPalettes, setCustomPalettes] = useState<ColorPalette[]>(() => {
    try {
      const saved = localStorage.getItem('chaosbox_graph_custom_palettes');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {
      console.error('Error loading custom palettes from localStorage', e);
    }
    return [];
  });

  const allPalettes = [...DEFAULT_PALETTES, ...customPalettes];
  const [activePaletteId, setActivePaletteId] = useState<string>('brutalist-neon');
  const activePalette = allPalettes.find(p => p.id === activePaletteId) || allPalettes[0] || DEFAULT_PALETTES[0];

  // Custom Palette Creator / Editor Modal State
  const [isPaletteEditorOpen, setIsPaletteEditorOpen] = useState<boolean>(false);
  const [editingPaletteId, setEditingPaletteId] = useState<string | null>(null);
  const [paletteEditorName, setPaletteEditorName] = useState<string>('');
  const [paletteEditorColors, setPaletteEditorColors] = useState<string[]>([
    '#ff0077', '#00f0ff', '#00ff66', '#ffb700', '#7928ca'
  ]);

  // Series and Data State
  const [seriesList, setSeriesList] = useState<SeriesConfig[]>([
    { key: 'val1', label: 'Series 1', color: '#00f0ff' },
    { key: 'val2', label: 'Series 2', color: '#b700ff' }
  ]);

  const [dataRows, setDataRows] = useState<DataRow[]>([
    { category: 'Item A', val1: 45, val2: 28 },
    { category: 'Item B', val1: 72, val2: 54 },
    { category: 'Item C', val1: 38, val2: 65 },
    { category: 'Item D', val1: 89, val2: 41 },
    { category: 'Item E', val1: 60, val2: 82 }
  ]);

  // Math Function Plotter State
  const [mathFunctionExpr, setMathFunctionExpr] = useState<string>('Math.sin(x)');
  const [xMin, setXMin] = useState<number>(-10);
  const [xMax, setXMax] = useState<number>(10);
  const [functionStepCount, setFunctionStepCount] = useState<number>(50);

  // Copy & Export notification
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Apply Palette to Series
  const applyPalette = (palette: ColorPalette) => {
    setActivePaletteId(palette.id);
    const colors = palette.colors;
    setSeriesList(prev => prev.map((s, idx) => ({
      ...s,
      color: colors[idx % colors.length]
    })));
  };

  // Open New Palette Editor
  const openNewPaletteEditor = () => {
    setEditingPaletteId(null);
    setPaletteEditorName(`Custom Palette ${customPalettes.length + 1}`);
    setPaletteEditorColors(['#ff0077', '#00f0ff', '#00ff66', '#ffb700', '#7928ca']);
    setIsPaletteEditorOpen(true);
  };

  // Open Edit Palette Editor
  const openEditPaletteEditor = (palette: ColorPalette, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingPaletteId(palette.id);
    setPaletteEditorName(palette.name);
    setPaletteEditorColors([...palette.colors]);
    setIsPaletteEditorOpen(true);
  };

  // Save Custom Palette (Create or Update)
  const handleSaveCustomPalette = () => {
    if (!paletteEditorName.trim()) {
      alert("Please enter a palette name.");
      return;
    }
    if (paletteEditorColors.length < 2) {
      alert("A palette requires at least 2 colors.");
      return;
    }

    const targetId = editingPaletteId || `custom-${Date.now()}`;
    let updatedList: ColorPalette[];

    if (editingPaletteId) {
      updatedList = customPalettes.map(p => 
        p.id === editingPaletteId 
          ? { ...p, name: paletteEditorName.trim(), colors: paletteEditorColors }
          : p
      );
    } else {
      const newPalette: ColorPalette = {
        id: targetId,
        name: paletteEditorName.trim(),
        colors: paletteEditorColors,
        isCustom: true
      };
      updatedList = [...customPalettes, newPalette];
    }

    setCustomPalettes(updatedList);
    try {
      localStorage.setItem('chaosbox_graph_custom_palettes', JSON.stringify(updatedList));
    } catch (e) {
      console.error("Failed to save custom palette to localStorage", e);
    }

    // Apply the saved palette immediately
    setActivePaletteId(targetId);
    setSeriesList(prev => prev.map((s, idx) => ({
      ...s,
      color: paletteEditorColors[idx % paletteEditorColors.length]
    })));

    setIsPaletteEditorOpen(false);
    setEditingPaletteId(null);
  };

  // Delete Custom Palette
  const handleDeleteCustomPalette = (paletteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customPalettes.filter(p => p.id !== paletteId);
    setCustomPalettes(updated);
    try {
      localStorage.setItem('chaosbox_graph_custom_palettes', JSON.stringify(updated));
    } catch (e) {
      console.error("Failed to delete custom palette from localStorage", e);
    }
    if (activePaletteId === paletteId) {
      setActivePaletteId(DEFAULT_PALETTES[0].id);
      const defaultColors = DEFAULT_PALETTES[0].colors;
      setSeriesList(prev => prev.map((s, idx) => ({
        ...s,
        color: defaultColors[idx % defaultColors.length]
      })));
    }
  };

  // Add Swatch in Editor
  const handleAddEditorColor = () => {
    if (paletteEditorColors.length >= 12) return;
    const randomVibrant = ['#ff0055', '#00f0ff', '#ff00aa', '#00ff66', '#ffff00', '#ff6600', '#9d00ff', '#00e1ff', '#e02424', '#06b6d4'][Math.floor(Math.random() * 10)];
    setPaletteEditorColors(prev => [...prev, randomVibrant]);
  };

  // Remove Swatch in Editor
  const handleRemoveEditorColor = (index: number) => {
    if (paletteEditorColors.length <= 2) {
      alert("Palette must have at least 2 colors.");
      return;
    }
    setPaletteEditorColors(prev => prev.filter((_, i) => i !== index));
  };

  // Update Swatch in Editor
  const handleUpdateEditorColor = (index: number, val: string) => {
    setPaletteEditorColors(prev => prev.map((c, i) => i === index ? val : c));
  };

  // Randomize Swatches
  const handleRandomizeEditorColors = () => {
    const randomSets = [
      ['#ff007f', '#7928ca', '#0070f3', '#00dfd8', '#ffffff'],
      ['#ff5964', '#ffe74c', '#6bf178', '#35a7ff', '#ff9f1c'],
      ['#05ffa1', '#00e5ff', '#b967ff', '#ff3864', '#f1fa8c'],
      ['#ff1361', '#fff800', '#00eaff', '#b721ff', '#21d4fd'],
      ['#fa709a', '#fee140', '#43e97b', '#38f9d7', '#4facfe']
    ];
    const picked = randomSets[Math.floor(Math.random() * randomSets.length)];
    setPaletteEditorColors([...picked]);
  };

  // Load Preset
  const loadPreset = (presetKey: string) => {
    const p = PRESETS[presetKey];
    if (!p) return;
    setTitle(p.title);
    setSubtitle(p.subtitle);
    setChartType(p.chartType);
    setSeriesList(p.series);
    setDataRows(p.data);
  };

  // Add Data Row
  const handleAddRow = () => {
    const newCategory = `Item ${String.fromCharCode(65 + dataRows.length)}`;
    const newRow: DataRow = { category: newCategory };
    seriesList.forEach(s => {
      newRow[s.key] = Math.floor(Math.random() * 80) + 20;
    });
    setDataRows(prev => [...prev, newRow]);
  };

  // Delete Data Row
  const handleDeleteRow = (index: number) => {
    if (dataRows.length <= 1) {
      alert("At least one data row is required.");
      return;
    }
    setDataRows(prev => prev.filter((_, i) => i !== index));
  };

  // Update Data Row Cell
  const handleCellChange = (rowIndex: number, field: string, value: string) => {
    setDataRows(prev => prev.map((row, i) => {
      if (i !== rowIndex) return row;
      if (field === 'category') {
        return { ...row, category: value };
      } else {
        const num = parseFloat(value);
        return { ...row, [field]: isNaN(num) ? value : num };
      }
    }));
  };

  // Add New Series Column
  const handleAddSeries = () => {
    const seriesIndex = seriesList.length + 1;
    const key = `val${seriesIndex}`;
    const label = `Series ${seriesIndex}`;
    const palette = activePalette.colors;
    const color = palette[(seriesList.length) % palette.length];

    setSeriesList(prev => [...prev, { key, label, color }]);
    setDataRows(prev => prev.map(row => ({
      ...row,
      [key]: Math.floor(Math.random() * 80) + 10
    })));
  };

  // Remove Series Column
  const handleRemoveSeries = (seriesKey: string) => {
    if (seriesList.length <= 1) {
      alert("At least one series column is required.");
      return;
    }
    setSeriesList(prev => prev.filter(s => s.key !== seriesKey));
    setDataRows(prev => prev.map(row => {
      const copy = { ...row };
      delete copy[seriesKey];
      return copy;
    }));
  };

  // Update Series Properties
  const handleUpdateSeries = (seriesKey: string, field: 'label' | 'color', val: string) => {
    setSeriesList(prev => prev.map(s => s.key === seriesKey ? { ...s, [field]: val } : s));
  };

  // Plot Math Function
  const handlePlotMathFunction = () => {
    try {
      const generatedRows: DataRow[] = [];
      const step = (xMax - xMin) / Math.max(10, functionStepCount);
      
      // Sanitized evaluate function
      const evalFunc = new Function('x', `
        try {
          with (Math) {
            return ${mathFunctionExpr};
          }
        } catch (e) {
          return NaN;
        }
      `);

      for (let x = xMin; x <= xMax + 0.0001; x += step) {
        const y = evalFunc(x);
        if (!isNaN(y) && isFinite(y)) {
          generatedRows.push({
            category: Number(x.toFixed(2)).toString(),
            xVal: Number(x.toFixed(2)),
            fx: Number(y.toFixed(4))
          });
        }
      }

      if (generatedRows.length === 0) {
        alert("Function evaluation returned no valid numbers. Try e.g. Math.sin(x), x*x - 4, or 2*x + 1.");
        return;
      }

      setSeriesList([
        { key: 'fx', label: `f(x) = ${mathFunctionExpr}`, color: '#00f0ff' }
      ]);
      setDataRows(generatedRows);
      setChartType('function');
      setXAxisLabel('x');
      setYAxisLabel('f(x)');
      setTitle(`MATH FUNCTION: ${mathFunctionExpr}`);
      setSubtitle(`Plotted from x = ${xMin} to x = ${xMax}`);
    } catch (err) {
      alert(`Invalid mathematical expression: ${(err as Error).message}`);
    }
  };

  // CSV Import Parser
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
      if (lines.length < 2) {
        alert("CSV file must contain a header line and at least one data row.");
        return;
      }

      const headers = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
      const categoryHeader = headers[0] || 'Category';
      const seriesHeaders = headers.slice(1);

      if (seriesHeaders.length === 0) {
        alert("CSV must have at least 2 columns (Category, Value1, ...).");
        return;
      }

      const palette = activePalette.colors;
      const newSeries: SeriesConfig[] = seriesHeaders.map((sh, idx) => ({
        key: `csv_col_${idx}`,
        label: sh,
        color: palette[idx % palette.length]
      }));

      const newRows: DataRow[] = [];
      for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split(',').map(c => c.trim().replace(/^["']|["']$/g, ''));
        const rowCategory = cells[0] || `Row ${i}`;
        const rowObj: DataRow = { category: rowCategory };

        seriesHeaders.forEach((_, sIdx) => {
          const valStr = cells[sIdx + 1];
          const valNum = parseFloat(valStr);
          rowObj[`csv_col_${sIdx}`] = isNaN(valNum) ? (valStr || 0) : valNum;
        });

        newRows.push(rowObj);
      }

      setSeriesList(newSeries);
      setDataRows(newRows);
      setXAxisLabel(categoryHeader);
      setTitle(`CSV DATA GRAPH: ${file.name.replace(/\.[^/.]+$/, "")}`);
      setSubtitle(`Imported ${newRows.length} rows and ${newSeries.length} data series`);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export CSV
  const handleExportCsv = () => {
    const headers = [xAxisLabel || 'Category', ...seriesList.map(s => s.label)];
    const csvLines = [headers.join(',')];

    dataRows.forEach(row => {
      const line = [
        `"${row.category}"`,
        ...seriesList.map(s => row[s.key] !== undefined ? row[s.key] : '')
      ];
      csvLines.push(line.join(','));
    });

    const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_data.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export JSON Project State
  const handleExportJson = () => {
    const state = {
      title,
      subtitle,
      chartType,
      xAxisLabel,
      yAxisLabel,
      unitSuffix,
      showGrid,
      showLegend,
      legendPosition,
      showValuesOnChart,
      chartBg,
      seriesList,
      dataRows
    };
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_project.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Import JSON Project
  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const json = JSON.parse(evt.target?.result as string);
        if (json.title) setTitle(json.title);
        if (json.subtitle) setSubtitle(json.subtitle);
        if (json.chartType) setChartType(json.chartType);
        if (json.xAxisLabel) setXAxisLabel(json.xAxisLabel);
        if (json.yAxisLabel) setYAxisLabel(json.yAxisLabel);
        if (json.unitSuffix !== undefined) setUnitSuffix(json.unitSuffix);
        if (json.showGrid !== undefined) setShowGrid(json.showGrid);
        if (json.showLegend !== undefined) setShowLegend(json.showLegend);
        if (json.seriesList) setSeriesList(json.seriesList);
        if (json.dataRows) setDataRows(json.dataRows);
      } catch (err) {
        alert("Failed to parse graph project JSON file.");
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Export PNG Image
  const handleExportImage = async () => {
    if (!chartPreviewRef.current) return;
    try {
      const dataUrl = await toPng(chartPreviewRef.current, {
        cacheBust: true,
        backgroundColor: chartBg
      });
      const link = document.createElement('a');
      link.download = `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_graph.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Export Image error", err);
      alert("Error exporting chart image.");
    }
  };

  // Export Raw SVG Vector
  const handleExportSvg = () => {
    if (!chartPreviewRef.current) return;
    const svgEl = chartPreviewRef.current.querySelector('svg');
    if (!svgEl) {
      alert("SVG element not found in graph container.");
      return;
    }

    const svgData = new XMLSerializer().serializeToString(svgEl);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_graph.svg`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Format Tooltip/Axis value with unit suffix
  const formatValue = (value: any) => {
    if (typeof value === 'number') {
      return `${value.toLocaleString()}${unitSuffix}`;
    }
    return `${value}${unitSuffix}`;
  };

  // Render Recharts Component based on active chartType
  const renderChart = () => {
    const pieData = dataRows.map((r, i) => {
      const mainKey = seriesList[0]?.key || 'val1';
      const val = typeof r[mainKey] === 'number' ? r[mainKey] : parseFloat(String(r[mainKey])) || 0;
      const palette = activePalette.colors;
      return {
        name: r.category,
        value: val,
        color: palette[i % palette.length]
      };
    });

    switch (chartType) {
      case 'bar':
        return (
          <BarChart data={dataRows} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} label={{ value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#888', fontSize: 11 }} />
            <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign={legendPosition === 'bottom' ? 'bottom' : 'top'} align={legendPosition === 'right' ? 'right' : 'center'} wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        );

      case 'horizontal-bar':
        return (
          <BarChart data={dataRows} layout="vertical" margin={{ top: 20, right: 30, left: 40, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis type="number" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} />
            <YAxis type="category" dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} width={80} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign={legendPosition === 'bottom' ? 'bottom' : 'top'} align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[0, 2, 2, 0]} />
            ))}
          </BarChart>
        );

      case 'stacked-bar':
        return (
          <BarChart data={dataRows} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
            <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} stackId="a" />
            ))}
          </BarChart>
        );

      case 'line':
      case 'function':
        return (
          <LineChart data={dataRows} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} label={{ value: xAxisLabel, position: 'insideBottom', offset: -10, fill: '#888', fontSize: 11 }} />
            <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} label={{ value: yAxisLabel, angle: -90, position: 'insideLeft', fill: '#888', fontSize: 11 }} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Line key={s.key} type={isCurvedLine ? 'monotone' : 'linear'} dataKey={s.key} name={s.label} stroke={s.color} strokeWidth={3} dot={{ r: chartType === 'function' ? 0 : 4, fill: s.color }} activeDot={{ r: 6 }} />
            ))}
          </LineChart>
        );

      case 'area':
        return (
          <AreaChart data={dataRows} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
            <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Area key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color} fill={s.color} fillOpacity={0.3} strokeWidth={2} />
            ))}
          </AreaChart>
        );

      case 'pie':
      case 'donut':
        return (
          <PieChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={110}
              innerRadius={chartType === 'donut' ? 55 : 0}
              paddingAngle={chartType === 'donut' ? 3 : 0}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {pieData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#000" strokeWidth={2} />
              ))}
            </Pie>
          </PieChart>
        );

      case 'scatter':
        return (
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            {showGrid && <CartesianGrid strokeDasharray="3 3" stroke="#222225" />}
            <XAxis dataKey="category" name={xAxisLabel} stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
            <YAxis stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} tickFormatter={formatValue} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="top" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Scatter key={s.key} name={s.label} data={dataRows} fill={s.color} line={{ stroke: s.color, strokeWidth: 1 }} />
            ))}
          </ScatterChart>
        );

      case 'radar':
        return (
          <RadarChart cx="50%" cy="50%" outerRadius={110} data={dataRows}>
            <PolarGrid stroke="#222225" />
            <PolarAngleAxis dataKey="category" stroke="#888" tick={{ fill: '#aaa', fontSize: 11 }} />
            <PolarRadiusAxis angle={30} domain={[0, 'auto']} stroke="#444" tick={{ fill: '#666', fontSize: 9 }} />
            <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff', fontSize: '12px' }} formatter={(val: any) => [formatValue(val)]} />
            {showLegend && <Legend verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '11px', color: '#fff' }} />}
            {seriesList.map(s => (
              <Radar key={s.key} name={s.label} dataKey={s.key} stroke={s.color} fill={s.color} fillOpacity={0.4} />
            ))}
          </RadarChart>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      {/* Tool Header */}
      <div className="border border-brand-border p-6 bg-brand-surface flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.25em] text-brand-accent bg-black px-2 py-0.5 border border-brand-border">
              MAKEMYGRAPH BUILDER
            </span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">
              BRUTALIST GRAPH CREATOR
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-white flex items-center gap-3">
            <BarChart3 className="w-6 h-6 text-brand-accent" />
            Graph & Chart Studio
          </h1>
          <p className="text-xs text-zinc-400 uppercase tracking-wider mt-1">
            Custom bar, line, pie, radar, scatter & function plotter charts with export capabilities.
          </p>
        </div>

        {/* Preset Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-black border border-brand-border p-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-accent" />
            <span className="text-[10px] font-mono font-bold text-zinc-400 uppercase tracking-wider mr-1">PRESETS:</span>
            <button onClick={() => loadPreset('revenue')} className="px-2 py-1 text-[9px] font-mono font-bold uppercase bg-brand-surface border border-brand-border text-white hover:border-brand-accent hover:text-brand-accent transition-colors">
              Financial
            </button>
            <button onClick={() => loadPreset('marketShare')} className="px-2 py-1 text-[9px] font-mono font-bold uppercase bg-brand-surface border border-brand-border text-white hover:border-brand-accent hover:text-brand-accent transition-colors">
              Market Share
            </button>
            <button onClick={() => loadPreset('growthLine')} className="px-2 py-1 text-[9px] font-mono font-bold uppercase bg-brand-surface border border-brand-border text-white hover:border-brand-accent hover:text-brand-accent transition-colors">
              Growth
            </button>
            <button onClick={() => loadPreset('skillsRadar')} className="px-2 py-1 text-[9px] font-mono font-bold uppercase bg-brand-surface border border-brand-border text-white hover:border-brand-accent hover:text-brand-accent transition-colors">
              Radar
            </button>
          </div>
        </div>
      </div>

      {/* Main Workbench Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT PANEL: Chart Type & Controls (5 columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Chart Type Selector */}
          <div className="p-5 border border-brand-border bg-brand-surface space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
              <BarChart3 className="w-4 h-4 text-brand-accent" />
              1. Select Chart Type
            </h3>

            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'bar', label: 'Bar', icon: BarChart3 },
                { id: 'horizontal-bar', label: 'H-Bar', icon: BarChart3 },
                { id: 'stacked-bar', label: 'Stacked', icon: BarChart3 },
                { id: 'line', label: 'Line', icon: LineChartIcon },
                { id: 'area', label: 'Area', icon: Activity },
                { id: 'pie', label: 'Pie', icon: PieChartIcon },
                { id: 'donut', label: 'Donut', icon: PieChartIcon },
                { id: 'radar', label: 'Radar', icon: RadarIcon },
                { id: 'function', label: 'Math f(x)', icon: FunctionSquare }
              ].map(t => {
                const IconComp = t.icon;
                const isActive = chartType === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setChartType(t.id as ChartType)}
                    className={`p-2.5 flex flex-col items-center gap-1.5 text-center border font-mono text-[10px] uppercase font-bold transition-all cursor-pointer ${
                      isActive 
                        ? 'bg-brand-accent text-black border-brand-accent shadow-[0_0_15px_rgba(0,240,255,0.3)]' 
                        : 'bg-black text-zinc-400 border-brand-border hover:border-zinc-500 hover:text-white'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{t.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Math Function Plotter Box (Shows when chartType === 'function') */}
          {chartType === 'function' && (
            <div className="p-5 border border-brand-accent bg-black space-y-4">
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-brand-accent flex items-center gap-2">
                <FunctionSquare className="w-4 h-4" />
                Math Function Expression
              </h3>

              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">
                    f(x) Expression (e.g. Math.sin(x), x*x - 4)
                  </label>
                  <input
                    type="text"
                    value={mathFunctionExpr}
                    onChange={(e) => setMathFunctionExpr(e.target.value)}
                    placeholder="Math.sin(x) * Math.cos(x/2)"
                    className="w-full bg-brand-surface border border-brand-border px-3 py-2 text-xs text-brand-accent font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">X Min</label>
                    <input
                      type="number"
                      value={xMin}
                      onChange={(e) => setXMin(parseFloat(e.target.value) || 0)}
                      className="w-full bg-brand-surface border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">X Max</label>
                    <input
                      type="number"
                      value={xMax}
                      onChange={(e) => setXMax(parseFloat(e.target.value) || 0)}
                      className="w-full bg-brand-surface border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Steps</label>
                    <input
                      type="number"
                      value={functionStepCount}
                      onChange={(e) => setFunctionStepCount(parseInt(e.target.value) || 20)}
                      className="w-full bg-brand-surface border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <button
                  onClick={handlePlotMathFunction}
                  className="w-full py-2.5 bg-brand-accent text-black font-mono font-bold text-xs uppercase tracking-wider hover:bg-white transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Plot Function Graph
                </button>
              </div>
            </div>
          )}

          {/* Titles & Axis Labels Settings */}
          <div className="p-5 border border-brand-border bg-brand-surface space-y-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
              <Sliders className="w-4 h-4 text-brand-accent" />
              2. Graph Labels & Design
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Main Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Subtitle / Context</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-zinc-300 font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">X-Axis Title</label>
                  <input
                    type="text"
                    value={xAxisLabel}
                    onChange={(e) => setXAxisLabel(e.target.value)}
                    className="w-full bg-black border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Y-Axis Title</label>
                  <input
                    type="text"
                    value={yAxisLabel}
                    onChange={(e) => setYAxisLabel(e.target.value)}
                    className="w-full bg-black border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Unit Suffix</label>
                  <input
                    type="text"
                    value={unitSuffix}
                    onChange={(e) => setUnitSuffix(e.target.value)}
                    placeholder="e.g. $, %, kg"
                    className="w-full bg-black border border-brand-border px-2 py-1.5 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>

              {/* Palette Selection */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[9px] font-mono uppercase text-zinc-400">Color Palette Theme</label>
                  <button
                    type="button"
                    onClick={openNewPaletteEditor}
                    className="flex items-center gap-1.5 px-2 py-0.5 bg-brand-accent hover:bg-white text-black font-mono font-bold text-[9px] uppercase tracking-wider transition-colors cursor-pointer"
                    title="Create custom color palette"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Custom Palette</span>
                  </button>
                </div>

                <div className="flex flex-wrap gap-2">
                  {allPalettes.map((palette) => (
                    <div
                      key={palette.id}
                      onClick={() => applyPalette(palette)}
                      className={`group relative flex items-center gap-1.5 p-1.5 border font-mono text-[9px] uppercase cursor-pointer transition-all ${
                        activePaletteId === palette.id
                          ? 'border-brand-accent bg-black shadow-[0_0_8px_rgba(183,0,255,0.3)]'
                          : 'border-brand-border bg-brand-surface hover:border-zinc-500'
                      }`}
                    >
                      <div className="flex -space-x-1">
                        {palette.colors.slice(0, 4).map((c, i) => (
                          <div
                            key={i}
                            className="w-2.5 h-2.5 rounded-full border border-black shadow-xs shrink-0"
                            style={{ backgroundColor: c }}
                          />
                        ))}
                        {palette.colors.length > 4 && (
                          <div className="w-2.5 h-2.5 rounded-full border border-black bg-zinc-800 text-[6px] text-zinc-300 flex items-center justify-center font-bold">
                            +
                          </div>
                        )}
                      </div>
                      <span className={`${activePaletteId === palette.id ? 'text-white font-bold' : 'text-zinc-300'}`}>
                        {palette.name}
                      </span>
                      {palette.isCustom && (
                        <span className="text-[7px] px-1 py-0.2 bg-brand-accent/20 text-brand-accent border border-brand-accent/40 font-bold ml-0.5">
                          CUSTOM
                        </span>
                      )}

                      {palette.isCustom && (
                        <div className="flex items-center gap-1 ml-1 opacity-70 group-hover:opacity-100">
                          <button
                            type="button"
                            onClick={(e) => openEditPaletteEditor(palette, e)}
                            className="p-0.5 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                            title="Edit Palette"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomPalette(palette.id, e)}
                            className="p-0.5 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
                            title="Delete Palette"
                          >
                            <Trash2 className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Custom Palette Editor Drawer/Panel */}
                {isPaletteEditorOpen && (
                  <div className="mt-3 p-3.5 bg-black border border-brand-accent space-y-3.5">
                    <div className="flex items-center justify-between border-b border-brand-border pb-2">
                      <div className="flex items-center gap-2">
                        <Palette className="w-3.5 h-3.5 text-brand-accent" />
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-white">
                          {editingPaletteId ? 'Edit Custom Color Palette' : 'Create Custom Color Palette'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsPaletteEditorOpen(false)}
                        className="text-zinc-400 hover:text-white transition-colors cursor-pointer p-0.5"
                        title="Close editor"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">
                          Palette Name
                        </label>
                        <input
                          type="text"
                          value={paletteEditorName}
                          onChange={(e) => setPaletteEditorName(e.target.value)}
                          placeholder="e.g. CYBER LIME, RETRO SYNTHWAVE"
                          className="w-full bg-brand-surface border border-brand-border px-2.5 py-1.5 text-xs text-white font-mono uppercase focus:outline-none focus:border-brand-accent"
                        />
                      </div>

                      {/* Live Ribbon Preview */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-mono uppercase text-zinc-400">
                            Palette Swatches ({paletteEditorColors.length} colors)
                          </span>
                          <button
                            type="button"
                            onClick={handleRandomizeEditorColors}
                            className="text-[9px] font-mono text-brand-accent hover:text-white flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Sparkles className="w-2.5 h-2.5" /> Randomize Colors
                          </button>
                        </div>
                        <div className="h-4 w-full flex rounded-xs overflow-hidden border border-brand-border">
                          {paletteEditorColors.map((color, idx) => (
                            <div
                              key={idx}
                              className="h-full flex-grow transition-all"
                              style={{ backgroundColor: color }}
                              title={`${color} (Color #${idx + 1})`}
                            />
                          ))}
                        </div>
                      </div>

                      {/* Swatch Controls List */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-48 overflow-y-auto pr-1">
                        {paletteEditorColors.map((color, idx) => (
                          <div
                            key={idx}
                            className="flex items-center gap-2 p-1.5 bg-brand-surface border border-brand-border"
                          >
                            <span className="text-[9px] font-mono text-zinc-500 w-3 shrink-0">#{idx + 1}</span>
                            <div className="relative w-6 h-6 rounded-xs overflow-hidden border border-brand-border shrink-0">
                              <input
                                type="color"
                                value={color}
                                onChange={(e) => handleUpdateEditorColor(idx, e.target.value)}
                                className="absolute -top-2 -left-2 w-10 h-10 cursor-pointer border-0 p-0"
                              />
                            </div>
                            <input
                              type="text"
                              value={color}
                              onChange={(e) => handleUpdateEditorColor(idx, e.target.value)}
                              className="w-20 bg-black border border-brand-border px-1.5 py-0.5 text-[10px] font-mono text-zinc-200 uppercase focus:outline-none focus:border-brand-accent"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveEditorColor(idx)}
                              disabled={paletteEditorColors.length <= 2}
                              className="p-1 text-zinc-500 hover:text-red-400 disabled:opacity-25 disabled:hover:text-zinc-500 ml-auto cursor-pointer"
                              title="Remove swatch color"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Controls footer */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-brand-border">
                        <button
                          type="button"
                          onClick={handleAddEditorColor}
                          disabled={paletteEditorColors.length >= 12}
                          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black border border-brand-border hover:border-brand-accent text-zinc-300 hover:text-white font-mono text-[9px] uppercase cursor-pointer disabled:opacity-40"
                        >
                          <Plus className="w-3 h-3 text-brand-accent" />
                          Add Swatch Color
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setIsPaletteEditorOpen(false)}
                            className="px-2.5 py-1.5 border border-brand-border text-zinc-400 hover:text-white font-mono text-[9px] uppercase cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveCustomPalette}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-accent text-black font-mono font-bold text-[9px] uppercase tracking-wider hover:bg-white transition-colors cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                            Save & Apply Palette
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Display Toggles */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-border">
                <label className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showGrid}
                    onChange={(e) => setShowGrid(e.target.checked)}
                    className="accent-brand-accent"
                  />
                  <span>Show Gridlines</span>
                </label>
                <label className="flex items-center gap-2 text-[10px] font-mono text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showLegend}
                    onChange={(e) => setShowLegend(e.target.checked)}
                    className="accent-brand-accent"
                  />
                  <span>Show Legend</span>
                </label>
              </div>

              {/* Canvas Background Color */}
              <div>
                <label className="block text-[9px] font-mono uppercase text-zinc-400 mb-1">Canvas Background</label>
                <div className="flex items-center gap-2">
                  {[
                    { label: 'Black', color: '#000000' },
                    { label: 'Dark Slate', color: '#121214' },
                    { label: 'Off-White', color: '#f4f4f5' },
                    { label: 'Matrix', color: '#051508' }
                  ].map(bg => (
                    <button
                      key={bg.color}
                      onClick={() => setChartBg(bg.color)}
                      className={`px-2 py-1 text-[9px] font-mono font-bold uppercase border cursor-pointer ${
                        chartBg === bg.color ? 'border-brand-accent text-white' : 'border-brand-border text-zinc-400'
                      }`}
                      style={{ backgroundColor: bg.color === '#f4f4f5' ? '#ffffff' : bg.color, color: bg.color === '#f4f4f5' ? '#000' : '#fff' }}
                    >
                      {bg.label}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          </div>

          {/* Series Configuration List */}
          <div className="p-5 border border-brand-border bg-brand-surface space-y-4">
            <div className="flex items-center justify-between border-b border-brand-border pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-accent" />
                3. Data Series ({seriesList.length})
              </h3>
              <button
                onClick={handleAddSeries}
                className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-brand-accent text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3 h-3" /> Add Series
              </button>
            </div>

            <div className="space-y-2">
              {seriesList.map((series) => (
                <div key={series.key} className="p-2.5 bg-black border border-brand-border flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 flex-grow">
                    <input
                      type="color"
                      value={series.color}
                      onChange={(e) => handleUpdateSeries(series.key, 'color', e.target.value)}
                      className="w-6 h-6 bg-transparent border-0 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={series.label}
                      onChange={(e) => handleUpdateSeries(series.key, 'label', e.target.value)}
                      className="bg-brand-surface border border-brand-border px-2 py-1 text-xs text-white font-mono focus:outline-none focus:border-brand-accent flex-grow"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveSeries(series.key)}
                    className="p-1 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                    title="Remove Series"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>

        {/* RIGHT PANEL: Live Chart Preview & Editable Data Table (7 columns) */}
        <div className="lg:col-span-7 space-y-6">

          {/* LIVE GRAPH PREVIEW CANVAS */}
          <div className="border border-brand-border bg-black relative overflow-hidden flex flex-col">
            
            {/* Canvas Header Toolbar */}
            <div className="p-3 border-b border-brand-border bg-brand-surface flex items-center justify-between flex-wrap gap-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-accent flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5" /> LIVE GRAPH CANVAS PREVIEW
              </span>

              {/* Export Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleExportImage}
                  className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export High-Res PNG Image"
                >
                  <Download className="w-3 h-3 text-brand-accent" /> PNG
                </button>
                <button
                  onClick={handleExportSvg}
                  className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export Vector SVG File"
                >
                  <Download className="w-3 h-3 text-brand-accent" /> SVG
                </button>
                <button
                  onClick={handleExportCsv}
                  className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  title="Export Data Matrix as CSV"
                >
                  <FileSpreadsheet className="w-3 h-3 text-brand-accent" /> CSV
                </button>
                <button
                  onClick={handleExportJson}
                  className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 transition-colors cursor-pointer"
                  title="Save Project JSON"
                >
                  <FileJson className="w-3 h-3 text-brand-accent" /> JSON
                </button>
              </div>
            </div>

            {/* Render Target Div */}
            <div 
              ref={chartPreviewRef} 
              className="p-6 transition-colors min-h-[380px] flex flex-col justify-between"
              style={{ backgroundColor: chartBg, color: chartBg === '#f4f4f5' ? '#000000' : '#ffffff' }}
            >
              {/* Header inside Chart Image */}
              <div className="mb-4 text-center">
                <h2 className="text-lg md:text-xl font-black uppercase tracking-wider" style={{ color: chartBg === '#f4f4f5' ? '#000000' : '#ffffff' }}>
                  {title}
                </h2>
                {subtitle && (
                  <p className="text-xs uppercase tracking-wider mt-0.5 opacity-70">
                    {subtitle}
                  </p>
                )}
              </div>

              {/* Chart Graphics Container */}
              <div className="w-full h-[320px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  {renderChart() || <div className="text-center text-xs text-zinc-500 pt-20">Select a valid chart type</div>}
                </ResponsiveContainer>
              </div>

              {/* Branding Footer in Chart */}
              <div className="mt-4 pt-2 border-t border-zinc-800/50 flex items-center justify-between text-[8px] font-mono uppercase tracking-[0.2em] opacity-50">
                <span>CHAOSBOX GRAPH CREATOR</span>
                <span>{new Date().toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          {/* EDITABLE DATA MATRIX TABLE */}
          <div className="p-5 border border-brand-border bg-brand-surface space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-brand-border pb-3">
              <h3 className="text-xs font-mono font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <FileSpreadsheet className="w-4 h-4 text-brand-accent" />
                4. Data Matrix Table ({dataRows.length} Rows)
              </h3>

              <div className="flex items-center gap-2">
                {/* CSV Import */}
                <label className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-zinc-300 hover:text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors">
                  <Upload className="w-3 h-3 text-brand-accent" />
                  <span>Import CSV</span>
                  <input type="file" accept=".csv,.txt" onChange={handleCsvImport} className="hidden" />
                </label>

                {/* JSON Load */}
                <label className="px-2.5 py-1 bg-black border border-brand-border hover:border-brand-accent text-zinc-300 hover:text-white text-[10px] font-mono font-bold uppercase flex items-center gap-1 cursor-pointer transition-colors">
                  <FileJson className="w-3 h-3 text-brand-accent" />
                  <span>Load JSON</span>
                  <input type="file" accept=".json" onChange={handleImportJson} className="hidden" />
                </label>

                <button
                  onClick={handleAddRow}
                  className="px-2.5 py-1 bg-brand-accent text-black font-mono font-bold text-[10px] uppercase flex items-center gap-1 hover:bg-white transition-colors cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> Add Row
                </button>
              </div>
            </div>

            {/* Responsive Table */}
            <div className="overflow-x-auto max-h-[320px] overflow-y-auto border border-brand-border">
              <table className="w-full text-left border-collapse">
                <thead className="bg-black sticky top-0 z-10">
                  <tr className="border-b border-brand-border text-[9px] font-mono uppercase tracking-wider text-brand-accent">
                    <th className="p-2.5 border-r border-brand-border min-w-[120px]">
                      {xAxisLabel || 'Category'}
                    </th>
                    {seriesList.map(s => (
                      <th key={s.key} className="p-2.5 border-r border-brand-border min-w-[100px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                          <span>{s.label}</span>
                        </div>
                      </th>
                    ))}
                    <th className="p-2.5 w-10 text-center">Del</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-border text-xs font-mono">
                  {dataRows.map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-black/50 transition-colors">
                      <td className="p-1.5 border-r border-brand-border">
                        <input
                          type="text"
                          value={row.category}
                          onChange={(e) => handleCellChange(rIdx, 'category', e.target.value)}
                          className="w-full bg-transparent px-2 py-1 text-white focus:bg-black focus:outline-none focus:text-brand-accent"
                        />
                      </td>
                      {seriesList.map(s => (
                        <td key={s.key} className="p-1.5 border-r border-brand-border">
                          <input
                            type="text"
                            value={row[s.key] !== undefined ? row[s.key] : ''}
                            onChange={(e) => handleCellChange(rIdx, s.key, e.target.value)}
                            className="w-full bg-transparent px-2 py-1 text-zinc-300 focus:bg-black focus:outline-none focus:text-brand-accent"
                          />
                        </td>
                      ))}
                      <td className="p-1.5 text-center">
                        <button
                          onClick={() => handleDeleteRow(rIdx)}
                          className="text-zinc-600 hover:text-red-400 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="text-[9px] font-mono uppercase text-zinc-500 tracking-wider flex items-center justify-between">
              <span>* EDIT CELLS IN REAL-TIME TO UPDATE GRAPH INSTANTLY</span>
              <span>{dataRows.length} ROWS × {seriesList.length} SERIES</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
