import { IMessageBus } from '../../../shared/infra/message-bus/message-bus.interface';
import { Block, Chain, Wallet } from '../../domain';
import { BlockMineFoundMessage, CODES, MessageType, NewTransactionMessage, nodeInfo } from '../../domain/types';
import { InMemChainState } from '../../infra/chain-state/ChainState';
import { IApplicationHandler } from '../definitions';

export class ReceiveTransactionHandler implements IApplicationHandler {
  constructor(
    private readonly chain: Chain,
    private readonly nodes: nodeInfo[],
    private readonly messageBus: IMessageBus,
    protected readonly chainState: InMemChainState
  ) {}

  async handle(message: NewTransactionMessage) {
    console.log('Received transaction');
    console.log('this keys', Object.keys(this));
    try {
      await this.chain.addTransaction(message.transaction, this.broadcastBlock.bind(this));
    } catch (e) {
      console.log('Error adding transaction', e);
    }
    // console.log('Checking balance after received transaction, iAmReadyStatus', this.readyToMakeTransactions());
  }

  protected broadcastBlock(block: Block) {
    console.log('Broadcasting block!');
    const message: BlockMineFoundMessage = {
      code: CODES.BLOCK_FOUND,
      block,
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
