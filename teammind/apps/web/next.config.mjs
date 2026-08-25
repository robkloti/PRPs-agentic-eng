import withBundleAnalyzer from '@next/bundle-analyzer';
import { withSentryConfig } from '@sentry/nextjs';

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;

const INTERNAL_PACKAGES = [
  '@tm/ui',
  '@tm/auth',
  '@tm/accounts',
  '@tm/admin',
  '@tm/team-accounts',
  '@tm/shared',
  '@tm/supabase',
  '@tm/i18n',
  '@tm/mailers',
  '@tm/billing-gateway',
  '@tm/email-templates',
  '@tm/database-webhooks',
  '@tm/cms',
  '@tm/next',
  '@tm/notifications',
  '@tm/ai',
];

/** @type {import('next').NextConfig} */
const config = {
  reactStrictMode: true,
  /** Enables hot reloading for local packages without a build step */
  transpilePackages: INTERNAL_PACKAGES,
  images: {
    remotePatterns: getRemotePatterns(),
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  outputFileTracingIncludes: {
    '/*': ['./content/**/*'],
  },
  turbopack: {
    resolveExtensions: ['.ts', '.tsx', '.js', '.jsx'],
  },
  experimental: {
    mdxRs: true,
    // needed for supporting dynamic imports for local content
    optimizePackageImports: [
      'lucide-react',
      '@radix-ui/react-icons',
      '@radix-ui/react-avatar',
      '@radix-ui/react-select',
      'date-fns',
      ...INTERNAL_PACKAGES,
    ],
  },
  serverExternalPackages: [
    '@sentry/node',
    '@opentelemetry/instrumentation',
  ],
  modularizeImports: {
    lodash: {
      transform: 'lodash/{{member}}',
    },
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.ignoreWarnings = [{ module: /opentelemetry/ }];
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return config;
  },
  /** We already do linting and typechecking as separate tasks in CI */
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
};

// todo set this to true when Sentry is activated
const withSentryConfigActivated = true;
const nextConfig = withSentryConfigActivated && IS_PRODUCTION
  ? withSentryConfig(
      withBundleAnalyzer({
        enabled: process.env.ANALYZE === 'true',
      })(config),
      {
        org: 'teammind',
        project: 'teammind',
        // An auth token is required for uploading source maps.
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: false, // Keep logs on to help diagnose issues

        // Disable server-side features
        autoInstrumentServerFunctions: true,
        autoInstrumentMiddleware: false,
        autoInstrumentAppDirectory: true,

        // Keep client-side features enabled
        widenClientFileUpload: true, // Helps with better client-side stack traces

        // Exclude server routes from Sentry
        excludeServerRoutes: ['/api/.*'],
        // Automatically tree-shake Sentry logger statements to reduce bundle size
        disableLogger: true,

        // Basic bundle size optimizations that won't affect functionality
        bundleSizeOptimizations: {
          excludeDebugStatements: true,
        },

        telemetry: false,
      },
    )
  : withBundleAnalyzer({
      enabled: process.env.ANALYZE === 'true',
    })(config);

export default nextConfig;

function getRemotePatterns() {
  /** @type {import('next').NextConfig['remotePatterns']} */
  // add here the remote patterns for your images
  const remotePatterns = [];

  if (SUPABASE_URL) {
    const hostname = new URL(SUPABASE_URL).hostname;

    remotePatterns.push({
      protocol: 'https',
      hostname,
    });
  }

  // eslint-disable-next-line @typescript-eslint/no-unsafe-return
  return IS_PRODUCTION
    ? remotePatterns
    : [
        {
          protocol: 'http',
          hostname: '127.0.0.1',
        },
        {
          protocol: 'http',
          hostname: 'localhost',
        },
      ];
}