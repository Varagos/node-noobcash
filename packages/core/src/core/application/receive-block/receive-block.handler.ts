import { IMessageBus } from '../../../shared/infra/message-bus/message-bus.interface';
import { requestChain } from '../../../utils/sockets';
import { Chain, Transaction, Wallet } from '../../domain';
import {
  BlockMineFoundMessage,
  CODES,
  ChainsRequestMessage,
  CliNewTransactionMessage,
  MessageType,
  NewTransactionMessage,
  nodeInfo,
} from '../../domain/types';
import { InMemChainState } from '../../infra/chain-state/ChainState';
import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';
import { IApplicationHandler } from '../definitions';

export class ReceiveBlockHandler implements IApplicationHandler {
  constructor(
    private chain: Chain,
    private myWallet: Wallet,
    private nodes: nodeInfo[],
    private messageBus: IMessageBus,
    protected chainState: InMemChainState
  ) {}

  async handle(message: BlockMineFoundMessage) {
    console.log('I received a block!');
    if (!this.chain.handleReceivedBlock(message.block)) {
      await this.resolveConflict();
    }
    // console.log('MY ID IS:', this.id);
    // if (this.id == 0) {
    //   console.log('I AM NODE ZERO');
    //   await this.resolveConflict();
    // }
  }

  protected async resolveConflict() {
    console.log('💢 Conflict detected');

    const message: ChainsRequestMessage = {
      code: CODES.CHAINS_REQUEST,
    };

    // ask remaining nodes for their chain, and keep longest valid
    const otherNodes = this.nodes.filter((node) => node.pk !== this.myWallet.publicKey);
    // TODO replace requestChain with messageBus
    const chains = await Promise.all(otherNodes.map((node) => requestChain(node.host, node.port, message)));
    console.log('Received chains from other nodes', chains);

    const sortedChains = chains.sort((a, b) => {
      if (a.blockChain.chain.length > b.blockChain.chain.length) return -1;
      if (a.blockChain.chain.length < b.blockChain.chain.length) return 1;
      return 0;
    });
    // console.log(
    //   'sortedChain lengths',
    //   sortedChains.map((x) => x.blockChain.chain.length)
    // );
    let chainReplaced = false;
    for (const { blockChain } of sortedChains) {
      const chain = Chain.initializeReceived(blockChain, this.chainState);
      const chainIsValid = chain.validateChain();
      if (chainIsValid) {
        console.log('validated chain-resolved conflict');
        this.chain = chain;
        chainReplaced = true;
        break;
      }
    }
    if (!chainReplaced) throw new Error('Could not resolve conflict - all chains were invalid');
  }
}
