'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';

import {
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Minus,
  Search,
  X,
} from 'lucide-react';
// Added useRef
import { useTranslation } from 'react-i18next';

import { Button } from '@tm/ui/button';
import { Checkbox } from '@tm/ui/checkbox';
// Added Minus
import { Input } from '@tm/ui/input';
import { ScrollArea } from '@tm/ui/scroll-area';
import { Skeleton } from '@tm/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tm/ui/tooltip';
import { Trans } from '@tm/ui/trans';

import { useDebounce } from '~/home/_hooks';

import {
  fetchSubfolders,
  searchGoogleDriveFolders,
  updateGoogleFolderSelections,
} from './actions';

const PRELOAD_DEPTH = 2; // How many levels deep to fetch when expanding

interface GoogleFolder {
  id: string;
  name: string;
  parentId?: string;
  path?: string;
  hasChildren?: boolean;
  children?: GoogleFolder[];
}

interface FolderTreeItem extends GoogleFolder {
  children: FolderTreeItem[];
  level: number;
  expanded: boolean;
  loading: boolean;
  loaded: boolean;
}

interface Props {
  accountSlug: string;
  rootFolders: GoogleFolder[];
  initialSelectedFolders: string[];
  preloadDepth?: number; // How many levels to preload when expanding a folder
}

