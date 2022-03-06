import { TransactionOutput } from '../libs/Transaction';

type TransactionOutputId = string;
type WalletAddress = string;

/**
 * Collection of all the UTXOs
 */
export class ChainState {
  localStorage: Record<WalletAddress, Record<TransactionOutputId, TransactionOutput>>;

  constructor() {
    this.localStorage = {};
  }

  clear() {
    this.localStorage = {};
  }

  addUnspentOutput(transactionOutput: TransactionOutput) {
    const { recipient } = transactionOutput;
    if (this.localStorage[recipient] === undefined) this.localStorage[recipient] = {};
    this.localStorage[recipient][transactionOutput.id] = transactionOutput;
  }

  removeUnspentOutput(recipient: string, transactionOutputId: string) {
    delete this.localStorage[recipient][transactionOutputId];
  }

  /**
   * Searches if the recipient has the requested unspent outputs
   * @param recipient
   * @param amountAsked
   * @returns
   */
  findUnspentOutputsForAmount(recipient: string, amountAsked: number): TransactionOutput[] | null {
    if (this.localStorage[recipient] === undefined) return null;
    const transactions: TransactionOutput[] = [];
    let totalAmount = 0;
    for (const transactionOutput of Object.values(this.localStorage[recipient])) {
      transactions.push(transactionOutput);
      totalAmount += transactionOutput.amountTransferred;

      if (totalAmount >= amountAsked) {
        transactions.map((transactionOutput) => this.removeUnspentOutput(recipient, transactionOutput.id));
        return transactions;
      }
    }
    return null;
  }

  walletBalance(walletAddress: string): number {
    const walletUTXOs = Object.values(this.localStorage[walletAddress]);
    return walletUTXOs.reduce((previousValue, currentUTXO) => previousValue + currentUTXO.amountTransferred, 0);
  }
}
