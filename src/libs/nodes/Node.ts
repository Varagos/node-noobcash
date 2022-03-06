import net from 'net';
import { Chain, Wallet } from '..';
import { nodeInfo, RegisterNodeMessage, nodeAddressInfo, CODES, MessageType, NewTransactionMessage } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';
import { ChainState } from '../../services/ChainState';

/**
 * A node has a wallet-1 pk
 */
// TODO complete class with basic functionalities
export default class BlockChainNode {
  protected chain: Chain = Chain.instance;
  protected id?: number;
  protected nodes: nodeInfo[] = [];
  protected myWallet: Wallet;

  // TODO keep list with all nodes in order to interchange msgs
  constructor(
    private readonly bootstrapNodeInfo: nodeAddressInfo,
    protected readonly myInfo: nodeAddressInfo,
    protected chainState: ChainState
  ) {
    this.myWallet = new Wallet(chainState);
  }

  /** When all nodes are entered, receive broadcast from bootstrapNode,
   * with ip/port/pk of every node in the system,
   * also receive blockchain created, validate it, and
   * from now on node is ready to make transactions
   */
  setUpServerListener() {
    const { port } = this.myInfo;
    const server = net.createServer();
    server.listen(port);
    server.on('connection', (netSocket) => {
      const socket = new JsonSocket(netSocket);
      socket.on('message', (message) => {
        this.handleReceivedMessage(message, socket);
      });

      socket.on('end', () => {
        console.log('client disconnected');
      });
    });

    server.on('error', (err) => {
      console.log('❌ Server error ❌', err);
      throw err;
    });
  }

  /**
   * Send to bootstrap node ip address/port and my public key
   * and receive my id as response
   */
  enterNodeToBlockChain() {
    // inform bootstrap node with my address info
    // receive my id from bootstrap node
    const { port, host } = this.bootstrapNodeInfo;
    const socket = new JsonSocket(new net.Socket());
    socket.connect({ host, port });
    socket.on('connect', () => {
      const message: RegisterNodeMessage = {
        code: CODES.REGISTER,
        host: this.myInfo.host,
        port: this.myInfo.port,
        pk: this.myWallet.publicKey,
      };
      socket.sendMessage(message, handleError);
      socket.on('message', (message) => {
        console.log('I received id: ', message);
        this.id = message.id;
      });
    });

    socket.on('error', (error) => {
      console.log('There was an error connecting to server', error);
    });

    socket.on('close', () => {
      console.log('connection to bootstrap node closed');
    });
  }

  /**
   * Receive all nodes list from bootstrap node
   * as well as blockChain so far
   */
  protected handleReceivedMessage(message: MessageType, socket: JsonSocket) {
    switch (message.code) {
      case CODES.INITIALIZE_CHAIN:
        const { nodes, blockChain } = message;
        this.nodes = nodes;
        console.log('Received nodes from bootstrap', this.nodes);
        const chain = Chain.initializeReceived(blockChain, this.chainState);
        const chainIsValid = chain.validateChain();
        if (!chainIsValid) throw new Error('Cannot validate received chain');
        this.chain = chain;
        console.log('validated chain!');
        break;
      case CODES.NEW_TRANSACTION:
        this.handleReceivedTransaction(message);
        break;
      default:
        throw new Error(`unknown command ${message.code}`);
    }
  }

  /** Broadcast transaction to all nodes */

  /** Receive broadcasted transaction,
   * verify it using validateTransaction
   */

  // conflict-resolve https://www.geeksforgeeks.org/blockchain-resolving-conflicts/

  protected broadcastTransaction(receiverAddress: string, amount: number) {
    const transaction = this.myWallet.makeTransaction(amount, receiverAddress);
    const message: NewTransactionMessage = {
      code: CODES.NEW_TRANSACTION,
      transaction,
    };
    this.broadcastMessage(message);
  }

  // sends to each node, info of all Nodes
  protected broadcastMessage(message: MessageType) {
    console.log('Broadcasting message to', this.nodes.length, 'nodes');
    for (const node of this.nodes) {
      // TODO broadcast to myself as well? .e.g makeTransaction
      // if (node.pk === this.myWallet.publicKey) continue;
      const { host, port } = node;
      console.log('Sending message to', host, port);
      this.sendOneMessageToNode(host, port, message);
    }
  }

  protected sendOneMessageToNode(host: string, port: number, message: MessageType) {
    const socket = new JsonSocket(new net.Socket());
    socket.connect(port, host);
    socket.on('connect', () => {
      socket.sendEndMessage(message, handleError);
    });
    socket.on('error', (error) => {
      console.error(error);
    });
  }

  protected handleReceivedTransaction(message: NewTransactionMessage) {
    console.log('Received transaction');
    this.chain.addTransaction(message.transaction);
  }
}
