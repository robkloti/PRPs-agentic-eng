import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import Image from 'next/image';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ColumnDef,
  ColumnFiltersState,
  Row,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import {
  AlertTriangle,
  ArrowUpDown,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Columns4,
  ExternalLink,
  FileIcon,
  Files,
  Info,
  LetterText,
  RefreshCw,
  TextSelect,
  X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DocumentSource } from '@tm/ai/types';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Badge } from '@tm/ui/badge';
import { Button } from '@tm/ui/button';
import { Checkbox } from '@tm/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@tm/ui/dropdown-menu';
import { Input } from '@tm/ui/input';
import { toast } from '@tm/ui/sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@tm/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tm/ui/tooltip';

import { sourceIconMap } from '~/components/source-icons';
import { Database } from '~/lib/database.types';

import { FlagDetailsDialog } from './doc-quality-flag-details';
import { useFlagDocuments } from './use-doc';

type QualityFlag =
  Database['public']['Tables']['document_quality_flags']['Row'];
type FilterStatus = Database['public']['Enums']['flag_status_enum'];

// Constants
const PAGE_SIZE = 10;

// Enhanced QualityFlag with document information for the data table
interface EnhancedQualityFlag extends QualityFlag {
  documentTitle?: string;
  documentSource?: DocumentSource;
  documentUrl?: string;
}

