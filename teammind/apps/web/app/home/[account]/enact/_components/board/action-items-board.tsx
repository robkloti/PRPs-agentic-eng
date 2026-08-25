'use client'

import { useState, useEffect, useCallback } from "react";
import { 
  DndContext, 
  useSensor, 
  useSensors,
  TouchSensor,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  rectIntersection
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { ArchiveIcon } from "lucide-react";
import { useSupabase } from "@tm/supabase/hooks/use-supabase";
import { Button } from "@tm/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "@tm/ui/sheet";
import { ArchivedItemsList } from "./archived-items-list";
import { BoardContainer, BoardColumn } from "./board-column";
import { TaskDetailsDialog } from "./task-details-dialog";
import { Task, TaskCard } from "./task-card";
import { hasDraggableData } from "../utils";
import { Database } from "@tm/supabase/database";

// Map our database enum values to column IDs
export type ActionItemStatus = Database['public']['Enums']['action_item_status_enum'];

// Define columns based on the status enum from the database - reduced to 3
const columns = [
  {
    id: "todo",
    title: "To Do",
  },
  {
    id: "in_progress",
    title: "In Progress",
  },
  {
    id: "done",
    title: "Done",
  },
];

// Interface for our action item from the database
interface ActionItem {
  id: number;
  user_id: string;
  title: string;
  summary: string | null;
  status: ActionItemStatus;
  created_at: string;
  updated_at: string;
}

interface ActionItemsBoardProps {
  sidebarOpen?: boolean;
  selectedTaskId?: number;
  onTaskSelect?: (task: Task) => void;
  onStatusChange?: (taskId: number, newStatus: ActionItemStatus) => void;
  onShowDetails?: (task: Task) => void;
  onArchive?: (taskId: number) => void;
}

export function ActionItemsBoard({
  sidebarOpen = false,
  selectedTaskId,
  onTaskSelect,
  onStatusChange,
  onShowDetails,
  onArchive,
}: ActionItemsBoardProps) {
  const supabase = useSupabase();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [archivedItems, setArchivedItems] = useState<ActionItem[]>([]);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const [detailsTask, setDetailsTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Use PointerSensor with delay to prevent unintended drags
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 100,
        tolerance: 5,
      },
    })
  );

  // Fetch action items on component mount
  useEffect(() => {
    fetchActionItems();
  }, []);

  const fetchActionItems = useCallback(async () => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from('document_action_items')
        .select('*')
        .order('updated_at', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        // Transform action items to tasks for the board - include backlog in todo
        const newTasks: Task[] = data
          .filter(item => ['todo', 'in_progress', 'done', 'backlog', 'blocked'].includes(item.status))
          .map(item => ({
            id: item.id,
            // Map backlog to todo, keep original status 
            columnId: item.status === 'backlog' ? 'todo' : 
                     item.status === 'blocked' ? 'in_progress' : item.status,
            content: item.title,
            updated_at: item.updated_at,
            summary: item.summary || '',
            originalStatus: item.status
          }));
        
        setTasks(newTasks);
        
        // Set archived items (all ignored items)
        setArchivedItems(data.filter(item => item.status === 'ignored'));
      }
    } catch (error) {
      console.error('Error fetching action items:', error);
    } finally {
      setIsLoading(false);
    }
  }, [supabase]);

  async function updateItemStatus(itemId: number, newStatus: ActionItemStatus) {
    try {
      const { error } = await supabase
        .from('document_action_items')
        .update({ 
          status: newStatus, 
          updated_at: new Date().toISOString() 
        })
        .eq('id', itemId);
        
      if (error) {
        console.error('Error updating status in database:', error);
        throw error;
      }
      
      // Notify parent about status change if handler provided
      if (onStatusChange) {
        onStatusChange(itemId, newStatus);
      }
      
      // If moving to ignored, remove from tasks and add to archived
      if (newStatus === 'ignored') {
        const taskToArchive = tasks.find(t => t.id === itemId);
        if (taskToArchive) {
          // Remove from tasks
          setTasks(prevTasks => prevTasks.filter(t => t.id !== itemId));
          
          // Add to archived items
          const archivedItem: ActionItem = {
            id: itemId,
            user_id: '', // This would come from the database
            title: taskToArchive.content,
            summary: taskToArchive.summary || null,
            status: 'ignored',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          
          setArchivedItems(prev => [archivedItem, ...prev]);
          return;
        }
      }
      
      // Otherwise update local state to reflect the change immediately
      setTasks(tasks => 
        tasks.map(task => 
          task.id === itemId 
            ? { 
                ...task, 
                originalStatus: newStatus,
                columnId: newStatus === 'backlog' ? 'todo' : 
                         newStatus === 'blocked' ? 'in_progress' : newStatus
              } 
            : task
        )
      );
    } catch (error) {
      console.error('Error updating action item status:', error);
    }
  }

  async function handleTaskMove(taskId: number, newColumnId: string) {
    // Get the task from current state
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Determine the new status based on the column and original status
    let newStatus: ActionItemStatus;
    
    if (newColumnId === 'todo') {
      // Preserve backlog status if it was backlog before
      newStatus = task.originalStatus === 'backlog' ? 'backlog' : 'todo';
    } else if (newColumnId === 'in_progress') {
      // Preserve blocked status if it was blocked before
      newStatus = task.originalStatus === 'blocked' ? 'blocked' : 'in_progress';
    } else if (newColumnId === 'done') {
      // Always set to done, regardless of previous status
      newStatus = 'done';
    } else {
      newStatus = newColumnId as ActionItemStatus;
    }
    
    // Update the task's status in the database
    await updateItemStatus(taskId, newStatus);
  }

  function onDragStart(event: DragStartEvent) {
    const { active } = event;
    if (!hasDraggableData(active)) return;
    
    if (active.data.current?.type === "Task") {
      const task = tasks.find(t => t.id === active.id);
      if (task) {
        setActiveTask(task);
      }
    }
  }

  function onDragEnd(event: DragEndEvent) {
    setActiveTask(null);

    const { active, over } = event;
    if (!over || !hasDraggableData(active)) return;

    const activeId = active.id;
    const overId = over.id;
    
    // Only process task moves
    if (active.data.current?.type !== "Task") return;
    
    const isOverAColumn = over.data.current?.type === "Column";
    
    // If dropping on a column, update the task's columnId
    if (isOverAColumn) {
      const newColumnId = overId as string;
      
      setTasks(tasks => {
        return tasks.map(task => 
          task.id === activeId 
            ? { ...task, columnId: newColumnId } 
            : task
        );
      });
      
      // Update in database
      handleTaskMove(Number(activeId), newColumnId);
      return;
    }
    
    // If dropping on another task
    const activeIndex = tasks.findIndex(t => t.id === activeId);
    const overIndex = tasks.findIndex(t => t.id === overId);
    
    if (activeIndex !== -1 && overIndex !== -1) {
      const activeTask = tasks[activeIndex];
      const overTask = tasks[overIndex];
      
      // If moving to a different column
      if (activeTask && (activeTask.columnId !== overTask?.columnId)) {
        setTasks(tasks => {
          const updatedTasks = [...tasks];
          updatedTasks[activeIndex] = { ...activeTask, columnId: overTask!.columnId };
          return arrayMove(updatedTasks, activeIndex, overIndex);
        });
        
        // Update in database
        handleTaskMove(Number(activeId), overTask!.columnId);
      } else {
        // Just reordering within the same column
        setTasks(tasks => arrayMove(tasks, activeIndex, overIndex));
      }
    }
  }

  function onDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || !hasDraggableData(active)) return;

    const activeId = active.id;
    const overId = over.id;

    if (activeId === overId) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    if (activeData?.type !== "Task") return;

    // Handle dropping a task over another task
    if (overData?.type === "Task") {
      const activeIndex = tasks.findIndex(t => t.id === activeId);
      const overIndex = tasks.findIndex(t => t.id === overId);
      
      if (activeIndex === -1 || overIndex === -1) return;
      
      const activeItem = tasks[activeIndex];
      const overItem = tasks[overIndex];
      
      // If items are in the same column, just do a regular array move
      if (activeItem?.columnId === overItem?.columnId) {
        return;
      }
      
      // Only update if the task is significantly within the new column
      // This helps prevent the jumping behavior
      const overRect = (over as any).rect;
      if (!overRect) return;
      
      // Only move if the center of the active item is over the center of the over item
      // This creates a more stable dragging experience
      const isCentered = (event as any).activatorEvent?.clientX > overRect.left + overRect.width * 0.3 &&
                         (event as any).activatorEvent?.clientX < overRect.left + overRect.width * 0.7;
      
      if (!isCentered) return;
      
      setTasks(tasks => {
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...activeItem!, columnId: overItem!.columnId };
        return newTasks;
      });
    }

    // Handle dropping a task over a column
    if (overData?.type === "Column") {
      const activeIndex = tasks.findIndex(t => t.id === activeId);
      
      if (activeIndex === -1) return;
      
      const activeItem = tasks[activeIndex];
      
      // Only update if the column ID actually changed
      if (activeItem?.columnId === overId) return;
      
      setTasks(tasks => {
        const newTasks = [...tasks];
        newTasks[activeIndex] = { ...activeItem!, columnId: overId as string };
        return newTasks;
      });
    }
  }

  function handleMoveToIgnored(taskId: number) {
    updateItemStatus(taskId, 'ignored');
  }

  function handleArchivedItemMove(itemId: number) {
    updateItemStatus(itemId, 'todo');
  }
  
  function handleTaskClick(task: Task) {
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  }

  function handleShowDetails(task: Task) {
    // Use the onShowDetails prop if provided, otherwise use local state
    if (onShowDetails) {
      onShowDetails(task);
    } else {
      setDetailsTask(task);
    }
  }

  function handleEnact(task: Task) {
    if (onTaskSelect) {
      onTaskSelect(task);
    }
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="flex justify-between items-center mb-2 px-4 pt-4 flex-shrink-0">
        <h2 className="text-xl font-bold">ENACT Board</h2>
        
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="flex items-center gap-2">
              <ArchiveIcon className="h-4 w-4" />
              <span>Archive</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[60vh] max-w-3xl mx-auto">
            <ArchivedItemsList 
              items={archivedItems} 
              onMoveToColumn={handleArchivedItemMove}
              title="Archived Items"
            />
          </SheetContent>
        </Sheet>
      </div>

      <DndContext
        sensors={sensors}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={onDragOver}
        collisionDetection={rectIntersection}
      >
        <BoardContainer sidebarOpen={sidebarOpen}>
          {columns.map((col) => (
            <BoardColumn
              key={col.id}
              column={col}
              tasks={tasks.filter((task) => task.columnId === col.id)}
              onShowDetails={handleShowDetails}
              onEnact={handleEnact}
              onTaskClick={handleTaskClick}
              onArchive={handleMoveToIgnored}
              selectedTaskId={selectedTaskId}
              sidebarOpen={sidebarOpen}
              disableDrag={false}
            />
          ))}
        </BoardContainer>
        
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} isOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {/* Only render the dialog if we're not using the external onShowDetails prop */}
      {!onShowDetails && detailsTask && (
        <TaskDetailsDialog
          task={detailsTask}
          isOpen={!!detailsTask}
          onClose={() => setDetailsTask(null)}
          onMoveToIgnored={handleMoveToIgnored}
        />
      )}
    </div>
  );
}