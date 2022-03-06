import { v4 as uuid } from 'uuid';
import { TransactionOutput } from './Transaction';
import { ChainState } from './../services/ChainState';
import * as crypto from 'crypto';
import { Transaction, Block } from '.';
import { setImmediatePromise } from '../utils/sleep';

/**
 * Number of transactions per block
 */
const CAPACITY = 2;

const DIFFICULTY = 4;
/**
 * There can only be a single Block chain
 * so we use the Singleton pattern
 */
export default class Chain {
  private static _instance: Chain;

  private chainState: ChainState;

  chain: Block[];

  /**
   * list of transactions that are yet to be mined
   */
  currentTransactions: Transaction[];

  // Genesis block
  private constructor(chainState: ChainState, receiverAddress?: string, amount?: number) {
    this.chainState = chainState;

    if (!receiverAddress || !amount) {
      console.log('Initializing empty chain');
      this.chain = [];
      this.currentTransactions = [];
      return;
    }
    const genesisBlock = this.createGenesisBlock(receiverAddress, amount);
    this.chain = [genesisBlock];
    this.currentTransactions = [];

    console.log('Initializing chain with genesis Block');
  }

  public static initialize(receiverAddress: string, numberOfClients: number, chainState: ChainState) {
    if (!Chain._instance) {
      Chain._instance = new Chain(chainState, receiverAddress, 100 * numberOfClients);
    }
    return Chain._instance;
  }

  public static initializeReceived(receivedChain: Chain, chainState: ChainState) {
    console.log('validating chain', typeof receivedChain);
    console.log(receivedChain);
    Chain._instance = Object.assign(new Chain(chainState), receivedChain);
    return Chain._instance;
  }

  public static get instance(): Chain {
    return Chain._instance;
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  private createGenesisBlock(receiverAddress: string, amount: number): Block {
    const firstTransaction = new Transaction('0', receiverAddress, amount);
    const utxo: TransactionOutput = {
      id: uuid(),
      transactionId: firstTransaction.transactionId,
      recipient: receiverAddress,
      amountTransferred: amount,
    };
    this.chainState.addUnspentOutput(utxo);

    const previousHash = '1';
    const genesisBlock = new Block(previousHash, [firstTransaction]);
    genesisBlock.nonce = 0;
    return genesisBlock;
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
        console.log(`🚀 Solved: ${nonce}, attempt: ${attempt}`);
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

  async addTransaction(serializedTransaction: Transaction) {
    const { senderAddress, receiverAddress, amount } = serializedTransaction;
    const transaction = Object.assign(new Transaction(senderAddress, receiverAddress, amount), serializedTransaction);
    const senderPublicKey = transaction.senderAddress;
    const isValid = this.verifyTransaction(transaction, senderPublicKey);
    console.log('Valid result of transaction is', isValid);
    if (!isValid) return;
    this.currentTransactions.push(transaction);
    if (this.currentTransactions.length >= CAPACITY) {
      const transactionsToBeMined = [];
      for (let index = 0; index < CAPACITY; index++) {
        const transaction = this.currentTransactions.shift();
        if (transaction === undefined) throw new Error('Reached Unreachable code');
        transactionsToBeMined.push(transaction);
      }
      // pass transactions to new Block
      const newBlock = new Block(this.lastBlock.currentHash, transactionsToBeMined);
      // we need some proof of work to prevent double spend issue
      // mine will return proof
      const solution = await this.mine(newBlock);
      console.log('after mine');
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
  verifyTransaction(transaction: Transaction, senderAddress: string): boolean {
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.transactionId);

    const isValid = verifier.verify(senderAddress, transaction.signature);
    return isValid;
  }

  // TODO checkValidity function for received blocks

  /**
   * Αυτή η συνάρτηση καλείται από τους nodes κατά τη λήψη ενός νέου block (εκτός του genesis block).
   * Επαληθεύεται ότι
   * (a) το πεδίο current_hash είναι πράγματι σωστό και ότι
   * (b) το πεδίο previous_hash ισούται πράγματι με το hash του προηγούμενου block.
   * @param previousBlock
   * @param currentBlock
   * @returns
   */
  validateBlock(previousBlock: Block, currentBlock: Block): boolean {
    console.log('validation block');
    const hash = crypto.createHash('sha256');
    hash.update(currentBlock.toStringWithoutNonce()).end();
    const hashResult = hash.digest('hex');
    const padString = ''.padStart(DIFFICULTY, '0');
    console.log('padString', padString);
    if (hashResult.substring(0, DIFFICULTY) === padString) return true;
    // TODO (b)
    return false;
  }

  /**
   * Gets called by newly inserted nodes to
   * validate received chain from bootstrap node
   * In practice, it validates every block except genesis
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

  /**
   * Create UTXOs chainState for received Chain instance
   */
  createUTXOFromChain() {
    this.chainState.clear();
    const spentTXOutputIds = new Set();
    const allOutputs = [];
    for (const block of this.chain) {
      for (const transaction of block.transactions) {
        for (const input of transaction.transactionInputs) {
          spentTXOutputIds.add(input.previousOutputId);
        }
        for (const output of transaction.transactionOutputs) {
          allOutputs.push(output);
        }
      }
    }
    const unspentTXOutputs = allOutputs.filter((output) => !spentTXOutputIds.has(output.id));
    for (const UTXO of unspentTXOutputs) {
      this.chainState.addUnspentOutput(UTXO);
    }
  }

  // TODO - Μόλις βρεθεί ο κατάλληλος nonce, ο κόμβος κάνει broadcast το επαληθευμένο block σε όλους τους
  // υπόλοιπους κόμβους.
  // broadcastBlock() {}

  /**
   * TODO wallet_balance()
   * Μπορούμενα βρούμε το υπόλοιπο οποιουδήποτε wallet προσθέτοντας όλα τα UTXOs που έχουν
   * παραλήπτη το συγκεκριμένο wallet.
   */

  /** Αυτή η συνάρτηση καλείται όταν ένα κόμβος λάβει ένα block το οποίο δεν μπορεί να κάνει validate
   * γιατί το πεδίο previous_hash δεν ισούται με το hash του προηγούμενου block. Αυτό μπορεί να σημαίνει
   * ότι έχει δημιουργηθεί κάποια διακλάδωση, η οποία πρέπει να επιλυθεί. Ο κόμβος ρωτάει τους
   * υπόλοιπους για το μήκος του blockchain και επιλέγει να υιοθετήσει αυτό με το μεγαλύτερο μήκος.
   */
  // TODO resolve-conflict
}
