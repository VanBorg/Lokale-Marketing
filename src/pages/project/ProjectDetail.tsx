import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { useProject } from '../../hooks/useProject';
import ProjectSidePanel from './ProjectSidePanel';
import TabBlauwdruk from './tabs/TabBlauwdruk';
import TabMaterialen from './tabs/TabMaterialen';
import TabUren from './tabs/TabUren';
import TabOfferte from './tabs/TabOfferte';
import TabContract from './tabs/TabContract';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const { project, loading, updateProject, resetProject } = useProject(id);
  const [activeTab, setActiveTab] = useState('blauwdruk');

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <div className="h-8 w-8 rounded-full border-2 border-dark-border border-t-accent animate-spin" />
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-light/50 text-lg">Project niet gevonden</p>
      </div>
    );
  }

  // Blauwdruk is full-screen — no side panel
  if (activeTab === 'blauwdruk') {
    return (
      <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden w-full">
        <TabBlauwdruk
          project={project}
          onUpdateProject={updateProject}
          onTabChange={setActiveTab}
        />
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      <ProjectSidePanel
        project={project}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onUpdate={updateProject}
        onReset={resetProject}
      />
      <div className="flex-1 min-w-0 overflow-auto p-6">
        {activeTab === 'materialen' && <TabMaterialen />}
        {activeTab === 'uren' && <TabUren />}
        {activeTab === 'offerte' && <TabOfferte />}
        {activeTab === 'contract' && <TabContract />}
      </div>
    </div>
  );
}
