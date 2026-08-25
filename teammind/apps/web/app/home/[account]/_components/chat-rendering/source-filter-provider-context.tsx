import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import { DocumentSource } from '@tm/ai/types';

interface SourceFilterContextType {
  selectedSources: DocumentSource[];
  availableSources: DocumentSource[];
  setSelectedSources: (
    sources: DocumentSource[] | ((prev: DocumentSource[]) => DocumentSource[]),
  ) => void;
  setAvailableSources: (sources: DocumentSource[]) => void;
}

export const DisabledContext = createContext<boolean>(false);

const SourceFilterContext = createContext<SourceFilterContextType | undefined>(
  undefined,
);

interface SourceProviderProps {
  children: ReactNode;
  initialSources?: DocumentSource[];
  availableSources?: DocumentSource[];
  onSourcesChange?: (sources: DocumentSource[]) => void;
}

export function SourceFilterProvider({
  children,
  initialSources = [],
  availableSources = [],
  onSourcesChange,
}: SourceProviderProps) {
  // Initialize with all available sources if no initialSources provided
  const [selectedSources, setSelectedSourcesInternal] = useState<
    DocumentSource[]
  >(initialSources.length > 0 ? initialSources : availableSources);
  const [availableSourcesState, setAvailableSourcesState] =
    useState<DocumentSource[]>(availableSources);

  useEffect(() => {
    if (selectedSources.length === 0 && availableSources.length > 0) {
      setSelectedSourcesInternal(availableSources);
      if (onSourcesChange) {
        onSourcesChange(availableSources);
      }
    }
    setAvailableSourcesState(availableSources);
  }, [availableSources, onSourcesChange, selectedSources.length]);

  const setSelectedSources = useCallback(
    (
      sourcesOrUpdater:
        | DocumentSource[]
        | ((prev: DocumentSource[]) => DocumentSource[]),
    ) => {
      setSelectedSourcesInternal((prev) => {
        const newSources =
          typeof sourcesOrUpdater === 'function'
            ? sourcesOrUpdater(prev)
            : sourcesOrUpdater;

        if (onSourcesChange) {
          onSourcesChange(newSources);
        }
        return newSources;
      });
    },
    [onSourcesChange],
  );

  const setAvailableSources = useCallback((sources: DocumentSource[]) => {
    setAvailableSourcesState(sources);
  }, []);

  return (
    <SourceFilterContext.Provider
      value={{
        selectedSources,
        availableSources: availableSourcesState,
        setSelectedSources,
        setAvailableSources,
      }}
    >
      {children}
    </SourceFilterContext.Provider>
  );
}

export function useSourceFilterContext() {
  const context = useContext(SourceFilterContext);
  if (context === undefined) {
    throw new Error('useSourceContext must be used within a SourceProvider');
  }
  return context;
}
