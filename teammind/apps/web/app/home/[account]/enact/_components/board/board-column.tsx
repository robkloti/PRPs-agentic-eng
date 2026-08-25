import { SortableContext, useSortable } from "@dnd-kit/sortable";
import { type UniqueIdentifier } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useMemo } from "react";
import { Card, CardHeader, CardContent } from "@tm/ui/card";
import { ScrollArea } from "@tm/ui/scroll-area";
import { Task, TaskCard } from "./task-card";
import { cn } from "@tm/ui/utils";
import { Badge } from "@tm/ui/badge";

export interface Column {
  id: UniqueIdentifier;
  title: string;
}

export type ColumnType = "Column";

export interface ColumnDragData {
  type: ColumnType;
  column: Column;
}

interface BoardColumnProps {
  column: Column;
  tasks: Task[];
  isOverlay?: boolean;
  disableDrag?: boolean;
  sidebarOpen?: boolean;
  selectedTaskId?: number;
  onShowDetails?: (task: Task) => void;
  onEnact?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onArchive?: (taskId: number) => void;
}

export function BoardColumn({ 
  column, 
  tasks, 
  isOverlay,
  disableDrag = false,
  sidebarOpen = false,
  selectedTaskId,
  onShowDetails,
  onEnact,
  onTaskClick,
  onArchive
}: BoardColumnProps) {
  const tasksIds = useMemo(() => {
    return tasks.map((task) => task.id);
  }, [tasks]);

  // Count tickets with different statuses for the column header
  const backlogCount = column.id === "todo" ? tasks.filter((t) => t.originalStatus === "backlog").length : 0;
  const blockedCount = column.id === "in_progress" ? tasks.filter((t) => t.originalStatus === "blocked").length : 0;

  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: column.id,
    data: {
      type: "Column",
      column,
    } satisfies ColumnDragData,
    attributes: {
      roleDescription: `Column: ${column.title}`,
    },
    disabled: disableDrag,
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex flex-col bg-primary-foreground",
        {
          "h-full flex-1": !sidebarOpen,
          "h-full w-full": sidebarOpen,
          "border-2 border-transparent": !isOverlay && !isDragging,
          "ring-2 opacity-30": !isOverlay && isDragging,
          "ring-2 ring-primary": isOverlay
        }
      )}
    >
      <CardHeader className="p-3 font-semibold border-b text-left flex-shrink-0">
        <div className="flex items-center justify-between">
          <span>{column.title}</span>
          <div className="flex gap-2">
            {column.id === "todo" && backlogCount > 0 && (
              <Badge variant="outline" className="text-xs">
                Backlog: {backlogCount}
              </Badge>
            )}
            {column.id === "in_progress" && blockedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                Blocked: {blockedCount}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs">
              Total: {tasks.length}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow p-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="flex flex-col gap-2 p-2">
            <SortableContext items={tasksIds}>
              {tasks.map((task) => (
                <TaskCard 
                  key={task.id} 
                  task={task} 
                  onShowDetails={onShowDetails}
                  onEnact={onEnact}
                  onTaskClick={onTaskClick}
                  onArchive={onArchive}
                  isSelected={selectedTaskId === task.id}
                />
              ))}
            </SortableContext>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}

export function BoardContainer({ 
  children, 
  sidebarOpen = false 
}: { 
  children: React.ReactNode;
  sidebarOpen?: boolean;
}) {
  return (
    <div className={cn("flex-grow", {
      "h-[calc(100%-70px)] overflow-x-auto overflow-y-hidden": !sidebarOpen,
      "h-full overflow-y-auto overflow-x-hidden": sidebarOpen
    })}>
      <div className={cn({
        "h-full flex gap-4 p-4": !sidebarOpen,
        "flex flex-col gap-4 p-2 pb-4": sidebarOpen // Bottom padding for mobile
      })}>
        {children}
      </div>
    </div>
  );
}