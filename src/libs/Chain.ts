import * as crypto from 'crypto';
import { Transaction, Block } from '.';
import { setImmediatePromise } from '../utils/sleep';

const BLOCK_SIZE = 2;

const DIFFICULTY = 4;

export default class Chain {
  private static _instance: Chain;
  chain: Block[];
  /**
   * list of transactions that are yet to be mined
   */
  currentTransactions: Transaction[];

  // Genesis block
  private constructor(receiverAddress: string = 'satoshi', amount: number = 500) {
    const firstTransaction = new Transaction('0', receiverAddress, amount);
    const previousHash = '1';
    const genesisBlock = new Block(previousHash, [firstTransaction]);
    genesisBlock.nonce = 0;
    this.chain = [genesisBlock];
    this.currentTransactions = [];
  }

  public static initialize(receiverAddress: string, numberOfClients: number) {
    if (!Chain._instance) {
      Chain._instance = new Chain(receiverAddress, 100 * numberOfClients);
    }
    return Chain._instance;
  }

  public static initializeReceived(receivedChain: Chain) {
    console.log('validating chain', typeof receivedChain);
    console.log(receivedChain);
    Chain._instance = Object.assign(new Chain(), receivedChain);
    return Chain._instance;
  }

  public static get instance(): Chain {
    return Chain._instance;
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  async mine(block: Block) {
    console.log('⛏️  mining...');

    /**while is sync and will block The event loop
     * we will wrap it in async setImmediate
     * to be able to let another part of the app set a break variable
     *  */
    let blockingSince = Date.now();
    while (true) {
      const nonce = Math.random() * 10000000001;
      /**
       *  MD5 is similar to sha256, but it's
       * only 128 bits and faster to calculate
       */
      const hash = crypto.createHash('sha256');
      hash.update((block.toString() + nonce).toString()).end();

      const attempt = hash.digest('hex');

      // TODO replace with difficulty variable
      if (attempt.substring(0, 4) === '0000') {
        console.log(`Solved: ${nonce}, attempt: ${attempt}`);
        // emit end-mine event
        return nonce;
      }
      /**
       * We yield every at-least 10 ms passed
       * to let the event loop process other requests
       */
      if (blockingSince + 10 > Date.now()) {
        await setImmediatePromise();
        blockingSince = Date.now();
      }
    }
  }

  async addTransaction(transaction: Transaction, senderPublicKey: string, signature: Buffer) {
    const isValid = this.verifyTransaction(transaction, senderPublicKey, signature);
    if (!isValid) return;
    this.currentTransactions.push(transaction);
    if (this.currentTransactions.length === BLOCK_SIZE) {
      // pass transactions to new Block
      const newBlock = new Block(this.lastBlock.currentHash, this.currentTransactions);
      // we need some proof of work to prevent double spend issue
      // mine will return proof
      const solution = await this.mine(newBlock);
      newBlock.nonce = solution;
      // empty transactions, TODO handle receive new transaction while mining
      this.currentTransactions = [];
      this.chain.push(newBlock);
    }
  }

  /**
   * Verifies the signature of the transaction
   * @param transaction
   * @param senderAddress
   * @param signature
   */
  verifyTransaction(transaction: Transaction, senderAddress: string, signature: Buffer): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.toString());

    const isValid = verifier.verify(senderAddress, signature);
    return isValid;
  }

  // TODO checkValidity function for received blocks

  validateBlock(previousBlock: Block, currentBlock: Block): boolean {
    console.log('validation block');
    const hash = crypto.createHash('sha256');
    hash.update(currentBlock.toStringWithoutNonce()).end();
    const hashResult = hash.digest('hex');
    const padString = ''.padStart(DIFFICULTY, '0');
    console.log('padString', padString);
    if (hashResult.substring(0, DIFFICULTY) === padString) return true;
    return false;
  }

  /**
   * Gets called by newly inserted nodes
   * validates chain and initializes it if it passes
   */
  validateChain(): boolean {
    for (let i = 1; i < this.chain.length; i++) {
      const currentBlock = this.chain[i];
      const previousBlock = this.chain[i - 1];
      const blockIsValid = this.validateBlock(previousBlock, currentBlock);
      if (blockIsValid === false) return false;
    }
    return true;
  }
}
