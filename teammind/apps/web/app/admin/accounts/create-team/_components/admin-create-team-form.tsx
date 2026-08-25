'use client';

import { useState } from 'react';

import { useRouter } from 'next/navigation';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Alert, AlertDescription, AlertTitle } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@tm/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@tm/ui/form';
import { Input } from '@tm/ui/input';

import { createTeamWithOwnerAction } from '../_actions/create-team-with-owner-action';

const CreateTeamWithOwnerSchema = z.object({
  teamName: z.string().min(3, {
    message: 'Team name must be at least 3 characters',
  }),
  ownerEmail: z.string().email({
    message: 'Please enter a valid email address',
  }),
});

type FormValues = z.infer<typeof CreateTeamWithOwnerSchema>;

export function AdminCreateTeamForm() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(CreateTeamWithOwnerSchema),
    defaultValues: {
      teamName: '',
      ownerEmail: '',
    },
  });

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createTeamWithOwnerAction(values);

      if (result.success) {
        setSuccess(true);
        router.push(`/admin/accounts/${result.accountId}`);
        return;
      }

      setError(result.error || 'An error occurred while creating the team');
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'An error occurred while creating the team',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle>Create New Team</CardTitle>
        <CardDescription>
          Create a team account and invite the owner in one step
        </CardDescription>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="teamName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Acme Corp" {...field} />
                  </FormControl>
                  <FormDescription>
                    The name of the team to create
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ownerEmail"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Owner Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="owner@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The email of the person who will own this team
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button
              type="submit"
              disabled={isSubmitting || success}
              className="w-full"
            >
              {isSubmitting ? 'Creating...' : 'Create Team & Invite Owner'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
