export function sanitizeUrl(url: string): string {
  return url.replace(/\s+/g, '%20');
}

export async function isValidImageUrl(
  url: string,
): Promise<{ valid: boolean; redirectedUrl?: string }> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        Accept: 'image/*',
        'User-Agent': 'Mozilla/5.0 (compatible; ImageValidator/1.0)',
      },
      redirect: 'follow',
    });

    clearTimeout(timeout);

    const redirectedUrl = response.redirected ? response.url : undefined;

    if (response.redirected) {
      console.log(`Image was redirected from ${url} to ${redirectedUrl}`);
    }

    if (response.status === 404) {
      console.log(`Image not found (404): ${url}`);
      return { valid: false };
    }

    if (response.status === 403) {
      console.log(
        `Access forbidden (403) - likely CORS or hotlink protection: ${url}`,
      );
      try {
        const proxyController = new AbortController();
        const proxyTimeout = setTimeout(() => proxyController.abort(), 5000);
        const proxyResponse = await fetch(
          `/api/proxy-image?url=${encodeURIComponent(url)}`,
          {
            method: 'HEAD',
            signal: proxyController.signal,
          },
        );
        clearTimeout(proxyTimeout);

        if (proxyResponse.ok) {
          const contentType = proxyResponse.headers.get('content-type');
          const proxyFinalUrl =
            proxyResponse.headers.get('x-final-url') || undefined;
          if (contentType && contentType.startsWith('image/')) {
            console.log(`Proxy validation successful for ${url}`);
            return {
              valid: true,
              redirectedUrl: proxyFinalUrl || redirectedUrl,
            };
          }
        }
      } catch (proxyError) {
        console.error(
          `Proxy validation attempt failed for ${url}:`,
          proxyError,
        );
      }
      return { valid: false };
    }

    if (!response.ok) {
      console.log(
        `Image request failed with status ${response.status}: ${url}`,
      );
      return { valid: false };
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.startsWith('image/')) {
      console.log(
        `Invalid content type for image: ${contentType}, url: ${url}`,
      );
      return { valid: false };
    }

    return { valid: true, redirectedUrl };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`Image validation error for ${url}:`, errorMsg);

    if (
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('NetworkError')
    ) {
      console.log(
        `Network error during validation for ${url}, potentially CORS.`,
      );
    }

    return { valid: false };
  }
}

export const extractDomain = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.hostname;
  } catch (e) {
    const urlPattern = /^https?:\/\/([^/?#]+)(?:[/?#]|$)/i;
    const match = url.match(urlPattern);
    return match?.[1] || url;
  }
};

export const deduplicateByDomainAndUrl = <T extends { url: string }>(
  items: T[],
): T[] => {
  const seenDomains = new Set<string>();
  const seenUrls = new Set<string>();

  return items.filter((item) => {
    if (!item || typeof item.url !== 'string') {
      return false;
    }
    const domain = extractDomain(item.url);
    const isNewUrl = !seenUrls.has(item.url);
    const isNewDomain = !seenDomains.has(domain);

    if (isNewUrl && isNewDomain) {
      seenUrls.add(item.url);
      seenDomains.add(domain);
      return true;
    }
    return false;
  });
};

export const APPROVAL = Symbol('requires_approval');

export function getToolsRequiringConfirmation(tools: any): any {
  console.warn(
    'getToolsRequiringConfirmation is a placeholder and does not filter tools.',
  );
  return tools;
}

export async function processToolConfirmations(
  toolCall: any,
  executeTool: (toolCall: any) => Promise<any>,
): Promise<any> {
  console.warn(
    'processToolConfirmations is a placeholder and executes the tool directly.',
  );
  return executeTool(toolCall);
}
