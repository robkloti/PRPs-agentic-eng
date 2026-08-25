import { Database } from '@tm/supabase/database';

import { estimateJinaTokenCount } from '../_utils';
import {
  ChunkerOptions as GFMChunkerOptions,
  GFMContextPathChunker,
} from './gfm-context-path-chunker';

export class TokenLimitError extends Error {
  constructor(given: number, limit: number) {
    super(`Token limit exceeded: ${given} tokens given, limit is ${limit}`);
    this.name = 'TokenLimitError';
  }
}

export type JinaModel =
  | 'jina-clip-v2'
  | 'jina-embeddings-v3'
  | 'jina-colbert-v2'
  | 'jina-clip-v1'
  | 'jina-colbert-v1-en'
  | 'jina-embeddings-v2-base-es'
  | 'jina-embeddings-v2-base-code'
  | 'jina-embeddings-v2-base-de'
  | 'jina-embeddings-v2-base-zh'
  | 'jina-embeddings-v2-base-en';

export type JinaEmbeedingTask =
  | 'retrieval.query'
  | 'retrieval.passage'
  | 'separation'
  | 'classification'
  | 'text-matching';

export type JinaEmbeddingType = 'binary' | 'ubinary' | 'base64' | 'float';

export interface JinaEmbeddingsParams {
  model?: JinaModel;
  baseUrl?: string;
  timeout?: number;
  stripNewLines?: boolean;
  dimensions?: number;
  task?: JinaEmbeedingTask;
  embeddingType: JinaEmbeddingType;
  lateChunking?: boolean;
  maxTokensPerRequest?: number;
}

interface EmbeddingResponse {
  data: Array<{
    embedding: number[];
    index: number;
  }>;
}

type DocumentChunksInsert =
  Database['public']['Tables']['document_chunks']['Insert'];

const RPM_LIMIT = 500;
const TPM_LIMIT = 1_000_000;
const MIN_MD_CHUNK_TOKEN_LIMIT = 512;
const INITIAL_MD_CHUNK_TOKEN_LIMIT = 7168;

class SharedRateLimiter {
  private static instance: SharedRateLimiter;
  private tokensUsed = 0;
  private requestCount = 0;
  private lastReset: number = Date.now();
  private readonly tpmLimit: number;
  private readonly rpmLimit: number;

  private constructor(tpmLimit: number, rpmLimit: number) {
    this.tpmLimit = tpmLimit;
    this.rpmLimit = rpmLimit;
  }

  public static getInstance(
    tpmLimit: number,
    rpmLimit: number,
  ): SharedRateLimiter {
    if (!SharedRateLimiter.instance) {
      SharedRateLimiter.instance = new SharedRateLimiter(tpmLimit, rpmLimit);
    }
    return SharedRateLimiter.instance;
  }

  async checkAndUpdate(tokenCount: number): Promise<void> {
    const now = Date.now();
    const minuteAgo = now - 60000;

    if (this.lastReset < minuteAgo) {
      this.tokensUsed = 0;
      this.requestCount = 0;
      this.lastReset = now;
    }

    if (
      this.tokensUsed + tokenCount > this.tpmLimit ||
      this.requestCount >= this.rpmLimit
    ) {
      const waitTime = 60000 - (now - this.lastReset);
      if (waitTime > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitTime));
        this.tokensUsed = 0;
        this.requestCount = 0;
        this.lastReset = Date.now();
      }
    }

    this.tokensUsed += tokenCount;
    this.requestCount += 1;
  }
}

export class JinaEmbeddings {
  model: JinaModel;
  baseUrl: string;
  stripNewLines: boolean;
  dimensions: number;
  task: JinaEmbeedingTask;
  embeddingType: JinaEmbeddingType;
  maxTokensPerRequest: number;
  lateChunking: boolean;

  private rateLimiter: SharedRateLimiter;

  constructor(fields?: Partial<JinaEmbeddingsParams>) {
    this.model = fields?.model ?? 'jina-embeddings-v3';
    this.baseUrl = fields?.baseUrl ?? 'https://api.jina.ai/v1/embeddings';
    this.stripNewLines = fields?.stripNewLines ?? true;
    this.dimensions = fields?.dimensions ?? 1024;
    this.task = fields?.task ?? 'retrieval.passage';
    this.embeddingType = fields?.embeddingType ?? 'float';
    this.maxTokensPerRequest = fields?.maxTokensPerRequest ?? 8192;
    this.lateChunking = fields?.lateChunking ?? false;

    this.rateLimiter = SharedRateLimiter.getInstance(TPM_LIMIT, RPM_LIMIT);
  }

  async embedSingleDocument(text: string): Promise<number[]> {
    if (!text.length) return [];

    const processedText = this.stripNewLines ? text.replace(/\n/g, ' ') : text;
    const totalTokens = estimateJinaTokenCount(text);

    await this.rateLimiter.checkAndUpdate(totalTokens);
    const embeddings = await this.createEmbeddings([processedText]);

    return embeddings[0] ?? [];
  }

