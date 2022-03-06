import * as crypto from 'crypto';
import { Chain, Transaction } from '.';
import { ChainState } from '../services/ChainState';

export default class Wallet {
  public publicKey: string;
  public privateKey: string;
  constructor(private chainState: ChainState) {
    /** Generate using RSA(an encrypting algorithm)
     * we will use it to create a digital signature
     */
    const keypair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    // format pem is saved in file system
    this.privateKey = keypair.privateKey;
    this.publicKey = keypair.publicKey;
  }

  async sendMoney(amount: number, receiverAddress: string) {
    console.log(`Sending ${amount} 💰NBC💰 to receiver`);
    const transaction = new Transaction(this.publicKey, receiverAddress, amount);
    const unspentOutputsToBeConsumed = this.chainState.findUnspentOutputsForAmount(this.publicKey, amount);
    if (unspentOutputsToBeConsumed === null) {
      console.error('Attempted to make a transaction without having necessary UTXOs');
      console.log('I only have', this.chainState.walletBalance(this.publicKey));
      process.exit(1);
    }
    transaction.consumeOldUTXOs(unspentOutputsToBeConsumed);
    transaction.transactionOutputs.forEach(this.chainState.addUnspentOutput.bind(this.chainState));

    transaction.signature = this.signTransaction(transaction);
    // Chain.instance.addBlock(transaction, this.publicKey, signature);
    await Chain.instance.addTransaction(transaction, this.publicKey);
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
