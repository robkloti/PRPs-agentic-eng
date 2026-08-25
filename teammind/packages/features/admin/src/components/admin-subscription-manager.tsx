'use client';

import { useEffect, useState } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { InfoIcon, Loader2, Plus } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import billingConfig from '@tm/billing/config';
import { Database } from '@tm/supabase/database';
import { Button } from '@tm/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@tm/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@tm/ui/dialog';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@tm/ui/select';
import { toast } from '@tm/ui/sonner';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@tm/ui/tooltip';

import {
  cancelSubscriptionAction,
  createSubscriptionAction,
  updateSubscriptionAction,
} from '../lib/server/admin-subscription-actions';

// Types
type Account = Database['public']['Tables']['accounts']['Row'];
type Subscription = Database['public']['Tables']['subscriptions']['Row'] & {
  subscription_items: Database['public']['Tables']['subscription_items']['Row'][];
};

// Form Schema
const SubscriptionFormSchema = z.object({
  accountId: z.string().uuid(),
  productId: z.string().min(1),
  planId: z.string().min(1),
  status: z.enum([
    'active',
    'trialing',
    'past_due',
    'canceled',
    'unpaid',
    'incomplete',
    'incomplete_expired',
    'paused',
  ]),
  currency: z.string().length(3).default('USD'),
  periodStartsAt: z.string(),
  periodEndsAt: z.string(),
  lineItems: z.array(
    z.object({
      variantId: z.string().min(1),
      quantity: z.number().min(1),
    }),
  ),
});

