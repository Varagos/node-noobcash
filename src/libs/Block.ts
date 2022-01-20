import * as crypto from 'crypto';
import { Transaction } from '.';

export default class Block {
  // one time use random number
  // https://www.investopedia.com/terms/n/nonce.asp
  public nonce = Math.round(Math.random() * 999999999);
  constructor(
    public prevHash: string | null, // only genesis block can have null value
    public transaction: Transaction,
    public ts = Date.now() // Timestamp because all blocks will be placed on chronological order
  ) {}

  /**
   * current_hash of block
   */
  get hash() {
    const str = JSON.stringify(this);
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }
}
