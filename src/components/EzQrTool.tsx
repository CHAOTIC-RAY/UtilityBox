import React, { useState, useEffect, useRef, useId } from 'react';
import QRCode from 'qrcode';
import { 
  QrCode, User, Phone, Mail, Globe, MapPin, Building, Briefcase, 
  Sparkles, Download, Copy, Check, RefreshCw, Layers, Wifi, 
  Share2, Shield, Eye, Palette, Sliders, Image as ImageIcon, FileText,
  Bookmark, Trash2, Plus, Info, ExternalLink, Smartphone, MessageSquare
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface VCardContact {
  prefix: string;
  firstName: string;
  lastName: string;
  suffix: string;
  nickname: string;
  organization: string;
  department: string;
  jobTitle: string;
  mobilePhone: string;
  workPhone: string;
  homePhone: string;
  workEmail: string;
  personalEmail: string;
  website: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  linkedin: string;
  twitter: string;
  github: string;
  instagram: string;
  notes: string;
  birthday: string;
  version: '3.0' | '4.0';
}

export interface WifiConfig {
  ssid: string;
  password: string;
  encryption: 'WPA' | 'WEP' | 'nopass';
  hidden: boolean;
}

export interface GeoConfig {
  lat: string;
  lng: string;
  title: string;
}

export interface QRStyleConfig {
  fgColor: string;
  bgColor: string;
  eyeColor: string;
  moduleStyle: 'square' | 'dots' | 'rounded' | 'classy';
  eyeOuterStyle: 'square' | 'circle' | 'rounded';
  eyeInnerStyle: 'square' | 'circle' | 'diamond';
  errorCorrectionLevel: 'L' | 'M' | 'Q' | 'H';
  margin: number;
  enableLogo?: boolean;
  presetLogo: 'none' | 'user' | 'phone' | 'globe' | 'wifi' | 'location' | 'building' | 'star' | 'custom';
  customLogoUrl: string;
  logoScale: number; // 0.1 to 0.28
  logoBgShape: 'circle' | 'square' | 'none';
  enableFrame?: boolean;
  frameLabel: string;
  framePosition: 'none' | 'bottom' | 'top' | 'badge';
  frameColor: string;
}

export interface SavedStylePreset {
  id: string;
  name: string;
  style: QRStyleConfig;
}

export const BLANK_VCARD: VCardContact = {
  prefix: '',
  firstName: '',
  lastName: '',
  suffix: '',
  nickname: '',
  organization: '',
  department: '',
  jobTitle: '',
  mobilePhone: '',
  workPhone: '',
  homePhone: '',
  workEmail: '',
  personalEmail: '',
  website: '',
  street: '',
  city: '',
  state: '',
  zip: '',
  country: '',
  linkedin: '',
  twitter: '',
  github: '',
  instagram: '',
  notes: '',
  birthday: '',
  version: '3.0'
};


const DEFAULT_VCARD: VCardContact = {
  prefix: 'Dr.',
  firstName: 'Alex',
  lastName: 'Mercer',
  suffix: 'Ph.D.',
  nickname: 'Gex',
  organization: 'Apex Geospatial Labs',
  department: 'GIS & Cartography',
  jobTitle: 'Lead Spatial Systems Architect',
  mobilePhone: '+1 (555) 839-2041',
  workPhone: '+1 (555) 019-2834',
  homePhone: '',
  workEmail: 'a.mercer@apexgeo.io',
  personalEmail: 'alex.mercer@gmail.com',
  website: 'https://apexgeo.io/mercer',
  street: '742 Cybernetics Blvd, Suite 400',
  city: 'New Haven',
  state: 'CT',
  zip: '06511',
  country: 'USA',
  linkedin: 'https://linkedin.com/in/alexmercer-geo',
  twitter: 'https://x.com/alexmercer_gis',
  github: 'https://github.com/alexmercer-geo',
  instagram: '',
  notes: 'Field Lead for Malé Atoll Satellite Mapping Project. Available for spatial intelligence consulting.',
  birthday: '1988-06-14',
  version: '3.0'
};

const DEFAULT_STYLE: QRStyleConfig = {
  fgColor: '#00FF66',
  bgColor: '#0A0A0C',
  eyeColor: '#00FF66',
  moduleStyle: 'classy',
  eyeOuterStyle: 'square',
  eyeInnerStyle: 'square',
  errorCorrectionLevel: 'H',
  margin: 2,
  enableLogo: true,
  presetLogo: 'user',
  customLogoUrl: '',
  logoScale: 0.22,
  logoBgShape: 'square',
  enableFrame: true,
  frameLabel: 'SCAN FOR CONTACT',
  framePosition: 'bottom',
  frameColor: '#00FF66'
};

const COLOR_PRESETS = [
  { name: 'Neon Cyber', fg: '#00FF66', bg: '#0A0A0C', eye: '#00FF66', frame: '#00FF66' },
  { name: 'Industrial Purple', fg: '#B700FF', bg: '#050508', eye: '#B700FF', frame: '#B700FF' },
  { name: 'Warning Gold', fg: '#FFE600', bg: '#000000', eye: '#FFE600', frame: '#FFE600' },
  { name: 'Cyan Matrix', fg: '#00F0FF', bg: '#0A0E17', eye: '#00F0FF', frame: '#00F0FF' },
  { name: 'Monochrome High-Vis', fg: '#FFFFFF', bg: '#000000', eye: '#FFFFFF', frame: '#FFFFFF' },
  { name: 'Inverted Dark', fg: '#000000', bg: '#FFFFFF', eye: '#000000', frame: '#000000' },
  { name: 'Emerald Ops', fg: '#10B981', bg: '#064E3B', eye: '#34D399', frame: '#10B981' }
];

export const EzQrTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'vcard' | 'url' | 'wifi' | 'geo' | 'text'>('vcard');
  
  // Local temporary save: Load latest entered contact from localStorage
  const [vcard, setVcard] = useState<VCardContact>(() => {
    try {
      const saved = localStorage.getItem('gextag_ezqr_latest_contact');
      if (saved) {
        return { ...BLANK_VCARD, ...JSON.parse(saved) };
      }
    } catch (err) {
      console.warn('Failed to load saved contact from localStorage', err);
    }
    return DEFAULT_VCARD;
  });

  const [url, setUrl] = useState<string>('https://apexgeo.io/mercer');
  const [wifi, setWifi] = useState<WifiConfig>({ ssid: 'APEX_SURVEY_5G', password: 'spatial_tag_2026', encryption: 'WPA', hidden: false });
  const [geo, setGeo] = useState<GeoConfig>({ lat: '4.1755', lng: '73.5093', title: 'Hulhumalé Field Base' });
  const [plainText, setPlainText] = useState<string>('Gextag Spatial Toolbox - Contact alex.mercer@apexgeo.io');

  const [style, setStyle] = useState<QRStyleConfig>(() => {
    try {
      const saved = localStorage.getItem('gextag_ezqr_latest_style');
      if (saved) {
        return { ...DEFAULT_STYLE, ...JSON.parse(saved) };
      }
    } catch {}
    return DEFAULT_STYLE;
  });

  const [activeInspector, setActiveInspector] = useState<'preview' | 'vcf' | 'presets'>('preview');

  // Automatically persist latest contact data to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('gextag_ezqr_latest_contact', JSON.stringify(vcard));
    } catch (err) {
      console.warn('Failed to auto-save vcard contact', err);
    }
  }, [vcard]);

  // Automatically persist latest style to localStorage whenever updated
  useEffect(() => {
    try {
      localStorage.setItem('gextag_ezqr_latest_style', JSON.stringify(style));
    } catch (err) {
      console.warn('Failed to auto-save qr style', err);
    }
  }, [style]);

  const [copied, setCopied] = useState<string | null>(null);
  const [svgString, setSvgString] = useState<string>('');
  const [qrMatrixData, setQrMatrixData] = useState<{ size: number; matrix: boolean[][] } | null>(null);

  const customLogoInputRef = useRef<HTMLInputElement | null>(null);

  const [savedPresets, setSavedPresets] = useState<Array<{ id: string; name: string; vcard: VCardContact }>>(() => {
    try {
      const saved = localStorage.getItem('gextag_vcard_presets');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Alex Mercer (Lead Architect)', vcard: DEFAULT_VCARD }
      ];
    } catch {
      return [{ id: '1', name: 'Alex Mercer (Lead Architect)', vcard: DEFAULT_VCARD }];
    }
  });

  const savePresetToStorage = (updated: Array<{ id: string; name: string; vcard: VCardContact }>) => {
    setSavedPresets(updated);
    try {
      localStorage.setItem('gextag_vcard_presets', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save vcard presets', err);
    }
  };

  const [savedStylePresets, setSavedStylePresets] = useState<SavedStylePreset[]>(() => {
    try {
      const saved = localStorage.getItem('gextag_qr_style_presets');
      return saved ? JSON.parse(saved) : [
        { id: '1', name: 'Gextag Neon Cyber', style: DEFAULT_STYLE },
        { id: '2', name: 'Apex Industrial Gold', style: { ...DEFAULT_STYLE, fgColor: '#FFE600', bgColor: '#000000', eyeColor: '#FFE600', frameColor: '#FFE600', frameLabel: 'APEX GEOSPATIAL' } }
      ];
    } catch {
      return [{ id: '1', name: 'Gextag Neon Cyber', style: DEFAULT_STYLE }];
    }
  });

  const saveStylePresetToStorage = (updated: SavedStylePreset[]) => {
    setSavedStylePresets(updated);
    try {
      localStorage.setItem('gextag_qr_style_presets', JSON.stringify(updated));
    } catch (err) {
      console.error('Failed to save style presets', err);
    }
  };

  const handleSaveStylePreset = () => {
    const defaultName = style.frameLabel.trim() || `Brand Style ${savedStylePresets.length + 1}`;
    const namePrompt = window.prompt('ENTER PRESET NAME FOR THIS QR BRAND STYLE:', defaultName);
    if (!namePrompt || !namePrompt.trim()) return;

    const newPreset: SavedStylePreset = {
      id: Math.random().toString(36).substring(2, 9),
      name: namePrompt.trim(),
      style: JSON.parse(JSON.stringify(style)) // Deep copy style config including custom logo Data URLs
    };

    const updated = [...savedStylePresets, newPreset];
    saveStylePresetToStorage(updated);
  };

  const handleDeleteStylePreset = (id: string) => {
    if (window.confirm('Delete this saved style preset?')) {
      const updated = savedStylePresets.filter(p => p.id !== id);
      saveStylePresetToStorage(updated);
    }
  };


  // Generate Raw vCard string (Strictly omitting any empty fields)
  const generateVCardString = (c: VCardContact): string => {
    const lines: string[] = [];
    lines.push('BEGIN:VCARD');
    lines.push(`VERSION:${c.version || '3.0'}`);
    
    // Clean trimmed values
    const first = c.firstName?.trim() || '';
    const last = c.lastName?.trim() || '';
    const prefix = c.prefix?.trim() || '';
    const suffix = c.suffix?.trim() || '';
    
    // N: Family Name; Given Name; Additional Names; Honorific Prefixes; Honorific Suffixes
    // Only include if at least one name component is filled
    if (last || first || prefix || suffix) {
      lines.push(`N:${last};${first};;${prefix};${suffix}`);
    }
    
    const fullName = [prefix, first, last, suffix].filter(Boolean).join(' ');
    if (fullName) {
      lines.push(`FN:${fullName}`);
    } else if (c.organization?.trim()) {
      lines.push(`FN:${c.organization.trim()}`);
    }
    
    if (c.nickname?.trim()) lines.push(`NICKNAME:${c.nickname.trim()}`);

    const org = c.organization?.trim();
    const dept = c.department?.trim();
    if (org && dept) {
      lines.push(`ORG:${org};${dept}`);
    } else if (org) {
      lines.push(`ORG:${org}`);
    } else if (dept) {
      lines.push(`ORG:${dept}`);
    }

    if (c.jobTitle?.trim()) lines.push(`TITLE:${c.jobTitle.trim()}`);

    const mob = c.mobilePhone?.trim();
    const work = c.workPhone?.trim();
    const home = c.homePhone?.trim();

    if (c.version === '4.0') {
      if (mob) lines.push(`TEL;TYPE=cell,voice;VALUE=uri:tel:${mob.replace(/[^\d+]/g, '')}`);
      if (work) lines.push(`TEL;TYPE=work,voice;VALUE=uri:tel:${work.replace(/[^\d+]/g, '')}`);
      if (home) lines.push(`TEL;TYPE=home,voice;VALUE=uri:tel:${home.replace(/[^\d+]/g, '')}`);
    } else {
      if (mob) lines.push(`TEL;TYPE=CELL:${mob}`);
      if (work) lines.push(`TEL;TYPE=WORK,VOICE:${work}`);
      if (home) lines.push(`TEL;TYPE=HOME,VOICE:${home}`);
    }

    if (c.workEmail?.trim()) lines.push(`EMAIL;TYPE=WORK:${c.workEmail.trim()}`);
    if (c.personalEmail?.trim()) lines.push(`EMAIL;TYPE=HOME:${c.personalEmail.trim()}`);
    if (c.website?.trim()) lines.push(`URL:${c.website.trim()}`);

    const street = c.street?.trim() || '';
    const city = c.city?.trim() || '';
    const state = c.state?.trim() || '';
    const zip = c.zip?.trim() || '';
    const country = c.country?.trim() || '';

    if (street || city || state || zip || country) {
      lines.push(`ADR;TYPE=WORK:;;${street};${city};${state};${zip};${country}`);
    }

    if (c.birthday?.trim()) {
      const bday = c.birthday.trim();
      const formattedBday = c.version === '4.0' ? bday.replace(/-/g, '') : bday;
      lines.push(`BDAY:${formattedBday}`);
    }

    if (c.linkedin?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${c.linkedin.trim()}`);
    if (c.twitter?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=twitter:${c.twitter.trim()}`);
    if (c.github?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=github:${c.github.trim()}`);
    if (c.instagram?.trim()) lines.push(`X-SOCIALPROFILE;TYPE=instagram:${c.instagram.trim()}`);

    if (c.notes?.trim()) lines.push(`NOTE:${c.notes.trim().replace(/\n/g, '\\n')}`);

    lines.push('END:VCARD');
    return lines.join('\r\n');
  };

  // Get raw payload string based on active tab
  const getPayloadString = (): string => {
    switch (activeTab) {
      case 'vcard':
        return generateVCardString(vcard);
      case 'url':
        return url.trim().startsWith('http') ? url.trim() : `https://${url.trim()}`;
      case 'wifi':
        return `WIFI:S:${wifi.ssid};T:${wifi.encryption};P:${wifi.password};H:${wifi.hidden ? 'true' : 'false'};;`;
      case 'geo':
        return `geo:${geo.lat},${geo.lng}?q=${encodeURIComponent(geo.title || 'Location')}`;
      case 'text':
        return plainText;
      default:
        return generateVCardString(vcard);
    }
  };

  // Process QR matrix data
  useEffect(() => {
    const payload = getPayloadString();
    if (!payload) return;

    try {
      const qr = QRCode.create(payload, {
        errorCorrectionLevel: style.errorCorrectionLevel
      });

      const size = qr.modules.size;
      const matrix: boolean[][] = [];

      for (let r = 0; r < size; r++) {
        const row: boolean[] = [];
        for (let c = 0; c < size; c++) {
          row.push(Boolean(qr.modules.get(r, c)));
        }
        matrix.push(row);
      }

      setQrMatrixData({ size, matrix });
    } catch (err) {
      console.error('Failed to build QR matrix:', err);
    }
  }, [vcard, url, wifi, geo, plainText, activeTab, style.errorCorrectionLevel]);

  // Helper to determine eye modules (top-left, top-right, bottom-left 7x7 outer patterns)
  const isEyeModule = (r: number, c: number, size: number): boolean => {
    if (r <= 6 && c <= 6) return true; // Top-left eye
    if (r <= 6 && c >= size - 7) return true; // Top-right eye
    if (r >= size - 7 && c <= 6) return true; // Bottom-left eye
    return false;
  };

  // Helper to determine if center logo mask applies to module
  const isCenterLogoMask = (r: number, c: number, size: number): boolean => {
    if (style.enableLogo === false) return false;
    if (style.presetLogo === 'none' && !style.customLogoUrl) return false;
    const center = Math.floor(size / 2);
    // Mask radius proportional to logo scale
    const radius = Math.ceil((size * style.logoScale) / 2) + 1;
    return Math.abs(r - center) <= radius && Math.abs(c - center) <= radius;
  };

  // Generate SVG path for a rectangle with individual corner radiuses (for classy smooth QR modules)
  const generateSmoothModulePath = (x: number, y: number, w: number, h: number, tl: number, tr: number, br: number, bl: number): string => {
    return `M ${x + tl} ${y} ` +
      `H ${x + w - tr} ` +
      (tr > 0 ? `A ${tr} ${tr} 0 0 1 ${x + w} ${y + tr} ` : '') +
      `V ${y + h - br} ` +
      (br > 0 ? `A ${br} ${br} 0 0 1 ${x + w - br} ${y + h} ` : '') +
      `H ${x + bl} ` +
      (bl > 0 ? `A ${bl} ${bl} 0 0 1 ${x} ${y + h - bl} ` : '') +
      `V ${y + tl} ` +
      (tl > 0 ? `A ${tl} ${tl} 0 0 1 ${x + tl} ${y} ` : '') +
      'Z';
  };

  // Render SVG QR code element
  const renderSVGCode = (): string => {
    if (!qrMatrixData) return '';

    const { size, matrix } = qrMatrixData;
    const margin = style.margin;
    const totalSize = size + margin * 2;
    const unitSize = 10;
    const canvasDimension = totalSize * unitSize;

    const fg = style.fgColor;
    const bg = style.bgColor === 'transparent' ? 'none' : style.bgColor;
    const eyeClr = style.eyeColor || style.fgColor;

    let elements = [];

    // Background rect
    if (bg !== 'none') {
      elements.push(`<rect width="${canvasDimension}" height="${canvasDimension}" fill="${bg}" />`);
    }

    // Logo mask calculation
    const centerUnit = (size / 2 + margin) * unitSize;
    const logoDimension = size * unitSize * style.logoScale;

    // Center Logo background mask (Only when logo is enabled)
    if (style.enableLogo !== false && (style.presetLogo !== 'none' || style.customLogoUrl) && style.logoBgShape !== 'none') {
      const maskPad = 8;
      const maskSize = logoDimension + maskPad * 2;
      const maskX = centerUnit - maskSize / 2;
      const maskY = centerUnit - maskSize / 2;
      const maskFill = bg !== 'none' ? bg : '#000000';

      if (style.logoBgShape === 'circle') {
        elements.push(`<circle cx="${centerUnit}" cy="${centerUnit}" r="${maskSize / 2}" fill="${maskFill}" />`);
      } else {
        elements.push(`<rect x="${maskX}" y="${maskY}" width="${maskSize}" height="${maskSize}" rx="4" fill="${maskFill}" />`);
      }
    }

    // Helper to check if neighbor module is active
    const isModuleActive = (row: number, col: number): boolean => {
      if (row < 0 || row >= size || col < 0 || col >= size) return false;
      if (!matrix[row][col]) return false;
      if (isEyeModule(row, col, size)) return false;
      if (isCenterLogoMask(row, col, size)) return false;
      return true;
    };

    // Render normal data modules (non-eye modules, non-logo-masked)
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        if (!matrix[r][c]) continue;
        if (isEyeModule(r, c, size)) continue;
        if (isCenterLogoMask(r, c, size)) continue;

        const x = (c + margin) * unitSize;
        const y = (r + margin) * unitSize;

        if (style.moduleStyle === 'dots') {
          // Circular Dots
          elements.push(`<circle cx="${x + unitSize / 2}" cy="${y + unitSize / 2}" r="${unitSize * 0.42}" fill="${fg}" />`);
        } else if (style.moduleStyle === 'classy') {
          // Classy Smooth: Connected fluid rounded modules with smooth rounded exterior corners
          const top = isModuleActive(r - 1, c);
          const bottom = isModuleActive(r + 1, c);
          const left = isModuleActive(r, c - 1);
          const right = isModuleActive(r, c + 1);

          const rad = unitSize * 0.45;
          const tl = (!top && !left) ? rad : 0;
          const tr = (!top && !right) ? rad : 0;
          const br = (!bottom && !right) ? rad : 0;
          const bl = (!bottom && !left) ? rad : 0;

          elements.push(`<path d="${generateSmoothModulePath(x, y, unitSize, unitSize, tl, tr, br, bl)}" fill="${fg}" />`);
        } else if (style.moduleStyle === 'rounded') {
          // Rounded rects with continuous edges and smooth corner radius (not looking like disconnected dots)
          elements.push(`<rect x="${x}" y="${y}" width="${unitSize}" height="${unitSize}" rx="${unitSize * 0.32}" fill="${fg}" />`);
        } else {
          // Sharp Square
          elements.push(`<rect x="${x}" y="${y}" width="${unitSize}" height="${unitSize}" fill="${fg}" />`);
        }
      }
    }

    // Render Eye position detection patterns (Top-Left, Top-Right, Bottom-Left)
    const eyePositions = [
      { r: 0, c: 0 },
      { r: 0, c: size - 7 },
      { r: size - 7, c: 0 }
    ];

    eyePositions.forEach(({ r, c }) => {
      const x = (c + margin) * unitSize;
      const y = (r + margin) * unitSize;
      const outerSize = 7 * unitSize;
      const innerX = x + 2 * unitSize;
      const innerY = y + 2 * unitSize;
      const innerSize = 3 * unitSize;

      // Outer Eye Frame
      if (style.eyeOuterStyle === 'circle') {
        elements.push(`<circle cx="${x + outerSize / 2}" cy="${y + outerSize / 2}" r="${outerSize / 2}" fill="none" stroke="${eyeClr}" stroke-width="${unitSize}" />`);
      } else if (style.eyeOuterStyle === 'rounded') {
        elements.push(`<rect x="${x + unitSize / 2}" y="${y + unitSize / 2}" width="${outerSize - unitSize}" height="${outerSize - unitSize}" rx="${unitSize * 1.5}" fill="none" stroke="${eyeClr}" stroke-width="${unitSize}" />`);
      } else {
        // Square outer frame
        elements.push(`<path d="M${x},${y} h${outerSize} v${outerSize} h-${outerSize} z M${x + unitSize},${y + unitSize} v${outerSize - 2 * unitSize} h${outerSize - 2 * unitSize} v-${outerSize - 2 * unitSize} z" fill="${eyeClr}" />`);
      }

      // Inner Eye Dot
      if (style.eyeInnerStyle === 'circle') {
        elements.push(`<circle cx="${x + outerSize / 2}" cy="${y + outerSize / 2}" r="${innerSize / 2}" fill="${eyeClr}" />`);
      } else if (style.eyeInnerStyle === 'diamond') {
        const cx = x + outerSize / 2;
        const cy = y + outerSize / 2;
        const half = innerSize / 2;
        elements.push(`<polygon points="${cx},${cy - half} ${cx + half},${cy} ${cx},${cy + half} ${cx - half},${cy}" fill="${eyeClr}" />`);
      } else {
        // Square inner
        elements.push(`<rect x="${innerX}" y="${innerY}" width="${innerSize}" height="${innerSize}" fill="${eyeClr}" />`);
      }
    });

    // Render Preset Logo overlay if enabled
    if (style.enableLogo !== false && (style.presetLogo !== 'none' || style.customLogoUrl)) {
      const logoX = centerUnit - logoDimension / 2;
      const logoY = centerUnit - logoDimension / 2;

      if (style.presetLogo === 'custom' && style.customLogoUrl) {
        elements.push(`<image href="${style.customLogoUrl}" x="${logoX}" y="${logoY}" width="${logoDimension}" height="${logoDimension}" preserveAspectRatio="xMidYMid meet" />`);
      } else if (style.presetLogo !== 'none') {
        // Vector icons paths for crisp rendering
        let iconPath = '';
        const iconColor = style.frameColor || style.fgColor;
        const scaleFactor = logoDimension / 24;

        if (style.presetLogo === 'user') {
          // Contact User Icon
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" fill="none" stroke="${iconColor}" stroke-width="2.2"/></g>`;
        } else if (style.presetLogo === 'phone') {
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></g>`;
        } else if (style.presetLogo === 'globe') {
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><circle cx="12" cy="12" r="10" fill="none" stroke="${iconColor}" stroke-width="2.2"/><line x1="2" y1="12" x2="22" y2="12" stroke="${iconColor}" stroke-width="2.2"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" fill="none" stroke="${iconColor}" stroke-width="2.2"/></g>`;
        } else if (style.presetLogo === 'wifi') {
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><path d="M5 12.55a11 11 0 0 1 14 0" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round"/><path d="M8.5 16.5a6 6 0 0 1 7 0" fill="none" stroke="${iconColor}" stroke-width="2.2" stroke-linecap="round"/><line x1="12" y1="20" x2="12.01" y2="20" stroke="${iconColor}" stroke-width="3" stroke-linecap="round"/></g>`;
        } else if (style.presetLogo === 'location') {
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" fill="none" stroke="${iconColor}" stroke-width="2.2"/><circle cx="12" cy="10" r="3" fill="none" stroke="${iconColor}" stroke-width="2.2"/></g>`;
        } else if (style.presetLogo === 'building') {
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="${iconColor}" stroke-width="2.2"/><line x1="9" y1="6" x2="9" y2="6.01" stroke="${iconColor}" stroke-width="2.5"/><line x1="15" y1="6" x2="15" y2="6.01" stroke="${iconColor}" stroke-width="2.5"/><line x1="9" y1="11" x2="9" y2="11.01" stroke="${iconColor}" stroke-width="2.5"/><line x1="15" y1="11" x2="15" y2="11.01" stroke="${iconColor}" stroke-width="2.5"/><line x1="9" y1="16" x2="9" y2="16.01" stroke="${iconColor}" stroke-width="2.5"/><line x1="15" y1="16" x2="15" y2="16.01" stroke="${iconColor}" stroke-width="2.5"/></g>`;
        } else {
          // Star
          iconPath = `<g transform="translate(${logoX}, ${logoY}) scale(${scaleFactor})"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="${iconColor}" stroke-width="2.2"/></g>`;
        }

        elements.push(iconPath);
      }
    }

    // Frame Banner Label (Only rendered when enableFrame is true)
    const isFrameActive = style.enableFrame !== false && style.framePosition !== 'none' && Boolean(style.frameLabel?.trim());
    if (isFrameActive) {
      const bannerText = style.frameLabel.toUpperCase().trim();
      const bannerBg = style.frameColor;
      const bannerTxtColor = style.bgColor === '#000000' || style.bgColor === '#0A0A0C' ? '#000000' : '#FFFFFF';

      if (style.framePosition === 'bottom') {
        elements.push(`
          <g transform="translate(0, ${canvasDimension})">
            <rect width="${canvasDimension}" height="32" fill="${bannerBg}" />
            <text x="${canvasDimension / 2}" y="20" text-anchor="middle" fill="${bannerTxtColor}" font-family="monospace" font-weight="900" font-size="11" letter-spacing="2">${bannerText}</text>
          </g>
        `);
      } else if (style.framePosition === 'top') {
        elements.push(`
          <g transform="translate(0, -32)">
            <rect width="${canvasDimension}" height="32" fill="${bannerBg}" />
            <text x="${canvasDimension / 2}" y="20" text-anchor="middle" fill="${bannerTxtColor}" font-family="monospace" font-weight="900" font-size="11" letter-spacing="2">${bannerText}</text>
          </g>
        `);
      } else if (style.framePosition === 'badge') {
        const badgeW = Math.min(canvasDimension - 20, bannerText.length * 9 + 30);
        const badgeX = (canvasDimension - badgeW) / 2;
        elements.push(`
          <g transform="translate(${badgeX}, ${canvasDimension - 14})">
            <rect width="${badgeW}" height="24" rx="12" fill="${bannerBg}" stroke="${fg}" stroke-width="1.5" />
            <text x="${badgeW / 2}" y="16" text-anchor="middle" fill="${bannerTxtColor}" font-family="sans-serif" font-weight="800" font-size="10" letter-spacing="1.5">${bannerText}</text>
          </g>
        `);
      }
    }

    const viewBoxY = isFrameActive && style.framePosition === 'top' ? -32 : 0;
    const viewBoxH = canvasDimension + (isFrameActive && (style.framePosition === 'bottom' || style.framePosition === 'top') ? 32 : 0);

    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 ${viewBoxY} ${canvasDimension} ${viewBoxH}" width="${canvasDimension}" height="${viewBoxH}">${elements.join('')}</svg>`;
  };

  // Sync SVG string when matrix or styles change
  useEffect(() => {
    const svg = renderSVGCode();
    setSvgString(svg);
  }, [qrMatrixData, style]);

  // Handle Download vCard file
  const handleDownloadVCard = () => {
    const vcfText = generateVCardString(vcard);
    const blob = new Blob([vcfText], { type: 'text/vcard;charset=utf-8' });
    const fileName = `${(vcard.firstName || 'contact').toLowerCase()}_${(vcard.lastName || 'card').toLowerCase()}.vcf`;
    
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  };

  // Handle Download SVG QR image
  const handleDownloadSVG = () => {
    if (!svgString) return;
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const fileName = `gextag_qr_${activeTab}_${Date.now()}.svg`;

    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(urlObj);
  };

  // Handle Download PNG high-res image
  const handleDownloadPNG = () => {
    if (!svgString) return;

    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const urlObj = URL.createObjectURL(svgBlob);

    img.onload = () => {
      const canvas = document.createElement('canvas');
      // Render at high resolution (1200px)
      const exportWidth = 1200;
      const aspectRatio = img.height / img.width;
      canvas.width = exportWidth;
      canvas.height = exportWidth * aspectRatio;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = style.bgColor === 'transparent' ? 'transparent' : style.bgColor;
        if (style.bgColor !== 'transparent') {
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
          if (blob) {
            const fileName = `gextag_qr_${activeTab}_${Date.now()}.png`;
            const pngUrl = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = pngUrl;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(pngUrl);
          }
        }, 'image/png');
      }
      URL.revokeObjectURL(urlObj);
    };

    img.src = urlObj;
  };

  // Copy helper
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2500);
    });
  };

  // Save current vCard contact as a preset
  const handleSaveContactPreset = () => {
    const namePrompt = window.prompt('ENTER PRESET NAME FOR THIS CONTACT:', `${vcard.firstName} ${vcard.lastName}`.trim() || 'Saved Contact');
    if (!namePrompt) return;

    const newPreset = {
      id: Math.random().toString(36).substr(2, 9),
      name: namePrompt.trim(),
      vcard: { ...vcard }
    };

    const updated = [...savedPresets, newPreset];
    savePresetToStorage(updated);
  };

  const handleDeletePreset = (id: string) => {
    if (window.confirm('Are you sure you want to delete this contact preset?')) {
      const updated = savedPresets.filter(p => p.id !== id);
      savePresetToStorage(updated);
    }
  };

  // Custom Logo upload handler
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        if (evt.target?.result) {
          setStyle(prev => ({
            ...prev,
            presetLogo: 'custom',
            customLogoUrl: evt.target?.result as string
          }));
        }
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="border border-brand-border p-5 sm:p-6 bg-brand-surface relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 z-10 relative">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[9px] uppercase tracking-[0.3em] font-bold text-brand-accent bg-black/60 px-2 py-0.5 border border-brand-border">
                GEXTAG TOOLKIT // EZQR
              </span>
              <span className="text-[9px] uppercase tracking-[0.2em] text-brand-muted">vCard 3.0 & 4.0 Standard</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.15em] text-white mt-1 flex items-center gap-3">
              <QrCode className="w-7 h-7 text-brand-accent" />
              EzQR / vCard Generator
            </h1>
            <p className="text-brand-muted text-xs uppercase tracking-widest mt-1">
              Industrial custom QR generator with vCard contacts, WiFi credentials, Map coordinates, custom logos & vector export.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => {
                setVcard(DEFAULT_VCARD);
                setStyle(DEFAULT_STYLE);
              }}
              className="px-3 py-2 bg-black border border-brand-border text-xs uppercase tracking-widest text-brand-muted hover:text-white hover:border-brand-accent transition-colors flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Load Demo
            </button>
            <button
              onClick={handleSaveContactPreset}
              className="px-3 py-2 bg-brand-accent text-black font-extrabold text-xs uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-1.5"
            >
              <Bookmark className="w-3.5 h-3.5" />
              Save Contact
            </button>
          </div>
        </div>
      </div>

      {/* Main Grid: Left Workbench Form vs Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Input Configuration & Controls (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Tab Selection (vCard, URL, WiFi, Geo, Text) */}
          <div className="border border-brand-border bg-brand-surface p-2 flex flex-wrap gap-1">
            {[
              { id: 'vcard', label: 'vCard Contact', icon: User },
              { id: 'url', label: 'Website / URL', icon: Globe },
              { id: 'wifi', label: 'WiFi Network', icon: Wifi },
              { id: 'geo', label: 'Geo Location', icon: MapPin },
              { id: 'text', label: 'Plain Text', icon: FileText },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 min-w-[110px] flex items-center justify-center gap-2 py-2.5 px-3 border text-[10px] font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? 'bg-brand-accent text-black border-brand-accent shadow-[0_0_15px_rgba(0,255,102,0.3)]'
                      : 'bg-black text-brand-muted border-brand-border hover:text-white hover:border-zinc-700'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: VCARD CONTACT FIELDS */}
          {activeTab === 'vcard' && (
            <div className="border border-brand-border bg-brand-surface p-5 space-y-6">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-brand-border pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                    <User className="w-4 h-4 text-brand-accent" />
                    1. Contact Information
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-[9px] text-emerald-400 font-mono uppercase bg-emerald-950/40 border border-emerald-800/60 px-2 py-0.5" title="Changes auto-saved to browser local storage">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Auto-Saved
                  </span>
                </div>
                
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setVcard(BLANK_VCARD)}
                    className="px-2.5 py-1 bg-black border border-red-900/60 text-[10px] text-red-400 uppercase font-mono hover:bg-red-950/30 hover:border-red-500 transition-colors"
                    title="Clear all fields to start blank with no phantom data"
                  >
                    Clear All Fields
                  </button>
                  <button
                    type="button"
                    onClick={() => setVcard(DEFAULT_VCARD)}
                    className="px-2.5 py-1 bg-black border border-brand-border text-[10px] text-brand-muted uppercase font-mono hover:text-white hover:border-brand-accent transition-colors"
                    title="Load pre-filled sample contact"
                  >
                    Load Sample
                  </button>
                  <div className="flex items-center gap-1.5 border-l border-brand-border pl-2">
                    <span className="text-[10px] text-brand-muted uppercase tracking-wider">Format:</span>
                    <select
                      value={vcard.version}
                      onChange={(e) => setVcard({ ...vcard, version: e.target.value as any })}
                      className="bg-black text-white border border-brand-border px-2 py-1 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                    >
                      <option value="3.0">vCard 3.0 (Universal)</option>
                      <option value="4.0">vCard 4.0 (Modern)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Name & Title Section */}
              <div className="space-y-3">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">Personal Info</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Prefix</label>
                    <input
                      type="text"
                      placeholder="Dr., Mr."
                      value={vcard.prefix}
                      onChange={(e) => setVcard({ ...vcard, prefix: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">First Name *</label>
                    <input
                      type="text"
                      placeholder="Alex"
                      value={vcard.firstName}
                      onChange={(e) => setVcard({ ...vcard, firstName: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Last Name *</label>
                    <input
                      type="text"
                      placeholder="Mercer"
                      value={vcard.lastName}
                      onChange={(e) => setVcard({ ...vcard, lastName: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Suffix</label>
                    <input
                      type="text"
                      placeholder="Ph.D., Jr., III"
                      value={vcard.suffix}
                      onChange={(e) => setVcard({ ...vcard, suffix: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Nickname</label>
                    <input
                      type="text"
                      placeholder="e.g. Gex, Alex"
                      value={vcard.nickname}
                      onChange={(e) => setVcard({ ...vcard, nickname: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Birthday (YYYY-MM-DD)</label>
                    <input
                      type="text"
                      placeholder="1988-06-14"
                      value={vcard.birthday}
                      onChange={(e) => setVcard({ ...vcard, birthday: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3 text-brand-accent" /> Company / Organization
                    </label>
                    <input
                      type="text"
                      placeholder="Apex Geospatial Labs"
                      value={vcard.organization}
                      onChange={(e) => setVcard({ ...vcard, organization: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Building className="w-3 h-3 text-brand-accent" /> Department / Division
                    </label>
                    <input
                      type="text"
                      placeholder="GIS & Cartography"
                      value={vcard.department}
                      onChange={(e) => setVcard({ ...vcard, department: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Briefcase className="w-3 h-3 text-brand-accent" /> Job Title / Role
                    </label>
                    <input
                      type="text"
                      placeholder="Lead Spatial Architect"
                      value={vcard.jobTitle}
                      onChange={(e) => setVcard({ ...vcard, jobTitle: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Phone & Email Channels */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">Contact Channels</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-brand-accent" /> Mobile Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 839-2041"
                      value={vcard.mobilePhone}
                      onChange={(e) => setVcard({ ...vcard, mobilePhone: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-brand-accent" /> Work Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 019-2834"
                      value={vcard.workPhone}
                      onChange={(e) => setVcard({ ...vcard, workPhone: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Phone className="w-3 h-3 text-brand-accent" /> Home / Alt Phone
                    </label>
                    <input
                      type="text"
                      placeholder="+1 (555) 234-5678"
                      value={vcard.homePhone}
                      onChange={(e) => setVcard({ ...vcard, homePhone: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-brand-accent" /> Work Email
                    </label>
                    <input
                      type="email"
                      placeholder="alex@apexgeo.io"
                      value={vcard.workEmail}
                      onChange={(e) => setVcard({ ...vcard, workEmail: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Mail className="w-3 h-3 text-brand-accent" /> Personal Email
                    </label>
                    <input
                      type="email"
                      placeholder="alex.mercer@gmail.com"
                      value={vcard.personalEmail}
                      onChange={(e) => setVcard({ ...vcard, personalEmail: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1 flex items-center gap-1">
                      <Globe className="w-3 h-3 text-brand-accent" /> Website URL
                    </label>
                    <input
                      type="text"
                      placeholder="https://apexgeo.io/mercer"
                      value={vcard.website}
                      onChange={(e) => setVcard({ ...vcard, website: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Physical Address Section */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">Office / Postal Address</span>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Street Address</label>
                  <input
                    type="text"
                    placeholder="742 Cybernetics Blvd, Suite 400"
                    value={vcard.street}
                    onChange={(e) => setVcard({ ...vcard, street: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">City</label>
                    <input
                      type="text"
                      placeholder="New Haven"
                      value={vcard.city}
                      onChange={(e) => setVcard({ ...vcard, city: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">State / Prov</label>
                    <input
                      type="text"
                      placeholder="CT"
                      value={vcard.state}
                      onChange={(e) => setVcard({ ...vcard, state: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Zip Code</label>
                    <input
                      type="text"
                      placeholder="06511"
                      value={vcard.zip}
                      onChange={(e) => setVcard({ ...vcard, zip: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Country</label>
                    <input
                      type="text"
                      placeholder="USA"
                      value={vcard.country}
                      onChange={(e) => setVcard({ ...vcard, country: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>
              </div>

              {/* Social Profiles & Notes */}
              <div className="space-y-3 pt-2 border-t border-brand-border">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">Social Links & Notes</span>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">LinkedIn Profile</label>
                    <input
                      type="text"
                      placeholder="https://linkedin.com/in/username"
                      value={vcard.linkedin}
                      onChange={(e) => setVcard({ ...vcard, linkedin: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">X / Twitter</label>
                    <input
                      type="text"
                      placeholder="https://x.com/username"
                      value={vcard.twitter}
                      onChange={(e) => setVcard({ ...vcard, twitter: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">GitHub / Portfolio</label>
                    <input
                      type="text"
                      placeholder="https://github.com/username"
                      value={vcard.github}
                      onChange={(e) => setVcard({ ...vcard, github: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Notes / Bio</label>
                  <textarea
                    rows={2}
                    placeholder="Field Lead for Spatial Mapping. Available for consulting."
                    value={vcard.notes}
                    onChange={(e) => setVcard({ ...vcard, notes: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: URL / LINK FIELDS */}
          {activeTab === 'url' && (
            <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
                <Globe className="w-4 h-4 text-brand-accent" />
                Target Website / Link URL
              </span>
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Destination Web Address</label>
                <input
                  type="url"
                  placeholder="https://example.com"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="w-full bg-black border border-brand-border px-4 py-3 text-sm text-white font-mono focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
          )}

          {/* TAB 3: WIFI NETWORK FIELDS */}
          {activeTab === 'wifi' && (
            <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
                <Wifi className="w-4 h-4 text-brand-accent" />
                WiFi Network Access Credentials
              </span>
              <div className="space-y-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Network Name (SSID) *</label>
                  <input
                    type="text"
                    placeholder="APEX_SURVEY_5G"
                    value={wifi.ssid}
                    onChange={(e) => setWifi({ ...wifi, ssid: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">WiFi Password</label>
                  <input
                    type="text"
                    placeholder="Password"
                    value={wifi.password}
                    onChange={(e) => setWifi({ ...wifi, password: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Encryption Type</label>
                    <select
                      value={wifi.encryption}
                      onChange={(e) => setWifi({ ...wifi, encryption: e.target.value as any })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                    >
                      <option value="WPA">WPA / WPA2 / WPA3</option>
                      <option value="WEP">WEP</option>
                      <option value="nopass">None (Open Network)</option>
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-xs text-white cursor-pointer pb-2">
                      <input
                        type="checkbox"
                        checked={wifi.hidden}
                        onChange={(e) => setWifi({ ...wifi, hidden: e.target.checked })}
                        className="accent-brand-accent"
                      />
                      <span className="text-[10px] uppercase tracking-widest">Hidden SSID</span>
                    </label>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: GEO LOCATION FIELDS */}
          {activeTab === 'geo' && (
            <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
                <MapPin className="w-4 h-4 text-brand-accent" />
                Geographic Coordinates
              </span>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Latitude</label>
                  <input
                    type="text"
                    placeholder="4.1755"
                    value={geo.lat}
                    onChange={(e) => setGeo({ ...geo, lat: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Longitude</label>
                  <input
                    type="text"
                    placeholder="73.5093"
                    value={geo.lng}
                    onChange={(e) => setGeo({ ...geo, lng: e.target.value })}
                    className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Location Title / Landmark</label>
                <input
                  type="text"
                  placeholder="Hulhumalé Field Base"
                  value={geo.title}
                  onChange={(e) => setGeo({ ...geo, title: e.target.value })}
                  className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent"
                />
              </div>
            </div>
          )}

          {/* TAB 5: PLAIN TEXT */}
          {activeTab === 'text' && (
            <div className="border border-brand-border bg-brand-surface p-5 space-y-4">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2 border-b border-brand-border pb-3">
                <FileText className="w-4 h-4 text-brand-accent" />
                Custom Message / Text Payload
              </span>
              <textarea
                rows={4}
                value={plainText}
                onChange={(e) => setPlainText(e.target.value)}
                placeholder="Type any arbitrary text or string..."
                className="w-full bg-black border border-brand-border px-4 py-3 text-xs text-white font-mono focus:outline-none focus:border-brand-accent"
              />
            </div>
          )}

          {/* SECTION 2: QR CUSTOMIZATION & STYLING CONTROLS */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Palette className="w-4 h-4 text-brand-accent" />
                2. Industrial QR Design & Color Styling
              </span>
              <button
                onClick={handleSaveStylePreset}
                className="px-3 py-1.5 bg-brand-accent text-black font-extrabold text-[10px] uppercase tracking-widest hover:bg-white transition-colors flex items-center gap-1.5"
              >
                <Bookmark className="w-3.5 h-3.5" />
                Save Style Preset
              </button>
            </div>

            {/* Saved Brand Style Presets */}
            {savedStylePresets.length > 0 && (
              <div className="p-3 bg-black/60 border border-brand-border space-y-2">
                <div className="flex justify-between items-center">
                  <span className="block text-[9px] uppercase tracking-widest text-brand-accent font-bold flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3" />
                    Saved Brand Style Presets
                  </span>
                  <span className="text-[9px] text-brand-muted uppercase font-mono">{savedStylePresets.length} Saved</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {savedStylePresets.map(preset => (
                    <div
                      key={preset.id}
                      className="p-2 border border-brand-border bg-black hover:border-brand-accent transition-colors flex items-center justify-between gap-2"
                    >
                      <button
                        onClick={() => setStyle({ ...preset.style })}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                        title="Click to apply this styling & logo configuration"
                      >
                        <div
                          className="w-5 h-5 rounded-sm border border-zinc-700 shrink-0 flex items-center justify-center text-[8px] font-black"
                          style={{
                            backgroundColor: preset.style.bgColor === 'transparent' ? '#000000' : preset.style.bgColor,
                            color: preset.style.fgColor
                          }}
                        >
                          QR
                        </div>
                        <div className="truncate">
                          <div className="text-[10px] font-bold text-white uppercase truncate">{preset.name}</div>
                          <div className="text-[8px] text-brand-muted font-mono uppercase truncate">
                            {preset.style.moduleStyle} • {preset.style.presetLogo !== 'none' ? preset.style.presetLogo : 'no logo'}
                          </div>
                        </div>
                      </button>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => setStyle({ ...preset.style })}
                          className="px-2 py-1 bg-brand-surface border border-brand-border hover:bg-brand-accent hover:text-black text-[9px] font-bold uppercase transition-colors"
                        >
                          Apply
                        </button>
                        <button
                          onClick={() => handleDeleteStylePreset(preset.id)}
                          className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                          title="Delete style preset"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Preset Color Themes */}
            <div>
              <span className="block text-[9px] uppercase tracking-widest text-brand-muted mb-2">Industrial Theme Swatches</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {COLOR_PRESETS.map(preset => (
                  <button
                    key={preset.name}
                    onClick={() => {
                      setStyle({
                        ...style,
                        fgColor: preset.fg,
                        bgColor: preset.bg,
                        eyeColor: preset.eye,
                        frameColor: preset.frame
                      });
                    }}
                    className="p-2 border border-brand-border bg-black hover:border-brand-accent transition-colors flex items-center gap-2 text-[10px] uppercase font-mono text-left"
                  >
                    <div
                      className="w-4 h-4 rounded-sm border border-zinc-700 shrink-0"
                      style={{ backgroundColor: preset.fg }}
                    />
                    <span className="truncate text-white">{preset.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Color Controls */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Foreground Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.fgColor}
                    onChange={(e) => setStyle({ ...style, fgColor: e.target.value })}
                    className="w-8 h-8 bg-transparent border border-brand-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.fgColor}
                    onChange={(e) => setStyle({ ...style, fgColor: e.target.value })}
                    className="w-full bg-black border border-brand-border px-2 py-1 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Background Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.bgColor === 'transparent' ? '#000000' : style.bgColor}
                    onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                    className="w-8 h-8 bg-transparent border border-brand-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.bgColor}
                    onChange={(e) => setStyle({ ...style, bgColor: e.target.value })}
                    className="w-full bg-black border border-brand-border px-2 py-1 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Eye Outer Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={style.eyeColor}
                    onChange={(e) => setStyle({ ...style, eyeColor: e.target.value })}
                    className="w-8 h-8 bg-transparent border border-brand-border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={style.eyeColor}
                    onChange={(e) => setStyle({ ...style, eyeColor: e.target.value })}
                    className="w-full bg-black border border-brand-border px-2 py-1 text-xs text-white font-mono uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Shape Selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-brand-border">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Module Dot Shape</label>
                <select
                  value={style.moduleStyle}
                  onChange={(e) => setStyle({ ...style, moduleStyle: e.target.value as any })}
                  className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="square">Square Modules</option>
                  <option value="dots">Circular Dots</option>
                  <option value="rounded">Rounded Rects</option>
                  <option value="classy">Classy Smooth</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Corner Eye Outer</label>
                <select
                  value={style.eyeOuterStyle}
                  onChange={(e) => setStyle({ ...style, eyeOuterStyle: e.target.value as any })}
                  className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="square">Square Frame</option>
                  <option value="circle">Circle Ring</option>
                  <option value="rounded">Rounded Frame</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Corner Eye Inner</label>
                <select
                  value={style.eyeInnerStyle}
                  onChange={(e) => setStyle({ ...style, eyeInnerStyle: e.target.value as any })}
                  className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="square">Square Core</option>
                  <option value="circle">Circle Core</option>
                  <option value="diamond">Diamond Core</option>
                </select>
              </div>
            </div>

            {/* Center Logo & Icon Overlay */}
            <div className="space-y-3 pt-2 border-t border-brand-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">
                  Center Logo / Icon Overlay
                </span>
                <button
                  type="button"
                  onClick={() => setStyle(prev => ({ ...prev, enableLogo: prev.enableLogo === false ? true : false }))}
                  className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
                    style.enableLogo !== false
                      ? 'bg-brand-accent text-black border-brand-accent'
                      : 'bg-black text-brand-muted border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.enableLogo !== false ? 'bg-black' : 'bg-zinc-600'}`} />
                  {style.enableLogo !== false ? 'LOGO ENABLED' : 'LOGO DISABLED'}
                </button>
              </div>

              {style.enableLogo === false ? (
                <div className="bg-black/40 border border-dashed border-zinc-800 p-3 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>Center logo overlay is currently disabled and hidden from QR.</span>
                  <button
                    type="button"
                    onClick={() => setStyle(prev => ({ ...prev, enableLogo: true }))}
                    className="text-brand-accent underline hover:text-white uppercase tracking-wider text-[9px]"
                  >
                    Enable Logo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Center Icon</label>
                    <select
                      value={style.presetLogo}
                      onChange={(e) => setStyle({ ...style, presetLogo: e.target.value as any })}
                      className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                    >
                      <option value="none">None (No Icon)</option>
                      <option value="user">Contact Person Icon</option>
                      <option value="phone">Phone Icon</option>
                      <option value="globe">Globe / Web Icon</option>
                      <option value="wifi">WiFi Icon</option>
                      <option value="location">Map Location Icon</option>
                      <option value="building">Company Building Icon</option>
                      <option value="star">Star Badge</option>
                      <option value="custom">Upload Custom Logo...</option>
                    </select>
                  </div>

                  {style.presetLogo === 'custom' && (
                    <div>
                      <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Upload File (PNG/SVG)</label>
                      <input
                        type="file"
                        ref={customLogoInputRef}
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="w-full bg-black border border-brand-border px-2 py-1 text-xs text-brand-muted file:bg-brand-surface file:text-white file:border-none file:px-2 file:py-1 file:mr-2 file:cursor-pointer"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Logo Background Mask</label>
                    <select
                      value={style.logoBgShape}
                      onChange={(e) => setStyle({ ...style, logoBgShape: e.target.value as any })}
                      className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                    >
                      <option value="square">Square Mask</option>
                      <option value="circle">Circle Mask</option>
                      <option value="none">No Mask (Transparent)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Logo Size ({Math.round(style.logoScale * 100)}%)</label>
                    <input
                      type="range"
                      min="0.10"
                      max="0.28"
                      step="0.02"
                      value={style.logoScale}
                      onChange={(e) => setStyle({ ...style, logoScale: parseFloat(e.target.value) })}
                      className="w-full accent-brand-accent cursor-pointer"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Frame Label Banner */}
            <div className="space-y-3 pt-2 border-t border-brand-border">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold tracking-widest text-brand-accent block">
                  Frame Label Banner
                </span>
                <button
                  type="button"
                  onClick={() => setStyle(prev => ({ ...prev, enableFrame: prev.enableFrame === false ? true : false }))}
                  className={`px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider border flex items-center gap-1.5 transition-all ${
                    style.enableFrame !== false
                      ? 'bg-brand-accent text-black border-brand-accent'
                      : 'bg-black text-brand-muted border-zinc-800 hover:border-zinc-600'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${style.enableFrame !== false ? 'bg-black' : 'bg-zinc-600'}`} />
                  {style.enableFrame !== false ? 'FRAME ENABLED' : 'FRAME DISABLED'}
                </button>
              </div>

              {style.enableFrame === false ? (
                <div className="bg-black/40 border border-dashed border-zinc-800 p-3 text-[10px] font-mono text-zinc-500 flex items-center justify-between">
                  <span>Frame label ribbon is currently disabled and hidden from QR.</span>
                  <button
                    type="button"
                    onClick={() => setStyle(prev => ({ ...prev, enableFrame: true }))}
                    className="text-brand-accent underline hover:text-white uppercase tracking-wider text-[9px]"
                  >
                    Enable Frame Banner
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Frame Label Banner</label>
                    <input
                      type="text"
                      placeholder="SCAN FOR CONTACT"
                      value={style.frameLabel}
                      onChange={(e) => setStyle({ ...style, frameLabel: e.target.value })}
                      className="w-full bg-black border border-brand-border px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-accent font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Banner Position</label>
                    <select
                      value={style.framePosition}
                      onChange={(e) => setStyle({ ...style, framePosition: e.target.value as any })}
                      className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                    >
                      <option value="bottom">Bottom Industrial Bar</option>
                      <option value="top">Top Header Bar</option>
                      <option value="badge">Pill Badge</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Banner Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={style.frameColor || style.fgColor}
                        onChange={(e) => setStyle({ ...style, frameColor: e.target.value })}
                        className="w-8 h-8 bg-transparent border border-brand-border cursor-pointer"
                      />
                      <input
                        type="text"
                        value={style.frameColor || style.fgColor}
                        onChange={(e) => setStyle({ ...style, frameColor: e.target.value })}
                        className="w-full bg-black border border-brand-border px-2 py-1 text-xs text-white font-mono uppercase"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* QR Specs & Error Correction (Always Accessible) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-brand-border">
              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Error Correction (ECC)</label>
                <select
                  value={style.errorCorrectionLevel}
                  onChange={(e) => setStyle({ ...style, errorCorrectionLevel: e.target.value as any })}
                  className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="H">High - 30% (Recommended with Logo)</option>
                  <option value="Q">Quartile - 25%</option>
                  <option value="M">Medium - 15%</option>
                  <option value="L">Low - 7%</option>
                </select>
              </div>

              <div>
                <label className="block text-[9px] uppercase tracking-widest text-brand-muted mb-1">Quiet Zone Margin</label>
                <select
                  value={style.margin}
                  onChange={(e) => setStyle({ ...style, margin: parseInt(e.target.value, 10) || 2 })}
                  className="w-full bg-black text-white border border-brand-border px-3 py-2 text-xs font-mono uppercase focus:outline-none focus:border-brand-accent cursor-pointer"
                >
                  <option value="1">1 Module (Compact)</option>
                  <option value="2">2 Modules (Standard)</option>
                  <option value="3">3 Modules (Spacious)</option>
                  <option value="4">4 Modules (ISO Standard Quiet Zone)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Live Interactive Preview & Export Controls (5 Cols) */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6">
          {/* Preview Inspector Header */}
          <div className="border border-brand-border bg-brand-surface p-5 space-y-5">
            <div className="flex justify-between items-center border-b border-brand-border pb-3">
              <span className="text-xs font-bold uppercase tracking-[0.2em] text-white flex items-center gap-2">
                <Eye className="w-4 h-4 text-brand-accent" />
                Live Preview Inspector
              </span>

              <div className="flex gap-1">
                {[
                  { id: 'preview', label: 'QR Canvas' },
                  { id: 'vcf', label: 'Raw vCard' },
                  { id: 'presets', label: 'Saved (' + savedPresets.length + ')' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveInspector(tab.id as any)}
                    className={`px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider border transition-colors ${
                      activeInspector === tab.id
                        ? 'bg-brand-accent text-black border-brand-accent'
                        : 'bg-black text-brand-muted border-brand-border hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* LIVE QR DISPLAY CANVAS */}
            {activeInspector === 'preview' && (
              <div className="flex flex-col items-center justify-center p-6 bg-black border border-brand-border space-y-4 relative group">
                <div
                  className="p-4 rounded-none transition-all shadow-[0_0_30px_rgba(0,0,0,0.8)] max-w-full flex justify-center"
                  style={{ backgroundColor: style.bgColor === 'transparent' ? '#0A0A0C' : style.bgColor }}
                  dangerouslySetInnerHTML={{ __html: svgString }}
                />

                <div className="w-full flex items-center justify-between text-[10px] text-brand-muted font-mono uppercase pt-2 border-t border-brand-border">
                  <span>Type: <strong className="text-brand-accent">{activeTab}</strong></span>
                  <span>Grid: <strong className="text-white">{qrMatrixData ? `${qrMatrixData.size}x${qrMatrixData.size}` : 'Matrix'}</strong></span>
                  <span>ECC: <strong className="text-white">{style.errorCorrectionLevel} (30%)</strong></span>
                </div>
              </div>
            )}

            {/* RAW VCARD INSPECTOR TAB */}
            {activeInspector === 'vcf' && (
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase tracking-widest text-brand-muted">Formatted vCard Syntax</span>
                  <button
                    onClick={() => copyToClipboard(generateVCardString(vcard), 'vcf')}
                    className="text-[10px] text-brand-accent hover:underline flex items-center gap-1 font-mono uppercase"
                  >
                    {copied === 'vcf' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    {copied === 'vcf' ? 'Copied' : 'Copy Text'}
                  </button>
                </div>
                <textarea
                  readOnly
                  rows={12}
                  value={generateVCardString(vcard)}
                  className="w-full bg-black border border-brand-border p-3 text-[11px] font-mono text-emerald-400 focus:outline-none select-all"
                />
              </div>
            )}

            {/* SAVED PRESETS TAB */}
            {activeInspector === 'presets' && (
              <div className="space-y-4">
                {/* Section A: Saved Brand Styles */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center border-b border-brand-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      Saved Brand Styles ({savedStylePresets.length})
                    </span>
                    <button
                      onClick={handleSaveStylePreset}
                      className="text-[9px] text-brand-muted hover:text-white uppercase tracking-wider underline"
                    >
                      + Save Current
                    </button>
                  </div>
                  {savedStylePresets.length === 0 ? (
                    <div className="p-3 bg-black border border-brand-border text-center text-[10px] text-brand-muted">
                      No brand styles saved yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {savedStylePresets.map(preset => (
                        <div
                          key={preset.id}
                          className="p-2 bg-black border border-brand-border hover:border-brand-accent transition-colors flex items-center justify-between gap-2 text-left"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div
                              className="w-4 h-4 rounded-sm border border-zinc-700 shrink-0"
                              style={{ backgroundColor: preset.style.fgColor }}
                            />
                            <div className="truncate">
                              <div className="text-[10px] font-bold text-white uppercase truncate">{preset.name}</div>
                              <div className="text-[8px] text-brand-muted font-mono uppercase truncate">
                                {preset.style.presetLogo !== 'none' ? `Logo: ${preset.style.presetLogo}` : preset.style.fgColor}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setStyle({ ...preset.style })}
                              className="px-2 py-0.5 bg-brand-surface border border-brand-border hover:bg-brand-accent hover:text-black text-[9px] font-bold uppercase transition-colors"
                            >
                              Apply
                            </button>
                            <button
                              onClick={() => handleDeleteStylePreset(preset.id)}
                              className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Section B: Saved Contact Cards */}
                <div className="space-y-2 pt-2 border-t border-brand-border">
                  <div className="flex justify-between items-center border-b border-brand-border pb-1">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-brand-accent flex items-center gap-1">
                      <User className="w-3 h-3" />
                      Saved Contact Cards ({savedPresets.length})
                    </span>
                    <button
                      onClick={handleSaveContactPreset}
                      className="text-[9px] text-brand-muted hover:text-white uppercase tracking-wider underline"
                    >
                      + Save Current
                    </button>
                  </div>
                  {savedPresets.length === 0 ? (
                    <div className="p-3 bg-black border border-brand-border text-center text-[10px] text-brand-muted">
                      No contact presets saved yet.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-[160px] overflow-y-auto pr-1">
                      {savedPresets.map(preset => (
                        <div
                          key={preset.id}
                          className="p-2 bg-black border border-brand-border hover:border-brand-accent transition-colors flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <div className="text-[10px] font-bold text-white uppercase truncate">{preset.name}</div>
                            <div className="text-[8px] text-brand-muted truncate">
                              {preset.vcard.organization || preset.vcard.workEmail || 'Contact Card'}
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                setVcard(preset.vcard);
                                setActiveTab('vcard');
                              }}
                              className="px-2 py-0.5 bg-brand-surface border border-brand-border hover:bg-brand-accent hover:text-black text-[9px] font-bold uppercase transition-colors"
                            >
                              Load
                            </button>
                            <button
                              onClick={() => handleDeletePreset(preset.id)}
                              className="p-1 text-zinc-600 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ACTION EXPORT BUTTONS */}
            <div className="space-y-2 pt-2 border-t border-brand-border">
              {activeTab === 'vcard' && (
                <button
                  onClick={handleDownloadVCard}
                  className="w-full py-3 bg-brand-accent text-black font-black uppercase text-xs tracking-[0.2em] hover:bg-white transition-colors flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(0,255,102,0.3)]"
                >
                  <Download className="w-4 h-4" />
                  Download vCard (.vcf File)
                </button>
              )}

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadPNG}
                  className="py-2.5 bg-black border border-brand-border hover:border-brand-accent text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <ImageIcon className="w-3.5 h-3.5 text-brand-accent" />
                  Export PNG
                </button>

                <button
                  onClick={handleDownloadSVG}
                  className="py-2.5 bg-black border border-brand-border hover:border-brand-accent text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-1.5"
                >
                  <Layers className="w-3.5 h-3.5 text-brand-accent" />
                  Export SVG
                </button>
              </div>

              <button
                onClick={() => copyToClipboard(getPayloadString(), 'payload')}
                className="w-full py-2 bg-brand-surface border border-brand-border hover:bg-black text-brand-muted hover:text-white text-[10px] font-mono uppercase tracking-widest transition-colors flex items-center justify-center gap-1.5"
              >
                {copied === 'payload' ? <Check className="w-3 h-3 text-brand-accent" /> : <Copy className="w-3 h-3" />}
                {copied === 'payload' ? 'Copied QR Data Payload' : 'Copy QR Raw Payload String'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
