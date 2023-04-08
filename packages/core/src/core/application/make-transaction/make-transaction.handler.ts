import { IMessageBus } from '../../../shared/infra/message-bus/message-bus.interface';
import { Chain, Transaction, Wallet } from '../../domain';
import { CODES, CliNewTransactionMessage, MessageType, NewTransactionMessage, nodeInfo } from '../../domain/types';
import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';
import { IApplicationHandler } from '../definitions';

export class MakeNewTransactionHandler implements IApplicationHandler {
  constructor(private myWallet: Wallet, private nodes: nodeInfo[], private messageBus: IMessageBus) {}

  handle(message: CliNewTransactionMessage) {
    console.log('Received new transaction command');
    if (!this.nodes.some((node, index) => index === +message.nodeId)) {
      console.error('There is no node for provided nodeId', message.nodeId);
      return { response: null, error: 'There is no node for provided nodeId' };
    }

    try {
      this.makeTransaction(message.amount, this.nodes[+message.nodeId].pk);
      return { response: 'Transaction broadcasted', error: null };
    } catch (error) {
      console.error('Error while making transaction', error);
      return { response: null, error };
    }
  }

  protected makeTransaction(amount: number, receiverAddress: string): void {
    const transaction = this.myWallet.createTransaction(amount, receiverAddress);
    this.broadcastTransaction(transaction);
  }

  /** Broadcast transaction to all nodes */

  /** Receive broadcasted transaction,
   * verify it using validateTransaction
   */

  // conflict-resolve https://www.geeksforgeeks.org/blockchain-resolving-conflicts/
  protected broadcastTransaction(transaction: Transaction) {
    const message: NewTransactionMessage = {
      code: CODES.NEW_TRANSACTION,
      transaction,
    };
    this.broadcastMessage(message);
  }

  /**
   * Also broadcasts message to ourselves,
   * for messages that don't need ACK
   * and need some processing on receive,
   * we consume them like all nodes
   * @param message
   */
  protected broadcastMessage(message: MessageType) {
    console.log('Broadcasting message to', this.nodes.length, 'nodes');
    this.messageBus.publish(message, this.nodes);
  }
}
