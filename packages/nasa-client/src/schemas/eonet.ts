import { z } from 'zod';

export const EonetGeometrySchema = z.object({
  magnitudeValue: z.number().optional().nullable(),
  magnitudeUnit: z.string().optional().nullable(),
  date: z.string(),
  type: z.string(),
  // Coordinates can be [lng, lat] for Point or array of arrays for polygons/lines
  coordinates: z.any(),
});

export const EonetCategorySchema = z.object({
  id: z.string(),
  title: z.string(),
});

export const EonetSourceSchema = z.object({
  id: z.string(),
  url: z.string().optional().nullable(),
});

export const EonetEventSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional().nullable(),
  link: z.string().optional().nullable(),
  closed: z.string().optional().nullable(),
  categories: z.array(EonetCategorySchema).default([]),
  sources: z.array(EonetSourceSchema).default([]),
  geometry: z.array(EonetGeometrySchema).default([]),
});

export const EonetResponseSchema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  link: z.string().optional(),
  events: z.array(EonetEventSchema).default([]),
});

export type EonetGeometry = z.infer<typeof EonetGeometrySchema>;
export type EonetCategory = z.infer<typeof EonetCategorySchema>;
export type EonetSource = z.infer<typeof EonetSourceSchema>;
export type EonetEvent = z.infer<typeof EonetEventSchema>;
export type EonetResponse = z.infer<typeof EonetResponseSchema>;
