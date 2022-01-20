import * as crypto from 'crypto';
import { Transaction, Block } from '.';

export default class Chain {
  public static instance = new Chain();

  chain: Block[];

  // Genesis block
  constructor() {
    this.chain = [new Block(null, new Transaction(100, 'genesis', 'satoshi'))];
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  mine(nonce: number) {
    let solution = 1;
    console.log('⛏️  mining...');

    while (true) {
      /**
       *  MD5 is similar to sha256, but it's
       * only 128 bits and faster to calculate
       */
      const hash = crypto.createHash('MD5');
      hash.update((nonce + solution).toString()).end();

      const attempt = hash.digest('hex');

      if (attempt.substring(0, 4) === '0000') {
        console.log(`Solved: ${solution}`);
        return solution;
      }
      solution += 1;
    }
  }

  addBlock(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());

    const isValid = verifier.verify(senderPublicKey, signature);
    if (isValid) {
      const newBlock = new Block(this.lastBlock.hash, transaction);
      // we need some proof of work to prevent double spend issue
      this.mine(newBlock.nonce);
      this.chain.push(newBlock);
    }
    // const newBlock = new Block(this.lastBlock.hash, transaction);
    // this.chain.push(newBlock);
  }
}
