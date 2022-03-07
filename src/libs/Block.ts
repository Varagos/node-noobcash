import * as crypto from 'crypto';
import { Transaction } from '.';

export default class Block {
  // one time use random number
  // https://www.investopedia.com/terms/n/nonce.asp
  private _nonce?: number;
  constructor(
    public readonly previousHash: string,
    public transactions: Transaction[],
    public readonly timestamp = Date.now() // Timestamp because all blocks will be placed on chronological order
  ) {}

  /**
   * current_hash of block
   */
  get currentHash() {
    const str = this.toString();
    const hash = crypto.createHash('SHA256');
    hash.update(str).end();
    return hash.digest('hex');
  }

  set nonce(proofOfWork: number) {
    this._nonce = proofOfWork;
  }

  toString() {
    return JSON.stringify(this);
  }

  toStringWithoutNonce() {
    const { nonce, ...rest } = this;
    return JSON.stringify(rest);
  }
}
