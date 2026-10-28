import React, { useState, useRef, useEffect } from 'react';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { jsPDF } from 'jspdf';
import { 
  ArrowRightLeft, FileCode, Image as ImageIcon, MapPin, Key, Music, 
  Download, Upload, RefreshCw, Copy, Check, Sliders, ShieldCheck, 
  FileText, Zap, Eye, Trash2, FileSpreadsheet, Binary, Hash
} from 'lucide-react';

export type Category = 'IMAGE' | 'DOCUMENT' | 'GIS' | 'ENCODING' | 'AUDIO';

interface ConversionPreset {
  id: string;
  name: string;
  category: Category;
  fromExt: string;
  toExt: string;
  description: string;
}

const PRESETS: ConversionPreset[] = [
  // Image
  { id: 'img-png-jpg', name: 'PNG to JPG', category: 'IMAGE', fromExt: 'png', toExt: 'jpg', description: 'Convert PNG image to JPEG with quality adjustment.' },
  { id: 'img-jpg-png', name: 'JPG to PNG', category: 'IMAGE', fromExt: 'jpg', toExt: 'png', description: 'Convert JPEG image to lossless PNG format.' },
  { id: 'img-any-webp', name: 'Any Image to WEBP', category: 'IMAGE', fromExt: 'image', toExt: 'webp', description: 'Compress images to modern web-optimized WEBP.' },
  { id: 'img-any-ico', name: 'Image to Favicon (ICO)', category: 'IMAGE', fromExt: 'image', toExt: 'ico', description: 'Generate website favicon ico image file.' },
  { id: 'img-svg-png', name: 'SVG to PNG', category: 'IMAGE', fromExt: 'svg', toExt: 'png', description: 'Rasterize vector SVG to crisp PNG bitmap.' },

  // Document & Data
  { id: 'doc-csv-json', name: 'CSV to JSON', category: 'DOCUMENT', fromExt: 'csv', toExt: 'json', description: 'Convert CSV spreadsheets to formatted JSON array.' },
  { id: 'doc-json-csv', name: 'JSON to CSV', category: 'DOCUMENT', fromExt: 'json', toExt: 'csv', description: 'Flatten JSON arrays to CSV table download.' },
  { id: 'doc-json-xml', name: 'JSON to XML', category: 'DOCUMENT', fromExt: 'json', toExt: 'xml', description: 'Transform JSON hierarchy into XML DOM document.' },
  { id: 'doc-xml-json', name: 'XML to JSON', category: 'DOCUMENT', fromExt: 'xml', toExt: 'json', description: 'Parse XML tags into structured JSON representation.' },
  { id: 'doc-md-html', name: 'Markdown to HTML', category: 'DOCUMENT', fromExt: 'md', toExt: 'html', description: 'Render Markdown syntax into clean HTML document.' },
  { id: 'doc-txt-pdf', name: 'Text / Code to PDF', category: 'DOCUMENT', fromExt: 'txt', toExt: 'pdf', description: 'Export plain text or code as formatted PDF file.' },

  // GIS
  { id: 'gis-geojson-kml', name: 'GeoJSON to KML', category: 'GIS', fromExt: 'json', toExt: 'kml', description: 'Convert GeoJSON vectors to Google Earth KML.' },
  { id: 'gis-kml-geojson', name: 'KML to GeoJSON', category: 'GIS', fromExt: 'kml', toExt: 'json', description: 'Parse Earth KML Placemarks into GeoJSON Features.' },
  { id: 'gis-csv-geojson', name: 'CSV Coordinates to GeoJSON', category: 'GIS', fromExt: 'csv', toExt: 'json', description: 'Convert CSV with Lat/Lng columns to GeoJSON.' },
  { id: 'gis-geojson-wkt', name: 'GeoJSON to WKT', category: 'GIS', fromExt: 'json', toExt: 'wkt', description: 'Convert GeoJSON geometry to Well-Known Text (WKT).' },

  // Encoding & Hash
  { id: 'enc-file-base64', name: 'File / Text to Base64', category: 'ENCODING', fromExt: 'any', toExt: 'base64', description: 'Encode files or text strings into Base64 / Data URI.' },
  { id: 'enc-base64-file', name: 'Base64 to File / Text', category: 'ENCODING', fromExt: 'base64', toExt: 'txt', description: 'Decode Base64 string back to file or UTF-8 text.' },
  { id: 'enc-text-hex', name: 'Text to Hexadecimal', category: 'ENCODING', fromExt: 'txt', toExt: 'hex', description: 'Convert text characters to Hex string byte codes.' },
  { id: 'enc-url-encode', name: 'URL Encode / Decode', category: 'ENCODING', fromExt: 'txt', toExt: 'url', description: 'Percent-encode or decode URL query strings.' },
  { id: 'enc-hash-gen', name: 'SHA-256 / MD5 Hash Generator', category: 'ENCODING', fromExt: 'txt', toExt: 'hash', description: 'Compute cryptographic checksums of text or files.' },

  // Audio Synth
  { id: 'aud-tone-wav', name: 'Tone Synthesizer to WAV', category: 'AUDIO', fromExt: 'hz', toExt: 'wav', description: 'Generate custom frequency sound tones as WAV files.' }
];

