import { TransactionInput } from './../libs/Transaction';
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
    console.log(`Added ${transactionOutput.amountTransferred} NBC to ${transactionOutput.recipient.substring(75, 90)}`);
    // console.log('addedd xdxd', transactionOutput.recipient);
  }

  removeUnspentOutput(recipient: string, transactionOutputId: string) {
    delete this.localStorage[recipient][transactionOutputId];
  }

  /**
   * Searches if the recipient has the requested unspent outputs
   * for the amount requested
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
        return transactions;
      }
    }
    return null;
  }

  /**
   * Checks if recipient has specific UTXOs
   * @param recipient public key for sender
   * @param txIns the transaction inputs which are utxos until consumed
   */
  validateSenderHasUTXOs(recipient: string, txIns: TransactionInput[], txOuts: TransactionOutput[]): boolean {
    // Check if we already have the txOuts are UTXOs, then we are the transaction creator
    // and don't need to further check
    if (
      this.localStorage[txOuts[0].recipient] &&
      Object.values(this.localStorage[txOuts[0].recipient]).some((UTXO) => UTXO.id === txOuts[0].id)
    ) {
      console.log('Checking UTXOs that i have created');
      return true;
    }
    // console.log('FOR FIRST TXOUT, RECIPIENT HAS', Object.values(this.localStorage[txOuts[0].recipient]));
    // console.log('WHILE TXOUT WAS', txOuts[0]);

    // Else check if inputs are indeed UTXOs, and if they are remove them and new UTXOs
    // if not then they are invalid and the UTXOs are INVALID

    const recipientAvailableUTXOs = new Set(Object.keys(this.localStorage[recipient]));
    // console.log('Recipient has availableUTXOs', recipientAvailableUTXOs);
    // console.log(
    //   'Requested UTXOs',
    //   txIns.map((u) => u.previousOutputId)
    // );
    for (const { previousOutputId } of txIns) {
      if (!recipientAvailableUTXOs.has(previousOutputId)) return false;
    }
    // TODO also check amount of ids matches registered transaction amount/outputs?
    // TODO validate that he has sufficient UTXOs

    // If our chainState has the new UTXOs, then we were the initiator and have updated the chainState
    // Remove old UTXOs from chainState
    txIns.forEach((txInput) => this.removeUnspentOutput(recipient, txInput.previousOutputId));
    // Add new UnspentOutputs into chainState
    txOuts.forEach(this.addUnspentOutput.bind(this));
    return true;
  }

  walletBalance(walletAddress: string): number {
    if (this.localStorage[walletAddress] === undefined) this.localStorage[walletAddress] = {};
    const walletUTXOs = Object.values(this.localStorage[walletAddress]);
    return walletUTXOs.reduce((previousValue, currentUTXO) => previousValue + currentUTXO.amountTransferred, 0);
  }
}
