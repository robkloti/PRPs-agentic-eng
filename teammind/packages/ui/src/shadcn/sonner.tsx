'use client';

import { useTheme } from 'next-themes';
import { Toaster as Sonner, toast as sonnerToast } from 'sonner';

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = 'system' } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps['theme']}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            'group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
          description: 'group-[.toast]:!text-muted-foreground',
          actionButton:
            'group-[.toast]:bg-primary group-[.toast]:text-primary-foreground',
          cancelButton:
            'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
          // Default/info state uses brand purple
          icon: 'group-[.toast]:text-brand-purple',
          // Success state uses brand blue (same as purple in your case)
          success:
            'group-[.toast]:!border-brand-blue group-[.toast]:bg-background group-[.toast]:[&>[data-icon]]:text-brand-blue',
          // Error state uses brand coral
          error:
            'group-[.toast]:!border-brand-coral group-[.toast]:bg-background group-[.toast]:[&>[data-icon]]:text-brand-coral',
          // Warning state uses brand gold
          warning:
            'group-[.toast]:!border-brand-gold group-[.toast]:bg-background group-[.toast]:[&>[data-icon]]:text-brand-gold',
          // Loading state (if used) with brand purple
          loading:
            'group-[.toast]:!border-brand-purple group-[.toast]:bg-background group-[.toast]:[&>[data-icon]]:text-brand-purple',
        },
      }}
      {...props}
    />
  );
};

const toast = sonnerToast;

export { Toaster, toast };
