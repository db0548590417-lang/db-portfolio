import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  Project,
  ModuleId,
  GlobalPreferences,
  CreativeConcept,
  InspirationItem,
  ColorPalette,
  TypographyDesign,
  MockupProject,
  GestaltConcept,
} from '../types';
import { buildBrandContext } from '../data/brandContext';
import { userStorageKey } from '../data/accountStorage';
import { deleteDesignImage } from '../data/designAssetsDb';

interface ProjectContextType {
  activeModule: ModuleId;
  setActiveModule: (module: ModuleId) => void;
  projects: Project[];
  activeProject: Project;
  setActiveProjectId: (id: string) => void;
  createProject: (name: string, clientName?: string) => Project;
  updateActiveProject: (updater: (prev: Project) => Project) => void;
  deleteProject: (id: string) => void;
  duplicateProject: (id: string) => void;
  exportProjectBackup: () => void;
  importProjectBackup: (jsonContent: string) => boolean;
  globalPrefs: GlobalPreferences;
  updateGlobalPrefs: (partial: Partial<GlobalPreferences>) => void;
  
  // Cross-module quick workflows
  selectedInspirationForAnalysis: InspirationItem | null;
  setSelectedInspirationForAnalysis: (item: InspirationItem | null) => void;
  selectedConceptForVisual: CreativeConcept | null;
  setSelectedConceptForVisual: (concept: CreativeConcept | null) => void;
  selectedArtworkForMockup: string | null;
  setSelectedArtworkForMockup: (artworkUrl: string | null) => void;
  selectedImageForShadowMaster: string | null;
  setSelectedImageForShadowMaster: (url: string | null) => void;
  
  // Toast notifications
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;
}

const STORAGE_KEY_PROJECTS = 'inspira_studio_projects_v1';
const STORAGE_KEY_ACTIVE_ID = 'inspira_studio_active_id_v1';
const STORAGE_KEY_PREFS = 'inspira_studio_prefs_v1';

const defaultBrief = {
  clientName: '',
  productOrService: '',
  targetAudience: '',
  campaignObjective: '',
  primaryMessage: '',
  brandPersonality: '',
  desiredEmotions: '',
  creativeRestrictions: '',
  budgetLevel: 'בינוני' as const,
  preferredVisualStyle: '',
};

