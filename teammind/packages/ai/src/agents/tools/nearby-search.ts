import { tool } from 'ai';
import { z } from 'zod';

interface TripAdvisorNearbyPlace {
  location_id: string;
  name: string;
  distance?: string;
  bearing?: string;
  address_obj?: {
    street1?: string;
    street2?: string;
    city?: string;
    state?: string;
    country?: string;
    postalcode?: string;
    address_string?: string;
  };
}

interface TripAdvisorPlaceDetails {
  location_id: string;
  name: string;
  description?: string;
  web_url?: string;
  address_obj?: TripAdvisorNearbyPlace['address_obj'];
  ancestors?: { name: string; level: string }[];
  latitude?: string;
  longitude?: string;
  timezone?: string;
  phone?: string;
  website?: string;
  write_review?: string;
  ranking_data?: any;
  rating?: string;
  rating_image_url?: string;
  num_reviews?: string;
  review_rating_count?: any;
  photo_count?: string;
  see_all_photos?: string;
  price_level?: string;
  hours?: {
    periods?: {
      open: { day: number; time: string };
      close: { day: number; time: string };
    }[];
    weekday_text?: string[];
  };
  cuisine?: { name: string; localized_name: string }[];
  category?: { name: string; localized_name: string };
  subcategory?: { name: string; localized_name: string }[];
}

interface TripAdvisorPhoto {
  id: number;
  is_blessed: boolean;
  caption: string;
  published_date: string;
  images?: {
    thumbnail?: { height: number; width: number; url: string };
    small?: { height: number; width: number; url: string };
    medium?: { height: number; width: number; url: string };
    large?: { height: number; width: number; url: string };
    original?: { height: number; width: number; url: string };
  };
  album: string;
  source: { name: string; localized_name: string };
  user?: { user_id: string | null; member_id: string; type: string };
}

interface GoogleGeocodingResult {
  geometry: {
    location: { lat: number; lng: number };
  };
}

interface GoogleTimezoneResult {
  dstOffset: number;
  rawOffset: number;
  status: string;
  timeZoneId: string;
  timeZoneName: string;
}

interface NearbyPlaceResult {
  name: string;
  location: { lat: number; lng: number };
  timezone: string;
  place_id: string;
  vicinity: string;
  distance: number;
  bearing: string;
  type: string;
  rating: number;
  price_level?: string;
  cuisine?: string;
  description?: string;
  phone?: string;
  website?: string;
  reviews_count: number;
  is_closed: boolean;
  hours?: string[];
  next_open_close?: string | null;
  next_day?: number | null;
  periods?: {
    open: { day: number; time: string };
    close: { day: number; time: string };
  }[];
  photos: {
    thumbnail?: string;
    small?: string;
    medium?: string;
    large?: string;
    original?: string;
    caption: string;
  }[];
  source: string;
}

const parseFloatSafe = (value: string | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
};

const parseIntSafe = (value: string | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
};

/**
 * Tool definition for searching nearby places using TripAdvisor and Google APIs.
 */
