'use client';

import { useState, useTransition } from 'react';

import { useSearchParams } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { usePersonalAccountData } from '@tm/accounts/hooks/use-personal-account-data';
import { Alert, AlertDescription, AlertTitle } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@tm/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tm/ui/select';
import { toast } from '@tm/ui/sonner';
import { Textarea } from '@tm/ui/textarea';
import { Trans } from '@tm/ui/trans';

import { sendSupportRequest } from '../_lib/server/server-actions';
import { SupportRequestSchema } from '../_lib/support-request.schema';

interface SupportFormProps {
  userEmail: string;
  userId: string;
  accountId: string;
  accountName: string;
}

export function SupportForm({
  userEmail,
  userId,
  accountId,
  accountName,
}: SupportFormProps) {
  const [pending, startTransition] = useTransition();
  const personalAccount = usePersonalAccountData(userId);
  const searchParams = useSearchParams();

  // Get parameters from URL
  const issueTypeFromQuery = searchParams.get('issueType');
  const planIdFromQuery = searchParams.get('planId');
  const productIdFromQuery = searchParams.get('productId');

  // Prepare default message with plan info if present
  let defaultMessage = '';
  if (issueTypeFromQuery === 'billing' && planIdFromQuery) {
    defaultMessage = `I would like to set up the ${planIdFromQuery} plan for my account.`;
    if (productIdFromQuery) {
      defaultMessage += ` (Product ID: ${productIdFromQuery})`;
    }
    defaultMessage += `\n\nPlease contact me with information about how to proceed.`;
  }

  const [state, setState] = useState({
    success: false,
    error: false,
  });

  const form = useForm({
    resolver: zodResolver(SupportRequestSchema),
    defaultValues: {
      name: personalAccount.data?.name || userEmail,
      email: userEmail,
      accountId: accountId,
      accountName: accountName,
      issueType: issueTypeFromQuery || '',
      message: defaultMessage,
    },
  });

  if (state.success) {
    return <SuccessAlert />;
  }

  if (state.error) {
    return <ErrorAlert />;
  }

  return (
    <Form {...form}>
      <form
        className={'flex flex-col space-y-4'}
        onSubmit={form.handleSubmit((data) => {
          startTransition(async () => {
            try {
              await sendSupportRequest(data);
              setState({ success: true, error: false });
            } catch (error) {
              setState({ error: true, success: false });
            }
          });
        })}
      >
        {/* Hidden fields for user data - still included in form data but not visible */}
        <input type="hidden" {...form.register('name')} />
        <input type="hidden" {...form.register('email')} />
        <input type="hidden" {...form.register('accountId')} />
        <input type="hidden" {...form.register('accountName')} />

        <FormField
          name={'issueType'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'support:issueType'} defaults="Issue Type" />
                </FormLabel>

                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue
                        placeholder={
                          <Trans
                            i18nKey={'support:selectIssueType'}
                            defaults="Select an issue type"
                          />
                        }
                      />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="billing">
                      <Trans
                        i18nKey={'support:issueBilling'}
                        defaults="Billing"
                      />
                    </SelectItem>
                    <SelectItem value="bug">
                      <Trans
                        i18nKey={'support:issueBug'}
                        defaults="Bug Report"
                      />
                    </SelectItem>
                    <SelectItem value="feature">
                      <Trans
                        i18nKey={'support:issueFeature'}
                        defaults="Feature Request"
                      />
                    </SelectItem>
                    <SelectItem value="general">
                      <Trans
                        i18nKey={'support:issueGeneral'}
                        defaults="General Question"
                      />
                    </SelectItem>
                    <SelectItem value="other">
                      <Trans i18nKey={'support:issueOther'} defaults="Other" />
                    </SelectItem>
                  </SelectContent>
                </Select>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <FormField
          name={'message'}
          render={({ field }) => {
            return (
              <FormItem>
                <FormLabel>
                  <Trans i18nKey={'support:message'} defaults="Message" />
                </FormLabel>

                <FormControl>
                  <Textarea
                    className={'min-h-36'}
                    maxLength={5000}
                    {...field}
                  />
                </FormControl>

                <FormMessage />
              </FormItem>
            );
          }}
        />

        <Button disabled={pending} type={'submit'}>
          <Trans i18nKey={'support:submitRequest'} defaults="Submit Request" />
        </Button>
      </form>
    </Form>
  );
}

function SuccessAlert() {
  return (
    <Alert variant={'success'}>
      <AlertTitle>
        <Trans
          i18nKey={'support:requestSuccess'}
          defaults="Request Submitted Successfully"
        />
      </AlertTitle>

      <AlertDescription>
        <Trans
          i18nKey={'support:requestSuccessDescription'}
          defaults="Thank you for your request. Our support team will contact you shortly."
        />
      </AlertDescription>
    </Alert>
  );
}

function ErrorAlert() {
  return (
    <Alert variant={'destructive'}>
      <AlertTitle>
        <Trans
          i18nKey={'support:requestError'}
          defaults="Error Submitting Request"
        />
      </AlertTitle>

      <AlertDescription>
        <Trans
          i18nKey={'support:requestErrorDescription'}
          defaults="There was an error submitting your request. Please try again or contact us directly."
        />
      </AlertDescription>
    </Alert>
  );
}