export interface UniversalConverterToolProps {
  activeCategory?: Category | 'ALL';
  onSelectCategory?: (category: Category | 'ALL') => void;
}

export const UniversalConverterTool: React.FC<UniversalConverterToolProps> = ({
  activeCategory: propActiveCategory,
  onSelectCategory: propOnSelectCategory
}) => {
  const [internalCategory, setInternalCategory] = useState<Category | 'ALL'>('ALL');
  const activeCategory = propActiveCategory !== undefined ? propActiveCategory : internalCategory;
  const setActiveCategory = (cat: Category | 'ALL') => {
    setInternalCategory(cat);
    propOnSelectCategory?.(cat);
  };
  const [selectedPresetId, setSelectedPresetId] = useState<string>('img-png-jpg');

  // Input States
  const [inputText, setInputText] = useState<string>('');
  const [uploadedFile, setUploadedFile] = useState<{ file: File; dataUrl: string } | null>(null);
  
  // Settings
  const [imageQuality, setImageQuality] = useState<number>(90);
  const [imageScale, setImageScale] = useState<number>(100);
  const [imageFilter, setImageFilter] = useState<'none' | 'grayscale' | 'invert'>('none');
  const [imageRotate, setImageRotate] = useState<number>(0);
  const [watermarkText, setWatermarkText] = useState<string>('');
  const [csvDelimiter, setCsvDelimiter] = useState<string>(',');
  const [hashAlgorithm, setHashAlgorithm] = useState<'SHA-256' | 'SHA-512' | 'SHA-1'>('SHA-256');
  const [toneFreq, setToneFreq] = useState<number>(440);
  const [toneDuration, setToneDuration] = useState<number>(2);

  // Output States
  const [outputResult, setOutputResult] = useState<{
    text?: string;
    dataUrl?: string;
    blob?: Blob;
    filename: string;
    fileSizeStr: string;
    detailsStr: string;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const currentPreset = PRESETS.find(p => p.id === selectedPresetId) || PRESETS[0];

  // Auto Reset Output when preset or file changes
  useEffect(() => {
    setOutputResult(null);
    setErrorMessage(null);
  }, [selectedPresetId, uploadedFile, inputText]);

  // Handle File Upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadedFile({ file, dataUrl });
      // If text file, also populate text input area for convenience
      if (file.type.startsWith('text/') || file.name.endsWith('.json') || file.name.endsWith('.csv') || file.name.endsWith('.xml') || file.name.endsWith('.md') || file.name.endsWith('.kml')) {
        const textReader = new FileReader();
        textReader.onload = () => {
          setInputText(textReader.result as string);
        };
        textReader.readAsText(file);
      }
    };
    reader.readAsDataURL(file);
  };

  // Run Conversion logic based on active preset
  const handleConvert = async () => {
    setIsProcessing(true);
    setErrorMessage(null);
    setOutputResult(null);

    try {
      const preset = currentPreset;
      let targetFilename = `converted_${Date.now()}.${preset.toExt}`;

      // 1. IMAGE CONVERSIONS
      if (preset.category === 'IMAGE') {
        if (!uploadedFile) {
          throw new Error('Please upload an image file first.');
        }

        const img = new Image();
        img.src = uploadedFile.dataUrl;
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = () => reject(new Error('Failed to load uploaded image.'));
        });

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) throw new Error('Canvas context non-functional.');

        let w = Math.round(img.width * (imageScale / 100));
        let h = Math.round(img.height * (imageScale / 100));
        
        if (preset.toExt === 'ico') {
          w = 64;
          h = 64;
        }

        if (imageRotate === 90 || imageRotate === 270) {
          canvas.width = h;
          canvas.height = w;
        } else {
          canvas.width = w;
          canvas.height = h;
        }

        ctx.save();
        if (imageRotate !== 0) {
          ctx.translate(canvas.width / 2, canvas.height / 2);
          ctx.rotate((imageRotate * Math.PI) / 180);
          ctx.drawImage(img, -w / 2, -h / 2, w, h);
        } else {
          ctx.drawImage(img, 0, 0, w, h);
        }
        ctx.restore();

        // Filters
        if (imageFilter === 'grayscale') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
            data[i] = avg;
            data[i + 1] = avg;
            data[i + 2] = avg;
          }
          ctx.putImageData(imgData, 0, 0);
        } else if (imageFilter === 'invert') {
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imgData.data;
          for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];
            data[i + 1] = 255 - data[i + 1];
            data[i + 2] = 255 - data[i + 2];
          }
          ctx.putImageData(imgData, 0, 0);
        }

        // Watermark Overlay
        if (watermarkText.trim()) {
          ctx.font = `bold ${Math.max(16, Math.floor(canvas.height / 20))}px monospace`;
          ctx.fillStyle = 'rgba(0, 255, 102, 0.85)';
          ctx.strokeStyle = '#000000';
          ctx.lineWidth = 3;
          ctx.strokeText(watermarkText, 20, canvas.height - 25);
          ctx.fillText(watermarkText, 20, canvas.height - 25);
        }

        let mimeType = 'image/jpeg';
        if (preset.toExt === 'png' || preset.toExt === 'ico') mimeType = 'image/png';
        if (preset.toExt === 'webp') mimeType = 'image/webp';

        const dataUrl = canvas.toDataURL(mimeType, imageQuality / 100);
        const res = await fetch(dataUrl);
        const blob = await res.blob();

        const baseName = uploadedFile.file.name.replace(/\.[^/.]+$/, "");
        targetFilename = `${baseName}_converted.${preset.toExt}`;

        setOutputResult({
          dataUrl,
          blob,
          filename: targetFilename,
          fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
          detailsStr: `${canvas.width} x ${canvas.height} px | ${mimeType}`
        });
      }

      // 2. DOCUMENT & DATA CONVERSIONS
      else if (preset.category === 'DOCUMENT') {
        const rawText = inputText || (uploadedFile ? await uploadedFile.file.text() : '');
        if (!rawText.trim()) {
          throw new Error('Please enter text content or upload a document file.');
        }

        if (preset.id === 'doc-csv-json') {
          const lines = rawText.trim().split(/\r?\n/);
          if (lines.length < 1) throw new Error('Invalid CSV input.');
          const headers = lines[0].split(csvDelimiter).map(h => h.trim().replace(/^"|"$/g, ''));
          const result = lines.slice(1).map(line => {
            const vals = line.split(csvDelimiter).map(v => v.trim().replace(/^"|"$/g, ''));
            const obj: Record<string, string> = {};
            headers.forEach((h, idx) => {
              obj[h || `col_${idx}`] = vals[idx] || '';
            });
            return obj;
          });
          const jsonStr = JSON.stringify(result, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });

          setOutputResult({
            text: jsonStr,
            blob,
            filename: `converted_${Date.now()}.json`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: `${result.length} Records converted`
          });
        }
        else if (preset.id === 'doc-json-csv') {
          const parsed = JSON.parse(rawText);
          const arr = Array.isArray(parsed) ? parsed : [parsed];
          if (arr.length === 0) throw new Error('JSON array is empty.');

          const keys = Array.from(new Set(arr.flatMap(item => Object.keys(item))));
          const headerLine = keys.map(k => `"${k}"`).join(csvDelimiter);
          const rowLines = arr.map(item => 
            keys.map(k => `"${String(item[k] ?? '').replace(/"/g, '""')}"`).join(csvDelimiter)
          );
          const csvStr = [headerLine, ...rowLines].join('\n');
          const blob = new Blob([csvStr], { type: 'text/csv' });

          setOutputResult({
            text: csvStr,
            blob,
            filename: `converted_${Date.now()}.csv`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: `${arr.length} Rows generated`
          });
        }
        else if (preset.id === 'doc-json-xml') {
          const parsed = JSON.parse(rawText);
          const buildXmlNode = (obj: any, nodeName: string): string => {
            if (typeof obj !== 'object' || obj === null) {
              return `<${nodeName}>${String(obj).replace(/&/g, '&amp;').replace(/</g, '&lt;')}</${nodeName}>`;
            }
            if (Array.isArray(obj)) {
              return obj.map(item => buildXmlNode(item, nodeName)).join('\n');
            }
            const children = Object.keys(obj)
              .map(k => buildXmlNode(obj[k], k))
              .join('\n');
            return `<${nodeName}>\n${children}\n</${nodeName}>`;
          };

          const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n` + buildXmlNode(parsed, 'root');
          const blob = new Blob([xmlContent], { type: 'text/xml' });

          setOutputResult({
            text: xmlContent,
            blob,
            filename: `converted_${Date.now()}.xml`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'XML DOM Document generated'
          });
        }
        else if (preset.id === 'doc-xml-json') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(rawText, 'text/xml');
          const xmlToJsonNode = (node: Element): any => {
            const obj: Record<string, any> = {};
            if (node.children.length === 0) {
              return node.textContent || '';
            }
            Array.from(node.children).forEach(child => {
              const name = child.tagName;
              const val = xmlToJsonNode(child);
              if (obj[name]) {
                if (!Array.isArray(obj[name])) obj[name] = [obj[name]];
                obj[name].push(val);
              } else {
                obj[name] = val;
              }
            });
            return obj;
          };
          const jsonObj = xmlToJsonNode(xmlDoc.documentElement);
          const jsonStr = JSON.stringify(jsonObj, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });

          setOutputResult({
            text: jsonStr,
            blob,
            filename: `converted_${Date.now()}.json`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'XML parsed to JSON'
          });
        }
        else if (preset.id === 'doc-md-html') {
          let html = rawText
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*(.*)\*/gim, '<em>$1</em>')
            .replace(/`(.*)`/gim, '<code>$1</code>')
            .replace(/\n\n/g, '<br/><br/>');
          html = `<div style="font-family: sans-serif; padding: 20px;">\n${html}\n</div>`;
          const blob = new Blob([html], { type: 'text/html' });

          setOutputResult({
            text: html,
            blob,
            filename: `converted_${Date.now()}.html`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'HTML markup generated'
          });
        }
        else if (preset.id === 'doc-txt-pdf') {
          const doc = new jsPDF();
          doc.setFont('courier', 'normal');
          doc.setFontSize(10);
          
          const lines = doc.splitTextToSize(rawText, 180);
          let y = 15;
          lines.forEach((line: string) => {
            if (y > 280) {
              doc.addPage();
              y = 15;
            }
            doc.text(line, 15, y);
            y += 6;
          });

          const pdfBlob = doc.output('blob');
          const pdfDataUrl = doc.output('datauristring');

          setOutputResult({
            dataUrl: pdfDataUrl,
            blob: pdfBlob,
            filename: `converted_${Date.now()}.pdf`,
            fileSizeStr: `${(pdfBlob.size / 1024).toFixed(1)} KB`,
            detailsStr: `PDF Document (${lines.length} lines)`
          });
        }
      }

      // 3. GIS CONVERSIONS
      else if (preset.category === 'GIS') {
        const rawText = inputText || (uploadedFile ? await uploadedFile.file.text() : '');
        if (!rawText.trim()) throw new Error('Please input GeoJSON, KML or CSV spatial data.');

        if (preset.id === 'gis-geojson-kml') {
          const geojson = JSON.parse(rawText);
          const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
          
          let placemarks = features.map((f: any, i: number) => {
            const name = f.properties?.name || f.properties?.title || `Feature #${i + 1}`;
            const desc = f.properties?.description || JSON.stringify(f.properties || {});
            const coords = f.geometry?.coordinates;
            if (f.geometry?.type === 'Point') {
              return `  <Placemark>\n    <name>${name}</name>\n    <description><![CDATA[${desc}]]></description>\n    <Point><coordinates>${coords[0]},${coords[1]}</coordinates></Point>\n  </Placemark>`;
            }
            return '';
          }).join('\n');

          const kmlStr = `<?xml version="1.0" encoding="UTF-8"?>\n<kml xmlns="http://www.opengis.net/kml/2.2">\n<Document>\n${placemarks}\n</Document>\n</kml>`;
          const blob = new Blob([kmlStr], { type: 'application/vnd.google-earth.kml+xml' });

          setOutputResult({
            text: kmlStr,
            blob,
            filename: `spatial_${Date.now()}.kml`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'KML Document created'
          });
        }
        else if (preset.id === 'gis-kml-geojson') {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(rawText, 'text/xml');
          const placemarks = xmlDoc.getElementsByTagName('Placemark');
          
          const features: any[] = [];
          Array.from(placemarks).forEach((p, idx) => {
            const name = p.getElementsByTagName('name')[0]?.textContent || `Point ${idx + 1}`;
            const coordStr = p.getElementsByTagName('coordinates')[0]?.textContent?.trim();
            if (coordStr) {
              const parts = coordStr.split(',').map(Number);
              features.push({
                type: 'Feature',
                properties: { name },
                geometry: {
                  type: 'Point',
                  coordinates: [parts[0], parts[1]]
                }
              });
            }
          });

          const geojson = { type: 'FeatureCollection', features };
          const jsonStr = JSON.stringify(geojson, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/geo+json' });

          setOutputResult({
            text: jsonStr,
            blob,
            filename: `spatial_${Date.now()}.geojson`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: `GeoJSON FeatureCollection (${features.length} points)`
          });
        }
        else if (preset.id === 'gis-csv-geojson') {
          const lines = rawText.trim().split(/\r?\n/);
          if (lines.length < 2) throw new Error('CSV must have header and data rows.');
          const headers = lines[0].split(csvDelimiter).map(h => h.trim().toLowerCase());
          
          const latIdx = headers.findIndex(h => h.includes('lat'));
          const lngIdx = headers.findIndex(h => h.includes('lng') || h.includes('lon'));

          if (latIdx === -1 || lngIdx === -1) {
            throw new Error('CSV missing "lat" or "lng" columns.');
          }

          const features = lines.slice(1).map((line, idx) => {
            const cols = line.split(csvDelimiter).map(c => c.trim().replace(/^"|"$/g, ''));
            const lat = parseFloat(cols[latIdx]);
            const lng = parseFloat(cols[lngIdx]);
            if (isNaN(lat) || isNaN(lng)) return null;

            const props: Record<string, string> = {};
            headers.forEach((h, i) => props[h] = cols[i]);

            return {
              type: 'Feature',
              properties: props,
              geometry: { type: 'Point', coordinates: [lng, lat] }
            };
          }).filter(Boolean);

          const geojson = { type: 'FeatureCollection', features };
          const jsonStr = JSON.stringify(geojson, null, 2);
          const blob = new Blob([jsonStr], { type: 'application/json' });

          setOutputResult({
            text: jsonStr,
            blob,
            filename: `converted_spatial_${Date.now()}.geojson`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: `${features.length} Points converted`
          });
        }
        else if (preset.id === 'gis-geojson-wkt') {
          const geojson = JSON.parse(rawText);
          const features = geojson.type === 'FeatureCollection' ? geojson.features : [geojson];
          const wkts = features.map((f: any) => {
            if (f.geometry?.type === 'Point') {
              return `POINT(${f.geometry.coordinates[0]} ${f.geometry.coordinates[1]})`;
            }
            return '';
          }).filter(Boolean).join('\n');

          const blob = new Blob([wkts], { type: 'text/plain' });

          setOutputResult({
            text: wkts,
            blob,
            filename: `converted_wkt_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'Well-Known Text (WKT) generated'
          });
        }
      }

      // 4. ENCODING & HASH
      else if (preset.category === 'ENCODING') {
        const rawText = inputText || (uploadedFile ? await uploadedFile.file.text() : '');

        if (preset.id === 'enc-file-base64') {
          let b64 = '';
          if (uploadedFile) {
            b64 = uploadedFile.dataUrl;
          } else {
            b64 = `data:text/plain;base64,${btoa(unescape(encodeURIComponent(rawText)))}`;
          }
          const blob = new Blob([b64], { type: 'text/plain' });

          setOutputResult({
            text: b64,
            blob,
            filename: `base64_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'Base64 String Encoded'
          });
        }
        else if (preset.id === 'enc-base64-file') {
          const cleanB64 = rawText.replace(/^data:.*?;base64,/, '').trim();
          const decodedStr = decodeURIComponent(escape(atob(cleanB64)));
          const blob = new Blob([decodedStr], { type: 'text/plain' });

          setOutputResult({
            text: decodedStr,
            blob,
            filename: `decoded_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'Base64 Decoded to UTF-8 Text'
          });
        }
        else if (preset.id === 'enc-text-hex') {
          const hex = Array.from(String(rawText)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ');
          const blob = new Blob([hex], { type: 'text/plain' });

          setOutputResult({
            text: hex,
            blob,
            filename: `hex_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'Hexadecimal Sequence'
          });
        }
        else if (preset.id === 'enc-url-encode') {
          const encoded = encodeURIComponent(rawText);
          const blob = new Blob([encoded], { type: 'text/plain' });

          setOutputResult({
            text: encoded,
            blob,
            filename: `url_encoded_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: 'Percent URL Encoded'
          });
        }
        else if (preset.id === 'enc-hash-gen') {
          const encoder = new TextEncoder();
          const data = encoder.encode(rawText);
          const hashBuffer = await crypto.subtle.digest(hashAlgorithm, data);
          const hashArray = Array.from(new Uint8Array(hashBuffer));
          const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

          const blob = new Blob([hashHex], { type: 'text/plain' });

          setOutputResult({
            text: hashHex,
            blob,
            filename: `${hashAlgorithm.toLowerCase()}_${Date.now()}.txt`,
            fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
            detailsStr: `${hashAlgorithm} Checksum Algorithm`
          });
        }
      }

      // 5. AUDIO SYNTH
      else if (preset.category === 'AUDIO') {
        const sampleRate = 44100;
        const numSamples = Math.floor(sampleRate * toneDuration);
        const buffer = new Float32Array(numSamples);
        
        for (let i = 0; i < numSamples; i++) {
          const t = i / sampleRate;
          buffer[i] = Math.sin(2 * Math.PI * toneFreq * t);
        }

        // Convert float32 buffer to 16-bit PCM WAV container
        const wavBuffer = new ArrayBuffer(44 + numSamples * 2);
        const view = new DataView(wavBuffer);

        const writeString = (offset: number, str: string) => {
          for (let i = 0; i < str.length; i++) {
            view.setUint8(offset + i, str.charCodeAt(i));
          }
        };

        writeString(0, 'RIFF');
        view.setUint32(4, 36 + numSamples * 2, true);
        writeString(8, 'WAVE');
        writeString(12, 'fmt ');
        view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
        view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
        view.setUint16(22, 1, true); // NumChannels (1 mono)
        view.setUint32(24, sampleRate, true);
        view.setUint32(28, sampleRate * 2, true);
        view.setUint16(32, 2, true);
        view.setUint16(34, 16, true);
        writeString(36, 'data');
        view.setUint32(40, numSamples * 2, true);

        let offset = 44;
        for (let i = 0; i < numSamples; i++) {
          const s = Math.max(-1, Math.min(1, buffer[i]));
          view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
          offset += 2;
        }

        const blob = new Blob([wavBuffer], { type: 'audio/wav' });
        const dataUrl = URL.createObjectURL(blob);

        setOutputResult({
          dataUrl,
          blob,
          filename: `synth_tone_${toneFreq}Hz_${Date.now()}.wav`,
          fileSizeStr: `${(blob.size / 1024).toFixed(1)} KB`,
          detailsStr: `${toneFreq} Hz Sine Tone | ${toneDuration}s WAV Audio`
        });
      }

    } catch (err: any) {
      console.error('Conversion Error:', err);
      setErrorMessage(err.message || 'An error occurred during conversion.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadOutput = () => {
    if (!outputResult || !outputResult.blob) return;
    saveAs(outputResult.blob, outputResult.filename);
  };

  const handleCopyText = () => {
    if (outputResult?.text) {
      navigator.clipboard.writeText(outputResult.text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const filteredPresets = PRESETS.filter(p => activeCategory === 'ALL' || p.category === activeCategory);

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8 space-y-6">
      {/* Brutalist Header Banner */}
      <div className="border border-brand-border p-6 bg-brand-surface relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.25em] text-brand-accent bg-black px-2.5 py-1 border border-brand-border">
                CLOUDCONVERT & ONLINE-CONVERT ENGINE
              </span>
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-brand-accent" /> 100% CLIENT-SIDE & ZERO UPLOADS
              </span>
            </div>
            
            <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wider text-white flex items-center gap-3">
              <ArrowRightLeft className="w-7 h-7 text-brand-accent" />
              UNIVERSAL FORMAT CONVERTER
            </h1>
            <p className="text-zinc-400 text-xs uppercase tracking-[0.2em] mt-2 max-w-2xl leading-relaxed font-mono">
              Any-to-Any client-side conversion suite: Images, Documents, GIS Coordinates, Base64/Hex Encodings & Audio WAV Synthesizer.
            </p>
          </div>
        </div>
      </div>

      {/* Category Selection Sub-Bar */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-2 border-b border-brand-border">
        {(['ALL', 'IMAGE', 'DOCUMENT', 'GIS', 'ENCODING', 'AUDIO'] as const).map((cat) => (
          <button
            key={cat}
            onClick={() => {
              setActiveCategory(cat);
              const first = PRESETS.find(p => cat === 'ALL' || p.category === cat);
              if (first) setSelectedPresetId(first.id);
            }}
            className={`px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider border transition-colors cursor-pointer flex items-center gap-2 ${
              activeCategory === cat
                ? 'bg-brand-accent text-black border-brand-accent'
                : 'bg-black text-zinc-400 border-brand-border hover:text-white hover:border-zinc-500'
            }`}
          >
            {cat === 'IMAGE' && <ImageIcon className="w-3.5 h-3.5" />}
            {cat === 'DOCUMENT' && <FileSpreadsheet className="w-3.5 h-3.5" />}
            {cat === 'GIS' && <MapPin className="w-3.5 h-3.5" />}
            {cat === 'ENCODING' && <Binary className="w-3.5 h-3.5" />}
            {cat === 'AUDIO' && <Music className="w-3.5 h-3.5" />}
            <span>{cat === 'ALL' ? 'ALL PRESETS' : cat}</span>
          </button>
        ))}
      </div>

      {/* Main Converter Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Preset Selector & Controls (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          
          {/* Preset Picker */}
          <div className="bg-brand-surface border border-brand-border p-5 space-y-4">
            <label className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400 block">
              1. SELECT CONVERSION TASK
            </label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full bg-black text-white border border-brand-border text-xs font-mono p-3 uppercase tracking-wider outline-none focus:border-brand-accent cursor-pointer"
            >
              {filteredPresets.map(p => (
                <option key={p.id} value={p.id}>
                  [{p.category}] {p.name}
                </option>
              ))}
            </select>
            <p className="text-[11px] font-mono text-brand-accent bg-black p-2.5 border border-brand-border/60">
              {currentPreset.description}
            </p>
          </div>

          {/* Preset Specific Controls */}
          <div className="bg-brand-surface border border-brand-border p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-brand-border pb-2">
              <Sliders className="w-4 h-4 text-brand-accent" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-white">
                2. ADJUST PARAMETERS
              </span>
            </div>

            {/* Image Controls */}
            {currentPreset.category === 'IMAGE' && (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>QUALITY</span>
                    <span className="text-brand-accent">{imageQuality}%</span>
                  </div>
                  <input
                    type="range"
                    min="10"
                    max="100"
                    value={imageQuality}
                    onChange={(e) => setImageQuality(Number(e.target.value))}
                    className="w-full accent-brand-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>SCALE / RESIZE</span>
                    <span className="text-brand-accent">{imageScale}%</span>
                  </div>
                  <input
                    type="range"
                    min="25"
                    max="200"
                    step="5"
                    value={imageScale}
                    onChange={(e) => setImageScale(Number(e.target.value))}
                    className="w-full accent-brand-accent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-zinc-400 block mb-1">COLOR FILTER</span>
                    <select
                      value={imageFilter}
                      onChange={(e) => setImageFilter(e.target.value as any)}
                      className="w-full bg-black text-white border border-brand-border p-2 text-xs"
                    >
                      <option value="none">Normal</option>
                      <option value="grayscale">Grayscale</option>
                      <option value="invert">Invert Colors</option>
                    </select>
                  </div>

                  <div>
                    <span className="text-zinc-400 block mb-1">ROTATE</span>
                    <select
                      value={imageRotate}
                      onChange={(e) => setImageRotate(Number(e.target.value))}
                      className="w-full bg-black text-white border border-brand-border p-2 text-xs"
                    >
                      <option value={0}>0°</option>
                      <option value={90}>90°</option>
                      <option value={180}>180°</option>
                      <option value={270}>270°</option>
                    </select>
                  </div>
                </div>

                <div>
                  <span className="text-zinc-400 block mb-1">WATERMARK TEXT</span>
                  <input
                    type="text"
                    value={watermarkText}
                    onChange={(e) => setWatermarkText(e.target.value)}
                    placeholder="CONFIDENTIAL / STAMP..."
                    className="w-full bg-black text-white border border-brand-border p-2 text-xs"
                  />
                </div>
              </div>
            )}

            {/* Document / CSV Controls */}
            {currentPreset.category === 'DOCUMENT' && (currentPreset.fromExt === 'csv' || currentPreset.toExt === 'csv' || currentPreset.id === 'gis-csv-geojson') && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-zinc-400 block mb-1">CSV DELIMITER</span>
                  <select
                    value={csvDelimiter}
                    onChange={(e) => setCsvDelimiter(e.target.value)}
                    className="w-full bg-black text-white border border-brand-border p-2 text-xs"
                  >
                    <option value=",">Comma (,)</option>
                    <option value=";">Semicolon (;)</option>
                    <option value="\t">Tab (\t)</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Hash Controls */}
            {currentPreset.id === 'enc-hash-gen' && (
              <div className="space-y-3 font-mono text-xs">
                <div>
                  <span className="text-zinc-400 block mb-1">HASH ALGORITHM</span>
                  <select
                    value={hashAlgorithm}
                    onChange={(e) => setHashAlgorithm(e.target.value as any)}
                    className="w-full bg-black text-white border border-brand-border p-2 text-xs"
                  >
                    <option value="SHA-256">SHA-256</option>
                    <option value="SHA-512">SHA-512</option>
                    <option value="SHA-1">SHA-1</option>
                  </select>
                </div>
              </div>
            )}

            {/* Audio Synth Controls */}
            {currentPreset.category === 'AUDIO' && (
              <div className="space-y-4 font-mono text-xs">
                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>FREQUENCY</span>
                    <span className="text-brand-accent">{toneFreq} Hz</span>
                  </div>
                  <input
                    type="range"
                    min="100"
                    max="2000"
                    step="10"
                    value={toneFreq}
                    onChange={(e) => setToneFreq(Number(e.target.value))}
                    className="w-full accent-brand-accent"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-zinc-400 mb-1">
                    <span>DURATION</span>
                    <span className="text-brand-accent">{toneDuration} sec</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={toneDuration}
                    onChange={(e) => setToneDuration(Number(e.target.value))}
                    className="w-full accent-brand-accent"
                  />
                </div>
              </div>
            )}

            {/* Convert Trigger Button */}
            <button
              onClick={handleConvert}
              disabled={isProcessing}
              className="w-full bg-brand-accent text-black font-black uppercase text-sm tracking-widest py-3 border border-brand-accent hover:bg-white transition-colors cursor-pointer flex items-center justify-center gap-2"
            >
              {isProcessing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>CONVERTING...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>EXECUTE CONVERSION</span>
                </>
              )}
            </button>
          </div>

        </div>

        {/* Right Column: Input & Output Workspaces (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Input Panel */}
          <div className="bg-brand-surface border border-brand-border p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-zinc-400">
                INPUT FILE OR RAW TEXT
              </span>
              {uploadedFile && (
                <button
                  onClick={() => {
                    setUploadedFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="text-[10px] font-mono text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" /> REMOVE FILE
                </button>
              )}
            </div>

            {/* File Upload Dropzone */}
            {currentPreset.category === 'IMAGE' || currentPreset.id === 'enc-file-base64' ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-brand-border hover:border-brand-accent bg-black p-6 text-center cursor-pointer transition-colors"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Upload className="w-8 h-8 text-brand-accent mx-auto mb-2" />
                <p className="text-xs font-mono uppercase text-white font-bold">
                  {uploadedFile ? uploadedFile.file.name : 'CLICK TO UPLOAD INPUT FILE'}
                </p>
                <p className="text-[10px] font-mono text-zinc-500 mt-1">
                  {uploadedFile ? `${(uploadedFile.file.size / 1024).toFixed(1)} KB` : '100% Client-side file processing'}
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono">
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder="Paste raw text, CSV, JSON, GeoJSON, KML, Markdown or Base64 here..."
                  rows={6}
                  className="w-full bg-black text-white border border-brand-border p-3 text-xs focus:outline-none focus:border-brand-accent placeholder:text-zinc-600 font-mono"
                />
                <div className="flex justify-between items-center text-[10px] text-zinc-500">
                  <span>CHARACTERS: {inputText.length}</span>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="text-brand-accent hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <Upload className="w-3 h-3" /> OR LOAD FILE
                  </button>
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="bg-red-950/80 border border-red-500 text-red-200 p-4 font-mono text-xs">
              <strong className="block text-red-400 mb-1">CONVERSION FAILED:</strong>
              {errorMessage}
            </div>
          )}

          {/* Output Panel */}
          {outputResult && (
            <div className="bg-brand-surface border border-brand-accent p-5 space-y-4 animate-in fade-in duration-300">
              <div className="flex items-center justify-between border-b border-brand-border pb-3">
                <div>
                  <span className="text-[10px] font-mono font-bold uppercase tracking-[0.2em] text-brand-accent block">
                    CONVERSION RESULT READY
                  </span>
                  <h3 className="text-sm font-black font-mono uppercase text-white mt-0.5">
                    {outputResult.filename}
                  </h3>
                </div>
                <div className="text-right font-mono text-[10px] text-zinc-400">
                  <div>{outputResult.fileSizeStr}</div>
                  <div className="text-brand-accent">{outputResult.detailsStr}</div>
                </div>
              </div>

              {/* Preview Box */}
              {outputResult.dataUrl && currentPreset.category === 'IMAGE' && (
                <div className="bg-black border border-brand-border p-3 text-center">
                  <img
                    src={outputResult.dataUrl}
                    alt="Converted Result"
                    className="max-h-[220px] mx-auto object-contain border border-brand-border/40"
                  />
                </div>
              )}

              {outputResult.dataUrl && currentPreset.category === 'AUDIO' && (
                <div className="bg-black border border-brand-border p-4 text-center space-y-3">
                  <audio controls src={outputResult.dataUrl} className="w-full accent-brand-accent" />
                </div>
              )}

              {outputResult.text && (
                <div className="relative">
                  <textarea
                    readOnly
                    value={outputResult.text}
                    rows={8}
                    className="w-full bg-black text-brand-accent border border-brand-border p-3 text-xs font-mono focus:outline-none"
                  />
                  <button
                    onClick={handleCopyText}
                    className="absolute right-3 top-3 bg-zinc-800 hover:bg-zinc-700 text-white px-2.5 py-1 text-[10px] font-mono uppercase flex items-center gap-1 border border-zinc-600 cursor-pointer"
                  >
                    {copied ? <Check className="w-3 h-3 text-brand-accent" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'COPIED' : 'COPY'}</span>
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  onClick={handleDownloadOutput}
                  className="bg-white hover:bg-zinc-200 text-black px-5 py-2.5 text-xs font-mono font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>DOWNLOAD FILE ({outputResult.filename.split('.').pop()?.toUpperCase()})</span>
                </button>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