export const nearbySearchTool = tool({
  description:
    'Search for nearby places (restaurants, hotels, attractions, etc.) based on location name or coordinates, using TripAdvisor and Google APIs.',
  parameters: z.object({
    location: z
      .string()
      .describe(
        'The location name to search near (e.g., "Eiffel Tower", "Times Square, New York"). Used for geocoding if latitude/longitude are not precise.',
      ),
    latitude: z
      .number()
      .describe('The latitude of the location center for the search.'),
    longitude: z
      .number()
      .describe('The longitude of the location center for the search.'),
    type: z
      .string()
      .describe(
        'The type of place to search for (e.g., "restaurants", "hotels", "attractions", "geos"). Check TripAdvisor API docs for valid categories.',
      ),
    radius: z
      .number()
      .max(50000)
      .describe('The search radius in meters (max 50000).'),
  }),
  execute: async ({
    location,
    latitude,
    longitude,
    type,
    radius,
  }: {
    latitude: number;
    longitude: number;
    location: string;
    type: string;
    radius: number;
  }): Promise<{
    results: NearbyPlaceResult[];
    center: { lat: number; lng: number };
  }> => {
    const tripadvisorApiKey = process.env.TRIPADVISOR_API_KEY;
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;

    if (!tripadvisorApiKey) {
      throw new Error(
        'TripAdvisor API key is missing. Set TRIPADVISOR_API_KEY.',
      );
    }
    if (!googleApiKey) {
      throw new Error(
        'Google Maps API key is missing. Set GOOGLE_MAPS_API_KEY.',
      );
    }

    console.log('Nearby Search Tool Input:');
    console.log('  Location Name:', location);
    console.log('  Latitude:', latitude);
    console.log('  Longitude:', longitude);
    console.log('  Type:', type);
    console.log('  Radius:', radius);

    let finalLat = latitude;
    let finalLng = longitude;

    try {
      try {
        console.log(`Attempting to geocode location name: "${location}"...`);
        const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          location,
        )}&key=${googleApiKey}`;
        const geocodeResponse = await fetch(geocodeUrl);
        if (geocodeResponse.ok) {
          const geocodeData = await geocodeResponse.json();
          const geoResult = geocodeData.results?.[0] as
            | GoogleGeocodingResult
            | undefined;
          if (geoResult?.geometry?.location) {
            finalLat = geoResult.geometry.location.lat;
            finalLng = geoResult.geometry.location.lng;
            console.log(
              `Using geocoded coordinates: Lat ${finalLat}, Lng ${finalLng}`,
            );
          } else {
            console.log(
              'Geocoding did not return a precise location, using provided coordinates.',
            );
          }
        } else {
          console.warn(
            `Google Geocoding failed (${geocodeResponse.status}), using provided coordinates.`,
          );
        }
      } catch (geocodeError) {
        console.error('Error during geocoding:', geocodeError);
        console.log('Proceeding with provided coordinates.');
      }

      console.log(
        `Performing TripAdvisor nearby search for category "${type}"...`,
      );
      const nearbyUrl = `https://api.content.tripadvisor.com/api/v1/location/nearby_search?latLong=${finalLat},${finalLng}&category=${type}&radius=${radius}&language=en&key=${tripadvisorApiKey}`;
      const nearbyResponse = await fetch(nearbyUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!nearbyResponse.ok) {
        const errorText = await nearbyResponse.text();
        console.error(
          `TripAdvisor Nearby Search failed (${nearbyResponse.status}): ${errorText}`,
        );
        throw new Error(
          `TripAdvisor Nearby Search request failed with status ${nearbyResponse.status}`,
        );
      }

      const nearbyData = await nearbyResponse.json();
      const nearbyPlaces: TripAdvisorNearbyPlace[] = nearbyData.data || [];

      if (nearbyPlaces.length === 0) {
        console.log('No nearby places found by TripAdvisor.');
        return { results: [], center: { lat: finalLat, lng: finalLng } };
      }

      console.log(
        `Found ${nearbyPlaces.length} nearby places. Fetching details...`,
      );

      const detailedPlacesPromises = nearbyPlaces.map(
        async (place): Promise<NearbyPlaceResult | null> => {
          try {
            if (!place.location_id) {
              console.warn(`Skipping place "${place.name}": No location_id`);
              return null;
            }

            const detailsUrl = `https://api.content.tripadvisor.com/api/v1/location/${place.location_id}/details?language=en&currency=USD&key=${tripadvisorApiKey}`;
            const photosUrl = `https://api.content.tripadvisor.com/api/v1/location/${place.location_id}/photos?language=en&key=${tripadvisorApiKey}`;

            const [detailsResult, photosResult] = await Promise.allSettled([
              fetch(detailsUrl, { headers: { Accept: 'application/json' } }),
              fetch(photosUrl, { headers: { Accept: 'application/json' } }),
            ]);

            let details: TripAdvisorPlaceDetails | null = null;
            if (
              detailsResult.status === 'fulfilled' &&
              detailsResult.value.ok
            ) {
              details = await detailsResult.value.json();
            } else {
              console.warn(
                `Failed to fetch details for "${place.name}" (ID: ${place.location_id}):`,
                detailsResult.status === 'rejected'
                  ? detailsResult.reason
                  : `Status ${detailsResult.value.status}`,
              );
              return null;
            }

            if (!details) {
              console.warn(
                `No details found for "${place.name}" (ID: ${place.location_id})`,
              );
              return null;
            }

            const placeLat = parseFloatSafe(details.latitude);
            const placeLng = parseFloatSafe(details.longitude);

            let timezone = details.timezone || 'UTC';
            try {
              const tzUrl = `https://maps.googleapis.com/maps/api/timezone/json?location=${placeLat},${placeLng}&timestamp=${Math.floor(Date.now() / 1000)}&key=${googleApiKey}`;
              const tzResponse = await fetch(tzUrl);
              if (tzResponse.ok) {
                const tzData: GoogleTimezoneResult = await tzResponse.json();
                if (tzData.status === 'OK') {
                  timezone = tzData.timeZoneId;
                } else {
                  console.warn(
                    `Google Timezone API failed for ${placeLat},${placeLng}: ${tzData.status}`,
                  );
                }
              } else {
                console.warn(
                  `Google Timezone fetch failed (${tzResponse.status}) for ${placeLat},${placeLng}`,
                );
              }
            } catch (tzError) {
              console.error(
                `Error fetching timezone for ${placeLat},${placeLng}:`,
                tzError,
              );
            }

            let photos: NearbyPlaceResult['photos'] = [];
            if (photosResult.status === 'fulfilled' && photosResult.value.ok) {
              const photosData = await photosResult.value.json();
              photos =
                photosData.data
                  ?.map((photo: TripAdvisorPhoto) => ({
                    thumbnail: photo.images?.thumbnail?.url,
                    small: photo.images?.small?.url,
                    medium: photo.images?.medium?.url,
                    large: photo.images?.large?.url,
                    original: photo.images?.original?.url,
                    caption: photo.caption,
                  }))
                  .filter((p: any) => p.medium || p.large || p.original)
                  .slice(0, 5) || [];
            } else {
              console.warn(
                `Failed to fetch photos for "${place.name}" (ID: ${place.location_id}):`,
                photosResult.status === 'rejected'
                  ? photosResult.reason
                  : `Status ${photosResult.value.status}`,
              );
            }

            let is_closed = true;
            let next_open_close: string | null = null;
            let next_day: number | null = null;
            if (details.hours?.periods && timezone !== 'UTC') {
              try {
                const now = new Date();
                const localTimeStr = now.toLocaleString('en-US', {
                  timeZone: timezone,
                });
                const localTime = new Date(localTimeStr);
                const currentDay = localTime.getDay();
                const currentTime =
                  localTime.getHours() * 100 + localTime.getMinutes();

                const sortedPeriods = [...details.hours.periods].sort(
                  (a, b) => {
                    if (a.open.day !== b.open.day)
                      return a.open.day - b.open.day;
                    return (
                      parseIntSafe(a.open.time) - parseIntSafe(b.open.time)
                    );
                  },
                );

                let foundCurrent = false;
                for (const period of sortedPeriods) {
                  const openDay = period.open.day;
                  const openTime = parseIntSafe(period.open.time);
                  const closeDay = period.close.day;
                  const closeTime = parseIntSafe(period.close.time);

                  if (openDay === currentDay && closeDay === currentDay) {
                    if (currentTime >= openTime && currentTime < closeTime) {
                      is_closed = false;
                      next_open_close = period.close.time;
                      next_day = closeDay;
                      foundCurrent = true;
                      break;
                    }
                  } else if (
                    openDay === currentDay &&
                    closeDay !== currentDay
                  ) {
                    if (currentTime >= openTime) {
                      is_closed = false;
                      next_open_close = period.close.time;
                      next_day = closeDay;
                      foundCurrent = true;
                      break;
                    }
                  } else if (
                    openDay !== currentDay &&
                    closeDay === currentDay
                  ) {
                    if (currentTime < closeTime) {
                      is_closed = false;
                      next_open_close = period.close.time;
                      next_day = closeDay;
                      foundCurrent = true;
                      break;
                    }
                  }
                }

                if (!foundCurrent) {
                  is_closed = true;
                  let nextPeriod = sortedPeriods.find(
                    (p) =>
                      p.open.day > currentDay ||
                      (p.open.day === currentDay &&
                        parseIntSafe(p.open.time) > currentTime),
                  );
                  if (!nextPeriod) {
                    nextPeriod = sortedPeriods[0];
                  }
                  if (nextPeriod) {
                    next_open_close = nextPeriod.open.time;
                    next_day = nextPeriod.open.day;
                  }
                }
              } catch (timeError) {
                console.error(
                  `Error calculating open status for ${place.name}:`,
                  timeError,
                );
              }
            } else if (!details.hours?.periods) {
              console.log(
                `No hours data available for ${place.name}. Assuming closed.`,
              );
            } else if (timezone === 'UTC') {
              console.warn(
                `Could not determine valid timezone for ${place.name}. Cannot calculate open status.`,
              );
            }

            return {
              name: details.name || place.name || 'Unnamed Place',
              location: { lat: placeLat, lng: placeLng },
              timezone,
              place_id: place.location_id,
              vicinity:
                details.address_obj?.address_string ||
                place.address_obj?.address_string ||
                '',
              distance: parseFloatSafe(place.distance),
              bearing: place.bearing || '',
              type: type,
              rating: parseFloatSafe(details.rating),
              price_level: details.price_level,
              cuisine: details.cuisine?.[0]?.name,
              description: details.description,
              phone: details.phone,
              website: details.website,
              reviews_count: parseIntSafe(details.num_reviews),
              is_closed,
              hours: details.hours?.weekday_text,
              next_open_close,
              next_day,
              ...(details.hours && { periods: details.hours.periods }),
              photos,
              source: 'TripAdvisor',
            };
          } catch (error) {
            console.error(
              `Failed to process place "${place.name}" (ID: ${place.location_id}):`,
              error,
            );
            return null;
          }
        },
      );

      const validPlaces = (await Promise.all(detailedPlacesPromises)).filter(
        (place): place is NearbyPlaceResult => place !== null,
      );

      validPlaces.sort((a, b) => a.distance - b.distance);

      console.log(
        `Nearby Search completed. Returning ${validPlaces.length} detailed places.`,
      );

      return {
        results: validPlaces,
        center: { lat: finalLat, lng: finalLng },
      };
    } catch (error) {
      console.error('Error in nearbySearchTool execution:', error);
      throw new Error(
        `Nearby search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
