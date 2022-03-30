import * as crypto from 'crypto';
import { v4 as uuid } from 'uuid';
import fs from 'fs';
import { performance } from 'perf_hooks';
import { blockFromSerialized, transactionFromSerialized } from './../utils/objectToClass';
import { TransactionOutput } from './Transaction';
import { ChainState } from './../services/ChainState';
import { Transaction, Block } from '.';
import { setImmediatePromise } from '../utils/sleep';

type MinerStatus = 'idle' | 'mining';
type BroadCastBlock = (block: Block) => void;
/**
 * Number of transactions per block
 */
const CAPACITY = process.argv[3] ? +process.argv[3] : 2;
console.log('Capacity:', CAPACITY);

const DIFFICULTY = process.argv[4] ? +process.argv[4] : 5;
console.log('Difficulty:', DIFFICULTY);

const loggerStream = fs.createWriteStream(
  __dirname + `/../../block-time${process.argv[2]}-cap[${CAPACITY}]-dif[${DIFFICULTY}].txt`,
  { flags: 'a' }
);
/**
 * There can only be a single Block chain
 * so we use the Singleton pattern
 */
export default class Chain {
  private static _instance: Chain;

  private chainState: ChainState;

  private minerStatus: MinerStatus = 'idle';

  chain: Block[];

  /**
   * list of transactions that are yet to be mined
   */
  transactionPool: Transaction[];

  miningBlock: Block | null = null;

  breakMining: boolean = false;

  // Genesis block
  private constructor(chainState: ChainState, receiverAddress?: string, amount?: number) {
    this.chainState = chainState;

    // If not bootstrap Node
    if (!receiverAddress || !amount) {
      console.log('Initializing empty chain');
      this.chain = [];
      this.transactionPool = [];

      return;
    }
    const genesisBlock = this.createGenesisBlock(receiverAddress, amount);
    this.chain = [genesisBlock];
    this.transactionPool = [];

    console.log('Initializing chain with genesis Block');
  }

  public static initialize(receiverAddress: string, numberOfClients: number, chainState: ChainState) {
    if (!Chain._instance) {
      Chain._instance = new Chain(chainState, receiverAddress, 100 * numberOfClients);
    }
    return Chain._instance;
  }

  public static initializeReceived(receivedChain: Chain, chainState: ChainState) {
    Chain._instance = Object.assign(new Chain(chainState), receivedChain);

    console.log('Received chain:', receivedChain);
    Chain._instance.castSerializedChain();
    console.log(`Initializing chain with length:${Chain._instance.chain.length}`);
    console.log(`And block hash: ${Chain._instance.lastBlock.currentHash}`);
    Chain._instance.createUTXOFromChain(chainState);
    return Chain._instance;
  }

  public static get instance(): Chain {
    return Chain._instance;
  }

  get lastBlock() {
    return this.chain[this.chain.length - 1];
  }

  /**
   * We need to cast Blocks and Transactions items of chain
   * from objects to class instances
   * when received as serialized from tcp streams
   */
  private castSerializedChain(): void {
    const serializedChain = this.chain;
    const castedChain = serializedChain.map((serializedBlock) => blockFromSerialized(serializedBlock));
    this.chain = castedChain;
    // console.log('this.chain:', this.chain);

    // TODO  also cast currentTransactions ???
    // if we are only interested in received chain we should perhaps clear
    // current transactions received
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

    firstTransaction.transactionOutputs = [utxo];
    // console.log('First transaction', firstTransaction);
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
    const padString = ''.padStart(DIFFICULTY, '0');

    this.breakMining = false;
    while (!this.breakMining) {
      const nonce = Math.random() * 10000000001;
      /**
       *  MD5 is similar to sha256, but it's
       * only 128 bits and faster to calculate
       */
      const hash = crypto.createHash('sha256');
      hash.update((block.toStringWithoutNonce() + nonce).toString()).end();
      const attempt = hash.digest('hex');
      if (attempt.substring(0, DIFFICULTY) === padString) {
        console.log(`🚀 Solved: ${nonce}, attempt: ${attempt}`);
        return nonce;
      }
      /**
       * We yield every at-least 10 ms passed
       * to let the event loop process other requests
       */
      if (blockingSince + 300 > Date.now()) {
        await setImmediatePromise();
        blockingSince = Date.now();
      }
    }
    console.log('My mining was interrupted...not cool but ok');
    this.breakMining = false;
  }

  async addTransaction(serializedTransaction: Transaction, broadcastBlock: BroadCastBlock) {
    const transaction = transactionFromSerialized(serializedTransaction);
    const isValid = this.validateTransaction(transaction);
    console.log('Valid result of transaction is', isValid);
    if (!isValid) return;
    console.log('✅ Received valid transaction');
    this.transactionPool.push(transaction);
    return this.checkForTransactionsToMine(broadcastBlock);
  }