const createInitialProject = (): Project => ({
  id: 'proj-' + Date.now(),
  name: 'הפרויקט הראשון שלי',
  clientName: '',
  brief: defaultBrief,
  designAssets: [],
  savedInspirations: [],
  creativeProfile: 'hasidic_traditional',
  concepts: [],
  colorPalettes: [],
  typographyDesigns: [],
  mockups: [],
  gestaltConcepts: [],
  generatedImages: [],
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

const defaultPreferences: GlobalPreferences = {
  theme: 'dark',
  creativeProfile: 'hasidic_traditional',
  excludePeople: true,
  preferredAspectRatio: '1:1',
  searchProvider: 'samples',
};

const sanitizeProject = (raw: any): Project => {
  const init = createInitialProject();
  if (!raw || typeof raw !== 'object') return init;
  return {
    id: raw.id || init.id,
    name: raw.name || init.name,
    clientName: raw.clientName || init.clientName,
    brief: {
      clientName: raw.brief?.clientName ?? init.brief.clientName,
      productOrService: raw.brief?.productOrService ?? init.brief.productOrService,
      targetAudience: raw.brief?.targetAudience ?? init.brief.targetAudience,
      campaignObjective: raw.brief?.campaignObjective ?? init.brief.campaignObjective,
      primaryMessage: raw.brief?.primaryMessage ?? init.brief.primaryMessage,
      brandPersonality: raw.brief?.brandPersonality ?? init.brief.brandPersonality,
      desiredEmotions: raw.brief?.desiredEmotions ?? init.brief.desiredEmotions,
      creativeRestrictions: raw.brief?.creativeRestrictions ?? init.brief.creativeRestrictions,
      budgetLevel: raw.brief?.budgetLevel ?? init.brief.budgetLevel,
      preferredVisualStyle: raw.brief?.preferredVisualStyle ?? init.brief.preferredVisualStyle,
    },
    brand: raw.brand && typeof raw.brand === 'object' ? raw.brand : {},
    creativeWorkspace: raw.creativeWorkspace && typeof raw.creativeWorkspace === 'object' ? raw.creativeWorkspace : undefined,
    ideaFactoryWorkspace: raw.ideaFactoryWorkspace && typeof raw.ideaFactoryWorkspace === 'object' ? { ...raw.ideaFactoryWorkspace, focus: String(raw.ideaFactoryWorkspace.focus || ''), method: String(raw.ideaFactoryWorkspace.method || 'auto'), intensity: Math.max(1, Math.min(5, Number(raw.ideaFactoryWorkspace.intensity) || 3)) } : undefined,
    creativeProfile: ['modern_luxury','hasidic_traditional','bold_brutalist','minimalist'].includes(raw.creativeProfile) ? raw.creativeProfile : defaultPreferences.creativeProfile,
    designAssets: Array.isArray(raw.designAssets) ? raw.designAssets : [],
    savedInspirations: Array.isArray(raw.savedInspirations) ? raw.savedInspirations : [],
    concepts: Array.isArray(raw.concepts) ? raw.concepts : [],
    colorPalettes: Array.isArray(raw.colorPalettes) ? raw.colorPalettes : init.colorPalettes,
    typographyDesigns: Array.isArray(raw.typographyDesigns) ? raw.typographyDesigns : [],
    mockups: Array.isArray(raw.mockups) ? raw.mockups : [],
    gestaltConcepts: Array.isArray(raw.gestaltConcepts) ? raw.gestaltConcepts : [],
    generatedImages: Array.isArray(raw.generatedImages) ? raw.generatedImages : [],
    createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
    updatedAt: typeof raw.updatedAt === 'number' ? raw.updatedAt : Date.now(),
  };
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeModule, setActiveModule] = useState<ModuleId>('dashboard');
  
  // Projects State with defensive sanitization
  const [projects, setProjects] = useState<Project[]>(() => {
    try {
      const stored = localStorage.getItem(userStorageKey(STORAGE_KEY_PROJECTS));
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map(sanitizeProject);
        }
      }
    } catch (e) {
      console.warn('Failed to load projects from localStorage', e);
    }
    return [createInitialProject()];
  });

  const [activeProjectId, setActiveProjectIdState] = useState<string>(() => {
    const stored = localStorage.getItem(userStorageKey(STORAGE_KEY_ACTIVE_ID));
    return stored || projects[0]?.id || '';
  });

  // Preferences State
  const [globalPrefs, setGlobalPrefs] = useState<GlobalPreferences>(() => {
    try {
      const stored = localStorage.getItem(userStorageKey(STORAGE_KEY_PREFS));
      if (stored) return { ...defaultPreferences, ...JSON.parse(stored) };
    } catch (e) {}
    return defaultPreferences;
  });

  // Cross-module states
  const [selectedInspirationForAnalysis, setSelectedInspirationForAnalysis] = useState<InspirationItem | null>(null);
  const [visualConceptSelection, setVisualConceptSelection] = useState<{ projectId: string; concept: CreativeConcept } | null>(null);
  const [selectedArtworkForMockup, setSelectedArtworkForMockup] = useState<string | null>(null);
  const [selectedImageForShadowMaster, setSelectedImageForShadowMaster] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((curr) => (curr?.message === message ? null : curr));
    }, 4000);
  };

  // Sync to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(userStorageKey(STORAGE_KEY_PROJECTS), JSON.stringify(projects));
    } catch (e) {
      console.error('Failed to save projects to storage', e);
    }
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      localStorage.setItem(userStorageKey(STORAGE_KEY_ACTIVE_ID), activeProjectId);
    }
  }, [activeProjectId]);

  useEffect(() => {
    localStorage.setItem(userStorageKey(STORAGE_KEY_PREFS), JSON.stringify(globalPrefs));
  }, [globalPrefs]);

  // The active project is the single source of truth for all AI requests.
  const projectForAiRef = useRef<Project | null>(null);
  const activeProject = sanitizeProject(projects.find((p) => p.id === activeProjectId) || projects[0] || createInitialProject());
  const selectedConceptForVisual = visualConceptSelection?.projectId === activeProject.id ? visualConceptSelection.concept : null;
  const setSelectedConceptForVisual = (concept: CreativeConcept | null) => setVisualConceptSelection(concept ? { projectId: activeProject.id, concept } : null);
  projectForAiRef.current = activeProject;
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      // Only our JSON POST endpoints are enriched. Never send a project to third-party URLs.
      if (url.startsWith('/api/') && method === 'POST' && typeof init?.body === 'string' &&
          (init.headers instanceof Headers ? init.headers.get('content-type') : JSON.stringify(init.headers || {})).toLowerCase().includes('application/json')) {
        try {
          const data = JSON.parse(init.body);
          const project = projectForAiRef.current;
          if (project && data && typeof data === 'object' && !Array.isArray(data)) {
            data.projectContext = buildBrandContext(project).slice(0, 6000);
            return originalFetch(input, { ...init, body: JSON.stringify(data) });
          }
        } catch { /* Not JSON: do not modify request */ }
      }
      return originalFetch(input, init);
    }) as typeof fetch;
    return () => { window.fetch = originalFetch; };
  }, []);

  const setActiveProjectId = (id: string) => {
    setSelectedInspirationForAnalysis(null);
    setActiveProjectIdState(id);
    showToast('פרויקט נבחר הוחלף בהצלחה', 'info');
  };

  const createProject = (name: string, clientName = ''): Project => {
    const newProj: Project = {
      id: 'proj-' + Date.now(),
      name: name || 'פרויקט עיצוב חדש',
      clientName,
      brief: { ...Object.fromEntries(Object.keys(defaultBrief).map(key => [key, ''])), budgetLevel: 'בינוני', clientName, productOrService: name } as Project['brief'],
      brand: {},
      creativeProfile: defaultPreferences.creativeProfile,
      designAssets: [],
  savedInspirations: [],
      concepts: [],
      colorPalettes: [],
      typographyDesigns: [],
      mockups: [],
      gestaltConcepts: [],
      generatedImages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [newProj, ...prev]);
    setSelectedInspirationForAnalysis(null);
    setActiveProjectIdState(newProj.id);
    showToast(`הפרויקט "${newProj.name}" נוצר בהצלחה!`, 'success');
    return newProj;
  };

  const updateActiveProject = (updater: (prev: Project) => Project) => {
    setProjects((prev) =>
      prev.map((proj) => {
        if (proj.id === activeProject.id) {
          const updated = updater(proj);
          return { ...updated, updatedAt: Date.now() };
        }
        return proj;
      })
    );
  };

  const deleteProject = (id: string) => {
    if (projects.length <= 1) {
      showToast('לא ניתן למחוק את הפרויקט היחיד. צור פרויקט חדש תחילה.', 'error');
      return;
    }
    const removed = projects.find(p => p.id === id);
    // Delete image bytes as well as their project metadata.
    if (removed?.designAssets?.length) void Promise.allSettled(removed.designAssets.map(a => deleteDesignImage(a.id)));
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setSelectedInspirationForAnalysis(null);
      setActiveProjectIdState(filtered[0].id);
    }
    showToast('הפרויקט נמחק', 'info');
  };

  const duplicateProject = (id: string) => {
    const target = projects.find((p) => p.id === id);
    if (!target) return;
    const duplicated: Project = {
      ...JSON.parse(JSON.stringify(target)),
      designAssets: [], // Images are stored outside JSON; never share mutable blob IDs across projects.
      id: 'proj-' + Date.now(),
      name: `${target.name} (עותק)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setProjects((prev) => [duplicated, ...prev]);
    setSelectedInspirationForAnalysis(null);
    setActiveProjectIdState(duplicated.id);
    showToast('הפרויקט שוכפל בהצלחה', 'success');
  };

  const exportProjectBackup = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(projects, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `inspira_studio_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast('גיבוי JSON הורד. קובצי תמונות נשארים באחסון הדפדפן ואינם כלולים בגיבוי.', 'info');
  };

  const importProjectBackup = (jsonContent: string): boolean => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name) {
        setProjects(parsed);
        setActiveProjectIdState(parsed[0].id);
        showToast(`נטענו ${parsed.length} פרויקטים בהצלחה מגיבוי!`, 'success');
        return true;
      }
      showToast('קובץ הגיבוי אינו תקין', 'error');
      return false;
    } catch (e) {
      showToast('שגיאה בפענוח קובץ הגיבוי', 'error');
      return false;
    }
  };

  const updateGlobalPrefs = (partial: Partial<GlobalPreferences>) => {
    setGlobalPrefs((prev) => ({ ...prev, ...partial }));
    showToast('העדפות קריאייטיב עודכנו', 'info');
  };

  return (
    <ProjectContext.Provider
      value={{
        activeModule,
        setActiveModule,
        projects,
        activeProject,
        setActiveProjectId,
        createProject,
        updateActiveProject,
        deleteProject,
        duplicateProject,
        exportProjectBackup,
        importProjectBackup,
        globalPrefs,
        updateGlobalPrefs,
        selectedInspirationForAnalysis,
        setSelectedInspirationForAnalysis,
        selectedConceptForVisual,
        setSelectedConceptForVisual,
        selectedArtworkForMockup,
        setSelectedArtworkForMockup,
        selectedImageForShadowMaster,
        setSelectedImageForShadowMaster,
        toast,
        showToast,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = () => {
  const context = useContext(ProjectContext);
  if (!context) throw new Error('useProject must be used within ProjectProvider');
  return context;
};
