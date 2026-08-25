// Document for reranking
export interface RerankerDocument {
  pageContent: string;
  metadata: {
    id: number;
    documentId: number;
    originalSimilarity: number;
  };
}

// Reranked document from the reranker
export interface RerankedDocument extends RerankerDocument {
  metadata: {
    id: number;
    documentId: number;
    originalSimilarity: number;
    relevance_score?: number;
    _reranker_score?: number;
  };
}

/**
 * Interface for a ranked document response from Jina AI's reranking API
 */
interface JinaRankedDocument {
  index: number;
  document: {
    text: string;
  };
  relevance_score: number;
}

/**
 * Interface for the response from Jina AI's reranking API
 */
interface JinaRerankResponse {
  model: string;
  usage: {
    total_tokens: number;
  };
  results: JinaRankedDocument[];
}

/**
 * Interface for configuration parameters specific to the JinaReranker
 */
export interface JinaRerankParams {
  /**
   * The model to use for reranking
   * @default {"jina-reranker-v2-base-multilingual"}
   */
  model?: string;

  /**
   * The API key for authentication
   * @default {process.env.JINA_API_KEY}
   */
  apiKey?: string;

  /**
   * The base URL for the Jina AI API
   * @default {"https://api.jina.ai/v1/rerank"}
   */
  baseUrl?: string;

  /**
   * Number of top documents to return
   * @default {undefined}
   */
  topN?: number;

  /**
   * Maximum number of retries for failed requests
   * @default {3}
   */
  maxRetries?: number;
}

/**
 * Document compressor that uses Jina AI's rerank API.
 *
 * This class provides functionality to rerank documents based on their relevance
 * to a given query using Jina AI's reranking model.
 *
 * @example
 * ```typescript
 * const reranker = new JinaReranker({ apiKey: 'your-api-key' });
 * const documents = [
 *   { pageContent: "First document content", metadata: { id: 1, documentId: 101, originalSimilarity: 0.8 } },
 *   { pageContent: "Second document content", metadata: { id: 2, documentId: 102, originalSimilarity: 0.7 } }
 * ];
 * const query = "Search query";
 * const result = await reranker.compressDocuments(documents, query);
 * console.log(result);
 * ```
 */
export class JinaReranker {
  lc_secrets = {
    apiKey: 'JINA_API_KEY',
  };

  private model: string;
  private apiKey: string;
  private baseUrl: string;
  private topN?: number;
  private maxRetries: number;

  constructor(params?: Partial<JinaRerankParams>) {
    const apiKey = params?.apiKey ?? process.env.JINA_API_KEY;
    if (!apiKey) {
      throw new Error(
        "Jina AI API key not found. Please provide it in the constructor or set the 'JINA_API_KEY' environment variable.",
      );
    }

    this.apiKey = apiKey;
    this.model = params?.model ?? 'jina-reranker-v2-base-multilingual';
    this.baseUrl = params?.baseUrl ?? 'https://api.jina.ai/v1/rerank';
    this.topN = params?.topN;
    this.maxRetries = params?.maxRetries ?? 3;
  }

  /**
   * Compresses documents using Jina AI's reranking API.
   *
   * @param {RerankerDocument[]} documents - Array of documents to compress
   * @param {string} query - Query to use for reranking
   * @returns {Promise<RerankedDocument[]>} Reranked documents
   */
  async compressDocuments(
    documents: RerankerDocument[],
    query: string,
  ): Promise<RerankedDocument[]> {
    if (documents.length === 0) {
      return [];
    }

    const rankedDocs = await this.rerank(documents, query);

    return rankedDocs.map((ranked) => {
      const doc = documents[ranked.index]! as RerankedDocument;
      doc.metadata.relevance_score = ranked.relevance_score;
      return doc;
    });
  }

  /**
   * Reranks documents using the Jina AI API.
   *
   * @param {RerankerDocument[] | string[]} documents - Documents to rerank
   * @param {string} query - Query to use for reranking
   * @returns {Promise<JinaRankedDocument[]>} Ranked documents
   */
  private async rerank(
    documents: RerankerDocument[] | string[],
    query: string,
  ): Promise<JinaRankedDocument[]> {
    if (documents.length === 0) {
      return [];
    }

    const texts = documents.map((doc) =>
      typeof doc === 'string' ? doc : doc.pageContent,
    );

    let currentTry = 0;
    while (currentTry < this.maxRetries) {
      try {
        const response = await fetch(this.baseUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.apiKey}`,
          },
          body: JSON.stringify({
            model: this.model,
            query,
            documents: texts,
            top_n: this.topN,
          }),
        });

        if (!response.ok) {
          const error = await response.json().catch(() => ({}));
          throw new Error(
            `Jina AI API error: ${response.status} ${JSON.stringify(error)}`,
          );
        }

        const result = (await response.json()) as JinaRerankResponse;
        return result.results;
      } catch (error) {
        currentTry += 1;
        if (currentTry === this.maxRetries) {
          throw new Error(
            `Failed to rerank documents after ${this.maxRetries} attempts: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`,
          );
        }
        // Wait before retrying (exponential backoff)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.pow(2, currentTry) * 1000),
        );
      }
    }

    throw new Error('Failed to rerank documents');
  }
}
