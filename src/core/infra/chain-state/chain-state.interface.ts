import { TransactionInput, TransactionOutput } from '../../domain/Transaction';

export interface IChainState {
  clear(): void;
  addUnspentOutput(transactionOutput: TransactionOutput): void;
  removeUnspentOutput(recipient: string, transactionOutputId: string): void;
  /**
   * Searches if the recipient has the requested unspent outputs
   * for the amount requested
   * @param recipient
   * @param amountAsked
   * @returns
   */
  findUnspentOutputsForAmount(recipient: string, amountAsked: number): TransactionOutput[] | null;

  /**
   * Checks if recipient has specific UTXOs
   * @param recipient public key for sender
   * @param txIns the transaction inputs which are utxos until consumed
   */
  validateSenderHasUTXOs(recipient: string, txIns: TransactionInput[], txOuts: TransactionOutput[]): boolean;
  walletBalance(walletAddress: string): number;
}
