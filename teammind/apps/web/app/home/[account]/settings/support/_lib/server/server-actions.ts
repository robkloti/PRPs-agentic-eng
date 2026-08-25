'use server';

import { z } from 'zod';

import { getMailer } from '@tm/mailers';
import { enhanceAction } from '@tm/next/actions';

import { SupportRequestSchema } from '../support-request.schema';

const supportEmail = z
  .string({
    description: `The email where you want to receive the support form submissions.`,
    required_error:
      'Support email is required. Please use the environment variable SUPPORT_EMAIL.',
  })
  .parse(process.env.SUPPORT_EMAIL || process.env.CONTACT_EMAIL);

const emailFrom = z
  .string({
    description: `The email sending address.`,
    required_error:
      'Sender email is required. Please use the environment variable EMAIL_SENDER.',
  })
  .parse(process.env.EMAIL_SENDER);

export const sendSupportRequest = enhanceAction(
  async (data) => {
    const mailer = await getMailer();

    await mailer.sendEmail({
      to: supportEmail,
      from: emailFrom,
      subject: `Support Request: ${data.issueType} - ${data.accountName}`,
      html: `
        <p>
          You have received a new support request.
        </p>

        <p>Name: ${data.name}</p>
        <p>Email: ${data.email}</p>
        <p>Account: ${data.accountName} (${data.accountId})</p>
        <p>Issue Type: ${data.issueType}</p>
        <p>Message: ${data.message}</p>
      `,
    });

    return {};
  },
  {
    schema: SupportRequestSchema,
    auth: true,
  },
);
