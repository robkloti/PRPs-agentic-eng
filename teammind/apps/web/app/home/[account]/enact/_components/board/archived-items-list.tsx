import { ArrowUpRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@tm/ui/button";
import { Card, CardContent, CardFooter } from "@tm/ui/card";
import { ScrollArea } from "@tm/ui/scroll-area";

interface ArchivedItem {
  id: number;
  title: string;
  summary: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

interface ArchivedItemsListProps {
  items: ArchivedItem[];
  onMoveToColumn?: (itemId: number) => void;
  title: string;
}

export function ArchivedItemsList({
  items,
  onMoveToColumn,
  title
}: ArchivedItemsListProps) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <p className="text-muted-foreground">No items in {title.toLowerCase()}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-lg font-semibold mb-4">{title} ({items.length})</h3>
      
      <ScrollArea className="h-[calc(60vh-120px)]">
        <div className="space-y-3 pr-4">
          {items.map((item) => (
            <Card key={item.id} className="relative">
              <CardContent className="pt-4 pb-2">
                <h4 className="font-medium text-base mb-1">{item.title}</h4>
                {item.summary && (
                  <p className="text-sm text-muted-foreground">{item.summary}</p>
                )}
                <p className="text-xs text-muted-foreground mt-2">
                  Updated {formatDistanceToNow(new Date(item.updated_at))} ago
                </p>
              </CardContent>
              
              <CardFooter className="py-2 flex justify-end gap-1">
                  {onMoveToColumn && (
                    <Button 
                      variant="default" 
                      size="sm" 
                      className="h-8"
                      onClick={() => onMoveToColumn(item.id)}
                    >
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      <span>Restore</span>
                    </Button>
                  )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}