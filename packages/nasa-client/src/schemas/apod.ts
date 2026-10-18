import { z } from 'zod';

export const ApodItemSchema = z.object({
  date: z.string(),
  title: z.string(),
  explanation: z.string(),
  url: z.string(),
  hdurl: z.string().optional().nullable(),
  media_type: z.string(),
  copyright: z.string().optional().nullable(),
  service_version: z.string().optional(),
});

export const ApodResponseSchema = z.union([
  ApodItemSchema,
  z.array(ApodItemSchema),
]);

export type ApodItem = z.infer<typeof ApodItemSchema>;
export type ApodResponse = z.infer<typeof ApodResponseSchema>;
