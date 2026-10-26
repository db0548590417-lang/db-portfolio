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
import {pendingImageJobs,isImageJobRunning,imageJobStatus,acknowledgeImageJob} from '../data/generationJobs';
import {saveDesignImage,loadDesignImage} from '../data/designAssetsDb';
import {setCloudAssetsEnabled,readCloudWorkspace,writeCloudWorkspace} from '../data/cloudSync';
import { createProjectArchive, readProjectArchive } from '../data/projectBackup';
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
  exportProjectBackup: () => Promise<void>;
  exportProjectMetadata: () => void;
  importProjectFile: (file: File) => Promise<boolean>;
  saveStatus: 'saving' | 'saved' | 'error';
  cloudStatus: string;
  cloudConfigured: boolean;
  syncCloud: () => Promise<void>;
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
    creativeDrafts: Array.isArray(raw.creativeDrafts) ? raw.creativeDrafts : [],
    mixerDraft: raw.mixerDraft,
    ideaFactoryWorkspace: raw.ideaFactoryWorkspace && typeof raw.ideaFactoryWorkspace === 'object' ? { ...raw.ideaFactoryWorkspace, focus: String(raw.ideaFactoryWorkspace.focus || ''), method: String(raw.ideaFactoryWorkspace.method || 'auto'), intensity: Math.max(1, Math.min(5, Number(raw.ideaFactoryWorkspace.intensity) || 3)) } : undefined,
    creativeProfile: ['modern_luxury','hasidic_traditional','bold_brutalist','minimalist'].includes(raw.creativeProfile) ? raw.creativeProfile : defaultPreferences.creativeProfile,
    designAssets: Array.isArray(raw.designAssets) ? raw.designAssets : [],
    savedInspirations: Array.isArray(raw.savedInspirations) ? raw.savedInspirations : [],
    conceptHistory: Array.isArray(raw.conceptHistory) ? raw.conceptHistory : [],
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

  const [saveStatus, setSaveStatus] = useState<'saving' | 'saved' | 'error'>('saved');

  // Sync to localStorage
  useEffect(() => {
    try {
      setSaveStatus('saving');
      localStorage.setItem(userStorageKey(STORAGE_KEY_PROJECTS), JSON.stringify(projects));
      setSaveStatus('saved');
    } catch (e) {
      setSaveStatus('error');
      console.error('Failed to save projects to storage', e);
    }
  }, [projects]);

  useEffect(() => {
    if (activeProjectId) {
      try{localStorage.setItem(userStorageKey(STORAGE_KEY_ACTIVE_ID), activeProjectId);}catch{setSaveStatus('error');}
    }
  }, [activeProjectId]);

  useEffect(() => {
    try{localStorage.setItem(userStorageKey(STORAGE_KEY_PREFS), JSON.stringify(globalPrefs));}catch{setSaveStatus('error');}
  }, [globalPrefs]);

  // The active project is the single source of truth for all AI requests.
  const projectForAiRef = useRef<Project | null>(null);
  const activeProject = sanitizeProject(projects.find((p) => p.id === activeProjectId) || projects[0] || createInitialProject());
  const selectedConceptForVisual = visualConceptSelection?.projectId === activeProject.id ? (activeProject.concepts.find(concept=>concept.id===visualConceptSelection.concept.id) || visualConceptSelection.concept) : null;
  const setSelectedConceptForVisual = (concept: CreativeConcept | null) => setVisualConceptSelection(concept ? { projectId: activeProject.id, concept } : null);
  projectForAiRef.current = activeProject;
  const [cloudConfigured,setCloudConfigured]=useState(false);
  const [cloudStatus,setCloudStatus]=useState('שמירה מקומית');
  const [autoSync,setAutoSync]=useState(false);
  const [syncCycle,setSyncCycle]=useState(0);
  const cloudVersion=useRef(0), cloudBusy=useRef(false), lastSynced=useRef('');
  const projectsRef=useRef(projects);projectsRef.current=projects;
  const syncCloud = async () => {
    if(cloudBusy.current)return;
    cloudBusy.current=true;setCloudStatus('מסנכרן…');
    try {
      const remote=await readCloudWorkspace();
      if(!remote.enabled){setCloudStatus('אחסון ענן טרם הופעל בשרת');return;}
      const incoming=remote.content?JSON.parse(remote.content).projects:[];
      if(!Array.isArray(incoming))throw Error('נתוני הענן אינם תקינים');
      const merged=new Map<string,Project>();
      for(const project of [...incoming,...projectsRef.current]){const item=sanitizeProject(project);if(!merged.has(item.id)||merged.get(item.id)!.updatedAt<item.updatedAt)merged.set(item.id,item);}
      const data=[...merged.values()];
      setCloudAssetsEnabled(true);
      const version=await writeCloudWorkspace(data,remote.version);
      cloudVersion.current=version;lastSynced.current=JSON.stringify(data);
      setProjects(previous=>{const current=new Map(data.map(item=>[item.id,item]));for(const item of previous)if(!current.has(item.id)||current.get(item.id)!.updatedAt<item.updatedAt)current.set(item.id,item);return [...current.values()];});setAutoSync(true);setCloudStatus('נשמר בענן');
      localStorage.setItem(userStorageKey('dekel-cloud-sync'),'on');
    }catch(error:any){setAutoSync(false);setCloudStatus(error.message||'סנכרון הענן נכשל');}
    finally{cloudBusy.current=false;}
  };
  useEffect(()=>{
    let alive=true;
    void fetch('/api/storage').then(r=>r.ok?r.json():{enabled:false}).then(data=>{if(alive){setCloudConfigured(!!data.enabled);if(data.enabled&&localStorage.getItem(userStorageKey('dekel-cloud-sync'))==='on')void syncCloud();}}).catch(()=>{});
    return()=>{alive=false;setCloudAssetsEnabled(false);};
  },[]);
  useEffect(()=>{
    if(!autoSync||JSON.stringify(projects)===lastSynced.current)return;
    const timer=setTimeout(async()=>{
      if(cloudBusy.current)return;
      cloudBusy.current=true;setCloudStatus('מסנכרן…');
      const snapshot=projectsRef.current;
      try{cloudVersion.current=await writeCloudWorkspace(snapshot,cloudVersion.current);lastSynced.current=JSON.stringify(snapshot);setCloudStatus('נשמר בענן');}
      catch(error:any){setAutoSync(false);setCloudStatus(error.message||'הסנכרון נכשל. השמירה המקומית נשמרה.');}
      finally{cloudBusy.current=false;if(JSON.stringify(projectsRef.current)!==lastSynced.current)setSyncCycle(value=>value+1);}
    },1500);
    return()=>clearTimeout(timer);
  },[projects,autoSync,syncCycle]);
  useEffect(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
      const method = (init?.method || (input instanceof Request ? input.method : 'GET')).toUpperCase();
      // Only our JSON POST endpoints are enriched. Never send a project to third-party URLs.
      if (url.startsWith('/api/') && !url.startsWith('/api/auth/') && !url.startsWith('/api/settings/') && method === 'POST' && typeof init?.body === 'string' &&
          (init.headers instanceof Headers ? (init.headers.get('content-type') || '') : JSON.stringify(init.headers || {})).toLowerCase().includes('application/json')) {
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

  useEffect(()=>{
    let stopped=false,busy=false;
    const recover=async()=>{
      if(busy||stopped)return;busy=true;
      try{for(const job of pendingImageJobs()){
        if(stopped||isImageJobRunning(job.id))continue;
        try{
          const result=await imageJobStatus(job.id);
          if(result.state==='failed'){await acknowledgeImageJob(job.id,true);showToast(result.result?.error||'בקשת יצירה נכשלה','error');continue;}
          if(result.state!=='completed'||!result.result?.imageUrl)continue;
          if(!projectsRef.current.some(project=>project.id===job.projectId))continue;
          await saveDesignImage(job.image.id,result.result.imageUrl);
          await saveDesignImage(job.image.id+'-original',result.result.imageUrl);
          setProjects(previous=>previous.map(project=>project.id===job.projectId&&!project.generatedImages.some(image=>image.id===job.image.id)?{...project,generatedImages:[{...job.image,url:''},...project.generatedImages],updatedAt:Date.now()}:project));
          const alreadyPresent=projectsRef.current.some(project=>project.generatedImages.some(image=>image.id===job.image.id));
          await acknowledgeImageJob(job.id);
          if(!alreadyPresent)showToast('יצירה שהושלמה ברקע שוחזרה לפרויקט. ניתן להמשיך לערוך אותה.');
        }catch{/* Keep the recovery handle on temporary network or storage failure. */}
      }}finally{busy=false;}
    };
    void recover();const timer=setInterval(recover,5000);
    return()=>{stopped=true;clearInterval(timer);};
  },[]);

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
    const imageKeys=(project:Project)=>[...(project.designAssets||[]).map(item=>item.id),...project.generatedImages.flatMap(item=>[item.id,item.id+'-original']),...project.savedInspirations.map(item=>'ref-'+item.id)];
    const usedElsewhere=new Set(projects.filter(project=>project.id!==id).flatMap(imageKeys));
    if(removed)void Promise.allSettled(imageKeys(removed).filter(key=>!usedElsewhere.has(key)).map(key=>deleteDesignImage(key)));
    const filtered = projects.filter((p) => p.id !== id);
    setProjects(filtered);
    if (activeProjectId === id) {
      setSelectedInspirationForAnalysis(null);
      setActiveProjectIdState(filtered[0].id);
    }
    showToast('הפרויקט נמחק', 'info');
  };

  const duplicateProject = async (id: string) => {
    const target=projects.find(project=>project.id===id);if(!target)return;
    const createdKeys:string[]=[];
    try{
      const copied:Project=structuredClone(target),refIds=new Map<string,string>();
      const copyImage=async(oldKey:string,newKey:string,required=false)=>{const data=await loadDesignImage(oldKey);if(data){await saveDesignImage(newKey,data);createdKeys.push(newKey);}else if(required)throw Error('לא ניתן לשכפל תמונה חסרה. חבר את הענן או העלה אותה מחדש.');};
      for(const asset of copied.designAssets||[]){const previous=asset.id;asset.id='asset-'+crypto.randomUUID();await copyImage(previous,asset.id,true);}
      for(const image of copied.generatedImages){const previous=image.id;image.id='gen-'+crypto.randomUUID();if(!image.url)await copyImage(previous,image.id,true);await copyImage(previous+'-original',image.id+'-original');}
      for(const ref of copied.savedInspirations){const previous=ref.id;ref.id='ref-'+crypto.randomUUID();refIds.set(previous,ref.id);await copyImage('ref-'+previous,'ref-'+ref.id,ref.source==='מהמחשב');}
      for(const concept of [...copied.concepts,...(copied.conceptHistory||[]),...(copied.creativeDrafts||[])])concept.referenceIds=concept.referenceIds?.map(ref=>refIds.get(ref)||ref);
      for(const image of copied.generatedImages)image.referenceIds=image.referenceIds?.map(ref=>refIds.get(ref)||ref);
      copied.id='proj-'+crypto.randomUUID();copied.name=target.name+' (עותק)';copied.createdAt=Date.now();copied.updatedAt=Date.now();
      setProjects(previous=>[copied,...previous]);setActiveProjectIdState(copied.id);setSelectedInspirationForAnalysis(null);showToast('הפרויקט והתמונות שוכפלו לעותק עצמאי');
    }catch(error:any){await Promise.allSettled(createdKeys.map(key=>deleteDesignImage(key)));showToast(error.message||'שכפול הפרויקט נכשל','error');}
  };

  const exportProjectMetadata = () => {
    const url=URL.createObjectURL(new Blob([JSON.stringify(projects,null,2)],{type:'application/json'}));
    const anchor=document.createElement('a');anchor.href=url;anchor.download='dekel-project-data-'+new Date().toISOString().slice(0,10)+'.json';anchor.click();setTimeout(()=>URL.revokeObjectURL(url),30000);
    showToast('נתוני הפרויקטים הורדו. קובץ זה אינו כולל תמונות.','info');
  };
  const exportProjectBackup = async () => {
    try {
      const blob = await createProjectArchive(projects);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a'); anchor.href = url;
      anchor.download = 'dekel-backup-' + new Date().toISOString().slice(0,10) + '.zip';
      anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 30000);
      showToast('גיבוי ZIP עם כל הפרויקטים והתמונות הורד בהצלחה');
    } catch (error:any) { showToast(error.message || 'הגיבוי נכשל. נסה שוב.', 'error'); }
  };
  const importProjectFile = async (file: File) => {
    try {
      const data = await readProjectArchive(file);
      return importProjectBackup(JSON.stringify(data));
    } catch(error:any) { showToast(error.message || 'ייבוא הגיבוי נכשל', 'error'); return false; }
  };

  const importProjectBackup = (jsonContent: string): boolean => {
    try {
      const parsed = JSON.parse(jsonContent);
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].id && parsed[0].name) {
        setProjects(parsed.map(sanitizeProject));
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
        exportProjectMetadata,
        importProjectFile,
        saveStatus,
        cloudConfigured, cloudStatus, syncCloud,
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
