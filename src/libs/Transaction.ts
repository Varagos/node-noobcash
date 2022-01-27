export default class Transaction {
  // TODO add extra fields to avoid double spend
  constructor(
    public senderAddress: string, // public key
    public receiverAddress: string, // public key
    public amount: number
  ) {}

  toString() {
    return JSON.stringify(this);
  }
}
