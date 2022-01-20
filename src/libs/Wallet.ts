import * as crypto from 'crypto';
import { Chain, Transaction } from '.';
/**
 * There can only be a single Block chain
 * so we use the Singleton pattern
 *  */

export default class Wallet {
  public publicKey: string;
  public privateKey: string;
  constructor() {
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

  sendMoney(amount: number, payeePublicKey: string) {
    const transaction = new Transaction(amount, this.publicKey, payeePublicKey);

    /**
     * (sign the hash with our private key,
     * can be verified by others with our pk)
     */
    const sign = crypto.createSign('SHA256');
    sign.update(transaction.toString()).end();

    const signature = sign.sign(this.privateKey);
    Chain.instance.addBlock(transaction, this.publicKey, signature);
  }
}