export function AdminSubscriptionManager({
  account,
  currentSubscription,
}: {
  account: Account;
  currentSubscription?: Subscription;
}) {
  const [loading, setLoading] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState('');
  const [selectedPlan, setSelectedPlan] = useState('');
  const [productPlans, setProductPlans] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // Check if this is a personal account
  const isPersonalAccount = account.is_personal_account;

  const form = useForm<z.infer<typeof SubscriptionFormSchema>>({
    resolver: zodResolver(SubscriptionFormSchema),
    defaultValues: {
      accountId: account.id,
      status: 'active',
      currency: 'USD',
      periodStartsAt: new Date().toISOString(),
      periodEndsAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lineItems: [],
    },
  });

  // Initialize form with current subscription data if editing
  useEffect(() => {
    if (currentSubscription && isEditing) {
      // Find the product and plan from the subscription
      const items = currentSubscription.subscription_items;
      if (items && items.length > 0) {
        const firstItem = items[0];
        let foundProduct = '';
        let foundPlan = '';

        // Loop through products and plans to find matching product_id and variant_id
        billingConfig.products.forEach((product) => {
          product.plans.forEach((plan) => {
            plan.lineItems.forEach((lineItem) => {
              if (lineItem.id === firstItem?.variant_id) {
                foundProduct = product.id;
                foundPlan = plan.id;
              }
            });
          });
        });

        if (foundProduct) setSelectedProduct(foundProduct);
        if (foundPlan) setSelectedPlan(foundPlan);

        // Set form values
        form.reset({
          accountId: account.id,
          productId: foundProduct,
          planId: foundPlan,
          status: currentSubscription.status,
          currency: currentSubscription.currency,
          periodStartsAt: currentSubscription.period_starts_at,
          periodEndsAt: currentSubscription.period_ends_at,
          lineItems: items.map((item) => ({
            variantId: item.variant_id,
            quantity: item.quantity,
          })),
        });
      }
    }
  }, [currentSubscription, isEditing, form, account.id]);

  // Update available plans when product changes
  useEffect(() => {
    if (selectedProduct) {
      const product = billingConfig.products.find(
        (p) => p.id === selectedProduct,
      );
      if (product) {
        setProductPlans(product.plans);

        // Reset plan selection if current selection is not available in the new product
        if (!product.plans.some((plan) => plan.id === selectedPlan)) {
          setSelectedPlan('');
          form.setValue('planId', '');
        }
      }
    } else {
      setProductPlans([]);
      setSelectedPlan('');
      form.setValue('planId', '');
    }
  }, [selectedProduct, form, selectedPlan]);

  // Update line items when plan changes
  useEffect(() => {
    if (selectedPlan && selectedProduct) {
      const product = billingConfig.products.find(
        (p) => p.id === selectedProduct,
      );
      const plan = product?.plans.find((p) => p.id === selectedPlan);

      if (plan) {
        form.setValue('planId', plan.id);

        // Set line items based on plan
        const lineItems = plan.lineItems.map((item) => ({
          variantId: item.id,
          quantity: 1,
        }));

        form.setValue('lineItems', lineItems);
      }
    }
  }, [selectedPlan, selectedProduct, form]);

  // When status changes to trialing, adjust period dates if needed
  const handleStatusChange = (value: string) => {
    form.setValue('status', value as any);

    // If changing to trialing and using a plan with trial days, adjust the period dates
    if (value === 'trialing' && selectedPlan && selectedProduct) {
      const product = billingConfig.products.find(
        (p) => p.id === selectedProduct,
      );
      const plan = product?.plans.find((p) => p.id === selectedPlan);

      if (plan?.trialDays) {
        const trialStart = new Date();
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + (plan.trialDays || 0));

        form.setValue('periodStartsAt', trialStart.toISOString());
        form.setValue('periodEndsAt', trialEnd.toISOString());
      }
    }
  };

  const onSubmit = async (data: z.infer<typeof SubscriptionFormSchema>) => {
    setLoading(true);
    try {
      // For subscription data, determine active status based on status field
      const active = data.status === 'active' || data.status === 'trialing';

      // Trial dates are the same as period dates when status is trialing
      const trialStartsAt =
        data.status === 'trialing' ? data.periodStartsAt : undefined;
      const trialEndsAt =
        data.status === 'trialing' ? data.periodEndsAt : undefined;

      const submitData = {
        ...data,
        active,
        trialStartsAt,
        trialEndsAt,
      };

      if (currentSubscription && isEditing) {
        // Update existing subscription
        await updateSubscriptionAction({
          ...submitData,
          subscriptionId: currentSubscription.id,
        });
        toast.success('Subscription updated');
      } else {
        // Create new subscription
        await createSubscriptionAction(submitData);
        toast.success('Subscription created');
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Subscription operation failed:', error);
      toast.error('Operation failed');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setIsEditing(false);
    form.reset({
      accountId: account.id,
      status: 'active',
      currency: 'USD',
      periodStartsAt: new Date().toISOString(),
      periodEndsAt: new Date(
        Date.now() + 30 * 24 * 60 * 60 * 1000,
      ).toISOString(),
      lineItems: [],
    });
    setSelectedProduct('');
    setSelectedPlan('');
    setIsOpen(true);
  };

  const handleOpenEdit = () => {
    setIsEditing(true);
    setIsOpen(true);
  };

  const handleCancelSubscription = async () => {
    if (!currentSubscription) return;

    setLoading(true);
    try {
      await cancelSubscriptionAction({
        subscriptionId: currentSubscription.id,
      });
      toast.success('Subscription canceled');
    } catch (error) {
      console.error('Cancellation failed:', error);
      toast.error('Cancellation failed');
    } finally {
      setLoading(false);
    }
  };

  // If this is a personal account and there's no existing subscription, show a message instead
  if (isPersonalAccount && !currentSubscription) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Subscription Management</h3>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button disabled={true}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Subscription
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Manual subscriptions are only supported for team accounts</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>No Subscription Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground flex items-center text-sm">
              <InfoIcon className="mr-2 h-4 w-4" />
              Manual subscription management is only available for team
              accounts.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold">Subscription Management</h3>

        <div className="flex space-x-2">
          {currentSubscription ? (
            <>
              <Button onClick={handleOpenEdit} variant="outline">
                Edit Subscription
              </Button>

              <Button
                onClick={handleCancelSubscription}
                variant="destructive"
                disabled={loading}
              >
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Cancel Subscription
              </Button>
            </>
          ) : (
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Create Subscription
            </Button>
          )}
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isEditing ? 'Edit Subscription' : 'Create Subscription'}
            </DialogTitle>
            <DialogDescription>
              {isEditing
                ? 'Update the subscription details for this account.'
                : 'Create a new manual subscription for this account.'}
            </DialogDescription>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="productId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Product</FormLabel>
                    <Select
                      value={selectedProduct}
                      onValueChange={(value) => {
                        setSelectedProduct(value);
                        field.onChange(value);
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a product" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {billingConfig.products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="planId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Plan</FormLabel>
                    <Select
                      value={selectedPlan}
                      onValueChange={(value) => {
                        setSelectedPlan(value);
                        field.onChange(value);
                      }}
                      disabled={!selectedProduct}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a plan" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {productPlans.map((plan) => (
                          <SelectItem key={plan.id} value={plan.id}>
                            {plan.name}{' '}
                            {plan.trialDays
                              ? `(${plan.trialDays} day trial)`
                              : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={handleStatusChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="trialing">Trialing</SelectItem>
                        <SelectItem value="past_due">Past Due</SelectItem>
                        <SelectItem value="canceled">Canceled</SelectItem>
                        <SelectItem value="unpaid">Unpaid</SelectItem>
                        <SelectItem value="incomplete">Incomplete</SelectItem>
                        <SelectItem value="incomplete_expired">
                          Incomplete Expired
                        </SelectItem>
                        <SelectItem value="paused">Paused</SelectItem>
                      </SelectContent>
                    </Select>
                    {form.watch('status') === 'trialing' && (
                      <FormDescription>
                        When status is "Trialing", the period dates will be used
                        as trial dates.
                      </FormDescription>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="periodStartsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch('status') === 'trialing'
                          ? 'Trial Start'
                          : 'Period Start'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ''
                          }
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date.toISOString());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="periodEndsAt"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {form.watch('status') === 'trialing'
                          ? 'Trial End'
                          : 'Period End'}
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="datetime-local"
                          value={
                            field.value
                              ? new Date(field.value).toISOString().slice(0, 16)
                              : ''
                          }
                          onChange={(e) => {
                            const date = new Date(e.target.value);
                            field.onChange(date.toISOString());
                          }}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Line Items Section */}
              {form.watch('lineItems')?.length > 0 && (
                <div className="space-y-4">
                  <h4 className="font-medium">Line Items</h4>
                  {form.watch('lineItems').map((item, index) => {
                    // Find line item details from config
                    const lineItemDetails =
                      selectedProduct && selectedPlan
                        ? billingConfig.products
                            .find((p) => p.id === selectedProduct)
                            ?.plans.find((p) => p.id === selectedPlan)
                            ?.lineItems.find((li) => li.id === item.variantId)
                        : null;

                    return (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="text-sm">
                            {lineItemDetails?.name ?? item.variantId}
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <FormField
                            control={form.control}
                            name={`lineItems.${index}.quantity`}
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Quantity</FormLabel>
                                <FormControl>
                                  <Input
                                    type="number"
                                    min={1}
                                    {...field}
                                    onChange={(e) =>
                                      field.onChange(parseInt(e.target.value))
                                    }
                                  />
                                </FormControl>
                                <FormDescription>
                                  {lineItemDetails?.type === 'per_seat'
                                    ? 'Number of seats'
                                    : 'Quantity'}
                                </FormDescription>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {isEditing ? 'Update' : 'Create'} Subscription
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
