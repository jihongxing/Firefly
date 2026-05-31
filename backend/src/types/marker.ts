import { z } from 'zod';

export const MarkerCategory = z.enum([
  'abuse',
  'poison',
  'trap',
  'theft',
  'missing_pet',
  'suspicious_vehicle',
  'station',
  'food_bank',
  'friendly_clinic',
  'helper',
  'trap_support',
]);

export const MarkerVisibility = z.enum(['public', 'masked', 'private']);
export const ReviewStatus = z.enum(['pending', 'approved', 'rejected', 'hidden']);
export const ConsensusStatus = z.enum(['pending', 'verified', 'disputed', 'resolved']);
export const Locale = z.enum(['zh-CN', 'en', 'hi']);

export const GetMarkersQuerySchema = z.object({
  lat: z.string().transform(Number),
  lng: z.string().transform(Number),
  radius: z.string().transform(Number).default('3000'),
  types: z.string().optional(),
  lang: Locale.optional().default('zh-CN'),
  limit: z.string().transform(Number).default('50'),
  cursor: z.string().optional(),
});

export const SubmitMarkerSchema = z.object({
  category: MarkerCategory,
  title: z.string().min(1).max(200),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  address: z.string().min(1).max(500),
  description: z.string().min(1).max(2000),
  sourceLocale: Locale,
  contactInfo: z.string().max(500).optional(),
  visibility: MarkerVisibility.optional().default('public'),
});

export type GetMarkersQuery = z.infer<typeof GetMarkersQuerySchema>;
export type SubmitMarkerInput = z.infer<typeof SubmitMarkerSchema>;
