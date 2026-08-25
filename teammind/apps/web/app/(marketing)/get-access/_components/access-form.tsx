'use client';

import { useEffect, useRef, useState } from 'react';

import { getCalApi } from '@calcom/embed-react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTheme } from 'next-themes';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@tm/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@tm/ui/form';
import { Input } from '@tm/ui/input';
import { Trans } from '@tm/ui/trans';

// Form validation schema
const formSchema = z.object({
  email: z
    .string()
    .email({ message: 'Please enter a valid email address' })
    .min(1, { message: 'Email is required' }),
});

// Replace this with your actual Cal.com username or team link
const CAL_LINK = 'teammind'; // Without the https://cal.com/ part

export function AccessForm() {
  const { theme } = useTheme();
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const calRef = useRef<any | null>(null);

  // Initialize Cal API once and store the reference
  useEffect(() => {
    (async function () {
      const cal = await getCalApi();
      // Store the Cal reference
      calRef.current = cal;

      // Prerender the modal for faster loading when user submits
      // But DON'T auto-open it
      cal('preload', {
        calLink: CAL_LINK,
        type: 'modal',
        options: {
          prerenderIframe: false,
        },
      });

      setIsLoading(false);
    })();
  }, []);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);

    // First, send notification to Discord channel
    fetch('/api/marketing/get-access-submission', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: data.email }),
    }).catch((error) =>
      console.error('Failed to send "get access" notification', error),
    );
    // Open the Cal.com modal regardless of whether Discord notification succeeded
    if (calRef.current) {
      calRef.current('modal', {
        calLink: CAL_LINK,
        config: {
          theme: theme === 'dark' ? 'dark' : 'light',
          email: data.email,
        },
      });
    }

    setIsSubmitting(false);
  };

  return (
    <div className="animated-gradient-border">
      <div className="relative z-10 rounded-xl border bg-card/95 p-8 shadow-lg backdrop-blur-sm dark:shadow-primary/5">
        <div className="mb-6 text-center">
          <h3 className="mb-2 text-xl font-semibold">
            <Trans i18nKey="marketing:accessFormTitle" />
          </h3>
          <p className="text-muted-foreground">
            <Trans i18nKey="marketing:accessFormSubtitle" />
          </p>
        </div>

        {/* Form with email collection */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input
                      placeholder="you@example.com"
                      className="h-12"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="h-12 w-full text-base font-medium transition-all duration-200 hover:scale-[1.01]"
              disabled={
                form.formState.isSubmitting || isLoading || isSubmitting
              }
            >
              <Trans i18nKey="marketing:getAccessButton" />
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          <Trans i18nKey="marketing:accessFormDisclaimer" />
        </p>
      </div>
    </div>
  );
}
