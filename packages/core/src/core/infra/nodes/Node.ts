import fs from 'fs/promises';
import path from 'path';
import { Block, Chain, Transaction, Wallet } from '../../domain';
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
  InitializeChainMessage,
} from '../../domain/types';
import JsonSocket from 'json-socket';
import { handleError, requestChain } from '../../../utils/sockets';
import { InMemChainState } from '../chain-state/ChainState';
import { totalNodes } from '../../../shared/config';
import { IMessageBus } from '../../../shared/infra/message-bus/message-bus.interface';

/**
 * A node has a wallet-1 pk
 */
export default class BlockChainNode {
  protected chain: Chain = Chain.instance;
  protected id?: number;
  protected nodes: nodeInfo[] = [];
  protected myWallet: Wallet;
  protected executedTXs: boolean = false;

  // TODO keep list with all nodes in order to interchange msgs
  constructor(
    private readonly bootstrapNodeInfo: nodeAddressInfo,
    protected readonly myInfo: nodeAddressInfo,
    protected chainState: InMemChainState,
    protected messageBus: IMessageBus
  ) {
    this.myWallet = new Wallet(chainState);
  }

  /**
   * Send to bootstrap node ip address/port and my public key
   * and receive my id as response
   */
  async enterNodeToBlockChain() {
    const message: RegisterNodeMessage = {
      code: CODES.REGISTER,
      host: this.myInfo.host,
      port: this.myInfo.port,
      pk: this.myWallet.publicKey,
    };
    const responseMessage = await this.messageBus.requestReply(message, this.bootstrapNodeInfo);
    this.id = responseMessage.id;
    return this;
  }

  /**
   * Receive all nodes list from bootstrap node
   * as well as blockChain so far
   * ****************************************************
   * When all nodes are entered, receive broadcast from bootstrapNode,
   * with ip/port/pk of every node in the system,
   * also receive blockchain created, validate it, and
   * from now on node is ready to make transactions
   */
  setUpServerListener() {
    console.log('setting up server listener');
    this.messageBus.subscribe(CODES.INITIALIZE_CHAIN, (message: any) => {
      this.handleChainInitialization(message);
    });
    this.subscribeRegularNodeMessages();
    return this;
  }

  protected subscribeRegularNodeMessages() {
    this.messageBus.subscribe(CODES.NEW_TRANSACTION, (message: any) => {
      this.handleReceivedTransaction(message);
    });
    this.messageBus.subscribe(CODES.BLOCK_FOUND, (message: any) => {
      this.handleReceivedBlock(message);
    });
    this.messageBus.subscribe(CODES.CHAINS_REQUEST, (message) => {
      return this.handleChainsRequest();
    });
    this.messageBus.subscribe(CODES.CLI_MAKE_NEW_TX, (message) => {
      return this.handleCliNewTransaction(message);
    });
    this.messageBus.subscribe(CODES.CLI_VIEW_LAST_TX, (message) => {
      return this.handleViewLastTransactions();
    });
    this.messageBus.subscribe(CODES.CLI_SHOW_BALANCE, (message) => {
      return this.handleShowBalance();
    });
  }

  protected async handleChainInitialization(message: InitializeChainMessage) {
    const { nodes, blockChain } = message;
    this.nodes = nodes;
    console.log('Received nodes from bootstrap', this.nodes);
    const chain = Chain.initializeReceived(blockChain, this.chainState);
    const chainIsValid = chain.validateChain();
    if (!chainIsValid) throw new Error('Cannot validate received chain');
    this.chain = chain;
    console.log('validated chain!');
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
    this.messageBus.publish(message, this.nodes);
  }

  protected makeTransaction(amount: number, receiverAddress: string): void {
    const transaction = this.myWallet.createTransaction(amount, receiverAddress);
    this.broadcastTransaction(transaction);
  }

  protected async handleReceivedTransaction(message: NewTransactionMessage) {
    console.log('Received transaction');
    await this.chain.addTransaction(message.transaction, this.broadcastBlock.bind(this));
    // console.log('Checking balance after received transaction, iAmReadyStatus', this.readyToMakeTransactions());
    if (this.executedTXs === false && this.readyToMakeTransactions()) {
      this.executedTXs = true;
      await this.readAndExecuteMyTransactions();
    }
  }

  protected async handleReceivedBlock(message: BlockMineFoundMessage) {
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

  protected handleChainsRequest() {
    console.log('ChainsRequest');
    const msg: ChainResponse = { blockChain: this.chain };
    return msg;
  }

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

  protected handleCliNewTransaction(message: CliNewTransactionMessage) {
    console.log('Received new transaction command');
    if (!this.nodes.some((node, index) => index === +message.nodeId)) {
      return { response: null, error: 'There is no node for provided nodeId' };
    }

    try {
      this.makeTransaction(message.amount, this.nodes[+message.nodeId].pk);
      return { response: 'Transaction broadcasted', error: null };
    } catch (error) {
      return { response: null, error };
    }
  }

  protected handleViewLastTransactions() {
    console.log('handle view last transactions');

    const lastTransactions = this.chain.lastBlock.transactions;
    return { response: lastTransactions, error: null };
  }

  protected handleShowBalance() {
    console.log('Handle show balance');

    return {
      response: this.myWallet.myWalletBalance(),
      // chainState: this.chainState.localStorage
    };
  }

  protected async readAndExecuteMyTransactions() {
    console.log('Starting execution of my transactions, my balance:', this.myWallet.myWalletBalance());
    const txDirPath = totalNodes === 5 ? '../../../5nodes/transactions' : '../../../10nodes/transactions';

    const normalizedPath = path.join(__dirname, txDirPath + this.id + '.txt');
    console.log('__dirname', __dirname);
    console.log('normalizedPath', normalizedPath);
    const data = await fs.readFile(normalizedPath);
    const arr = data.toString().replace(/\r\n/g, '\n').split('\n');
    // console.log('all IDS:', this.nodes);

    const promises = arr.slice(0, -1).map(async (v, i) => {
      const [idString, amount] = v.split(' ');
      const id: string = idString.substring(2);
      // console.log(`ID:[${id}] => ${amount}`);
      return this.makeTransaction(+amount, this.nodes[+id].pk);
    });
    const values = await Promise.allSettled(promises);
    values.forEach((value) => {
      if (value.status === 'rejected') console.error('one ore more transaction promises failed', value.reason);
    });

    // console.log('../../5nodes/transactions' + this.id + '.txt');
  }

  protected readyToMakeTransactions(): boolean {
    console.log('My walletBalance:', this.myWallet.myWalletBalance());
    return this.myWallet.myWalletBalance() >= 100;
  }
}
