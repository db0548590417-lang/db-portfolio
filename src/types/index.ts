export type ModuleId =
  | 'dashboard'
  | 'inspiration_hunter'
  | 'creative_director'
  | 'idea_factory'
  | 'creative_analyzer'
  | 'color_lab'
  | 'typography_playground'
  | 'mockup_master'
  | 'gestalt_lab'
  | 'inspiration_mixer'
  | 'design_analyzer'
  | 'visual_generator'
  | 'export_studio'
  | 'shadow_master'
  | 'system_health';

export type TestStatus = 'working' | 'partial' | 'requires_api' | 'error' | 'not_tested';

export interface ModuleTestReport {
  moduleId: string;
  moduleName: string;
  status: TestStatus;
  lastTestedAt: number | null;
  durationMs: number | null;
  summary: string;
  details: string[];
  requiresManualCheck?: boolean;
}

export interface ShadowSettings {
  direction: number; // 0-360 deg
  length: number; // scale/length
  softness: number; // blur in px
  opacity: number; // 0-100
  color: string; // hex
  distance: number; // offset distance
  spread: number; // width scale 0.2 - 3.0
  rotation: number; // -180 to 180 deg
  perspectiveTilt: number; // -60 to 60 deg
  perspectiveShear: number; // -50 to 50
  contactPointY: number; // 0 - 100% of object height
  // Contact Shadow
  contactShadowEnabled: boolean;
  contactShadowIntensity: number; // 0-100
  contactShadowSize: number; // 5-50px
  // Ambient Occlusion
  ambientShadowEnabled: boolean;
  ambientShadowIntensity: number; // 0-100
  ambientShadowRadius: number; // 5-60px
}

export interface LightSourceSettings {
  direction: number; // 0-360 deg
  elevation: number; // 10-90 deg
  distance: number; // virtual distance
  intensity: number; // 0-100
  softness: number; // 0-100
  color: string;
}

export interface ShadowMasterProject {
  id: string;
  name: string;
  objectImageUrl: string | null;
  originalImageUrl: string | null;
  backgroundImageUrl: string | null;
  extractedShadowUrl: string | null;
  shadow: ShadowSettings;
  light: LightSourceSettings;
  layers: {
    object: boolean;
    originalShadow: boolean;
    generatedShadow: boolean;
    background: boolean;
  };
  objectTransform: {
    x: number;
    y: number;
    scale: number;
    rotation: number;
  };
  surfaceCorners: { x: number; y: number }[]; // 4 points on background
  updatedAt: number;
}

export interface ModuleInfo {
  id: ModuleId;
  number: number;
  titleHebrew: string;
  subtitleHebrew: string;
  iconName: string;
  badge?: string;
  category: 'discover' | 'ideate' | 'craft' | 'refine' | 'export';
}

export interface CreativeBrief {
  clientName: string;
  productOrService: string;
  targetAudience: string;
  campaignObjective: string;
  primaryMessage: string;
  brandPersonality: string;
  desiredEmotions: string;
  creativeRestrictions: string;
  budgetLevel: 'בוטיק' | 'בינוני' | 'ענק' | 'ללא הגבלה';
  preferredVisualStyle: string;
}

export interface CreativeConcept {
  id: string;
  conceptName: string;
  coreIdea: string;
  visualExecution: string;
  suggestedHeadline: string;
  emotionalMechanism: string;
  whyItWorks: string;
  suggestedDesignTechnique: string;
  imageGenerationPrompt: string;
  createdAt: number;
  status?: 'draft' | 'approved';
  version?: number;
  sourceConceptIds?: string[];
  referenceIds?: string[];
  tags?: string[];
  notes?: string;
}

export interface InspirationItem {
  folder?: string;
  favorite?: boolean;
  tags?: string[];
  assetRole?: 'reference' | 'logo' | 'product';
  id: string;
  title: string;
  url: string;
  thumbUrl: string;
  source: string;
  sourceUrl?: string;
  author?: string;
  authorUrl?: string;
  style?: string;
  industry?: string;
  color?: string;
  technique?: string;
  composition?: string;
  mood?: string;
  savedAt?: number;
  notes?: string;
  isSample?: boolean;
}

