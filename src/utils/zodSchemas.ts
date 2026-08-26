import { z } from 'zod';

export const DefinitionSchema = z.object({
  definition: z.string().min(1),
  source: z.string().optional(),
});

export const ChineseMeaningsSchema = z.preprocess(
  (val) => {
    if (Array.isArray(val)) return val;
    if (val && typeof val === 'object' && 'meanings' in val && Array.isArray((val as any).meanings))
      return (val as any).meanings;
    return val;
  },
  z.array(z.string()),
);

export const BoolTextSchema = z.enum(['true', 'false']);
