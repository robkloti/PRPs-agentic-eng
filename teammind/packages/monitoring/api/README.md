# Monitoring / @tm/monitoring

Please set the following environment variable to your preferred monitoring provider:

```
NEXT_PUBLIC_MONITORING_PROVIDER=
ENABLE_MONITORING_INSTRUMENTATION=true
```

## Available Providers

To use a specific provider, set the `NEXT_PUBLIC_MONITORING_PROVIDER` environment variable to one of the following values:

1. Sentry: `sentry`


## Sentry

To use Sentry, set the `NEXT_PUBLIC_MONITORING_PROVIDER` environment variable to `sentry`.

```
NEXT_PUBLIC_MONITORING_PROVIDER=sentry
```

## Instrumentation

To enable instrumentation, set the `ENABLE_MONITORING_INSTRUMENTATION` environment variable to `true`.

```
ENABLE_MONITORING_INSTRUMENTATION=true
```
