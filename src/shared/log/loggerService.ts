import fs from 'fs';
import path from 'path';
import { totalNodes } from '../infra/http/server';

export class FileLoggerService {
  private static instance: FileLoggerService;
  private loggerStream: fs.WriteStream;

  private constructor(blockTime: number, capacity: number, difficulty: number, totalNodes: number) {
    const fileName = path.join(
      __dirname,
      `../../../logs/block-time${blockTime}-cap[${capacity}]-dif[${difficulty}]-nodes[${totalNodes ?? 5}].log`
    );

    this.loggerStream = fs.createWriteStream(fileName, { flags: 'a' });
  }

  public static getInstance(): FileLoggerService {
    if (!FileLoggerService.instance) {
      const blockTime = 1;

      /**
       * Number of transactions per block
       */
      const capacity = process.argv[3] ? +process.argv[3] : 2;
      const difficulty = process.argv[4] ? +process.argv[4] : 5;
      FileLoggerService.instance = new FileLoggerService(blockTime, capacity, difficulty, totalNodes ?? 5);
    }
    return FileLoggerService.instance;
  }

  public log(message: string): void {
    console.log(message);
    this.loggerStream.write(message);
  }
}
