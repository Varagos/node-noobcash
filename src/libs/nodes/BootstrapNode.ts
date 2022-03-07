import Node from './Node';
import net from 'net';
import { nodeInfo, MessageType, nodeAddressInfo, CODES, InitializeChainMessage, NewTransactionMessage } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';
import { Chain } from '..';
import { ChainState } from '../../services/ChainState';

/**
 * Overrides subscribeHandler of simpleNode,
 * since it can listen and react to initialization events
 */
export default class BootstrapNode extends Node {
  /**
   * Όταν εισαχθούν όλοι οι κόμβοι, ο bootstrap κάνει broadcast σε όλους τα ζεύγη ip address/port
   * καθώς και τα public keys των wallets όλων των κόμβων που συμμετέχουν στο σύστημα
   */
  constructor(myNodeAddressInfo: nodeAddressInfo, chainState: ChainState, private totalExpectedNodes = 5) {
    super(myNodeAddressInfo, myNodeAddressInfo, chainState);
    const pk = this.myWallet.publicKey;
    const myNodeInfo = {
      ...myNodeAddressInfo,
      pk,
    };
    this.nodes.push(myNodeInfo);
    this.chain = Chain.initialize(pk, totalExpectedNodes, this.chainState);
  }

  override handleReceivedMessage(message: MessageType, socket: JsonSocket) {
    console.log('BOOTSTRAP handleReceivedMessage');
    switch (message.code) {
      case CODES.REGISTER:
        const { host, port, pk } = message;
        this.nodes.push({ host, port, pk });
        const nodeIndex = this.nodes.length - 1;
        const response = { id: nodeIndex };
        socket.sendEndMessage(response, handleError);

        if (this.isFinalNode(nodeIndex)) {
          console.log('all nodes entered!');
          setTimeout(this.broadcastNodesInfo.bind(this), 1000);
          setTimeout(this.transferCoinsToNodes.bind(this), 5000);
        }
        break;
      case CODES.NEW_TRANSACTION:
        this.handleReceivedTransaction(message);
        break;
      case CODES.BLOCK_FOUND:
        this.handleReceivedBlock(message);
        break;
      default:
        throw new Error(`unknown command ${message.code}`);
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

  private transferCoinsToNodes() {
    for (const node of this.nodes.slice(1)) {
      this.broadcastTransaction(node.pk, 100);
    }
  }

  private isFinalNode = (nodeIndex: number) => nodeIndex === this.totalExpectedNodes - 1;
}
