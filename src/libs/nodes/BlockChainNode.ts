import net from 'net';
import { Chain, Wallet } from '..';
import { nodeInfo, RegisterNodeMessage, nodeAddressInfo, MESSAGE_TYPES, CODES, MessageType } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';

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
  constructor(private readonly bootstrapNodeInfo: nodeAddressInfo, protected readonly myInfo: nodeAddressInfo) {
    this.myWallet = new Wallet();
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
        this.handleReceivedBroadCast(message);
      });
    });

    server.on('error', (err) => {
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
        type: MESSAGE_TYPES.BOOTSTRAP,
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
  protected handleReceivedBroadCast(message: MessageType) {
    switch (message.code) {
      case CODES.INITIALIZE_CHAIN:
        const { nodes, blockChain } = message;
        this.nodes = nodes;
        console.log('Received nodes from bootstrap', this.nodes);
        const chain = Chain.initializeReceived(blockChain);
        const chainIsValid = chain.validateChain();
        if (!chainIsValid) throw new Error('Cannot validate received chain');
        this.chain = chain;
        console.log('validated chain!');
      default:
        throw new Error(`unknown command ${message.code}`);
    }
  }

  /** Broadcast transaction to all nodes */

  /** Receive broadcasted transaction,
   * verify it using validateTransaction
   */
}
