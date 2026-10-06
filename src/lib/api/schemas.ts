import { z } from 'zod';

export const apiSuccessResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    message: z.string(),
    data: dataSchema,
  });

export const apiErrorResponseSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  error: z.string().optional(),
  errors: z.unknown().optional(),
});

export const apiResponseSchema = <T extends z.ZodType>(dataSchema: T) =>
  z.discriminatedUnion('success', [apiSuccessResponseSchema(dataSchema), apiErrorResponseSchema]);
