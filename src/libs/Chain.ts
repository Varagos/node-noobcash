import * as crypto from 'crypto';
import { Transaction, Block } from '.';

const BLOCK_SIZE = 2;

export default class Chain {
  private static _instance: Chain;
  chain: Block[];
  /**
   * list of transactions that are yet to be mined
   */
  currentTransactions: Transaction[];

  // Genesis block
  private constructor() {
    this.chain = [new Block(null, [new Transaction('genesis', 'satoshi', 100)])];
    this.currentTransactions = [];
  }

  public static get instance(): Chain {
    if (!Chain._instance) {
      Chain._instance = new Chain();
    }
    return Chain._instance;
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  mine(block: Block) {
    console.log('⛏️  mining...');

    // while is sync and will block The event loop
    // we will wrap it in async setImmediate
    // to be able to let another part of the app set a break variable
    while (true) {
      const nonce = Math.random() * 10000000001;
      /**
       *  MD5 is similar to sha256, but it's
       * only 128 bits and faster to calculate
       */
      const hash = crypto.createHash('MD5');
      hash.update((block.toString() + nonce).toString()).end();

      const attempt = hash.digest('hex');

      if (attempt.substring(0, 4) === '0000') {
        console.log(`Solved: ${nonce}, attempt: ${attempt}`);
        // emit end-mine event
        return nonce;
        // return nonce
      }
    }
  }

  addTransaction(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const isValid = this.verifyTransaction(transaction, senderPublicKey, signature);
    if (!isValid) return;
    this.currentTransactions.push(transaction);
    if (this.currentTransactions.length === BLOCK_SIZE) {
      // pass transactions to new Block
      const newBlock = new Block(this.lastBlock.currentHash, this.currentTransactions);
      // we need some proof of work to prevent double spend issue
      // mine will return proof
      const solution = this.mine(newBlock);
      newBlock.nonce = solution;
      // set proof on new Block
      // empty transactions, TODO handle receive new transaction while mining
      this.currentTransactions = [];
      this.chain.push(newBlock);
    }
  }

  /**
   * Verifies the signature of the transaction
   * @param transaction
   * @param senderPublicKey
   * @param signature
   */
  verifyTransaction(transaction: Transaction, senderPublicKey: string, signature: Buffer): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());

    const isValid = verifier.verify(senderPublicKey, signature);
    return isValid;
  }

  // TODO checkValidity function for received blocks
}
