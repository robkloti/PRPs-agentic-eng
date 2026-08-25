import { type FC, type ReactNode, useState, useEffect } from "react";
import { X } from 'lucide-react';
import { Button } from "@tm/ui/button";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@tm/ui/resizable";

interface EnactSidebarProps {
  children: ReactNode;
  chat?: ReactNode;
  onClose: () => void;
  isOpen?: boolean; 
}

export const EnactSidebar: FC<EnactSidebarProps> = ({ 
  children, 
  chat, 
  onClose,
  isOpen = true // Default to open
}) => {
  // Animation state
  const [_isVisible, setIsVisible] = useState(isOpen);
  
  // Handle animation when opening/closing
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      // Delay hiding until animation completes
      const timer = setTimeout(() => setIsVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  return (
    <div className={`h-full transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0'}`}>
      <ResizablePanelGroup 
        direction="horizontal"
        className="h-full"
      >
        {/* The board panel - smaller on desktop, but still visible */}
        <ResizablePanel 
          defaultSize={40} 
          minSize={30}
          className="lg:block transition-all duration-300" 
        >
          <div className="h-full overflow-hidden">
            {children}
          </div>
        </ResizablePanel>
        
        <ResizableHandle className="hidden lg:flex transition-opacity duration-300" /> 
        
        {/* The chat panel */}
        <ResizablePanel 
          defaultSize={60} 
          minSize={30}
          className="relative overflow-hidden transition-all duration-300" 
        >
          <div className="h-full flex flex-col relative overflow-hidden">
            <div className="absolute right-4 top-4 z-50">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={onClose}
                className="transition-transform hover:rotate-90 duration-200" 
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close sidebar</span>
              </Button>
            </div>
            <div className="h-full overflow-hidden">
              {chat}
            </div>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </div>
  );
};