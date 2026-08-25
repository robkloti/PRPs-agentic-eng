import React from 'react';
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Button } from '@tm/ui/button';
import { Loader2, MapPin } from 'lucide-react';
import { cn } from '@tm/ui/utils';

// Interfaces from the original component
interface Location {
    lat: number;
    lng: number;
}

interface Photo {
    thumbnail: string;
    small: string;
    medium: string;
    large: string;
    original: string;
    caption?: string;
}

interface Place {
    name: string;
    location: Location;
    place_id: string;
    vicinity: string;
    rating?: number;
    reviews_count?: number;
    price_level?: string;
    description?: string;
    photos?: Photo[];
    is_closed?: boolean;
    next_open_close?: string;
    type?: string;
    cuisine?: string;
    source?: string;
    phone?: string;
    website?: string;
    hours?: string[];
    distance?: string;
    bearing?: string;
}

// Tool-specific interfaces
interface PlaceSearchArgs {
    query: string;
    type?: string;
    location?: string;
    radius?: number;
}

interface PlaceSearchResult {
    places: Place[];
}

// PlaceholderImage component
const PlaceholderImage = () => (
    <div className="w-full h-full bg-neutral-200 dark:bg-neutral-800 flex items-center justify-center">
        <MapPin className="h-8 w-8 text-neutral-400 dark:text-neutral-600" />
    </div>
);

export const PlaceListToolUI = makeAssistantToolUI<PlaceSearchArgs, PlaceSearchResult>({
    toolName: 'place_search',
    render: ({ args, status, result }) => {
        // Handle loading state
        if (status.type === 'running' || !result) {
            return (
                <div className="bg-black text-white rounded-lg p-4 my-4 animate-pulse">
                    <div className="flex gap-4">
                        <div className="w-24 h-24 rounded-lg bg-neutral-800"></div>
                        <div className="flex-1 space-y-3">
                            <div className="h-6 bg-neutral-800 rounded w-3/4"></div>
                            <div className="h-4 bg-neutral-800 rounded w-1/2"></div>
                            <div className="h-4 bg-neutral-800 rounded w-1/4"></div>
                            <div className="flex gap-2">
                                <div className="h-8 bg-neutral-800 rounded w-24"></div>
                                <div className="h-8 bg-neutral-800 rounded w-24"></div>
                            </div>
                        </div>
                    </div>
                    <div className="mt-4 flex items-center gap-2 text-neutral-400">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Searching for {args.query}...</span>
                    </div>
                </div>
            );
        }

        // No results
        if (!result.places || result.places.length === 0) {
            return (
                <div className="bg-black text-white rounded-lg p-4 my-4">
                    <div className="flex items-center gap-2">
                        <MapPin className="h-5 w-5" />
                        <span>No places found for "{args.query}"</span>
                    </div>
                </div>
            );
        }

        // Render list of places
        return (
            <div className="space-y-4 my-4">
                {result.places.map((place, index) => (
                    <div
                        key={place.place_id || index}
                        className="bg-black text-white rounded-lg transition-transform hover:bg-opacity-80 cursor-pointer p-4"
                    >
                        <div className="flex gap-4">
                            <div className="w-24 h-24 rounded-lg overflow-hidden shrink-0">
                                {place.photos?.[0]?.medium ? (
                                    <img
                                        src={place.photos[0].medium}
                                        alt={place.name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <PlaceholderImage />
                                )}
                            </div>

                            <div className="flex-1 min-w-0">
                                <h3 className="text-xl font-medium mb-1">{place.name}</h3>

                                <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                        "text-sm font-medium",
                                        place.is_closed ? "text-red-500" : "text-green-500"
                                    )}>
                                        {place.is_closed ? "Closed" : "Open now"}
                                    </span>
                                    {place.next_open_close && (
                                        <>
                                            <span className="text-neutral-400">·</span>
                                            <span className="text-sm text-neutral-400">until {place.next_open_close}</span>
                                        </>
                                    )}
                                    {place.type && (
                                        <>
                                            <span className="text-neutral-400">·</span>
                                            <span className="text-sm text-neutral-400 capitalize">{place.type}</span>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center gap-2 text-sm mb-2">
                                    {place.rating && (
                                        <span>{place.rating.toFixed(1)}</span>
                                    )}
                                    {place.reviews_count && (
                                        <span className="text-neutral-400">({place.reviews_count} reviews)</span>
                                    )}
                                    {place.price_level && (
                                        <>
                                            <span className="text-neutral-400">·</span>
                                            <span>{place.price_level}</span>
                                        </>
                                    )}
                                </div>

                                {place.description && (
                                    <p className="text-sm text-neutral-400 line-clamp-2 mb-3">
                                        {place.description}
                                    </p>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="secondary"
                                        size="sm"
                                        className="bg-neutral-800 hover:bg-neutral-700 text-white"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            window.open(
                                                `https://www.google.com/maps/dir/?api=1&destination=${place.location.lat},${place.location.lng}`,
                                                '_blank'
                                            );
                                        }}
                                    >
                                        Directions
                                    </Button>
                                    {place.website && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(place.website, '_blank');
                                            }}
                                        >
                                            Website
                                        </Button>
                                    )}
                                    {place.phone && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`tel:${place.phone}`, '_blank');
                                            }}
                                        >
                                            Call
                                        </Button>
                                    )}
                                    {place.place_id && (
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            className="bg-neutral-800 hover:bg-neutral-700 text-white"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                window.open(`https://www.tripadvisor.com/${place.place_id}`, '_blank');
                                            }}
                                        >
                                            TripAdvisor
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }
});