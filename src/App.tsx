import { GeminiSetup } from './components/layout/GeminiSetup';
import React, { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { Navbar } from './components/layout/Navbar';
import { Sidebar } from './components/layout/Sidebar';
import { PropertyPanel } from './components/layout/PropertyPanel';
import { SettingsModal } from './components/layout/SettingsModal';
import { Dashboard } from './components/modules/Dashboard';
import { InspirationHunter } from './components/modules/InspirationHunter';
import { CreativeDirector } from './components/modules/CreativeDirector';
import { IdeaFactory } from './components/modules/IdeaFactory';
import { CreativeAnalyzer } from './components/modules/CreativeAnalyzer';
import { ColorLaboratory } from './components/modules/ColorLaboratory';
import { TypographyPlayground } from './components/modules/TypographyPlayground';
import { MockupMaster } from './components/modules/MockupMaster';
import { GestaltLab } from './components/modules/GestaltLab';
import { InspirationMixer } from './components/modules/InspirationMixer';
import { DesignAnalyzer } from './components/modules/DesignAnalyzer';
import { VisualGenerator } from './components/modules/VisualGenerator';
import { ExportStudio } from './components/modules/ExportStudio';
import { ShadowMasterPro } from './components/modules/ShadowMasterPro';
import { SystemHealthDashboard } from './components/modules/SystemHealthDashboard';
import { Icon } from './components/common/Icon';

const MainWorkspace: React.FC = () => {
  const { activeModule, toast } = useProject();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

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
    <div className="flex flex-col h-screen w-screen overflow-hidden dekel-app bg-[#183036] text-[#F7F8F3] font-['Heebo',sans-serif]">
      <GeminiSetup />{/* Top Navigation */}
      <Navbar onOpenSettings={() => setIsSettingsOpen(true)} />

      {/* Main Studio Body: Left (PropertyPanel) | Center (Workspace) | Right (RTL Sidebar) */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Contextual Tool Properties */}
        <PropertyPanel />

        {/* Center: Main Active Workspace */}
        <main className="flex-1 h-full overflow-hidden bg-[#183036] relative flex flex-col">
          {renderActiveModule()}
        </main>

        {/* Right: Primary RTL Navigation Sidebar */}
        <Sidebar
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
      </div>

      {/* Settings & Integrations Modal */}
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />

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
      localStorage.removeItem('inspira_studio_projects_v1');
      localStorage.removeItem('inspira_studio_active_id_v1');
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
      <ProjectProvider>
        <MainWorkspace />
      </ProjectProvider>
    </AppErrorBoundary>
  );
}
