export function ConnectorSelectLayoutShell({
  children,
  Logo,
  variant = 'small',
}: React.PropsWithChildren<{
  Logo: React.ComponentType;
  variant?: 'small' | 'wide';
}>) {
  return (
    <div
      className={
        'flex h-screen flex-col items-center justify-center' +
        ' space-y-10 lg:space-y-12 lg:bg-gray-50 dark:lg:bg-background' +
        ' duration-1000 animate-in fade-in zoom-in-95 slide-in-from-top-8'
      }
    >
      {Logo && <Logo />}

      <div
        className={`flex flex-col items-center space-y-5 rounded-lg border-transparent bg-background px-6 dark:border-border dark:shadow md:border md:px-8 md:py-6 md:shadow ${
          variant === 'wide'
            ? 'w-full max-w-4xl md:w-10/12 lg:w-8/12 xl:w-7/12 2xl:w-6/12'
            : 'w-full max-w-lg md:w-8/12 lg:w-5/12 xl:w-4/12 2xl:w-3/12'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
