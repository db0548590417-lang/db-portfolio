import React from 'react';
import {
  LayoutDashboard,
  Compass,
  Sparkles,
  Lightbulb,
  ScanEye,
  Palette,
  Type,
  Layers,
  Shapes,
  Blend,
  CheckCircle2,
  Wand2,
  Download,
  Settings,
  ChevronRight,
  ChevronLeft,
  Plus,
  Trash2,
  Copy,
  Sliders,
  Share2,
  RotateCcw,
  Upload,
  Eye,
  Grid,
  Filter,
  ArrowRight,
  Search,
  Image as ImageIcon,
  FileText,
  Check,
  ExternalLink,
  Info,
  Maximize2,
  FolderOpen,
  RefreshCw,
  FolderPlus,
  Zap,
  SunDim,
  Sun,
  Scissors,
  EyeOff,
  Move,
  ShieldCheck,
  Activity,
  AlertTriangle,
  HelpCircle,
  Clock,
  Play,
} from 'lucide-react';

interface IconProps {
  name: string;
  className?: string;
  size?: number;
}

export const Icon: React.FC<IconProps> = ({ name, className = 'w-5 h-5', size }) => {
  const props = { className, ...(size ? { size } : {}) };
  switch (name) {
    case 'LayoutDashboard': return <LayoutDashboard {...props} />;
    case 'Compass': return <Compass {...props} />;
    case 'Sparkles': return <Sparkles {...props} />;
    case 'Lightbulb': return <Lightbulb {...props} />;
    case 'ScanEye': return <ScanEye {...props} />;
    case 'Palette': return <Palette {...props} />;
    case 'Type': return <Type {...props} />;
    case 'Layers': return <Layers {...props} />;
    case 'Shapes': return <Shapes {...props} />;
    case 'Blend': return <Blend {...props} />;
    case 'CheckCircle2': return <CheckCircle2 {...props} />;
    case 'Wand2': return <Wand2 {...props} />;
    case 'Download': return <Download {...props} />;
    case 'Settings': return <Settings {...props} />;
    case 'ChevronRight': return <ChevronRight {...props} />;
    case 'ChevronLeft': return <ChevronLeft {...props} />;
    case 'Plus': return <Plus {...props} />;
    case 'Trash2': return <Trash2 {...props} />;
    case 'Copy': return <Copy {...props} />;
    case 'Sliders': return <Sliders {...props} />;
    case 'Share2': return <Share2 {...props} />;
    case 'RotateCcw': return <RotateCcw {...props} />;
    case 'Upload': return <Upload {...props} />;
    case 'Eye': return <Eye {...props} />;
    case 'Grid': return <Grid {...props} />;
    case 'Filter': return <Filter {...props} />;
    case 'ArrowRight': return <ArrowRight {...props} />;
    case 'Search': return <Search {...props} />;
    case 'Image': return <ImageIcon {...props} />;
    case 'FileText': return <FileText {...props} />;
    case 'Check': return <Check {...props} />;
    case 'ExternalLink': return <ExternalLink {...props} />;
    case 'Info': return <Info {...props} />;
    case 'Maximize2': return <Maximize2 {...props} />;
    case 'FolderOpen': return <FolderOpen {...props} />;
    case 'RefreshCw': return <RefreshCw {...props} />;
    case 'FolderPlus': return <FolderPlus {...props} />;
    case 'Zap': return <Zap {...props} />;
    case 'SunDim': return <SunDim {...props} />;
    case 'Sun': return <Sun {...props} />;
    case 'Scissors': return <Scissors {...props} />;
    case 'EyeOff': return <EyeOff {...props} />;
    case 'Move': return <Move {...props} />;
    case 'ShieldCheck': return <ShieldCheck {...props} />;
    case 'Activity': return <Activity {...props} />;
    case 'AlertTriangle': return <AlertTriangle {...props} />;
    case 'HelpCircle': return <HelpCircle {...props} />;
    case 'Clock': return <Clock {...props} />;
    case 'Play': return <Play {...props} />;
    default: return <Sparkles {...props} />;
  }
};
