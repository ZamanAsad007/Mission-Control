import { z } from 'zod';

export const CloseApproachDataSchema = z.object({
  close_approach_date: z.string(),
  close_approach_date_full: z.string().optional().nullable(),
  epoch_date_close_approach: z.number().optional().nullable(),
  relative_velocity: z.object({
    kilometers_per_second: z.string(),
    kilometers_per_hour: z.string(),
    miles_per_hour: z.string().optional(),
  }),
  miss_distance: z.object({
    astronomical: z.string().optional(),
    lunar: z.string().optional(),
    kilometers: z.string(),
    miles: z.string().optional(),
  }),
  orbiting_body: z.string().optional().nullable(),
});

export const NearEarthObjectSchema = z.object({
  id: z.string(),
  neo_reference_id: z.string(),
  name: z.string(),
  nasa_jpl_url: z.string().optional().nullable(),
  absolute_magnitude_h: z.number().optional().nullable(),
  estimated_diameter: z
    .object({
      kilometers: z.object({
        estimated_diameter_min: z.number(),
        estimated_diameter_max: z.number(),
      }),
      meters: z.object({
        estimated_diameter_min: z.number(),
        estimated_diameter_max: z.number(),
      }),
    })
    .optional()
    .nullable(),
  is_potentially_hazardous_asteroid: z.boolean(),
  close_approach_data: z.array(CloseApproachDataSchema).default([]),
  is_sentry_object: z.boolean().optional(),
});

export const NeoWsFeedSchema = z.object({
  links: z.record(z.string()).optional(),
  element_count: z.number().optional(),
  near_earth_objects: z.record(z.array(NearEarthObjectSchema)),
});

export type CloseApproachData = z.infer<typeof CloseApproachDataSchema>;
export type NearEarthObject = z.infer<typeof NearEarthObjectSchema>;
export type NeoWsFeedResponse = z.infer<typeof NeoWsFeedSchema>;
