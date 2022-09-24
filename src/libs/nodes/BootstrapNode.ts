import Node from './Node';
import { nodeInfo, MessageType, nodeAddressInfo, CODES, InitializeChainMessage, RegisterNodeMessage } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';
import { Chain } from '..';
import { ChainState } from '../../services/ChainState';
import { MessageBus } from '../../shared/infra/message-bus/message-bus';

/**
 * Overrides subscribeHandler of simpleNode,
 * since it can listen and react to initialization events
 */
export default class BootstrapNode extends Node {
  /**
   * Όταν εισαχθούν όλοι οι κόμβοι, ο bootstrap κάνει broadcast σε όλους τα ζεύγη ip address/port
   * καθώς και τα public keys των wallets όλων των κόμβων που συμμετέχουν στο σύστημα
   */
  constructor(
    myNodeAddressInfo: nodeAddressInfo,
    chainState: ChainState,
    private totalExpectedNodes = 5,
    messageBus: MessageBus
  ) {
    super(myNodeAddressInfo, myNodeAddressInfo, chainState, messageBus);
    const pk = this.myWallet.publicKey;
    const myNodeInfo = {
      ...myNodeAddressInfo,
      pk,
    };
    this.nodes.push(myNodeInfo);
    this.chain = Chain.initialize(pk, totalExpectedNodes, this.chainState);
    this.id = 0;
  }

  override setUpServerListener(): void {
    this.messageBus.subscribe(CODES.REGISTER, (message, socket) => {
      this.handleNodeRegister(message, socket);
    });
    this.subscribeRegularNodeMessages();
    // console.log('BOOTSTRAP handleReceivedMessage');
    // switch (message.code) {
    //   case CODES.REGISTER:
    //     this.handleNodeRegister(message, socket);
    //     break;
    //   case CODES.NEW_TRANSACTION:
    //     this.handleReceivedTransaction(message);
    //     break;
    //   case CODES.BLOCK_FOUND:
    //     this.handleReceivedBlock(message);
    //     break;
    //   case CODES.CHAINS_REQUEST:
    //     this.handleChainsRequest(socket);
    //     break;
    //   case CODES.CLI_MAKE_NEW_TX:
    //     this.handleCliNewTransaction(message, socket);
    //     break;
    //   case CODES.CLI_VIEW_LAST_TX:
    //     this.handleViewLastTransactions(socket);
    //     break;
    //   case CODES.CLI_SHOW_BALANCE:
    //     this.handleShowBalance(socket);
    //     break;
    //   default:
    //     throw new Error(`unknown command ${message.code}`);
    // }
  }

  private handleNodeRegister(message: RegisterNodeMessage, socket: JsonSocket) {
    const { host, port, pk } = message;
    this.nodes.push({ host, port, pk });
    const nodeIndex = this.nodes.length - 1;
    const response = { id: nodeIndex };
    socket.sendEndMessage(response, handleError);

    if (this.isFinalNode(nodeIndex)) {
      console.log('all nodes entered!');
      setTimeout(this.broadcastNodesInfo.bind(this), 1000);
      const allNodesExceptMe = this.nodes.slice(1);
      setTimeout(() => {
        this.transferCoinsToNodes(allNodesExceptMe);
      }, 2000);

      // setTimeout(() => {
      //   this.readAndExecuteMyTransactions();
      // }, 5 * 1000);
    }
  }

  // sends to each node, info of all Nodes
  private broadcastNodesInfo() {
    const msg: InitializeChainMessage = {
      code: CODES.INITIALIZE_CHAIN,
      nodes: this.nodes,
      blockChain: this.chain,
    };
    console.log(`Sending chain with length:${this.chain.chain.length}`);
    console.log(`And block hash: ${this.chain.lastBlock.currentHash}`);
    this.broadcastMessage(msg);
  }

  private transferCoinsToNodes(nodes: nodeInfo[]) {
    for (const node of nodes) {
      this.makeTransaction(100, node.pk);
    }
  }

  private isFinalNode = (nodeIndex: number) => nodeIndex === this.totalExpectedNodes - 1;
}
