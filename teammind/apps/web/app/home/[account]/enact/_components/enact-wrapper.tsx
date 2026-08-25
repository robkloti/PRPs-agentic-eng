'use client'

import { useState, Suspense, useEffect, useRef } from 'react';
import { Card } from '@tm/ui/card';
import { Spinner } from '@tm/ui/spinner';
import { Button } from '@tm/ui/button';
import { LayoutDashboard, MessageSquare, X } from 'lucide-react';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { ActionItemsBoard, type ActionItemStatus } from './board/action-items-board';
import { EnactSidebar } from './enact-sidebar';
import { Task } from './board/task-card';
import { TaskDetailsDialog } from './board/task-details-dialog';
import EnactRuntime from './enact-runtime';
import { useMediaQuery } from '@tm/ui/utils';
import { cn } from '@tm/ui/utils';

interface Props {
  userId: string;
  accountSlug: string;
}

// Skeleton for the ActionItemsBoard
function ActionItemsBoardSkeleton() {
  return (
    <div className="space-y-4 w-full h-full">
      <div className="flex justify-between items-center mb-4 px-4">
        <div className="h-8 w-32 bg-muted rounded animate-pulse"></div>
        <div className="h-10 w-40 bg-muted rounded animate-pulse"></div>
      </div>

      <div className="flex gap-4 overflow-x-auto px-4 pb-4 h-[calc(100%-70px)]">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex-shrink-0 w-1/3 h-full bg-primary-foreground rounded-lg border">
            <div className="h-14 border-b p-4">
              <div className="h-5 w-24 bg-muted rounded animate-pulse"></div>
            </div>
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((j) => (
                <div key={j} className="h-24 bg-card rounded-lg border animate-pulse"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function EnactWrapper({ userId, accountSlug }: Props) {
  // Create a ref to hold the single runtime instance
  const runtimeRef = useRef<React.ReactNode | null>(null);

  const supabase = useSupabase();
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [activeView, setActiveView] = useState<'board' | 'chat'>('board');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWrapperExpanded, setIsWrapperExpanded] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)"); // 1024px is the 'lg' breakpoint
  const [runtimeLoaded, setRuntimeLoaded] = useState(false);

  // Handle sidebar and wrapper animations (desktop only)
  useEffect(() => {
    if (selectedTask) {
      // First expand the wrapper
      setIsWrapperExpanded(true);
      // Then open the sidebar after a brief delay
      setTimeout(() => setIsSidebarOpen(true), 150);
    } else {
      // First close the sidebar
      setIsSidebarOpen(false);
      // Then collapse the wrapper after sidebar animation completes
      setTimeout(() => setIsWrapperExpanded(false), 300);
    }
  }, [selectedTask]);

  const handleTaskSelect = async (task: Task) => {
    setIsLoading(true);
    setSelectedTask(task);

    // Set initial chat message for the selected task
    sessionStorage.setItem('chatInitialMessage',
      `Help me with this task: ${task.content}${task.summary ? '\n\nSummary: ' + task.summary : ''}`
    );

    // Automatically switch to chat view in sidebar mode
    setActiveView('chat');

    // Auto-set the task to "in_progress" if it's not already
    if (task.columnId !== 'in_progress' && task.originalStatus !== 'in_progress') {
      try {
        const { error } = await supabase
          .from('document_action_items')
          .update({
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', task.id);

        if (error) throw error;

        // Update local task state
        setSelectedTask({
          ...task,
          columnId: 'in_progress',
          originalStatus: 'in_progress'
        });

        // Trigger a refresh to update the board
        setRefreshTrigger(prev => prev + 1);

      } catch (error) {
        console.error("Error updating task status:", error);
      }
    }

    // Initialize runtime if needed
    if (!runtimeLoaded) {
      setRuntimeLoaded(true);
    }

    // Simulate loading time for thread content
    setTimeout(() => setIsLoading(false), 500);
  };

  const handleCloseSidebar = () => {
    // For desktop, animation happens through useEffect
    setSelectedTask(null);
    // Clear chat session and return to board view
    sessionStorage.removeItem('chatInitialMessage');
    setActiveView('board');
  };

  const handleStatusChange = (taskId: number, newStatus: ActionItemStatus) => {
    // If the currently selected task status is updated, update the selectedTask state
    if (selectedTask && selectedTask.id === taskId) {
      setSelectedTask({
        ...selectedTask,
        columnId: newStatus === 'backlog' ? 'todo' :
          newStatus === 'blocked' ? 'in_progress' : newStatus,
        originalStatus: newStatus
      });
    }

    // Trigger a refresh to update the board
    setRefreshTrigger(prev => prev + 1);
  };

  // Function to handle showing task details
  const handleShowDetails = (task: Task) => {
    setDetailsTask(task);
  };

  // Function to handle moving to ignored (archive)
  const handleMoveToIgnored = async (taskId: number) => {
    try {
      const { error } = await supabase
        .from('document_action_items')
        .update({
          status: 'ignored',
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      // Close the dialog after action
      setDetailsTask(null);

      // If the currently selected task is being archived, close the sidebar
      if (selectedTask && selectedTask.id === taskId) {
        handleCloseSidebar();
      }

      // Refresh the board to reflect changes
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error("Error archiving task:", error);
    }
  };

  // Initialize the EnactRuntime once and store in ref
  if (!runtimeRef.current && (selectedTask || runtimeLoaded)) {
    runtimeRef.current = (
      <div className="h-full">
        <Suspense fallback={<div className="flex h-full items-center justify-center"><Spinner className="size-6" /></div>}>
          <EnactRuntime
            userId={userId}
            accountSlug={accountSlug}
            isInSidebar={true}
          />
        </Suspense>
      </div>
    );
  }

  // Shared chat component - uses the ref or shows loading state
  const chatComponent = isLoading ? (
    <div className="flex h-full items-center justify-center">
      <Spinner className="size-6" />
    </div>
  ) : runtimeRef.current;

  // Mobile view toggle buttons
  const viewToggle = !selectedTask ? null : (
    <div className="lg:hidden flex border-b p-2 gap-2 bg-background">
      <Button
        variant={activeView === 'board' ? 'default' : 'outline'}
        className="flex-1"
        onClick={() => setActiveView('board')}
      >
        <LayoutDashboard className="h-4 w-4 mr-2" />
        Board
      </Button>
      <Button
        variant={activeView === 'chat' ? 'default' : 'outline'}
        className="flex-1"
        onClick={() => setActiveView('chat')}
      >
        <MessageSquare className="h-4 w-4 mr-2" />
        Chat
      </Button>
    </div>
  );

  return (
    <div className="w-full h-[calc(100vh-80px)]">
      <Card
        className={`w-full h-full shadow-sm overflow-hidden transition-all duration-500 ease-in-out ${selectedTask ? 'lg:max-w-full' : 'lg:max-w-screen-xl lg:mx-auto'
          } ${isWrapperExpanded ? 'max-w-full' : 'max-w-screen-xl mx-auto'
          }`}
      >
        {/* Stable action items board instance that never unmounts */}
        <div className="h-full">
          {isDesktop ? (
            <div className="h-full">
              {selectedTask ? (
                <EnactSidebar
                  onClose={handleCloseSidebar}
                  isOpen={isSidebarOpen}
                  chat={chatComponent}
                >
                  <div className="h-full">
                    <Suspense fallback={<ActionItemsBoardSkeleton />}>
                      <ActionItemsBoard
                        key={refreshTrigger}
                        sidebarOpen={true}
                        onTaskSelect={handleTaskSelect}
                        selectedTaskId={selectedTask?.id}
                        onStatusChange={handleStatusChange}
                        onShowDetails={handleShowDetails}
                        onArchive={handleMoveToIgnored}
                      />
                    </Suspense>
                  </div>
                </EnactSidebar>
              ) : (
                <div className="h-full">
                  <Suspense fallback={<ActionItemsBoardSkeleton />}>
                    <ActionItemsBoard
                      key={refreshTrigger}
                      sidebarOpen={false}
                      onTaskSelect={handleTaskSelect}
                      onStatusChange={handleStatusChange}
                      onShowDetails={handleShowDetails}
                      onArchive={handleMoveToIgnored}
                    />
                  </Suspense>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {viewToggle}

              <div className="flex-grow overflow-hidden">
                {/* Use CSS to show/hide instead of conditional rendering */}
                <div className={cn(
                  "h-full transition-all",
                  !selectedTask || activeView === 'board' ? "opacity-100 z-10" : "opacity-0 z-0 absolute inset-0 pointer-events-none"
                )}>
                  <Suspense fallback={<ActionItemsBoardSkeleton />}>
                    <ActionItemsBoard
                      key={refreshTrigger}
                      sidebarOpen={activeView !== 'board'}
                      onTaskSelect={handleTaskSelect}
                      selectedTaskId={selectedTask?.id}
                      onStatusChange={handleStatusChange}
                      onShowDetails={handleShowDetails}
                      onArchive={handleMoveToIgnored}
                    />
                  </Suspense>
                </div>

                {selectedTask && (
                  <div className={cn(
                    "relative h-full transition-all",
                    activeView === 'chat' ? "opacity-100 z-10" : "opacity-0 z-0 absolute inset-0 pointer-events-none"
                  )}>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute right-4 top-4 z-10"
                      onClick={handleCloseSidebar}
                    >
                      <X className="h-4 w-4" />
                      <span className="sr-only">Close sidebar</span>
                    </Button>
                    {chatComponent}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {detailsTask && (
          <TaskDetailsDialog
            task={detailsTask}
            isOpen={!!detailsTask}
            onClose={() => setDetailsTask(null)}
            onMoveToIgnored={handleMoveToIgnored}
          />
        )}
      </Card>
    </div>
  );
}