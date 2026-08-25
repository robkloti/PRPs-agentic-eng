import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Button } from "@tm/ui/button";
import { Card, CardContent, CardFooter } from "@tm/ui/card";
import { ArchiveIcon, ChevronRight, MessageSquare } from "lucide-react";
import { ActionItemStatus } from "./action-items-board";
import { cn } from "@tm/ui/utils"; 
import { Badge } from "@tm/ui/badge";

export interface Task {
  id: number;
  columnId: string;
  content: string;
  updated_at: string;
  summary?: string;
  originalStatus?: ActionItemStatus;
}

interface TaskCardProps {
  task: Task;
  isOverlay?: boolean;
  isSelected?: boolean;
  onShowDetails?: (task: Task) => void;
  onEnact?: (task: Task) => void;
  onTaskClick?: (task: Task) => void;
  onArchive?: (taskId: number) => void;
}

export type TaskType = "Task";

export interface TaskDragData {
  type: TaskType;
  task: Task;
}

export function TaskCard({ 
  task, 
  isOverlay, 
  isSelected = false,
  onShowDetails,
  onEnact,
  onTaskClick,
  onArchive
}: TaskCardProps) {
  const {
    setNodeRef,
    attributes,
    listeners,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: {
      type: "Task",
      task,
    } satisfies TaskDragData,
    attributes: {
      roleDescription: "Task",
    },
  });

  const style = {
    transition,
    transform: CSS.Translate.toString(transform),
  };

  const handleDetailsClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onShowDetails) {
      onShowDetails(task);
    }
  };

  const handleEnactClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onEnact) {
      onEnact(task);
    }
  };

  const handleArchiveClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onArchive) {
      onArchive(task.id);
    }
  };

  const handleCardClick = () => {
    if (onTaskClick) {
      onTaskClick(task);
    }
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={cn(
        "transition-all duration-200 cursor-grab select-none",
        isSelected ? "border-primary bg-primary/5 shadow-md" : "hover:bg-muted/30 hover:shadow-sm",
        {
          "ring-2 opacity-30": !isOverlay && isDragging,
          "ring-2 ring-primary": isOverlay,
        }
      )}
      onClick={handleCardClick}
    >
      <CardContent 
        className="px-3 py-2 text-left whitespace-pre-wrap" 
        {...listeners}
      >
        <div className="flex items-center justify-between mb-1">
          <h4 className="font-medium">{task.content}</h4>
          {task.originalStatus === "backlog" && (
            <Badge variant="outline" className="text-xs">
              Backlog
            </Badge>
          )}
          {task.originalStatus === "blocked" && (
            <Badge variant="destructive" className="text-xs">
              Blocked
            </Badge>
          )}
        </div>
        
        {task.summary && (
          <div 
            className="flex items-start justify-between group"
            onClick={onShowDetails ? handleDetailsClick : undefined}
          >
            <p className="text-sm text-muted-foreground line-clamp-2 cursor-pointer group-hover:text-foreground">
              {task.summary}
            </p>
            
            {onShowDetails && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-7 w-7 p-0 ml-1 rounded-full hover:bg-muted transition-colors flex-shrink-0" 
                onClick={handleDetailsClick}
              >
                <ChevronRight size={16} />
                <span className="sr-only">Details</span>
              </Button>
            )}
          </div>
        )}
      </CardContent>
      
      <CardFooter className="p-2 border-t flex justify-between items-center gap-2">
        <div className="flex items-center text-xs text-muted-foreground gap-2">
          {onArchive && (
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-6 w-6 p-0 rounded-full hover:bg-muted/80 transition-colors" 
              onClick={handleArchiveClick}
            >
              <ArchiveIcon size={14} />
              <span className="sr-only">Archive</span>
            </Button>
          )}
          
          <span className="whitespace-nowrap">
            {new Date(task.updated_at).toLocaleDateString()}
          </span>
        </div>
        
        <div className="flex gap-1 items-center">
          {onEnact && (
            <Button 
              variant="default" 
              size="sm" 
              className="h-8 px-3 rounded-full font-medium text-xs gap-1 transition-all hover:shadow-sm" 
              onClick={handleEnactClick}
            >
              <MessageSquare size={14} />
              <span>ENACT</span>
            </Button>
          )}
        </div>
      </CardFooter>
    </Card>
  );
}