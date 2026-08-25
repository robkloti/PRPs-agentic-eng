import { tool } from 'ai';
import { z } from 'zod';

interface MapboxPlaceFeature {
  id: string;
  text: string;
  place_name: string;
  center: [number, number];
  geometry: {
    type: 'Point';
    coordinates: [number, number];
  };
}

interface TextSearchResult {
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
}

const parametersSchema = z.object({
  query: z
    .string()
    .describe("The search query (e.g., 'coffee shop', '123 main street')."),
  location: z
    .string()
    .optional()
    .describe(
      "Optional: Center the search around this location, provided as 'longitude,latitude' (e.g., '-71.18,42.36').",
    ),
  radius: z
    .number()
    .max(50000)
    .optional()
    .describe(
      'Optional: Radius in meters around the location to filter results (max 50000). Requires location to be set.',
    ),
});

export const textSearchTool = tool({
  description:
    'Perform a text-based search for places (points of interest, addresses) using Mapbox API. Can be biased towards a location and filtered by radius.',
  parameters: parametersSchema,
  execute: async (
    args: z.infer<typeof parametersSchema>,
  ): Promise<{ results: TextSearchResult[] }> => {
    const { query, location, radius } = args;

    const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
    if (!mapboxToken) {
      throw new Error(
        'Mapbox Token is not configured. Please set MAPBOX_ACCESS_TOKEN environment variable.',
      );
    }
    let radiusArg = radius;
    let locationArg = location;
    if (radiusArg && !locationArg) {
      console.warn(
        'Radius provided without location; radius filter will be ignored.',
      );
      radiusArg = undefined;
    }

    console.log('Text Search Tool Input:');
    console.log('  Query:', query);
    console.log('  Location:', locationArg);
    console.log('  Radius:', radiusArg);

    let apiUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
      query,
    )}.json?types=poi,address&access_token=${mapboxToken}`;

    let centerLng: number | undefined;
    let centerLat: number | undefined;

    if (locationArg) {
      const coords = locationArg.split(',').map(Number);
      if (coords.length === 2 && !isNaN(coords[0]!) && !isNaN(coords[1]!)) {
        [centerLng, centerLat] = coords;
        apiUrl += `&proximity=${centerLng},${centerLat}`;
        console.log(`Applying proximity bias: ${centerLng}, ${centerLat}`);
      } else {
        console.warn(
          `Invalid location format: "${locationArg}". Ignoring location bias.`,
        );
        locationArg = undefined;
        radiusArg = undefined;
      }
    }

    try {
      console.log(`Fetching Mapbox text search results for "${query}"...`);
      const response = await fetch(apiUrl);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Mapbox Geocoding API error (${response.status}): ${errorText}`,
        );
        throw new Error(
          `Mapbox Geocoding request failed with status ${response.status}`,
        );
      }

      const data = await response.json();
      let features: MapboxPlaceFeature[] = data.features || [];
      console.log(`Received ${features.length} features from Mapbox.`);

      if (
        locationArg &&
        radiusArg &&
        centerLng !== undefined &&
        centerLat !== undefined
      ) {
        console.log(`Filtering results within ${radiusArg}m radius...`);
        const radiusInDegrees = radiusArg / 111320;

        features = features.filter((feature) => {
          const [placeLng, placeLat] = feature.center;
          const distSq =
            Math.pow(placeLng - centerLng!, 2) +
            Math.pow(placeLat - centerLat!, 2);
          return distSq <= Math.pow(radiusInDegrees, 2);
        });
        console.log(`Found ${features.length} features within radius.`);
      }

      const results: TextSearchResult[] = features.map((feature) => ({
        name: feature.text,
        formatted_address: feature.place_name,
        geometry: {
          location: {
            lat: feature.center[1],
            lng: feature.center[0],
          },
        },
      }));

      return { results };
    } catch (error) {
      console.error('Error during Mapbox text search:', error);
      throw new Error(
        `Mapbox text search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
