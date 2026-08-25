import React from 'react';
import { makeAssistantToolUI } from "@assistant-ui/react";
import { Button } from '@tm/ui/button';
import { cn } from '@tm/ui/utils';

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

interface PlaceSearchArgs {
    query: string;
    location: Location;
}

interface PlaceSearchResult {
    places: Place[];
}

export const PlaceCardToolUI = makeAssistantToolUI<PlaceSearchArgs, PlaceSearchResult>({
  toolName: 'place_search',
  render: ({ args, status, result }) => {
    if (status.type === 'running' || !result) {
      return (
        <div className="w-full p-4 border border-neutral-200 dark:border-neutral-800 rounded-lg my-4">
          <div className="animate-pulse space-y-3">
            <div className="h-6 w-2/3 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
            <div className="h-24 bg-neutral-200 dark:bg-neutral-700 rounded-lg"></div>
            <div className="flex space-x-2">
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
              <div className="h-8 w-24 bg-neutral-200 dark:bg-neutral-700 rounded-md"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="w-full space-y-2 my-4">
        {result.places.map((place, index) => (
          <PlaceCard 
            key={place.place_id || index} 
            place={place} 
            onClick={() => {
              // Handle click if needed
              window.open(
                `https://www.google.com/maps/place/?q=place_id:${place.place_id}`, 
                '_blank'
              );
            }} 
          />
        ))}
      </div>
    );
  }
});

interface PlaceCardProps {
    place: Place;
    onClick: () => void;
    variant?: 'overlay' | 'list';
}

const PlaceCard: React.FC<PlaceCardProps> = ({
    place,
    onClick,
    variant = 'list'
}) => {
    const isOverlay = variant === 'overlay';

    return (
        <div
            onClick={onClick}
            className={cn(
                "bg-black text-white rounded-lg transition-transform",
                isOverlay ? 'bg-opacity-90 backdrop-blur-xs' : 'hover:bg-opacity-80',
                'cursor-pointer p-4'
            )}
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
                        <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                            <span className="text-neutral-400">No image</span>
                        </div>
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
    );
};