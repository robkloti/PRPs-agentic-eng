import { z } from 'zod';

export const SupportRequestSchema = z.object({
  name: z.string().min(1).max(200),
  email: z.string().email(),
  accountId: z.string().uuid(),
  accountName: z.string(),
  issueType: z.string().min(1, {
    message: 'Please select an issue type',
  }),
  message: z
    .string()
    .min(1, {
      message: 'Please enter a message',
    })
    .max(5000),
});

export type SupportRequestData = z.infer<typeof SupportRequestSchema>;
