// apps/web/app/api/discord/notify/route.ts
import { enhanceRouteHandler } from '@tm/next/routes';
import { getLogger } from '@tm/shared/logger';

interface NotifyRequest {
  email: string;
}

const DISCORD_WEBHOOK_URL =
  process.env.DISCORD_WEBHOOK_URL ||
  'https://discord.com/api/webhooks/1351152670538469437/Ut3Y5MYdus494sROhmu0QkkXT4WMtdrBqy8nrKxT90Sx4Q94PZt9wf_O0MoeB1uxouyq';

export const POST = enhanceRouteHandler(
  async ({ request }) => {
    const logger = await getLogger();
    const ctx = {
      name: 'discord.notify',
    };

    try {
      // Parse the request body
      const body = (await request.json()) as NotifyRequest;
      const { email } = body;

      if (!email) {
        logger.warn(ctx, 'Missing email in request');
        return new Response('Email is required', { status: 400 });
      }

      // Get the Discord webhook URL from environment variables
      const discordWebhookUrl = DISCORD_WEBHOOK_URL;

      if (!discordWebhookUrl) {
        logger.error(ctx, 'Discord webhook URL not configured');
        return new Response('Server configuration error', { status: 500 });
      }

      // Create the Discord message payload
      const payload = {
        content: `New access request from: ${email}`,
        embeds: [
          {
            title: '📬 New Access Request',
            description: `Someone requested access with email: **${email}**`,
            color: 5814783, // Blue color in decimal
            timestamp: new Date().toISOString(),
            footer: {
              text: 'Sent from TeamMind Access Form',
            },
            fields: [
              {
                name: 'Source',
                value: 'Get Access Page',
                inline: true,
              },
              {
                name: 'Timestamp',
                value: new Date().toLocaleString(),
                inline: true,
              },
            ],
          },
        ],
      };

      // Send the message to Discord
      const response = await fetch(discordWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(
          { ...ctx, error: errorText },
          'Failed to send message to Discord',
        );
        return new Response('Failed to send message to Discord', {
          status: 500,
        });
      }

      logger.info(
        ctx,
        `Successfully sent access request notification for ${email}`,
      );
      return new Response('Notification sent', { status: 200 });
    } catch (error) {
      logger.error({ ...ctx, error }, 'Failed to process Discord notification');
      return new Response('Failed to process notification', { status: 500 });
    }
  },
  {
    auth: false,
  },
);