export function GoogleSelectClient({
  accountSlug,
  rootFolders,
  initialSelectedFolders,
  // preloadDepth = 2, // We'll fetch depth 1 on expand now
}: Props) {
  const { t } = useTranslation('connect');
  const [isSaving, startTransition] = useTransition();
  const [_isSearching, startSearchTransition] = useTransition();
  const [_isLoadingFolders, startLoadingTransition] = useTransition();
  const [selectedFolders, setSelectedFolders] = useState<string[]>(
    initialSelectedFolders,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const debouncedSearchQuery = useDebounce(searchQuery, 300); // Debounce search input
  const [folderTree, setFolderTree] = useState<FolderTreeItem[]>([]);
  const [searchResults, setSearchResults] = useState<GoogleFolder[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [showSearchLoading, setShowSearchLoading] = useState(false);

  // Initialize the folder tree with preloaded folders
  useEffect(() => {
    const buildTree = (
      folders: GoogleFolder[] = [],
      level: number,
    ): FolderTreeItem[] => {
      return folders.map(
        (folder) =>
          ({
            ...folder,
            children: folder.children
              ? buildTree(folder.children, level + 1)
              : [],
            level,
            expanded: false,
            loading: false,
            loaded: folder.children && folder.children.length > 0,
          }) as FolderTreeItem,
      );
    };

    const tree = buildTree(rootFolders, 0);
    setFolderTree(tree);
  }, [rootFolders]);

  // Perform search when debounced query changes
  useEffect(() => {
    if (debouncedSearchQuery.length >= 2) {
      setShowSearchLoading(true);
      setIsSearchMode(true);

      startSearchTransition(async () => {
        const results = await searchGoogleDriveFolders(debouncedSearchQuery);
        setSearchResults(results);
        setShowSearchLoading(false);
      });
    } else if (debouncedSearchQuery.length === 0) {
      setIsSearchMode(false);
      setSearchResults([]);
      setShowSearchLoading(false);
    }
  }, [debouncedSearchQuery]);

  // Handler for search input changes
  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);

      // Show loading immediately if typing a search query of sufficient length
      if (value.length >= 2 && !isSearchMode) {
        setShowSearchLoading(true);
        setIsSearchMode(true);
      } else if (value.length === 0) {
        setIsSearchMode(false);
      }
    },
    [isSearchMode],
  );

  // Clear search and return to normal browsing
  const clearSearch = () => {
    setSearchQuery('');
    setIsSearchMode(false);
    setSearchResults([]);
    setShowSearchLoading(false);
  };

  const toggleFolder = (folderId: string) => {
    // Get current folder state before any updates
    const currentFolder = findFolderInTree(folderTree, folderId);
    if (!currentFolder) return;

    // Determine if we're expanding and need to load
    const isExpanding = !currentFolder.expanded;
    const needToLoadChildren = isExpanding && !currentFolder.loaded;

    // IMPORTANT: Update the UI FIRST, outside of the transition
    // This ensures the loading state is shown immediately
    if (isExpanding) {
      setFolderTree((prevTree) => {
        const newTree = [...prevTree]; // Create a new array reference

        const updateFolder = (folders: FolderTreeItem[]): FolderTreeItem[] => {
          return folders.map((folder) => {
            if (folder.id === folderId) {
              return {
                ...folder,
                expanded: true,
                loading: needToLoadChildren,
              };
            }

            if (folder.children && folder.children.length > 0) {
              return {
                ...folder,
                children: updateFolder(folder.children),
              };
            }

            return folder;
          });
        };

        return updateFolder(newTree);
      });
    } else {
      // Just collapse the folder, no loading needed
      setFolderTree((prevTree) => {
        const newTree = [...prevTree];

        const updateFolder = (folders: FolderTreeItem[]): FolderTreeItem[] => {
          return folders.map((folder) => {
            if (folder.id === folderId) {
              return {
                ...folder,
                expanded: false,
              };
            }

            if (folder.children && folder.children.length > 0) {
              return {
                ...folder,
                children: updateFolder(folder.children),
              };
            }

            return folder;
          });
        };

        return updateFolder(newTree);
      });
    }

    // Then, if we need to load, start the data fetching in a separate operation
    if (needToLoadChildren) {
      // Use setTimeout to ensure the UI updates first
      setTimeout(() => {
        startLoadingTransition(async () => {
          try {
            const response = await fetchSubfolders(folderId, PRELOAD_DEPTH);
            const subfolders = Array.isArray(response) ? response : [];

            // Update with the fetched data
            setFolderTree((prevTree) => {
              const newTree = updateFolderTreeWithSubfolders(
                prevTree,
                folderId,
                subfolders,
              );

              // Auto-select children if parent was selected
              if (selectedFolders.includes(folderId)) {
                const newFolderIds = getAllChildFolderIds(newTree, folderId);
                setSelectedFolders((prev) => [
                  ...new Set([...prev, ...newFolderIds]),
                ]);
              }

              return newTree;
            });
          } catch (error) {
            console.error('Error fetching subfolders:', error);

            // Remove loading state on error
            setFolderTree((prevTree) => {
              const newTree = [...prevTree];

              const updateFolder = (
                folders: FolderTreeItem[],
              ): FolderTreeItem[] => {
                return folders.map((folder) => {
                  if (folder.id === folderId) {
                    return {
                      ...folder,
                      loading: false,
                    };
                  }

                  if (folder.children && folder.children.length > 0) {
                    return {
                      ...folder,
                      children: updateFolder(folder.children),
                    };
                  }

                  return folder;
                });
              };

              return updateFolder(newTree);
            });
          }
        });
      }, 0);
    }
  };

  // Helper function to get all child folder IDs recursively
  const getAllChildFolderIds = (
    tree: FolderTreeItem[],
    parentId: string,
  ): string[] => {
    const result: string[] = [];

    const parent = findFolderInTree(tree, parentId);
    if (!parent) return result;

    const collectChildIds = (folders: FolderTreeItem[]) => {
      for (const folder of folders) {
        result.push(folder.id);
        if (folder.children && folder.children.length > 0) {
          collectChildIds(folder.children);
        }
      }
    };

    collectChildIds(parent.children);
    return result;
  };

  // Helper function to find a folder in the tree
  const findFolderInTree = (
    tree: FolderTreeItem[],
    folderId: string,
  ): FolderTreeItem | null => {
    for (const folder of tree) {
      if (folder.id === folderId) {
        return folder;
      }

      const foundInChildren = findFolderInTree(folder.children, folderId);
      if (foundInChildren) {
        return foundInChildren;
      }
    }
    return null;
  };

  // Helper to get ancestor IDs
  const getAncestorIds = (
    tree: FolderTreeItem[],
    folderId: string,
  ): string[] => {
    const path: string[] = [];
    const findPath = (nodes: FolderTreeItem[], targetId: string): boolean => {
      for (const node of nodes) {
        if (node.id === targetId) {
          return true; // Found target, path is complete up to parent
        }
        if (node.children && node.children.length > 0) {
          path.push(node.id); // Add current node as potential ancestor
          if (findPath(node.children, targetId)) {
            return true; // Found in children
          }
          path.pop(); // Backtrack if not found in this branch
        }
      }
      return false; // Not found in this subtree
    };
    findPath(tree, folderId);
    return path;
  };

  // Helper to get direct children IDs
  const getDirectChildIds = (
    tree: FolderTreeItem[],
    parentId: string,
  ): string[] => {
    const parent = findFolderInTree(tree, parentId);
    // Ensure children exist and are loaded before getting IDs
    return parent?.children?.map((child) => child.id) ?? [];
  };

  // Check if folder is in an indeterminate state (some children selected, but not all)
  const isFolderIndeterminate = (folder: FolderTreeItem): boolean => {
    if (!folder.children || folder.children.length === 0) {
      return false;
    }

    const childIds = getAllChildFolderIds([folder], folder.id);
    const selectedChildIds = childIds.filter((id) =>
      selectedFolders.includes(id),
    );

    return (
      selectedChildIds.length > 0 && selectedChildIds.length < childIds.length
    );
  };

  // Removed unused updateFolderTreeWithErrorState function

  const updateFolderTreeWithSubfolders = (
    tree: FolderTreeItem[],
    parentId: string,
    subfolders: GoogleFolder[],
  ): FolderTreeItem[] => {
    const deepCopy = (items: FolderTreeItem[]): FolderTreeItem[] => {
      return items.map((item) => ({
        ...item,
        children: deepCopy(item.children),
      }));
    };

    const newTree = deepCopy(tree);

    const findAndUpdateFolder = (folders: FolderTreeItem[]): boolean => {
      for (const folder of folders) {
        if (folder.id === parentId) {
          const parentLevel = folder.level;
          const index = folders.indexOf(folder);

          // Convert GoogleFolder to FolderTreeItem recursively
          const convertToTreeItems = (
            items: GoogleFolder[] = [],
            level: number,
          ): FolderTreeItem[] => {
            return items.map(
              (item) =>
                ({
                  ...item,
                  children: item.children
                    ? convertToTreeItems(item.children, level + 1)
                    : [],
                  level,
                  expanded: false,
                  loading: false,
                  loaded: item.children && item.children.length > 0,
                }) as FolderTreeItem,
            );
          };
          // Create a new folder object, ensuring loading is false and loaded is true
          folders[index] = {
            ...folder,
            loading: false, // Always set loading to false here
            loaded: true, // Always set loaded to true here
            // Convert subfolders to tree items with proper nesting
            children: convertToTreeItems(subfolders, parentLevel + 1),
          };

          return true;
        }

        if (folder.children.length > 0) {
          if (findAndUpdateFolder(folder.children)) {
            return true;
          }
        }
      }
      return false;
    };

    findAndUpdateFolder(newTree);
    return newTree;
  };

  // Toggle folder selection with cascade effect (including ancestor updates)
  const toggleFolderSelection = (folderId: string) => {
    const folder = findFolderInTree(folderTree, folderId);
    if (!folder) return;

    setSelectedFolders((prevSelected) => {
      const isCurrentlySelected = prevSelected.includes(folderId);
      const descendantIds = getAllChildFolderIds(folderTree, folderId);
      const newSelected = new Set(prevSelected); // Use const as the Set itself is not reassigned

      // 1. Select/Deselect the clicked folder and its descendants
      if (isCurrentlySelected) {
        // Deselect
        newSelected.delete(folderId);
        descendantIds.forEach((id) => newSelected.delete(id));
      } else {
        // Select
        newSelected.add(folderId);
        // Only auto-select loaded children; unloaded children will be selected when loaded if parent is selected
        const loadedDescendantIds = getAllChildFolderIds([folder], folderId); // Check only within the current folder structure
        loadedDescendantIds.forEach((id) => newSelected.add(id));
      }

      // 2. Update Ancestors based on their direct children's state
      const ancestorIds = getAncestorIds(folderTree, folderId);
      ancestorIds.reverse().forEach((ancestorId) => {
        // Process from parent up to root
        const directChildIds = getDirectChildIds(folderTree, ancestorId);

        // Only update ancestor if its children are loaded and present in the tree
        if (directChildIds.length > 0) {
          const allChildrenSelected = directChildIds.every((childId) =>
            newSelected.has(childId),
          );
          // const someChildrenSelected = directChildIds.some(childId => newSelected.has(childId)); // Not needed for selection logic

          if (allChildrenSelected) {
            newSelected.add(ancestorId); // Select ancestor if all children are selected
          } else {
            newSelected.delete(ancestorId); // Deselect ancestor if not all children are selected
          }
        }
      });

      return Array.from(newSelected);
    });
  };

  // Toggle selection for search results folders (simpler, no hierarchy)
  const toggleSearchFolderSelection = (folderId: string) => {
    setSelectedFolders((prev) => {
      const isSelected = prev.includes(folderId);

      if (isSelected) {
        return prev.filter((id) => id !== folderId);
      } else {
        return [...prev, folderId];
      }
    });
  };

  // Render the folder tree recursively
  const renderFolderTree = (folders: FolderTreeItem[]) => {
    return folders.map((folder) => (
      <div key={folder.id} className="py-1">
        <FolderItem
          folder={folder}
          isTreeItem={true}
          isSearch={false}
          selectedFolders={selectedFolders}
          isFolderIndeterminate={isFolderIndeterminate}
          toggleFolderSelection={toggleFolderSelection}
          toggleSearchFolderSelection={toggleSearchFolderSelection}
          toggleFolder={toggleFolder}
        />

        {/* Render loading skeleton or children */}
        {folder.expanded && folder.loading && (
          <div
            style={{ paddingLeft: `${(folder.level + 1) * 20 + 8}px` }}
            className="py-1"
          >
            <div className="flex items-center space-x-2 py-1">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-3/4" />
            </div>
            <div className="flex items-center space-x-2 py-1">
              <Skeleton className="h-5 w-5" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        )}
        {folder.expanded &&
          !folder.loading &&
          folder.children.length > 0 &&
          renderFolderTree(folder.children)}
      </div>
    ));
  };

  // Helper function for smart path truncation
  const truncatePath = (path: string, maxLength = 50): string => {
    if (path.length <= maxLength) {
      return path;
    }
    const separator = '/';
    const parts = path.split(separator);
    if (parts.length <= 3) {
      // If only root/folder or root/folder/subfolder, truncate end
      return path.substring(0, maxLength - 3) + '...';
    }
    // Show first part, ellipsis, last two parts
    const firstPart = parts[0];
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    const truncated = `${firstPart}${separator}...${separator}${secondLastPart}${separator}${lastPart}`;

    // If still too long, just truncate the end
    if (truncated.length > maxLength) {
      return path.substring(0, maxLength - 3) + '...';
    }
    return truncated;
  };

  // Render search results
  const renderSearchResults = () => {
    if (searchResults.length === 0) {
      return (
        <div className="p-4 text-center text-gray-500">
          <Trans
            i18nKey="connect:connectors.google.noSearchResults"
            values={{ query: searchQuery }}
          />
        </div>
      );
    }

    return searchResults.map((folder) => {
      // Apply smart truncation to search result paths
      // Apply smart truncation to search result paths for display
      const displayPath = folder.path ? truncatePath(folder.path) : '';
      // Keep original path for tooltip
      const originalPath = folder.path;

      return (
        <div key={folder.id} className="py-1">
          <FolderItem
            folder={{ ...folder, path: displayPath }} // Pass folder with truncated path for display
            originalPath={originalPath} // Pass original path separately for tooltip
            isTreeItem={false}
            isSearch={true}
            selectedFolders={selectedFolders}
            isFolderIndeterminate={isFolderIndeterminate}
            toggleFolderSelection={toggleFolderSelection}
            toggleSearchFolderSelection={toggleSearchFolderSelection}
            toggleFolder={toggleFolder}
          />
        </div>
      );
    });
  };

  // Render search skeleton loading state
  const renderSearchSkeleton = () => (
    <div className="space-y-4 p-4">
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-center space-x-2">
          <Skeleton className="h-5 w-5" />
          <div className="flex-grow space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
          <Skeleton className="h-4 w-4 rounded" />
        </div>
      ))}
    </div>
  );

  return (
    <div className="flex flex-col space-y-6">
      <div className="space-y-2">
        <div className="text-sm font-medium">
          <Trans i18nKey="connect:connectors.google.driveFolders" />
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder={t('connectors.google.searchFoldersPlaceholder')}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="pl-8 pr-8"
          />
          {searchQuery.length > 0 && (
            <button
              type="button"
              onClick={clearSearch}
              className="absolute right-2 top-2.5 text-gray-400 hover:text-gray-700"
              aria-label="Clear search"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        <div className="rounded-md border">
          {isSearchMode ? (
            <ScrollArea className="h-[300px]">
              {showSearchLoading
                ? renderSearchSkeleton()
                : renderSearchResults()}
            </ScrollArea>
          ) : folderTree.length === 0 ? (
            <div className="p-4 text-center text-gray-500">
              <Trans i18nKey="connect:connectors.google.noFoldersFound" />
            </div>
          ) : (
            <ScrollArea className="h-[300px] px-2 py-1">
              {renderFolderTree(folderTree)}
            </ScrollArea>
          )}
        </div>

        <div className="text-sm font-medium text-gray-500">
          {selectedFolders.length > 0 ? (
            <Trans
              i18nKey="connect:connectors.google.foldersSelected"
              values={{ count: selectedFolders.length }}
            />
          ) : (
            <Trans i18nKey="connect:connectors.google.selectFoldersMessage" />
          )}
        </div>
      </div>

      <Button
        className="w-full"
        onClick={() => {
          startTransition(async () => {
            await updateGoogleFolderSelections(accountSlug, selectedFolders);
          });
        }}
        disabled={isSaving || selectedFolders.length === 0}
      >
        {isSaving ? (
          <Trans i18nKey="common:saving" />
        ) : (
          <Trans i18nKey="connect:connectors.google.startTraining" />
        )}
      </Button>
    </div>
  );
}

// --- Sub-component for rendering a single folder item ---

interface FolderItemProps {
  folder: GoogleFolder | FolderTreeItem; // Contains potentially truncated path for display
  originalPath?: string; // Original full path, mainly for search result tooltips
  isTreeItem: boolean;
  isSearch: boolean;
  selectedFolders: string[];
  isFolderIndeterminate: (folder: FolderTreeItem) => boolean;
  toggleFolderSelection: (folderId: string) => void;
  toggleSearchFolderSelection: (folderId: string) => void;
  toggleFolder: (folderId: string) => void;
}

const FolderItem: React.FC<FolderItemProps> = ({
  folder,
  originalPath, // Receive original path
  isTreeItem,
  isSearch,
  selectedFolders,
  isFolderIndeterminate,
  toggleFolderSelection,
  toggleSearchFolderSelection,
  toggleFolder,
}) => {
  const checkboxRef = useRef<HTMLButtonElement>(null);
  const treeFolder = folder as FolderTreeItem;
  const isSelected = selectedFolders.includes(folder.id);

  // Calculate indeterminate state only for tree items
  const indeterminate =
    isTreeItem && !isSelected && isFolderIndeterminate(treeFolder);

  const hasChildren = isTreeItem
    ? (treeFolder.hasChildren ??
      (treeFolder.children && treeFolder.children.length > 0))
    : folder.hasChildren; // Use basic hasChildren for search results

  const level = isTreeItem ? treeFolder.level : 0;

  return (
    <div
      className={`flex cursor-pointer items-center rounded-sm px-2 py-1 hover:bg-gray-200 dark:hover:bg-gray-800 ${
        isSelected && !indeterminate ? 'bg-gray-200 dark:bg-gray-800' : ''
      }`}
      style={{ paddingLeft: isSearch ? '8px' : `${level * 20 + 8}px` }}
    >
      {/* Toggle Button */}
      {isTreeItem && hasChildren ? (
        <button
          type="button"
          onClick={() => toggleFolder(folder.id)}
          className="mr-1 flex-shrink-0 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          aria-label={treeFolder.expanded ? 'Collapse folder' : 'Expand folder'}
        >
          {treeFolder.loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-t-2 border-gray-500" />
          ) : treeFolder.expanded ? (
            <ChevronDown className="h-4 w-4" />
          ) : (
            <ChevronRight className="h-4 w-4" />
          )}
        </button>
      ) : (
        // Spacer for alignment
        <div className="mr-1 h-4 w-4 flex-shrink-0">
          {/* Optionally show a different indicator for search results with children */}
          {isSearch && hasChildren && <span className="text-gray-400">•</span>}
        </div>
      )}

      {/* Folder Icon */}
      <div className="mr-2 flex-shrink-0">
        {isTreeItem && treeFolder.expanded ? (
          <FolderOpen className="h-5 w-5" />
        ) : (
          <Folder className="h-5 w-5" />
        )}
      </div>

      {/* Folder Name & Path - Click triggers SELECTION only */}
      <div
        className="mr-2 min-w-0 flex-grow cursor-pointer flex-col overflow-hidden"
        onClick={() =>
          isSearch
            ? toggleSearchFolderSelection(folder.id)
            : toggleFolderSelection(folder.id)
        }
      >
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="truncate">{folder.name}</div>
            </TooltipTrigger>
            <TooltipContent>{folder.name}</TooltipContent>
          </Tooltip>
        </TooltipProvider>
        {/* Display truncated path for search results */}
        {isSearch && folder.path && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="truncate text-xs text-gray-500">
                  {folder.path} {/* Assumes path is already truncated */}
                </div>
              </TooltipTrigger>
              <TooltipContent>
                {/* Show the original, untruncated path in the tooltip */}
                {originalPath ?? folder.path}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>

      {/* Checkbox Area - Click triggers SELECTION only */}
      <div className="ml-auto flex h-4 w-4 flex-shrink-0 items-center justify-center">
        {indeterminate ? (
          // Render Minus icon as a button
          <button
            type="button"
            onClick={() => toggleFolderSelection(folder.id)} // Click selects the folder + children
            className="flex h-full w-full cursor-pointer items-center justify-center rounded-sm border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700"
            aria-label="Select folder partially"
          >
            <Minus className="h-3 w-3 text-gray-600 dark:text-gray-300" />
          </button>
        ) : (
          // Render standard Checkbox
          <Checkbox
            ref={checkboxRef}
            checked={isSelected}
            // Use onCheckedChange for selection toggle
            onCheckedChange={() =>
              isSearch
                ? toggleSearchFolderSelection(folder.id)
                : toggleFolderSelection(folder.id)
            }
            aria-label={isSelected ? 'Deselect folder' : 'Select folder'}
            className="cursor-pointer" // Ensure checkbox itself is clickable
          />
        )}
      </div>
    </div>
  );
};