  async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const processedTexts = texts.map((text) =>
      this.stripNewLines ? text.replace(/\n/g, ' ') : text,
    );

    const totalTokens = processedTexts.reduce(
      (sum, text) => sum + estimateJinaTokenCount(text),
      0,
    );

    await this.rateLimiter.checkAndUpdate(totalTokens);
    return this.createEmbeddings(processedTexts);
  }

  async embedQuery(text: string): Promise<number[]> {
    const processedText = this.stripNewLines ? text.replace(/\n/g, ' ') : text;
    const tokenCount = estimateJinaTokenCount(processedText);

    const currentTask = this.task;
    this.task = 'retrieval.query';
    await this.rateLimiter.checkAndUpdate(tokenCount);
    const embeddings = await this.createEmbeddings([processedText]);
    this.task = currentTask;

    return embeddings[0] ?? [];
  }

  async embedMultipleQueries(texts: string[]): Promise<number[][]> {
    const processedTexts = texts.map((text) =>
      this.stripNewLines ? text.replace(/\n/g, ' ') : text,
    );

    const tokenCounts = processedTexts.map((text) =>
      estimateJinaTokenCount(text),
    );
    const totalTokens = tokenCounts.reduce((sum, count) => sum + count, 0);

    const currentTask = this.task;
    this.task = 'retrieval.query';
    await this.rateLimiter.checkAndUpdate(totalTokens);
    const embeddings = await this.createEmbeddings(processedTexts);
    this.task = currentTask;

    return embeddings;
  }

  public async createEmbeddedGFMContextPathChunks(
    documentContent: string,
    titlePath: string,
    chunkerOptions?: GFMChunkerOptions,
  ): Promise<DocumentChunksInsert[]> {
    const chunker = new GFMContextPathChunker(chunkerOptions);

    let tokenLimit = INITIAL_MD_CHUNK_TOKEN_LIMIT;

    while (tokenLimit >= MIN_MD_CHUNK_TOKEN_LIMIT) {
      try {
        const chunkBatches = chunker.chunkWithinTokenLimit(
          documentContent,
          titlePath,
          tokenLimit,
        );

        const totalChunks = chunkBatches.reduce(
          (sum, batch) => sum + batch.length,
          0,
        );
        let currentChunkIndex = 0;
        const allEmbeddedChunks: DocumentChunksInsert[] = [];

        for (const contentChunks of chunkBatches) {
          const vectors = await this.embedDocuments(contentChunks);

          if (vectors.length !== contentChunks.length) {
            throw new Error('Embedding count does not match chunk count');
          }

          const embeddedChunks: DocumentChunksInsert[] = vectors.map(
            (embedding, idx) => {
              const content = contentChunks[idx];
              if (!content) {
                throw new Error(`Missing content for chunk at index ${idx}`);
              }
              return {
                content,
                embedding: embedding as unknown as string, // supabase generates pg vector type as string https://github.com/supabase/postgres-meta/issues/578
                chunk_index: currentChunkIndex++,
                max_chunk_index: totalChunks - 1,
              };
            },
          );

          allEmbeddedChunks.push(...embeddedChunks);
        }
        return allEmbeddedChunks;
      } catch (error) {
        if (!(error instanceof TokenLimitError)) {
          throw error;
        }

        tokenLimit =
          Math.floor((tokenLimit * 0.7) / MIN_MD_CHUNK_TOKEN_LIMIT) *
          MIN_MD_CHUNK_TOKEN_LIMIT;
        console.log(`Retrying chunking with ${tokenLimit} tokens`);
      }
    }

    throw new Error('Could not find suitable chunk size for document');
  }

  private async createEmbeddings(texts: string[]): Promise<number[][]> {
    if (!texts.length) return [];

    const totalTokens = texts.reduce(
      (sum, text) => sum + estimateJinaTokenCount(text),
      0,
    );
    if (totalTokens > this.maxTokensPerRequest) {
      throw new TokenLimitError(totalTokens, this.maxTokensPerRequest);
    }

    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey) {
      throw new Error('Missing Jina API key');
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          input: texts,
          dimensions: this.dimensions,
          task: this.task,
          embedding_type: this.embeddingType,
          late_chunking: this.lateChunking,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        // Check specifically for token limit error in the response
        if (error?.detail?.includes('Chunks concatenated text cannot exceed')) {
          const match = error.detail.match(/(\d+) tokens given/);
          const tokens = match ? parseInt(match[1]) : 0;
          throw new TokenLimitError(tokens, this.maxTokensPerRequest);
        }
        throw new Error(
          `API error: ${response.status} ${JSON.stringify(error)}`,
        );
      }

      const result = (await response.json()) as EmbeddingResponse;
      return result.data
        .sort((a, b) => a.index - b.index)
        .map((item) => item.embedding);
    } catch (error) {
      if (error instanceof TokenLimitError) {
        throw error;
      }
      throw new Error(
        `Embedding creation failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }
}
