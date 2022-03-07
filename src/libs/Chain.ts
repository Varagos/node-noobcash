import { blockFromSerialized } from './../utils/objectToClass';
import { v4 as uuid } from 'uuid';
import { TransactionOutput } from './Transaction';
import { ChainState } from './../services/ChainState';
import * as crypto from 'crypto';
import { Transaction, Block } from '.';
import { setImmediatePromise } from '../utils/sleep';

type MinerStatus = 'idle' | 'mining';
type BroadCastBlock = (block: Block) => void;
/**
 * Number of transactions per block
 */
const CAPACITY = 2;

const DIFFICULTY = 5;
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
  currentTransactions: Transaction[];

  miningBlock: Block | null = null;

  breakMining: boolean = false;

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

    Chain._instance.castSerializedChain();
    console.log(`Initializing chain with length:${Chain._instance.chain.length}`);
    console.log(`And block hash: ${Chain._instance.lastBlock.currentHash}`);
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
      hash.update((block.toString() + nonce).toString()).end();

      const attempt = hash.digest('hex');

      // TODO replace with difficulty variable

      if (attempt.substring(0, DIFFICULTY) === padString) {
        console.log(`🚀 Solved: ${nonce}, attempt: ${attempt}`);
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
    console.log('My mining was interrupted...not cool but ok');
    this.breakMining = false;
  }

  async addTransaction(serializedTransaction: Transaction, broadcastBlock: BroadCastBlock) {
    const { senderAddress, receiverAddress, amount } = serializedTransaction;
    const transaction = Object.assign(new Transaction(senderAddress, receiverAddress, amount), serializedTransaction);
    const senderPublicKey = transaction.senderAddress;
    const isValid = this.verifyTransaction(transaction, senderPublicKey);
    console.log('Valid result of transaction is', isValid);
    if (!isValid) return;
    this.currentTransactions.push(transaction);
    return this.checkForTransactionsToMine(broadcastBlock);
  }

  /**
   * (a) check signature
   * (b) check UTXOs balance
   */
  validateTransaction() {}
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

  private async checkForTransactionsToMine(broadcastBlock: BroadCastBlock) {
    if (this.currentTransactions.length >= CAPACITY && this.minerStatus !== 'mining') {
      this.minerStatus = 'mining';
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
      this.miningBlock = newBlock;
      const solution = await this.mine(newBlock);
      this.miningBlock = null;
      if (solution) {
        newBlock.nonce = solution;
        this.chain.push(newBlock);
        broadcastBlock(newBlock);
      }

      this.minerStatus = 'idle';
      // TODO emit end-mine event
      // TODO check for remaining transactions to mine
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

  handleReceivedBlock(serializedBlock: Block) {
    const block = blockFromSerialized(serializedBlock);
    const { previousHash } = block;

    const previousBlock = this.chain.find((block) => block.currentHash === previousHash);
    const previousBlockIndex = this.chain.findIndex((block) => block.currentHash === previousHash);
    if (previousBlockIndex === -1) {
      console.log("CASE0-I don't have previousBlock of received block");
      return this.resolveConflict(block);
    }
    if (previousBlockIndex === this.chain.length - 1) {
      /**
       * We received a block that can be attached to our latest block
       */
      // STOP MY MINING - CHECK TRANSACTIONS OF RECEIVED - THE ONES I WAS MINING
      // PUT DIFF ON CURRENT_TRANSACTIONS AND WORK LATER ON THEM
      console.log('CASE1-RECEIVED VALID BLOCK');
      console.log('I am mining transactions:');
      console.table(this.miningBlock?.transactions.map((tr) => tr.transactionId));
      console.log('I received block with transactions:');
      console.table(block.transactions.map((tr) => tr.transactionId));
      console.log('received block has txId[0]', typeof block.transactions[0]);
      this.breakMining = true;
    } else {
      console.log('CASE2-RECEIVED FOR OLD BLOCK');
      console.log(`I have ${this.chain.length} blocks in my chain`);
      console.log(`Previous block of received block is my No:${previousBlockIndex + 1}`);
      this.resolveConflict(block);
    }
    console.log('Previous block for received block:', previousBlock?.currentHash);
    // I also receive my broadcast, check if i have it and don't need to act
  }

  /**
   * TODO wallet_balance()
   * Μπορούμενα βρούμε το υπόλοιπο οποιουδήποτε wallet προσθέτοντας όλα τα UTXOs που έχουν
   * παραλήπτη το συγκεκριμένο wallet.
   */

  /** Αυτή η συνάρτηση καλείται όταν ένα κόμβος λάβει ένα block το οποίο δεν μπορεί να κάνει validate
   * γιατί το πεδίο previous_hash δεν ισούται με το hash του προηγούμενου block. Αυτό μπορεί να σημαίνει
   * ότι έχει δημιουργηθεί κάποια διακλάδωση, η οποία πρέπει να επιλυθεί. Ο κόμβος ρωτάει τους
   * υπόλοιπους για το μήκος του blockchain και επιλέγει να υιοθετήσει αυτό με το μεγαλύτερο μήκος.
   * **************************************
   * Σε περίπτωση που 2 ή περισσότεροι miners κάνουν ταυτόχρονα mine ένα block, οι παραλήπτες
   * των διαφορετικών αυτών blocks προσθέτουν στην αλυσίδα τους το πρώτο block που
   * λαμβάνουν. Αυτό μπορεί να οδηγήσει σε 2 ή περισσότερες διακλαδώσεις της αλυσίδας. Για να
   * καταλήξουν τελικά όλοι οι κόμβοι με την ίδια αλυσίδα του blockchain, τρέχουν τον αλγόριθμο
   * consensus, σύμφωνα με τον οποίον σε περίπτωση conflict υιοθετούν την αλυσίδα με το
   * μεγαλύτερο μέγεθος.
   */
  // TODO resolve-conflict
  resolveConflict(block: Block) {
    console.log('💢 Conflict detected');
  }
}
