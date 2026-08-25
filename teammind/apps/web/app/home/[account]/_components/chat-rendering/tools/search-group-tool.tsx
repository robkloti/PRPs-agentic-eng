import React from 'react';
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Card, CardDescription, CardHeader, CardTitle } from '@tm/ui/card';
import { cn } from '@tm/ui/utils';

// Define the types
interface SearchGroup {
    id: string;
    name: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
}

interface SearchGroupsArgs {
    searchGroups: SearchGroup[];
    selectedGroup?: string;
}

interface SearchGroupsResult {
    selectedGroup: string;
}

export const SearchGroupsToolUI = makeAssistantToolUI<SearchGroupsArgs, SearchGroupsResult>({
    toolName: 'search_groups',
    render: ({ args, status, result, addResult }) => {
        const isLoading = status.type === 'running';
        const selectedGroup = result?.selectedGroup || args.selectedGroup;

        const handleGroupSelect = (group: SearchGroup) => {
            addResult({ selectedGroup: group.id });
        };

        return (
            <div className="w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
                {args.searchGroups.map((group) => {
                    const Icon = group.icon;
                    const isSelected = selectedGroup === group.id;

                    return (
                        <Card
                            key={group.id}
                            className={cn(
                                "cursor-pointer transition-all duration-200 hover:scale-[1.02]",
                                "border border-neutral-200 dark:border-neutral-800",
                                isSelected && "ring-2 ring-primary ring-offset-2 dark:ring-offset-neutral-950",
                                isLoading && "opacity-70 pointer-events-none"
                            )}
                            onClick={() => handleGroupSelect(group)}
                        >
                            <CardHeader>
                                <div className="flex items-start gap-4">
                                    <div className={cn(
                                        "p-2 rounded-lg",
                                        isSelected ? "bg-primary text-primary-foreground" : "bg-neutral-100 dark:bg-neutral-800"
                                    )}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{group.name}</CardTitle>
                                        <CardDescription className="mt-1">
                                            {group.description}
                                        </CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                        </Card>
                    );
                })}
            </div>
        );
    }
});