  /**
   * (a) check signature
   * (b) check UTXOs balance
   */
  validateTransaction(transaction: Transaction) {
    const isValid = this.verifyTransaction(transaction);

    // validate user had requested UTXOs
    const validUtxos = this.chainState.validateSenderHasUTXOs(
      transaction.senderAddress,
      transaction.transactionInputs,
      transaction.transactionOutputs
    );
    if (!validUtxos) console.error('⛔ UTXOs received are not valid for recipient');

    // return isValid && validUtxos;
    return isValid;
  }

  /**
   * Verifies the signature of the transaction
   * @param transaction
   * @param senderAddress
   * @param signature
   */
  verifyTransaction(transaction: Transaction): boolean {
    const senderAddress = transaction.senderAddress;
    const verifier = crypto.createVerify('SHA256');
    verifier.update(transaction.transactionId);

    const isValid = verifier.verify(senderAddress, transaction.signature);
    return isValid;
  }

  private async checkForTransactionsToMine(broadcastBlock: BroadCastBlock) {
    if (this.transactionPool.length >= CAPACITY && this.minerStatus !== 'mining') {
      this.minerStatus = 'mining';
      const transactionsToBeMined = [];
      for (let index = 0; index < CAPACITY; index++) {
        const transaction = this.transactionPool.shift();
        if (transaction === undefined) throw new Error('Reached Unreachable code');
        transactionsToBeMined.push(transaction);
      }
      // pass transactions to new Block
      const newBlock = new Block(this.lastBlock.currentHash, transactionsToBeMined);
      // we need some proof of work to prevent double spend issue
      // mine will return proof
      this.miningBlock = newBlock;
      const solution = await this.mine(newBlock);
      this.miningBlock = null;
      if (solution) {
        newBlock.nonce = solution;
        this.chain.push(newBlock);
        broadcastBlock(newBlock);
        const newBlockTs = performance.now();
        loggerStream.write(newBlockTs + '\n');
      }

      this.minerStatus = 'idle';
      // emit end-mine event
      // check for remaining transactions to mine
      this.checkForTransactionsToMine(broadcastBlock);
    }
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
    console.log('validating block...', currentBlock.nonce);
    const hash = crypto.createHash('sha256');
    // console.log('currentBlock.toStringWithoutNonce()', currentBlock.toStringWithoutNonce());
    hash.update(currentBlock.toStringWithoutNonce() + currentBlock.nonce).end();
    const hashResult = hash.digest('hex');
    // console.log('hashResult', hashResult);
    const padString = ''.padStart(DIFFICULTY, '0');
    // console.log('padString', padString);
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
   * Can only build UTXO Chain State if chain has >= 1 transactions
   * and so it will include genesis UTXO
   */
  createUTXOFromChain(chainState: ChainState) {
    console.log('createUTXOFromChain');
    this.chainState = chainState;
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

  handleReceivedBlock(serializedBlock: Block) {
    const block = blockFromSerialized(serializedBlock);
    // TODO validate it
    const { previousHash } = block;

    // handles myReceived also(the one i broadcasted)
    if (this.blockExists(block)) {
      console.log('Received block that i already have');
      return true;
    }

    const previousBlockIndex = this.chain.findIndex((block) => block.currentHash === previousHash);
    if (previousBlockIndex === -1) {
      console.log("CASE0-I don't have previousBlock of received block");
      return false;
    }
    if (previousBlockIndex === this.chain.length - 1) {
      /**
       * We received a block that can be attached to our latest block
       */
      // STOP MY MINING - CHECK TRANSACTIONS OF RECEIVED - THE ONES I WAS MINING
      // PUT DIFF ON CURRENT_TRANSACTIONS AND WORK LATER ON THEM

      // TODO validate new block
      const previousBlock = this.chain[previousBlockIndex];
      if (!this.validateBlock(previousBlock, block)) {
        console.error('❌Block is not valid');
        // return;
      }
      this.chain.push(block);
      /**
       * I would need only to update UTXOs for transactions inside VALID received blocks
       * that were not somehow in my currentTransactions list, otherwise the UTXOs have been updated
       */

      console.log('📥CASE1-RECEIVED VALID BLOCK');

      const newBlockTs = performance.now();
      loggerStream.write(newBlockTs + '\n');

      const minedTransactionIds = new Set(block.transactions.map((tr) => tr.transactionId));
      if (this.miningBlock) this.transactionPool = this.transactionPool.concat(this.miningBlock.transactions);
      // filter my remaining transactions
      this.transactionPool = this.transactionPool.filter((tx) => !minedTransactionIds.has(tx.transactionId));
      // when i set this flag mining stops and new mining may start
      this.breakMining = true;
      return true;
    } else {
      console.log('CASE2-RECEIVED FOR OLD BLOCK');
      // we can ignore this since we have a longer chain,
      // UNLESS it comes after next-to-last block
      // Which would create a same length chain
      console.log(`I have ${this.chain.length} blocks in my chain`);
      console.log(`Previous block of received block is my No:${previousBlockIndex + 1}`);
      return false;
    }
  }

  blockExists(block: Block) {
    return this.chain.some((someBlock) => someBlock.currentHash === block.currentHash);
  }
}
