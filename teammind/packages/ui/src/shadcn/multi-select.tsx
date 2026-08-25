'use client';

import * as React from 'react';

import { Check, ChevronsUpDown } from 'lucide-react';

import { cn } from '../utils';
import { Button } from './button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from './command';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { Skeleton } from './skeleton';

export interface Option {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  label?: React.ReactNode;
  loading?: boolean;
  className?: string;
  selectAllLabel?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = 'Select options...',
  searchPlaceholder = 'Search options...',
  emptyMessage = 'No options found.',
  disabled = false,
  label,
  loading = false,
  className,
  selectAllLabel = 'Select All',
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelectAll = React.useCallback(() => {
    if (value.length === options.length) {
      // If all are selected, deselect all
      onChange([]);
    } else {
      // Otherwise, select all
      onChange(options.map((option) => option.value));
    }
  }, [options, value, onChange]);

  const handleSelect = React.useCallback(
    (optionValue: string) => {
      onChange(
        value.includes(optionValue)
          ? value.filter((v) => v !== optionValue)
          : [...value, optionValue],
      );
    },
    [value, onChange],
  );

  // Display text in the button
  const displayValue = React.useMemo(() => {
    if (value.length === 0) return placeholder;
    return `${value.length} selected`;
  }, [value, placeholder]);

  // If loading, render skeleton
  if (loading) {
    return (
      <div className={cn('space-y-2', className)}>
        {label && <Skeleton className="h-5 w-40" />}
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      {label && <div className="text-sm font-medium">{label}</div>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="min-h-10 w-full justify-between"
            disabled={disabled}
          >
            <span className="truncate">{displayValue}</span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-[--radix-popover-trigger-width] p-0"
          align="start"
        >
          <Command className="border">
            <CommandInput placeholder={searchPlaceholder} />
            <CommandList className="max-h-[200px] overflow-auto">
              <CommandEmpty>{emptyMessage}</CommandEmpty>
              <CommandGroup>
                {/* Select All Option */}
                <CommandItem
                  onSelect={handleSelectAll}
                  className="mb-1 cursor-pointer"
                >
                  <div className="flex items-center">
                    <div
                      className={cn(
                        'mr-2 flex h-4 w-4 items-center justify-center rounded-sm',
                        value.length === options.length
                          ? 'bg-primary text-primary-foreground'
                          : 'opacity-50 [&_svg]:invisible',
                      )}
                    >
                      <Check className="h-4 w-4" />
                    </div>
                    <span>{selectAllLabel}</span>
                  </div>
                </CommandItem>
                {options.length > 0 && <CommandSeparator className="mb-1" />}
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => handleSelect(option.value)}
                    className="cursor-pointer"
                  >
                    <div className="flex items-center">
                      <div
                        className={cn(
                          'mr-2 flex h-4 w-4 items-center justify-center rounded-sm',
                          value.includes(option.value)
                            ? 'bg-primary text-primary-foreground'
                            : 'opacity-50 [&_svg]:invisible',
                        )}
                      >
                        <Check className="h-4 w-4" />
                      </div>
                      <span>{option.label}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
