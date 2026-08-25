import { useState, useEffect } from 'react';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { ExternalLink, ArchiveIcon } from 'lucide-react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@tm/ui/dialog';
import { Button } from '@tm/ui/button';
import { Task } from './task-card';
import { Json } from '@tm/supabase/database';
import { SourceIcon } from '~/components/source-icons';
import { DocumentSource } from '@tm/ai';

interface RelatedDocument {
  id: number;
  title: string;
  source_id: string;
  source: DocumentSource;
  metadata: Json;
}

interface TaskDetailsDialogProps {
  task: Task | null;
  isOpen: boolean;
  onClose: () => void;
  onMoveToBacklog?: (taskId: number) => void;
  onMoveToIgnored?: (taskId: number) => void;
}

export function TaskDetailsDialog({
  task,
  isOpen,
  onClose,
  onMoveToIgnored
}: TaskDetailsDialogProps) {
  const supabase = useSupabase();
  const [relatedDocs, setRelatedDocs] = useState<RelatedDocument[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function fetchRelatedDocuments() {
      if (!task || !isOpen) return;
      
      setIsLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('document_action_item_relations')
          .select(`
            document_id,
            documents:document_id (
              id,
              title,
              source_id,
              metadata,
              source
            )
          `)
          .eq('action_item_id', task.id);
          
        if (error) throw error;
        
        if (data) {
          setRelatedDocs(data.map(item => item.documents as RelatedDocument));
        }
      } catch (error) {
        console.error('Error fetching related documents:', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    fetchRelatedDocuments();
  }, [supabase, task, isOpen]);
  
  const openDocument = (url: string) => {
    window.open(url, '_blank');
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{task.content}</DialogTitle>
        </DialogHeader>
        
        <div className="py-4">
          {task.summary && (
            <div className="mb-4">
              <h3 className="text-sm font-medium mb-1">Summary</h3>
              <p className="text-sm text-muted-foreground">{task.summary}</p>
            </div>
          )}
          
          <div>
            <h3 className="text-sm font-medium mb-2">Related Documents</h3>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : relatedDocs.length > 0 ? (
              <ul className="space-y-2">
                {relatedDocs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="rounded-full bg-primary/10 p-2">
                        <SourceIcon
                          source={doc.source}
                          className="h-3 w-3 text-primary"
                        />
                      </div>
                      <span className="text-sm truncate max-w-[200px]">{doc.title}</span>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="ml-2 flex-shrink-0" 
                      onClick={() => openDocument((doc.metadata as any)?.url || '')}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Open
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">No related documents found</p>
            )}
          </div>
        </div>
        
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {onMoveToIgnored && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => {
                  onMoveToIgnored(task.id);
                  onClose();
                }}
              >
                <ArchiveIcon className="h-4 w-4 mr-1" />
                Archive
              </Button>
            )}
          </div>
          
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}