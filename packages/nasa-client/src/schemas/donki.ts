import { z } from 'zod';

export const SolarFlareSchema = z.object({
  flrID: z.string(),
  instruments: z.array(z.object({ displayName: z.string() })).optional().nullable(),
  beginTime: z.string(),
  peakTime: z.string().optional().nullable(),
  endTime: z.string().optional().nullable(),
  classType: z.string().optional().nullable(),
  sourceLocation: z.string().optional().nullable(),
  activeRegionNum: z.number().optional().nullable(),
  linkedEvents: z.array(z.any()).optional().nullable(),
});

export const CmeAnalysisSchema = z.object({
  isMostAccurate: z.boolean().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  halfAngle: z.number().optional().nullable(),
  speed: z.number().optional().nullable(),
  type: z.string().optional().nullable(),
  featureCode: z.string().optional().nullable(),
});

export const CoronalMassEjectionSchema = z.object({
  activityID: z.string(),
  catalog: z.string().optional().nullable(),
  startTime: z.string(),
  sourceLocation: z.string().optional().nullable(),
  activeRegionNum: z.number().optional().nullable(),
  instruments: z.array(z.object({ displayName: z.string() })).optional().nullable(),
  cmeAnalyses: z.array(CmeAnalysisSchema).optional().nullable(),
  linkedEvents: z.array(z.any()).optional().nullable(),
});

export const SolarFlareArraySchema = z.array(SolarFlareSchema);
export const CoronalMassEjectionArraySchema = z.array(CoronalMassEjectionSchema);

export type SolarFlare = z.infer<typeof SolarFlareSchema>;
export type CmeAnalysis = z.infer<typeof CmeAnalysisSchema>;
export type CoronalMassEjection = z.infer<typeof CoronalMassEjectionSchema>;
