'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';
import TaskDetailDrawer from '@/core/components/TaskDetailDrawer';
import { useProjectDetail } from './hooks/useProjectDetail';
import ProjectHeader from './components/ProjectHeader';
import OverviewTab from './components/OverviewTab';
import KanbanTab from './components/KanbanTab';
import ListTab from './components/ListTab';
import CalendarTab from './components/CalendarTab';
import FilesTab from './components/FilesTab';
import MaterialsTab from './components/MaterialsTab';
import ActivityTab from './components/ActivityTab';
import ChatSidebar from './components/ChatSidebar';
import SettingsModal from './components/SettingsModal';
import DispatchModal from './components/DispatchModal';
import CreateTaskModal from './components/CreateTaskModal';
import TaskFilterSidebar from '@/core/components/TaskFilterSidebar';

interface Props {
  projectId: string;
}

export default function ProjectDetailModule({ projectId }: Props) {
  const ctx = useProjectDetail(projectId);

  // ─── Loading State ───
  if (ctx.loading) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 gap-3 flex-col">
        <Loader2 className="animate-spin h-8 w-8 text-emerald-500" />
        <span className="text-sm font-bold text-zinc-500">Cargando obra...</span>
      </div>
    );
  }

  // ─── Error State ───
  if (ctx.error || !ctx.project) {
    return (
      <div className="flex items-center justify-center h-full text-zinc-400 gap-3 flex-col">
        <span className="text-red-400 text-sm font-bold">⚠️ {ctx.error || 'Proyecto no encontrado.'}</span>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] bg-[#121315] relative overflow-hidden">
      {/* Dimmed backdrop overlay when mobile sidebar is open */}
      {!ctx.sidebarCollapsed && (ctx.activeTab === 'kanban' || ctx.activeTab === 'list') && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/60 z-40 transition-opacity duration-300"
          onClick={() => ctx.setSidebarCollapsed(true)}
        />
      )}

      {/* ─── MAIN CONTENT PANEL ─── */}
      <div className="flex-1 overflow-y-auto space-y-6 p-6 text-center scrollbar-thin scrollbar-thumb-zinc-900">
        <ProjectHeader
          project={ctx.project}
          isAdmin={ctx.isAdmin}
          isChatOpen={ctx.isChatOpen}
          setIsChatOpen={ctx.setIsChatOpen}
          setIsSettingsOpen={ctx.setIsSettingsOpen}
          activeTab={ctx.activeTab}
          setActiveTab={ctx.setActiveTab}
          sidebarCollapsed={ctx.sidebarCollapsed}
          setSidebarCollapsed={ctx.setSidebarCollapsed}
        />

        {/* TAB: OVERVIEW */}
        {ctx.activeTab === 'overview' && (
          <OverviewTab
            project={ctx.project}
            employees={ctx.employees}
            projectFolders={ctx.projectFolders}
            projectDocuments={ctx.projectDocuments}
            handleUploadBanner={ctx.handleUploadBanner}
            handleUploadGalleryImage={ctx.handleUploadGalleryImage}
            uploadingFile={ctx.uploadingFile}
            token={ctx.token}
          />
        )}

        {/* TAB: KANBAN */}
        {ctx.activeTab === 'kanban' && (
          <KanbanTab
            getColumnTasks={ctx.getColumnTasks}
            employees={ctx.employees}
            setIsCreateOpen={ctx.setIsCreateOpen}
            onDragEnd={ctx.onDragEnd}
            handleToggleCheck={ctx.handleToggleCheck}
            handleOpenTask={ctx.handleOpenTask}
            handleEditTask={ctx.handleEditTask}
            handleDeleteTask={ctx.handleDeleteTask}
            loadProjectTasks={ctx.loadProjectTasks}
            documentMap={ctx.documentMap}
          />
        )}

        {/* TAB: LIST */}
        {ctx.activeTab === 'list' && (
          <ListTab
            filteredTasks={ctx.filteredTasks}
            setIsCreateOpen={ctx.setIsCreateOpen}
            handleToggleCheck={ctx.handleToggleCheck}
            setSelectedTask={ctx.setSelectedTask}
            setIsTaskDrawerOpen={ctx.setIsTaskDrawerOpen}
          />
        )}

        {/* TAB: CALENDAR */}
        {ctx.activeTab === 'calendar' && (
          <CalendarTab
            currentDate={ctx.currentDate}
            getCalendarDays={ctx.getCalendarDays}
            nextMonth={ctx.nextMonth}
            prevMonth={ctx.prevMonth}
            getTasksForDate={ctx.getTasksForDate}
            setSelectedTask={ctx.setSelectedTask}
            setIsTaskDrawerOpen={ctx.setIsTaskDrawerOpen}
          />
        )}

        {/* TAB: FILES */}
        {ctx.activeTab === 'files' && (
          <FilesTab
            fileFilterDept={ctx.fileFilterDept}
            setFileFilterDept={ctx.setFileFilterDept}
            fileFilterExt={ctx.fileFilterExt}
            setFileFilterExt={ctx.setFileFilterExt}
            selectedUploadDept={ctx.selectedUploadDept}
            setSelectedUploadDept={ctx.setSelectedUploadDept}
            uploadingFile={ctx.uploadingFile}
            handleDirectFileUpload={ctx.handleDirectFileUpload}
            getDirectProjectFiles={ctx.getDirectProjectFiles}
            getEvidenceFiles={ctx.getEvidenceFiles}
            token={ctx.token}
          />
        )}

        {/* TAB: MATERIALS BOM */}
        {ctx.activeTab === 'materials' && (
          <MaterialsTab
            materials={ctx.materials}
            loadingMaterials={ctx.loadingMaterials}
            dispatchHistory={ctx.dispatchHistory}
            loadingHistory={ctx.loadingHistory}
            setIsDispatchModalOpen={ctx.setIsDispatchModalOpen}
            setDispatchForm={ctx.setDispatchForm}
            dispatchForm={ctx.dispatchForm}
            handleExportCSV={ctx.handleExportCSV}
          />
        )}

        {/* TAB: ACTIVITY LOG */}
        {ctx.activeTab === 'activity' && (
          <ActivityTab
            activityMemberFilter={ctx.activityMemberFilter}
            setActivityMemberFilter={ctx.setActivityMemberFilter}
            employees={ctx.employees}
            getProjectActivities={ctx.getProjectActivities}
          />
        )}
      </div>

      {/* ─── RIGHT SIDEBAR: FILTERS ─── */}
      {(ctx.activeTab === 'kanban' || ctx.activeTab === 'list') && (
        <TaskFilterSidebar
          sidebarCollapsed={ctx.sidebarCollapsed}
          setSidebarCollapsed={ctx.setSidebarCollapsed}
          filterArea={ctx.filterArea}
          setFilterArea={ctx.setFilterArea}
          filterPriority={ctx.filterPriority}
          setFilterPriority={ctx.setFilterPriority}
          filterAssignee={ctx.filterAssignee}
          setFilterAssignee={ctx.setFilterAssignee}
          employees={ctx.employees}
        />
      )}

      {/* ─── RIGHT SIDEBAR: CHAT ─── */}
      {ctx.isChatOpen && (
        <ChatSidebar
          messages={ctx.messages}
          newMessage={ctx.newMessage}
          setNewMessage={ctx.setNewMessage}
          sendingMsg={ctx.sendingMsg}
          messagesEndRef={ctx.messagesEndRef}
          currentUser={ctx.currentUser}
          handleSendMessage={ctx.handleSendMessage}
          setIsChatOpen={ctx.setIsChatOpen}
        />
      )}

      {/* ─── MODALS ─── */}
      {ctx.isSettingsOpen && (
        <SettingsModal
          isSettingsOpen={ctx.isSettingsOpen}
          setIsSettingsOpen={ctx.setIsSettingsOpen}
          settingsForm={ctx.settingsForm}
          setSettingsForm={ctx.setSettingsForm}
          savingSettings={ctx.savingSettings}
          handleSaveSettings={ctx.handleSaveSettings}
          employees={ctx.employees}
        />
      )}

      {ctx.isDispatchModalOpen && (
        <DispatchModal
          isDispatchModalOpen={ctx.isDispatchModalOpen}
          setIsDispatchModalOpen={ctx.setIsDispatchModalOpen}
          dispatchForm={ctx.dispatchForm}
          setDispatchForm={ctx.setDispatchForm}
          actionLoading={ctx.actionLoading}
          handleDispatchSubmit={ctx.handleDispatchSubmit}
          inventoryItems={ctx.inventoryItems}
        />
      )}

      {ctx.isCreateOpen && (
        <CreateTaskModal
          isCreateOpen={ctx.isCreateOpen}
          setIsCreateOpen={ctx.setIsCreateOpen}
          createForm={ctx.createForm}
          setCreateForm={ctx.setCreateForm}
          handleCreateSubmit={ctx.handleCreateSubmit}
          employees={ctx.employees}
        />
      )}

      {/* ─── TASK DETAIL SLIDE-OVER DRAWER ─── */}
      <TaskDetailDrawer
        task={ctx.selectedTask}
        isOpen={ctx.isTaskDrawerOpen}
        onClose={ctx.handleCloseTaskDrawer}
        employees={ctx.employees}
        user={ctx.currentUser}
        projects={[ctx.project]}
        onTaskUpdated={ctx.loadProjectTasks}
        initialEditMode={ctx.taskDrawerEditMode}
      />
    </div>
  );
}
