
import React, { useEffect, useState, lazy, Suspense } from 'react';
import { WelcomeTour } from './components/layout/WelcomeTour';
import { AccountGate } from './components/layout/AccountGate';
import { userStorageKey } from './data/accountStorage';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PropertyPanel } from './components/layout/PropertyPanel';
import { SettingsModal } from './components/layout/SettingsModal';
const Dashboard = lazy(() => import('./components/modules/Dashboard').then(module => ({default:module.Dashboard})));
const InspirationHunter = lazy(() => import('./components/modules/InspirationHunter').then(module => ({default:module.InspirationHunter})));
const CreativeDirector = lazy(() => import('./components/modules/CreativeDirector').then(module => ({default:module.CreativeDirector})));
const IdeaFactory = lazy(() => import('./components/modules/IdeaFactory').then(module => ({default:module.IdeaFactory})));
const CreativeAnalyzer = lazy(() => import('./components/modules/CreativeAnalyzer').then(module => ({default:module.CreativeAnalyzer})));
const ColorLaboratory = lazy(() => import('./components/modules/ColorLaboratory').then(module => ({default:module.ColorLaboratory})));
const TypographyPlayground = lazy(() => import('./components/modules/TypographyPlayground').then(module => ({default:module.TypographyPlayground})));
const MockupMaster = lazy(() => import('./components/modules/MockupMaster').then(module => ({default:module.MockupMaster})));
const GestaltLab = lazy(() => import('./components/modules/GestaltLab').then(module => ({default:module.GestaltLab})));
const InspirationMixer = lazy(() => import('./components/modules/InspirationMixer').then(module => ({default:module.InspirationMixer})));
const DesignAnalyzer = lazy(() => import('./components/modules/DesignAnalyzer').then(module => ({default:module.DesignAnalyzer})));
const VisualGenerator = lazy(() => import('./components/modules/VisualGenerator').then(module => ({default:module.VisualGenerator})));
const ExportStudio = lazy(() => import('./components/modules/ExportStudio').then(module => ({default:module.ExportStudio})));
const ShadowMasterPro = lazy(() => import('./components/modules/ShadowMasterPro').then(module => ({default:module.ShadowMasterPro})));
const SystemHealthDashboard = lazy(() => import('./components/modules/SystemHealthDashboard').then(module => ({default:module.SystemHealthDashboard})));
import { Icon } from './components/common/Icon';

