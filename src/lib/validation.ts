import { z } from 'zod';

// User validation schema
export const addUserSchema = z.object({
  username: z.string()
    .trim()
    .min(1, 'Username is required')
    .max(100, 'Username must be less than 100 characters'),
  phone_number: z.string()
    .regex(/^0[0-9]{9}$/, 'Invalid Israeli phone number (must be 10 digits starting with 0)')
    .length(10, 'Phone number must be exactly 10 digits'),
  company: z.enum(['Others', 'R-Server', 'Server'], {
    errorMap: () => ({ message: 'Invalid company selection' })
  }),
  domains: z.array(
    z.string()
      .trim()
      .min(1, 'Domain cannot be empty')
      .max(255, 'Domain must be less than 255 characters')
      .refine((val) => {
        // Basic domain validation
        const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-_.]{0,253}[a-zA-Z0-9]\.[a-zA-Z]{2,}$/;
        const withoutProtocol = val.replace(/^https?:\/\//, '');
        return domainRegex.test(withoutProtocol);
      }, 'Invalid domain format')
  ).min(1, 'At least one domain is required'),
});

// SMS test validation schema
export const testSmsSchema = z.object({
  phone: z.string()
    .regex(/^0[0-9]{9}$/, 'Invalid Israeli phone number'),
  message: z.string()
    .trim()
    .min(1, 'Message cannot be empty')
    .max(1000, 'Message must be less than 1000 characters'),
});

// Subscription validation schema
export const subscriptionSchema = z.object({
  domain_id: z.string().uuid('Invalid domain ID'),
  c_cost: z.number()
    .positive('Cost must be positive')
    .max(999999, 'Cost too large'),
  begin_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid begin date',
  }),
  expire_date: z.string().refine((date) => !isNaN(Date.parse(date)), {
    message: 'Invalid expire date',
  }),
  domain_cost: z.number()
    .min(0, 'Domain cost cannot be negative')
    .max(999999, 'Domain cost too large'),
  buy_domain: z.boolean(),
}).refine((data) => {
  const begin = new Date(data.begin_date);
  const expire = new Date(data.expire_date);
  return expire > begin;
}, {
  message: 'Expire date must be after begin date',
  path: ['expire_date'],
});

export type AddUserInput = z.infer<typeof addUserSchema>;
export type TestSmsInput = z.infer<typeof testSmsSchema>;
export type SubscriptionInput = z.infer<typeof subscriptionSchema>;
