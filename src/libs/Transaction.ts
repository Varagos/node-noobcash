import crypto from 'crypto';
import { v4 as uuid } from 'uuid';

export type TransactionOutput = {
  id: string;
  transactionId: string;
  recipient: string;
  amountTransferred: number;
};
export type TransactionInput = {
  previousOutputId: string;
};

/**
 * Based on UTXO model, a transaction is an act that
 * consumes some old UTXOs and creates a bunch of new UTXOs
 * UTXOs are always consumed as a whole, * and change UTXO
 * is created automatically by your wallet to get back the balance.
 */
export default class Transaction {
  // TODO add extra fields to avoid double spend

  public transactionInputs: TransactionInput[] = [];

  public transactionOutputs: TransactionOutput[] = [];

  private _signature?: Buffer;

  constructor(
    public senderAddress: string, // public key
    public receiverAddress: string, // public key
    public amount: number
  ) {}

  toString() {
    const { senderAddress, receiverAddress, amount } = this;
    return JSON.stringify({ senderAddress, receiverAddress, amount });
  }

  /**
   * Transaction ID (txid)
   * simply the double SHA-256 hash of a transaction.
   * When signing a transaction, it is in fact the txid that is signed.
   * Signing the txid ensures that if any part of the transaction changes,
   * the transaction ID changes, and the signature is rendered invalid.
   * This is what we sign with our private key, and is verified by others using our public key
   */
  public get transactionId(): string {
    const { senderAddress, receiverAddress, amount } = this;
    const payload = JSON.stringify({ senderAddress, receiverAddress, amount });

    const hashObject = crypto.createHash('sha256');
    hashObject.update(payload).end();
    return hashObject.digest('hex');
  }

  set signature(sig: Buffer) {
    this._signature = sig;
  }

  get signature(): Buffer {
    if (this._signature === undefined) throw new Error(`No signature for transaction ${this.toString()}`);
    return this._signature;
  }

  public consumeOldUTXOs(oldUTXOs: TransactionOutput[]) {
    const inputs: TransactionInput[] = oldUTXOs.map((oldOutput) => ({
      previousOutputId: oldOutput.id,
    }));
    //pass
    this.transactionInputs = inputs;
    const totalInputsAmount = oldUTXOs.reduce(
      (previousValue, currentValue) => previousValue + currentValue.amountTransferred,
      0
    );

    const changeAmount: number = totalInputsAmount - this.amount;
    const receiverUTXO = this.createTransactionOutput(this.receiverAddress, this.amount);
    const changeUTXO = this.createTransactionOutput(this.senderAddress, changeAmount);
    this.transactionOutputs = [receiverUTXO, changeUTXO];
  }

  /**
   * Needs to take a previous Unspent output in order to be created.
   * It turns it into a spent output
   * @param previousOutputId - the id of the unspent output
   * @returns
   */
  createTransactionInput(previousOutputId: string) {
    return {
      previousOutputId,
    };
  }

  /*
   * The output is considered unspent until a following input points to it
   * and consumes it
   * @param recipient the new holder of coins, public key
   * @param amount
   * @returns
   */
  createTransactionOutput(recipient: string, amount: number): TransactionOutput {
    return {
      id: uuid(),
      transactionId: this.transactionId,
      recipient,
      amountTransferred: amount,
    };
  }
}
