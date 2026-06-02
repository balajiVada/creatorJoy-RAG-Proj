import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';

export interface ChunkConfig {
  chunkSize: number;
  chunkOverlap: number;
  separators?: string[];
}

export class ChunkingService {
  private defaultSplitter: RecursiveCharacterTextSplitter;

  constructor() {
    this.defaultSplitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });
  }

  public getSplitter(config?: ChunkConfig): RecursiveCharacterTextSplitter {
    if (!config) {
      return this.defaultSplitter;
    }

    const params: any = {
      chunkSize: config.chunkSize,
      chunkOverlap: config.chunkOverlap,
    };
    if (config.separators) {
      params.separators = config.separators;
    }
    return new RecursiveCharacterTextSplitter(params);
  }

  public async splitText(text: string, config?: ChunkConfig): Promise<string[]> {
    const splitter = this.getSplitter(config);
    return splitter.splitText(text);
  }
}

export const chunkingService = new ChunkingService();
