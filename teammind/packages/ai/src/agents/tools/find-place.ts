import { tool } from 'ai';
import { z } from 'zod';

interface MapboxFeatureProperties {
  name_preferred?: string;
  name?: string;
  full_address?: string;
  feature_type?: string;
  context?: any;
  coordinates?: { latitude: number; longitude: number };
  bbox?: number[];
}

interface MapboxFeature {
  id: string;
  properties: MapboxFeatureProperties;
  geometry: {
    type: string;
    coordinates: number[];
  };
}

interface GoogleAddressComponent {
  long_name: string;
  short_name: string;
  types: string[];
}

interface GoogleGeometry {
  location: {
    lat: number;
    lng: number;
  };
  viewport: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
}

interface GoogleResult {
  place_id: string;
  formatted_address: string;
  geometry: GoogleGeometry;
  types: string[];
  address_components: GoogleAddressComponent[];
}

interface CombinedFeature {
  id: string;
  name: string;
  formatted_address: string;
  geometry: {
    type: string;
    coordinates: number[];
  };
  feature_type?: string;
  source: 'google' | 'mapbox';
  address_components?: GoogleAddressComponent[];
  viewport?: GoogleGeometry['viewport'];
  context?: any;
  coordinates?: { latitude: number; longitude: number };
  bbox?: number[];
  place_id?: string;
}

/**
 * Tool definition for finding places using Google Maps (forward geocoding)
 * and Mapbox (reverse geocoding).
 */
export const findPlaceTool = tool({
  description:
    'Find places using forward geocoding (address to coordinates via Google) and reverse geocoding (coordinates to address/place via Mapbox).',
  parameters: z.object({
    query: z
      .string()
      .optional()
      .describe(
        'The address or place name to search for (used for forward geocoding with Google).',
      ),
    coordinates: z
      .array(z.number())
      .length(2)
      .optional()
      .describe(
        'Coordinates [latitude, longitude] to search near (used for reverse geocoding with Mapbox).',
      ),
  }),
  execute: async ({
    query,
    coordinates,
  }: {
    query?: string;
    coordinates?: number[];
  }): Promise<{
    features: CombinedFeature[];
    google_attribution?: string;
    mapbox_attribution?: string;
  }> => {
    const googleApiKey = process.env.GOOGLE_MAPS_API_KEY;
    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;

    if (!query && !coordinates) {
      throw new Error('Either query or coordinates must be provided.');
    }
    if (query && !googleApiKey) {
      throw new Error(
        'Google Maps API key is required for forward geocoding (query search). Set GOOGLE_MAPS_API_KEY.',
      );
    }
    if (coordinates && !mapboxToken) {
      throw new Error(
        'Mapbox Token is required for reverse geocoding (coordinate search). Set MAPBOX_ACCESS_TOKEN.',
      );
    }

    console.log('Find Place Tool Input:');
    console.log('  Query:', query);
    console.log('  Coordinates:', coordinates);

    const features: CombinedFeature[] = [];
    let google_attribution: string | undefined;
    let mapbox_attribution: string | undefined;

    try {
      const fetchPromises: Promise<any>[] = [];

      if (query && googleApiKey) {
        console.log(`Performing Google forward geocoding for "${query}"...`);
        const googleUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          query,
        )}&key=${googleApiKey}`;
        fetchPromises.push(
          fetch(googleUrl)
            .then(async (res) => {
              if (!res.ok) {
                const errorText = await res.text();
                console.error(
                  `Google Geocoding API error (${res.status}): ${errorText}`,
                );
                return null;
              }
              return res.json();
            })
            .catch((err) => {
              console.error('Error fetching from Google Geocoding API:', err);
              return null;
            }),
        );
      } else {
        fetchPromises.push(Promise.resolve(null));
      }

      if (coordinates && mapboxToken) {
        const [lat, lng] = coordinates;
        console.log(
          `Performing Mapbox reverse geocoding for ${lat}, ${lng}...`,
        );
        const mapboxUrl = `https://api.mapbox.com/search/geocode/v6/reverse?longitude=${lng}&latitude=${lat}&access_token=${mapboxToken}`;
        fetchPromises.push(
          fetch(mapboxUrl)
            .then(async (res) => {
              if (!res.ok) {
                const errorText = await res.text();
                console.error(
                  `Mapbox Reverse Geocoding API error (${res.status}): ${errorText}`,
                );
                return null;
              }
              return res.json();
            })
            .catch((err) => {
              console.error(
                'Error fetching from Mapbox Reverse Geocoding API:',
                err,
              );
              return null;
            }),
        );
      } else {
        fetchPromises.push(Promise.resolve(null));
      }

      const [googleData, mapboxData] = await Promise.all(fetchPromises);

      if (
        googleData &&
        googleData.status === 'OK' &&
        googleData.results?.length > 0
      ) {
        console.log(`Processing ${googleData.results.length} Google results.`);
        google_attribution = 'Results powered by Google Maps Platform';
        features.push(
          ...googleData.results.map(
            (result: GoogleResult): CombinedFeature => ({
              id: result.place_id,
              name:
                result.formatted_address.split(',')[0] ||
                result.formatted_address,
              formatted_address: result.formatted_address,
              geometry: {
                type: 'Point',
                coordinates: [
                  result.geometry.location.lng,
                  result.geometry.location.lat,
                ],
              },
              feature_type: result.types?.[0],
              address_components: result.address_components,
              viewport: result.geometry.viewport,
              place_id: result.place_id,
              source: 'google',
            }),
          ),
        );
      } else if (googleData) {
        console.log(`Google geocoding returned status: ${googleData.status}`);
      }

      if (mapboxData && mapboxData.features?.length > 0) {
        console.log(`Processing ${mapboxData.features.length} Mapbox results.`);
        mapbox_attribution = 'Results powered by Mapbox';
        features.push(
          ...mapboxData.features.map(
            (feature: MapboxFeature): CombinedFeature => ({
              id: feature.id,
              name:
                feature.properties.name_preferred ||
                feature.properties.name ||
                'Unknown Place',
              formatted_address:
                feature.properties.full_address ||
                feature.properties.name ||
                '',
              geometry: feature.geometry,
              feature_type: feature.properties.feature_type,
              context: feature.properties.context,
              coordinates: feature.properties.coordinates,
              bbox: feature.properties.bbox,
              source: 'mapbox',
            }),
          ),
        );
      } else if (mapboxData) {
        console.log('Mapbox reverse geocoding returned no features.');
      }

      console.log(
        `Find Place completed. Total features found: ${features.length}`,
      );

      return {
        features,
        ...(google_attribution && { google_attribution }),
        ...(mapbox_attribution && { mapbox_attribution }),
      };
    } catch (error) {
      console.error('Error in findPlaceTool execution:', error);
      return { features: [] };
    }
  },
});