const MainWorkspace: React.FC = () => {
  const { activeModule, setActiveModule, toast, saveStatus, exportProjectBackup, exportProjectMetadata, cloudStatus } = useProject();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => window.innerWidth < 1024);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab,setSettingsTab]=useState<'creative'|'connection'>('creative');
  useEffect(()=>{const open=()=>{setSettingsTab('connection');setIsSettingsOpen(true);};window.addEventListener('dekel-open-settings',open);return()=>window.removeEventListener('dekel-open-settings',open);},[]);
  const [isTourOpen, setIsTourOpen] = useState(() => {
    try { return localStorage.getItem(userStorageKey('dekel-welcome-tour-v1')) !== 'done'; } catch { return true; }
  });
  const closeTour = () => {
    try { localStorage.setItem(userStorageKey('dekel-welcome-tour-v1'), 'done'); } catch { /* The tour still closes if browser storage is full. */ }
    setIsTourOpen(false);
  };

  const renderActiveModule = () => {
    switch (activeModule) {
      case 'dashboard':
        return <Dashboard />;
      case 'inspiration_hunter':
        return <InspirationHunter />;
      case 'creative_director':
        return <CreativeDirector />;
      case 'idea_factory':
        return <IdeaFactory />;
      case 'creative_analyzer':
        return <CreativeAnalyzer />;
      case 'color_lab':
        return <ColorLaboratory />;
      case 'typography_playground':
        return <TypographyPlayground />;
      case 'mockup_master':
        return <MockupMaster />;
      case 'gestalt_lab':
        return <GestaltLab />;
      case 'inspiration_mixer':
        return <InspirationMixer />;
      case 'design_analyzer':
        return <DesignAnalyzer />;
      case 'visual_generator':
        return <VisualGenerator />;
      case 'export_studio':
        return <ExportStudio />;
      case 'shadow_master':
        return <ShadowMasterPro />;
      case 'system_health':
        return <SystemHealthDashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden dekel-app bg-[#183036] text-[#F7F8F3] font-['Heebo',sans-serif]">
      <Navbar onOpenSettings={() => {setSettingsTab('creative');setIsSettingsOpen(true);}} onOpenTour={() => setIsTourOpen(true)} />
      <WelcomeTour key={isTourOpen ? 'tour-open' : 'tour-closed'} open={isTourOpen} onClose={closeTour} />

      <div role={saveStatus === 'error' ? 'alert' : 'status'} className={saveStatus === 'error' ? 'bg-red-950 px-4 py-2 text-sm text-red-100' : 'bg-[#103F46] px-4 py-1 text-xs text-zinc-200'}>
        {saveStatus === 'error' ? <>השמירה במכשיר נכשלה. הורד גיבוי לפני סגירת האתר. <button onClick={exportProjectMetadata} className="underline font-bold">הורד גיבוי נתונים בחירום (ללא תמונות)</button></> : saveStatus === 'saving' ? 'שומר…' : <>נשמר במכשיר הזה · {cloudStatus}</>}
      </div>
      <nav aria-label="מסלול העבודה" dir="rtl" className="flex shrink-0 gap-2 overflow-x-auto whitespace-nowrap border-b border-[#31535A] px-3 py-2 text-xs text-zinc-200">{([['creative_director','בריף וקונספט'],['inspiration_hunter','השראות'],['idea_factory','פיתוח רעיונות'],['visual_generator','יצירת תמונה'],['export_studio','ייצוא']] as const).map(([module,label],index)=><button key={module} aria-current={activeModule===module?'step':undefined} onClick={()=>setActiveModule(module)} className={activeModule===module?'rounded bg-[#43D6CB] px-3 py-1 font-bold text-[#183036]':'rounded border border-[#31535A] px-3 py-1'}>{index+1}. {label}</button>)}</nav>
      {/* Main Studio Body: Left (PropertyPanel) | Center (Workspace) | Right (RTL Sidebar) */}
      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Left: Contextual Tool Properties */}
        <PropertyPanel />

        {/* Center: Main Active Workspace */}
        <main className="flex-1 h-full overflow-hidden bg-[#183036] relative flex flex-col">
          <Suspense fallback={<p role="status" className="p-6 text-white">טוען כלי…</p>}>{renderActiveModule()}</Suspense>
        </main>

        {/* Right: Primary RTL Navigation Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Settings & Integrations Modal */}
      <SettingsModal isOpen={isSettingsOpen} initialTab={settingsTab} onClose={() => setIsSettingsOpen(false)} />

      {/* Toast Notification Alert */}
      {toast && (
        <div className="fixed bottom-6 left-6 z-50 animate-in fade-in slide-in-from-bottom-3">
          <div
            className={`px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-bold border backdrop-blur-md ${
              toast.type === 'error'
                ? 'bg-red-500/90 text-white border-red-400'
                : toast.type === 'info'
                ? 'bg-[#103F46]/95 text-zinc-200 border-zinc-700'
                : 'bg-[#43D6CB]/95 text-white border-blue-400'
            }`}
          >
            <Icon
              name={
                toast.type === 'error'
                  ? 'Info'
                  : toast.type === 'info'
                  ? 'Info'
                  : 'Check'
              }
              className="w-4 h-4 flex-shrink-0"
            />
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
};

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class AppErrorBoundary extends React.Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    try {
      localStorage.removeItem(userStorageKey('inspira_studio_projects_v1'));
      localStorage.removeItem(userStorageKey('inspira_studio_active_id_v1'));
    } catch (e) {}
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-screen bg-[#183036] text-[#F7F8F3] flex items-center justify-center p-6 text-right font-['Heebo',sans-serif]">
          <div className="max-w-md w-full bg-[#103F46] border border-zinc-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-[#43D6CB]">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center font-bold text-lg text-[#43D6CB]">
                AI
              </div>
              <div>
                <h2 className="text-base font-bold text-white">שחזור תצוגת דקל AI STUDIO</h2>
                <p className="text-xs text-zinc-400">אותרה אי-התאמה בתצוגת הדפדפן</p>
              </div>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              המערכת זיהתה תקלת תצוגה מקומית. ניתן לרענן את המסך או לאפס את הזיכרון המקומי להחזרת סביבת העבודה לפעולה תקינה.
            </p>

            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800">
              <button
                onClick={() => window.location.reload()}
                className="flex-1 py-2 px-3 bg-[#43D6CB] hover:bg-blue-600 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                רענן עמוד
              </button>
              <button
                onClick={this.handleReset}
                className="flex-1 py-2 px-3 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-xl text-xs font-bold transition border border-zinc-700 cursor-pointer"
              >
                איפוס נתונים מקומיים
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  return (
    <AppErrorBoundary>
      <AccountGate>
      <ProjectProvider>
        <MainWorkspace />
      </ProjectProvider>
      </AccountGate>
    </AppErrorBoundary>
  );
}
