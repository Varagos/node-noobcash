import * as crypto from 'crypto';
import { Chain, Transaction } from '.';
import { IChainState } from '../infra/chain-state/chain-state.interface';

export default class Wallet {
  public publicKey: string;
  public privateKey: string;
  constructor(private chainState: IChainState) {
    /** Generate using RSA(an encrypting algorithm)
     * we will use it to create a digital signature
     */
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    console.log('My PK: ', keypair.publicKey);
    // format pem is saved in file system
    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  createTransaction(amount: number, receiverAddress: string): Transaction {
    console.log(`Sending ${amount} 💰NBC💰 to receiver`);
    const transaction = new Transaction(this.publicKey, receiverAddress, amount);
    /**
     * We need to update ChainState in order to have possible subsequent synchronous
     * makeTransactions access an updated view of chainState
     */
    const unspentOutputsToBeConsumed = this.chainState.findUnspentOutputsForAmount(this.publicKey, amount);

    if (unspentOutputsToBeConsumed === null) {
      console.error('Attempted to make a transaction without having necessary UTXOs');
      console.log('I only have', this.chainState.walletBalance(this.publicKey));
      throw new Error('Not enough coins to make the transaction');
    }

    // Remove old UTXOs from chainState
    unspentOutputsToBeConsumed.forEach((transactionOutput) =>
      this.chainState.removeUnspentOutput(this.publicKey, transactionOutput.id)
    );

    transaction.consumeOldUTXOs(unspentOutputsToBeConsumed);
    // Add new UnspentOutputs into chainState
    transaction.transactionOutputs.forEach(this.chainState.addUnspentOutput.bind(this.chainState));

    transaction.signature = this.signTransaction(transaction);
    return transaction;
  }

  /**
   * (sign the hash with our private key,
   * can be verified by others with our pk)
   */
  private signTransaction(transaction: Transaction): Buffer {
    const signObject = crypto.createSign('SHA256');
    signObject.update(transaction.transactionId).end();

    const signature = signObject.sign(this.privateKey);
    return signature;
  }

  public myWalletBalance() {
    return this.chainState.walletBalance(this.publicKey);
  }

  // TODO - instead of addTransaction - (Broadcast to all nodes of blockchain (including myself))
  // broadCastTransaction() {}
}