export function DocQualityFlagList() {
  const { t } = useTranslation('create');
  const client = useSupabase();
  const queryClient = useQueryClient();
  const [activeFilter, setActiveFilter] = useState<FilterStatus>('open');
  const [highPriorityOnly, setHighPriorityOnly] = useState(false);
  const [selectedFlag, setSelectedFlag] = useState<QualityFlag | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedFlags, setSelectedFlags] = useState<number[]>([]);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [contextMenuPosition, setContextMenuPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [rightClickedFlag, setRightClickedFlag] =
    useState<EnhancedQualityFlag | null>(null);

  // Context menu ref for positioning and closing
  const contextMenuRef = useRef<HTMLDivElement>(null);

  // Table state
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'relevancy', desc: true },
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Local cache to prevent loading skeletons during view switches
  const [localFlagsCache, setLocalFlagsCache] = useState<
    Record<FilterStatus, EnhancedQualityFlag[]>
  >({
    open: [],
    in_progress: [],
    resolved: [],
    ignored: [],
  });

  // Fetch quality flags with pagination
  const {
    data: flagsResult,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: [
      'documentQualityFlags',
      activeFilter,
      highPriorityOnly,
      currentPage,
    ],
    queryFn: async () => {
      const from = currentPage * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      // Query for flags with pagination
      let flagsQuery = client
        .from('document_quality_flags')
        .select('*', { count: 'exact' });

      // Apply status filter
      if (activeFilter === 'open') {
        flagsQuery = flagsQuery.in('status', ['open', 'in_progress']);
      } else if (activeFilter === 'resolved') {
        flagsQuery = flagsQuery.eq('status', 'resolved');
      } else if (activeFilter === 'ignored') {
        flagsQuery = flagsQuery.eq('status', 'ignored');
      }

      // Apply high priority filter if enabled
      if (highPriorityOnly) {
        flagsQuery = flagsQuery.gte('relevancy', 0.9);
      }

      // Apply sorting and pagination
      flagsQuery = flagsQuery
        .order('created_at', { ascending: false })
        .range(from, to);

      const { data, error, count } = await flagsQuery;

      if (error) throw error;

      return {
        flags: data || [],
        totalCount: count ?? 0,
      };
    },
  });

  // Fetch all documents in batch
  const { data: documentsMap, isLoading: isLoadingDocs } = useFlagDocuments(
    flagsResult?.flags,
  );

  // Combine flag data with document data
  const enhancedFlags = useMemo(() => {
    const flags = (flagsResult?.flags ?? []).map((flag) => {
      const document = documentsMap?.[flag.document_id];
      return {
        ...flag,
        documentTitle: document?.title,
        documentSource: document?.source,
        documentUrl: document?.url,
      };
    });

    // Update local cache
    if (flags.length > 0 && !isLoading && !isLoadingDocs) {
      setLocalFlagsCache((prev) => ({
        ...prev,
        [activeFilter]: flags,
      }));
    }

    return flags;
  }, [
    flagsResult?.flags,
    documentsMap,
    isLoading,
    isLoadingDocs,
    activeFilter,
  ]);

  // Show cached data if loading but we have cache
  const displayFlags = useMemo(() => {
    if (!isLoading && !isLoadingDocs) return enhancedFlags;
    if (localFlagsCache[activeFilter]?.length > 0)
      return localFlagsCache[activeFilter];
    return enhancedFlags;
  }, [enhancedFlags, isLoading, isLoadingDocs, localFlagsCache, activeFilter]);

  const totalPages = useMemo(() => {
    return flagsResult?.totalCount
      ? Math.ceil(flagsResult.totalCount / PAGE_SIZE)
      : 0;
  }, [flagsResult?.totalCount]);

  // Close context menu when clicking outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(e.target as Node)
      ) {
        setContextMenuPosition(null);
      }
    };

    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  const handleViewDetails = useCallback(
    (flag: QualityFlag) => {
      if (actionInProgress) return;
      setSelectedFlag(flag);
      setDetailsDialogOpen(true);
    },
    [actionInProgress],
  );

  const handleResolveFlag = useCallback(
    async (flag: QualityFlag) => {
      if (actionInProgress) return;
  
      setActionInProgress(true);
      setProcessingId(flag.id);
  
      // Optimistic update to local cache
      if (flag.status === 'open' || flag.status === 'in_progress') {
        setLocalFlagsCache((prev) => ({
          ...prev,
          open: prev.open.filter((f) => f.id !== flag.id),
        }));
      }
  
      try {
        const { error } = await client
          .from('document_quality_flags')
          .update({
            status: 'resolved',
            updated_at: new Date().toISOString(),
          })
          .eq('id', flag.id);
  
        if (error) throw error;
  
        toast.success(t('issueFlagResolved'));
        setDetailsDialogOpen(false);
  
        // Remove from selected flags if it was selected
        setSelectedFlags((prev) => prev.filter((id) => id !== flag.id));
  
        // Just refetch current view instead of switching filters
        await refetch();
  
        // Invalidate other views without triggering immediate refetches
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityFlags'],
          refetchType: 'none',
        });
  
        // Invalidate the stats query to update the card counters
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityStats'],
        });
      } catch (error) {
        toast.error(t('failedToResolveFlag'));
        console.error(error);
  
        // Revert optimistic update on error
        await refetch();
      } finally {
        setProcessingId(null);
        setActionInProgress(false);
      }
    },
    [client, queryClient, refetch, t, actionInProgress],
  );

  const handleIgnoreFlag = useCallback(
    async (flag: QualityFlag) => {
      if (actionInProgress) return;
  
      setActionInProgress(true);
      setProcessingId(flag.id);
  
      // Optimistic update to local cache
      if (flag.status === 'open' || flag.status === 'in_progress') {
        setLocalFlagsCache((prev) => ({
          ...prev,
          open: prev.open.filter((f) => f.id !== flag.id),
        }));
      } else if (flag.status === 'resolved') {
        setLocalFlagsCache((prev) => ({
          ...prev,
          resolved: prev.resolved.filter((f) => f.id !== flag.id),
        }));
      }
  
      try {
        const { error } = await client
          .from('document_quality_flags')
          .update({
            status: 'ignored',
            updated_at: new Date().toISOString(),
          })
          .eq('id', flag.id);
  
        if (error) throw error;
  
        toast.success(t('issueFlagIgnored'));
        setDetailsDialogOpen(false);
  
        // Remove from selected flags if it was selected
        setSelectedFlags((prev) => prev.filter((id) => id !== flag.id));
  
        // Just refetch current view instead of switching filters
        await refetch();
  
        // Invalidate other views without triggering immediate refetches
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityFlags'],
          refetchType: 'none',
        });
  
        // Invalidate the stats query to update the card counters
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityStats'],
        });
      } catch (error) {
        toast.error(t('failedToIgnoreFlag'));
        console.error(error);
  
        // Revert optimistic update on error
        await refetch();
      } finally {
        setProcessingId(null);
        setActionInProgress(false);
      }
    },
    [client, queryClient, refetch, t, actionInProgress],
  );

  const handleReopenFlag = useCallback(
    async (flag: QualityFlag) => {
      if (actionInProgress) return;
  
      setActionInProgress(true);
      setProcessingId(flag.id);
  
      // Optimistic update to local cache
      if (flag.status === 'resolved') {
        setLocalFlagsCache((prev) => ({
          ...prev,
          resolved: prev.resolved.filter((f) => f.id !== flag.id),
        }));
      } else if (flag.status === 'ignored') {
        setLocalFlagsCache((prev) => ({
          ...prev,
          ignored: prev.ignored.filter((f) => f.id !== flag.id),
        }));
      }
  
      try {
        const { error } = await client
          .from('document_quality_flags')
          .update({
            status: 'open',
            updated_at: new Date().toISOString(),
          })
          .eq('id', flag.id);
  
        if (error) throw error;
  
        toast.success(t('issueFlagReopened'));
        setDetailsDialogOpen(false);
  
        // Remove from selected flags if it was selected
        setSelectedFlags((prev) => prev.filter((id) => id !== flag.id));
  
        // Just refetch current view instead of switching filters
        await refetch();
  
        // Invalidate other views without triggering immediate refetches
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityFlags'],
          refetchType: 'none',
        });
  
        // Invalidate the stats query to update the card counters
        await queryClient.invalidateQueries({
          queryKey: ['documentQualityStats'],
        });
      } catch (error) {
        toast.error(t('failedToReopenFlag'));
        console.error(error);
  
        // Revert optimistic update on error
        await refetch();
      } finally {
        setProcessingId(null);
        setActionInProgress(false);
      }
    },
    [client, queryClient, refetch, t, actionInProgress],
  );

  // Handle filter change - reset to first page
  const handleFilterChange = useCallback(
    (filter: FilterStatus) => {
      if (actionInProgress) return;
      if (filter === activeFilter) return;

      setActiveFilter(filter);
      setCurrentPage(0);
      setSelectedFlags([]);
    },
    [activeFilter, actionInProgress],
  );

  // Handle high priority filter toggle
  const handleHighPriorityToggle = useCallback(() => {
    if (actionInProgress) return;

    setHighPriorityOnly((prev) => !prev);
    setCurrentPage(0); // Reset to first page
    setSelectedFlags([]);
  }, [actionInProgress]);

  // Flag type icon mapping
  const getFlagIcon = useCallback((flagType: string) => {
    switch (flagType) {
      case 'outdated':
        return <Clock className="h-4 w-4" />;
      case 'factual':
        return <AlertTriangle className="h-4 w-4" />;
      case 'redundant':
        return <Files className="h-4 w-4" />;
      case 'quality':
        return <LetterText className="h-4 w-4" />;
      case 'inconsistent':
        return <TextSelect className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  }, []);

  // Pagination controls for the data table
  const handlePrevPage = useCallback(() => {
    if (actionInProgress) return;
    if (currentPage > 0) {
      setCurrentPage((prev) => prev - 1);
      setSelectedFlags([]);
    }
  }, [currentPage, actionInProgress]);

  const handleNextPage = useCallback(() => {
    if (actionInProgress) return;
    if (currentPage < totalPages - 1) {
      setCurrentPage((prev) => prev + 1);
      setSelectedFlags([]);
    }
  }, [currentPage, totalPages, actionInProgress]);

  // Function to handle row selection
  const handleSelectRow = useCallback(
    (id: number, isSelected: boolean, e?: React.MouseEvent) => {
      if (e) {
        e.stopPropagation();
      }

      setSelectedFlags((prev) =>
        isSelected ? [...prev, id] : prev.filter((flagId) => flagId !== id),
      );
    },
    [],
  );

  // Function to handle select all
  const handleSelectAll = useCallback(
    (isSelected: boolean) => {
      setSelectedFlags(isSelected ? displayFlags.map((flag) => flag.id) : []);
    },
    [displayFlags],
  );

  // Bulk actions
  const handleBulkIgnore = useCallback(async () => {
    if (selectedFlags.length === 0 || actionInProgress) return;
  
    setActionInProgress(true);
  
    // Optimistic update to local cache
    if (activeFilter === 'open') {
      setLocalFlagsCache((prev) => ({
        ...prev,
        open: prev.open.filter((f) => !selectedFlags.includes(f.id)),
      }));
    } else if (activeFilter === 'resolved') {
      setLocalFlagsCache((prev) => ({
        ...prev,
        resolved: prev.resolved.filter((f) => !selectedFlags.includes(f.id)),
      }));
    }
  
    try {
      const { error } = await client
        .from('document_quality_flags')
        .update({
          status: 'ignored',
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedFlags);
  
      if (error) throw error;
  
      toast.success(t('bulkFlagsIgnored', { count: selectedFlags.length }));
  
      // Just refetch current view instead of switching filters
      await refetch();
  
      setSelectedFlags([]);
  
      // Invalidate other views without triggering immediate refetches
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityFlags'],
        refetchType: 'none',
      });
  
      // Invalidate the stats query to update the card counters
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityStats'],
      });
    } catch (error) {
      toast.error(t('failedToBulkIgnore'));
      console.error(error);
  
      // Revert optimistic update on error
      await refetch();
    } finally {
      setActionInProgress(false);
    }
  }, [
    selectedFlags,
    client,
    queryClient,
    refetch,
    t,
    actionInProgress,
    activeFilter,
  ]);

  const handleBulkResolve = useCallback(async () => {
    if (selectedFlags.length === 0 || actionInProgress) return;
  
    setActionInProgress(true);
  
    // Optimistic update to local cache
    if (activeFilter === 'open') {
      setLocalFlagsCache((prev) => ({
        ...prev,
        open: prev.open.filter((f) => !selectedFlags.includes(f.id)),
      }));
    }
  
    try {
      const { error } = await client
        .from('document_quality_flags')
        .update({
          status: 'resolved',
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedFlags);
  
      if (error) throw error;
  
      toast.success(t('bulkFlagsResolved', { count: selectedFlags.length }));
  
      // Just refetch current view instead of switching filters
      await refetch();
  
      setSelectedFlags([]);
  
      // Invalidate other views without triggering immediate refetches
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityFlags'],
        refetchType: 'none',
      });
  
      // Invalidate the stats query to update the card counters
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityStats'],
      });
    } catch (error) {
      toast.error(t('failedToBulkResolve'));
      console.error(error);
  
      // Revert optimistic update on error
      await refetch();
    } finally {
      setActionInProgress(false);
    }
  }, [
    selectedFlags,
    client,
    queryClient,
    refetch,
    t,
    actionInProgress,
    activeFilter,
  ]);

  const handleBulkReopen = useCallback(async () => {
    if (selectedFlags.length === 0 || actionInProgress) return;
  
    setActionInProgress(true);
  
    // Optimistic update to local cache
    if (activeFilter === 'resolved') {
      setLocalFlagsCache((prev) => ({
        ...prev,
        resolved: prev.resolved.filter((f) => !selectedFlags.includes(f.id)),
      }));
    } else if (activeFilter === 'ignored') {
      setLocalFlagsCache((prev) => ({
        ...prev,
        ignored: prev.ignored.filter((f) => !selectedFlags.includes(f.id)),
      }));
    }
  
    try {
      const { error } = await client
        .from('document_quality_flags')
        .update({
          status: 'open',
          updated_at: new Date().toISOString(),
        })
        .in('id', selectedFlags);
  
      if (error) throw error;
  
      toast.success(t('bulkFlagsReopened', { count: selectedFlags.length }));
  
      // Just refetch current view instead of switching filters
      await refetch();
  
      setSelectedFlags([]);
  
      // Invalidate other views without triggering immediate refetches
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityFlags'],
        refetchType: 'none',
      });
  
      // Invalidate the stats query to update the card counters
      await queryClient.invalidateQueries({
        queryKey: ['documentQualityStats'],
      });
    } catch (error) {
      toast.error(t('failedToBulkReopen'));
      console.error(error);
  
      // Revert optimistic update on error
      await refetch();
    } finally {
      setActionInProgress(false);
    }
  }, [
    selectedFlags,
    client,
    queryClient,
    refetch,
    t,
    actionInProgress,
    activeFilter,
  ]);

  // Handle opening document
  const handleOpenDocument = useCallback((url: string | undefined) => {
    if (url) {
      window.open(url, '_blank');
    }
  }, []);

  // Handle right-click on row to show context menu
  const handleRowRightClick = useCallback(
    (e: React.MouseEvent, flag: EnhancedQualityFlag) => {
      e.preventDefault();
      setRightClickedFlag(flag);
      setContextMenuPosition({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  // Define columns for the data table
  const columns = useMemo<ColumnDef<EnhancedQualityFlag>[]>(
    () => [
      {
        id: 'select',
        header: ({ table }) => (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Checkbox
                  checked={
                    table.getRowModel().rows.length > 0 &&
                    selectedFlags.length === table.getRowModel().rows.length
                  }
                  onCheckedChange={(value) => handleSelectAll(!!value)}
                  aria-label="Select all"
                />
              </TooltipTrigger>
              <TooltipContent>{t('selectAll')}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={selectedFlags.includes(row.original.id)}
            onCheckedChange={(value) => {
              handleSelectRow(row.original.id, !!value);
            }}
            aria-label="Select row"
            onClick={(e) => e.stopPropagation()} // Prevent row click when clicking the checkbox
          />
        ),
        enableSorting: false,
        enableHiding: false, // Cannot hide the select column
      },
      {
        accessorKey: 'documentTitle',
        header: ({ column }) => (
          <div className="group flex items-center">
            <span className="font-medium">{t('document')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const flag = row.original;
          const title =
            flag.documentTitle ??
            `${t('documentQualityIssue')} ${flag.document_id}`;
          const SourceIconComponent = flag.documentSource
            ? sourceIconMap[flag.documentSource] || FileIcon
            : FileIcon;

          return (
            <div className="flex max-w-xs items-center gap-2">
              <SourceIconComponent className="h-4 w-4 flex-shrink-0 text-primary" />
              <span className="truncate font-medium">{title}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'flag_type',
        header: ({ column }) => (
          <div className="group flex items-center">
            <span className="font-medium">{t('issueType')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const flag = row.original;

          return (
            <div className="flex items-center gap-2">
              {getFlagIcon(flag.flag_type)}
              <span>{t(flag.flag_type)}</span>
            </div>
          );
        },
        filterFn: (
          row: Row<EnhancedQualityFlag>,
          columnId: string,
          filterValue: string[],
        ) => {
          const value: string = row.getValue(columnId);
          return filterValue.includes(value);
        },
      },
      {
        accessorKey: 'recommended_action',
        header: ({ column }) => (
          <div className="group flex items-center">
            <span className="font-medium">{t('recommendedAction')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const flag = row.original;

          return <Badge variant="outline">{t(flag.recommended_action)}</Badge>;
        },
        filterFn: (
          row: Row<EnhancedQualityFlag>,
          columnId: string,
          filterValue: string[],
        ) => {
          const value: string = row.getValue(columnId);
          return filterValue.includes(value);
        },
      },
      {
        accessorKey: 'relevancy',
        header: ({ column }) => (
          <div className="group flex items-center justify-end">
            <span className="font-medium">{t('relevancyScore')}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-1 h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
              onClick={() =>
                column.toggleSorting(column.getIsSorted() === 'asc')
              }
            >
              <ArrowUpDown className="h-3 w-3" />
            </Button>
          </div>
        ),
        cell: ({ row }) => {
          const flag = row.original;
          const score = Math.round(flag.relevancy * 100);

            return (
            <div
              className={`text-right font-medium ${
              score >= 90 ? 'text-destructive' : ''
              }`}
            >
              {score}%
            </div>
            );
        },
        sortingFn: 'basic',
      },
    ],
    [t, selectedFlags, handleSelectAll, handleSelectRow, getFlagIcon],
  );

  // Initialize table
  const table = useReactTable({
    data: displayFlags,
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    enableColumnFilters: true,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  useEffect(() => {
    // Make sure at least one content column is visible
    const visibleColumns = table
      .getAllColumns()
      .filter((col) => col.getIsVisible() && col.id !== 'select');
    if (visibleColumns.length === 0) {
      // Force first content column to be visible
      const firstContentColumn = table
        .getAllColumns()
        .find((col) => col.id !== 'select');
      if (firstContentColumn) {
        firstContentColumn.toggleVisibility(true);
      }
    }
  }, [table]);

  // Show loading indicator only when we don't have cached data
  const showLoading = isLoading && !localFlagsCache[activeFilter]?.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex h-10 items-center">
          <div className="flex gap-2">
            <Badge
              variant={activeFilter === 'open' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange('open')}
            >
              {t('active')}
            </Badge>
            <Badge
              variant={activeFilter === 'resolved' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange('resolved')}
            >
              {t('resolved')}
            </Badge>
            <Badge
              variant={activeFilter === 'ignored' ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => handleFilterChange('ignored')}
            >
              {t('ignored')}
            </Badge>
            <Badge
              variant={highPriorityOnly ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={handleHighPriorityToggle}
            >
              {t('highPriority')}
            </Badge>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 md:justify-end">
          {/* Use a fixed-width container for bulk action buttons to prevent layout shifts */}
          <div
            className={`flex h-10 w-full items-center gap-2 transition-opacity duration-200 md:w-auto ${
              selectedFlags.length > 0 ? 'opacity-100' : 'opacity-0'
            }`}
          >
            {selectedFlags.length > 0 && (
              <>
                <span className="text-sm font-medium text-muted-foreground">
                  {selectedFlags.length} {t('selected')}
                </span>
                {activeFilter === 'open' ? (
                  <>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={handleBulkResolve}
                      disabled={actionInProgress}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      {t('resolveAll')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={handleBulkIgnore}
                      disabled={actionInProgress}
                    >
                      <X className="mr-1 h-4 w-4" />
                      {t('ignoreAll')}
                    </Button>
                  </>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8"
                    onClick={handleBulkReopen}
                    disabled={actionInProgress}
                  >
                    <RefreshCw className="mr-1 h-4 w-4" />
                    {t('reopenAll')}
                  </Button>
                )}
              </>
            )}
          </div>

          <Input
            placeholder={t('searchDocuments')}
            value={globalFilter ?? ''}
            onChange={(e) => setGlobalFilter(e.target.value)}
            className="w-64 md:w-48"
          />

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="border">
                      <Columns4 strokeWidth={1.2} className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {table
                      .getAllColumns()
                      .filter(
                        (column) =>
                          column.getCanHide() && column.id !== 'select',
                      )
                      .map((column) => {
                        const visibleColumnsCount = table
                          .getAllColumns()
                          .filter(
                            (col) => col.getIsVisible() && col.id !== column.id,
                          ).length;

                        // Disable checkbox if hiding would leave 0 content columns visible
                        const wouldDisableAllColumns = visibleColumnsCount < 1;

                        return (
                          <DropdownMenuCheckboxItem
                            key={column.id}
                            className="capitalize"
                            checked={column.getIsVisible()}
                            disabled={
                              column.getIsVisible() && wouldDisableAllColumns
                            }
                            onCheckedChange={(value) =>
                              column.toggleVisibility(!!value)
                            }
                          >
                            {column.id === 'documentTitle'
                              ? t('document')
                              : column.id === 'flag_type'
                                ? t('issueType')
                                : column.id === 'recommended_action'
                                  ? t('recommendedAction')
                                  : column.id === 'relevancy'
                                    ? t('relevancyScore')
                                    : column.id}
                          </DropdownMenuCheckboxItem>
                        );
                      })}
                  </DropdownMenuContent>
                </DropdownMenu>
              </TooltipTrigger>
              <TooltipContent side="left">
                {t('columnVisibility')}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      <div className="min-h-[480px] max-h-[800px] overflow-y-auto">
        {showLoading ? (
          <TableSkeleton />
        ) : (
          <div>
            <Table>
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead key={header.id}>
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext(),
                            )}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {isLoadingDocs && !displayFlags.length ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <div className="flex items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                        <span className="ml-2">{t('loading')}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : displayFlags.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && 'selected'}
                      className="group cursor-pointer hover:bg-muted/50"
                      onClick={() => handleViewDetails(row.original)}
                      onContextMenu={(e) =>
                        handleRowRightClick(e, row.original)
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length}
                      className="h-24 text-center"
                    >
                      <div className="flex min-h-[300px] flex-col items-center justify-center px-4 py-8">
                        <Image
                          src="/images/illustrations/reviewed-docs-humans.svg"
                          alt="No updates"
                          width={300}
                          height={172}
                          className="mb-8 opacity-80"
                        />
                        <p className="mb-2 text-lg font-medium text-muted-foreground">
                          {activeFilter === 'open'
                            ? t('noActiveQualityIssues')
                            : activeFilter === 'resolved'
                              ? t('noResolvedQualityIssues')
                              : t('noIgnoredQualityIssues')}
                        </p>
                        <p className="max-w-sm text-center text-sm text-muted-foreground">
                          {activeFilter === 'open'
                            ? t('yourDocumentsLookGood')
                            : activeFilter === 'resolved'
                              ? t('noResolvedIssuesYet')
                              : t('noIgnoredIssuesYet')}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      {/* Pagination controls - outside the data table for consistency with API-based pagination */}
      {!showLoading && displayFlags.length > 0 && totalPages > 1 && (
        <div className="mt-4 flex items-center justify-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePrevPage}
            disabled={currentPage === 0 || actionInProgress}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t('previous')}
          </Button>
          <span className="text-sm">
            {t('pageXOfY', {
              current: currentPage + 1,
              total: totalPages,
            })}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextPage}
            disabled={currentPage >= totalPages - 1 || actionInProgress}
          >
            {t('next')}
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}

      {/* Context menu for right-click actions */}
      {contextMenuPosition && rightClickedFlag && (
        <div
          ref={contextMenuRef}
          className="absolute z-50 rounded-md border bg-background shadow-md"
          style={{
            top: `${contextMenuPosition.y}px`,
            left: `${contextMenuPosition.x}px`,
          }}
        >
          <div className="flex flex-col py-1">
            {rightClickedFlag.documentUrl && (
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50"
                onClick={() => {
                  handleOpenDocument(rightClickedFlag.documentUrl);
                  setContextMenuPosition(null);
                }}
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                {t('openDocument')}
              </button>
            )}

            {activeFilter === 'open' ? (
              <>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50"
                  onClick={() => {
                    void handleResolveFlag(rightClickedFlag);
                    setContextMenuPosition(null);
                  }}
                >
                  <Check className="mr-2 h-4 w-4" />
                  {t('resolveIssue')}
                </button>
                <button
                  className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50"
                  onClick={() => {
                    void handleIgnoreFlag(rightClickedFlag);
                    setContextMenuPosition(null);
                  }}
                >
                  <X className="mr-2 h-4 w-4" />
                  {t('ignoreIssue')}
                </button>
              </>
            ) : (
              <button
                className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50"
                onClick={() => {
                  void handleReopenFlag(rightClickedFlag);
                  setContextMenuPosition(null);
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                {t('reopenIssue')}
              </button>
            )}

            <button
              className="flex w-full items-center px-3 py-2 text-sm hover:bg-muted/50"
              onClick={() => {
                handleViewDetails(rightClickedFlag);
                setContextMenuPosition(null);
              }}
            >
              <Info className="mr-2 h-4 w-4" />
              {t('viewDetails')}
            </button>
          </div>
        </div>
      )}

      <FlagDetailsDialog
        open={detailsDialogOpen}
        onOpenChange={setDetailsDialogOpen}
        flag={selectedFlag}
        onResolve={
          activeFilter === 'open' ? handleResolveFlag : handleReopenFlag
        }
        onIgnore={handleIgnoreFlag}
        isProcessing={!!processingId && processingId === selectedFlag?.id}
      />
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[40px]"></TableHead>
            <TableHead>Document</TableHead>
            <TableHead>Issue Type</TableHead>
            <TableHead>Action</TableHead>
            <TableHead className="text-right">Relevancy</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {[1, 2, 3, 4, 5].map((i) => (
            <TableRow key={i}>
              <TableCell>
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
                  <div className="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
                </div>
              </TableCell>
              <TableCell>
                <div className="h-4 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </TableCell>
              <TableCell>
                <div className="h-6 w-20 animate-pulse rounded-full bg-gray-200 dark:bg-gray-700"></div>
              </TableCell>
              <TableCell className="text-right">
                <div className="ml-auto h-4 w-12 animate-pulse rounded bg-gray-200 dark:bg-gray-700"></div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
