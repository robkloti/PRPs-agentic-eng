import { z } from 'zod';

const PathsSchema = z.object({
  auth: z.object({
    signIn: z.string().min(1),
    signUp: z.string().min(1),
    verifyMfa: z.string().min(1),
    callback: z.string().min(1),
    passwordReset: z.string().min(1),
    passwordUpdate: z.string().min(1),
  }),
  app: z.object({
    home: z.string().min(1),
    getAccess: z.string().min(1),
    personalAccountSettings: z.string().min(1),
    accountHome: z.string().min(1),
    accountChat: z.string().min(1),
    accountCreate: z.string().min(1),
    accountEnact: z.string().min(1),
    accountSettings: z.string().min(1),
    accountBilling: z.string().min(1),
    accountMembers: z.string().min(1),
    accountBillingReturn: z.string().min(1),
    joinTeam: z.string().min(1),
  }),
});

const pathsConfig = PathsSchema.parse({
  auth: {
    signIn: '/auth/sign-in',
    signUp: '/auth/sign-up',
    verifyMfa: '/auth/verify',
    callback: '/auth/callback',
    passwordReset: '/auth/password-reset',
    passwordUpdate: '/update-password',
  },
  app: {
    home: '/home/teams',
    getAccess: '/get-access',
    personalAccountSettings: '/home/user-settings',
    accountHome: '/home/[account]',
    accountChat: '/home/[account]/chat',
    accountCreate: '/home/[account]/create',
    accountEnact: '/home/[account]/enact',
    accountSettings: `/home/[account]/settings`,
    accountBilling: `/home/[account]/settings/billing`,
    accountMembers: `/home/[account]/settings/members`,
    accountBillingReturn: `/home/[account]/settings/billing/return`,
    joinTeam: '/join',
  },
} satisfies z.infer<typeof PathsSchema>);

export default pathsConfig;