export interface ColorPalette {
  id: string;
  name: string;
  colors: string[]; // HEX codes
  type: 'complementary' | 'analogous' | 'triadic' | 'monochromatic' | 'custom' | 'luxury';
  gradient?: {
    type: 'linear' | 'radial';
    angle: number;
    stops: { color: string; offset: number }[];
  };
  createdAt: number;
}

export interface TypographyDesign {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  letterSpacing: number;
  lineHeight: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
  skewX: number;
  isCurved: boolean;
  curveRadius: number;
  fillColor: string;
  fillGradient?: string;
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  textAlign: 'right' | 'center' | 'left';
  canvasWidth: number;
  canvasHeight: number;
  backgroundColor: string;
  updatedAt: number;
}

export interface MockupProject {
  id: string;
  templateId: string;
  templateName: string;
  artworkUrl: string | null;
  corners: { x: number; y: number }[]; // 4 points [TL, TR, BR, BL] normalized 0..1
  blendMode: 'normal' | 'multiply' | 'screen' | 'overlay' | 'soft-light';
  opacity: number;
  brightness: number;
  contrast: number;
  blur: number;
  shadow: number;
  updatedAt: number;
}

export interface GestaltConcept {
  id: string;
  principle: string;
  visualConcept: string;
  executionSuggestion: string;
  headline: string;
  imagePrompt: string;
  svgPrototypeCode?: string;
}

export type CreativeWorkMode = 'full' | 'visual' | 'copy' | 'refine';
export interface CreativeWorkspace {
  mode: CreativeWorkMode; approvedCopy: string; visualDirection: string;
  visualReferenceUrl: string; notes: string; lockedCopy: boolean; lockedVisual: boolean;
  directorMode: boolean; history: {id:string; time:number; label:string; copy:string; visual:string; notes:string}[];
}
export interface BrandProfile {
  endClient?: string; brandName?: string; industry?: string; brandDescription?: string;
  brandValues?: string; brandVoice?: string; audience?: string; brandRestrictions?: string;
  typography?: string; logoUrl?: string; officialPaletteId?: string;
}

export interface DesignAsset {
  id: string;
  groupId: string;
  name: string;
  version: number;
  kind: 'ad' | 'logo' | 'element' | 'sketch' | 'other';
  createdAt: number;
  // Image bytes live in IndexedDB (not localStorage / JSON project backups).
}

export interface Project {
  id: string;
  name: string;
  clientName: string;
  brief: CreativeBrief;
  brand?: BrandProfile;
  creativeProfile?: GlobalPreferences['creativeProfile'];
  creativeWorkspace?: CreativeWorkspace;
  creativeDrafts?: CreativeConcept[];
  mixerDraft?: any;
  ideaFactoryWorkspace?: { focus: string; method: string; intensity: number; seedIdea?: string; feedback?: string; selectedConceptIds?: string[]; drafts?: { id: string; title: string; visualHook: string; mechanism: string; executionTip: string; suggestedCopy: string; imagePrompt: string }[] };
  designAssets?: DesignAsset[];
  savedInspirations: InspirationItem[];
  concepts: CreativeConcept[];
  conceptHistory?: CreativeConcept[];
  colorPalettes: ColorPalette[];
  typographyDesigns: TypographyDesign[];
  mockups: MockupProject[];
  gestaltConcepts: GestaltConcept[];
  generatedImages: { id: string; url: string; prompt: string; createdAt: number; aspectRatio: string; model?: string; quality?: string; conceptId?: string; referenceIds?: string[]; originalUrl?: string; processedUrl?: string }[];
  createdAt: number;
  updatedAt: number;
}

export interface GlobalPreferences {
  theme: 'dark' | 'light';
  creativeProfile: 'modern_luxury' | 'hasidic_traditional' | 'bold_brutalist' | 'minimalist';
  excludePeople: boolean;
  preferredAspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4';
  searchProvider: 'samples' | 'unsplash' | 'pexels';
  unsplashApiKey?: string;
  pexelsApiKey?: string;
}
