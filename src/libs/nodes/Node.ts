import net from 'net';
import { Block, Chain, Transaction, Wallet } from '..';
import {
  nodeInfo,
  RegisterNodeMessage,
  nodeAddressInfo,
  CODES,
  MessageType,
  NewTransactionMessage,
  BlockMineFoundMessage,
  ChainsRequestMessage,
  CliNewTransactionMessage,
  ChainResponse,
} from './types';
import JsonSocket from 'json-socket';
import { handleError, requestChain } from '../../utils/sockets';
import { ChainState } from '../../services/ChainState';
import { notEqual } from 'assert';

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
      case CODES.BLOCK_FOUND:
        this.handleReceivedBlock(message);
        break;
      case CODES.CHAINS_REQUEST:
        this.handleChainsRequest(socket);
        break;
      case CODES.CLI_MAKE_NEW_TX:
        this.handleCliNewTransaction(socket, message);
        break;
      case CODES.CLI_VIEW_LAST_TX:
        this.handleViewLastTransactions(socket);
        break;
      case CODES.CLI_SHOW_BALANCE:
        this.handleShowBalance(socket);
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

  protected broadcastTransaction(transaction: Transaction) {
    const message: NewTransactionMessage = {
      code: CODES.NEW_TRANSACTION,
      transaction,
    };
    this.broadcastMessage(message);
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
    for (const node of this.nodes) {
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

  protected makeTransaction(amount: number, receiverAddress: string): void {
    const transaction = this.myWallet.makeTransaction(amount, receiverAddress);
    this.broadcastTransaction(transaction);
  }

  protected handleReceivedTransaction(message: NewTransactionMessage) {
    console.log('Received transaction');
    this.chain.addTransaction(message.transaction, this.broadcastBlock.bind(this));
  }

  protected async handleReceivedBlock(message: BlockMineFoundMessage) {
    console.log('Received block');
    if (!this.chain.handleReceivedBlock(message.block)) {
      await this.resolveConflict();
    }
    console.log('MY ID IS:', this.id);
    if (this.id == 0) {
      console.log('I AM NODE ZERO');
      await this.resolveConflict();
    }
  }

  protected handleChainsRequest(socket: JsonSocket) {
    console.log('ChainsRequest');
    const msg: ChainResponse = { blockChain: this.chain };
    socket.sendEndMessage(msg, handleError);
  }

  // TODO resolve-conflict
  protected async resolveConflict() {
    console.log('💢 Conflict detected');

    const message: ChainsRequestMessage = {
      code: CODES.CHAINS_REQUEST,
    };

    // ask remaining nodes for their chain, and keep longest valid
    const otherNodes = this.nodes.filter((node) => node.pk !== this.myWallet.publicKey);
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
    chains[0].blockChain.chain.length;
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

  protected handleCliNewTransaction(socket: JsonSocket, message: CliNewTransactionMessage) {
    console.log('Received new transaction command');
    // TODO
    // Verify public key exists
    if (!this.nodes.some((node) => node.pk === message.recipientAddress)) {
      socket.sendEndMessage({ response: null, error: 'There is no node for provided recipientAddress' }, handleError);
      return;
    }

    // TODO validate he has the UTXOs, perhaps inside makeTransaction?
    try {
      this.makeTransaction(message.amount, message.recipientAddress);
      socket.sendEndMessage({ response: 'Transaction broadcasted', error: null }, handleError);
    } catch (error) {
      socket.sendEndMessage({ response: null, error }, handleError);
    }
  }

  protected handleViewLastTransactions(socket: JsonSocket) {
    console.log('handle view last transactions');

    const lastTransactions = this.chain.lastBlock.transactions;
    socket.sendEndMessage({ response: lastTransactions, error: null }, handleError);
  }

  protected handleShowBalance(socket: JsonSocket) {
    console.log('Handle show balance');

    socket.sendEndMessage({ response: this.myWallet.myWalletBalance() }, handleError);
  }
}
