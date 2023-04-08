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
import { ShowWalletBalanceHandler } from '../../application/show-wallet-balance/show-wallet-balance.handler';
import { ViewLastTransactionsHandler } from '../../application/view-last-transactions/view-last-transactions.handler';
import { MakeNewTransactionHandler } from '../../application/make-transaction/make-transaction.handler';
import { ReceiveBlockHandler } from '../../application/receive-block/receive-block.handler';
import { ReceiveTransactionHandler } from '../../application/receive-transaction/receive-transaction.handler';
import { GetChainHandler } from '../../application/get-chain/get-chain.handler';

/**
 * A node has a wallet-1 pk
 */
export default class BlockChainNode {
  protected chain: Chain = Chain.instance;
  protected id?: number;
  protected nodes: nodeInfo[] = [];
  protected myWallet: Wallet;
  private executedTXs: boolean = false;

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
    this.messageBus.subscribe(CODES.INITIALIZE_CHAIN, async (message: any) => {
      await this.handleChainInitialization(message);
      // We subscribe to regular messages after we have the chain
      this.subscribeRegularNodeMessages();
    });
    return this;
  }

  protected subscribeRegularNodeMessages() {
    console.log('subscribing this chain is::', this.chain);
    const receiveTransactionHandler = new ReceiveTransactionHandler(
      this.chain,
      this.nodes,
      this.messageBus,
      this.chainState
    );
    /**
     * Receive transaction from other nodes
     */
    this.messageBus.subscribe(CODES.NEW_TRANSACTION, receiveTransactionHandler.handle.bind(receiveTransactionHandler));
    /**
     * Receive block from other nodes
     */
    const receiveBlockHandler = new ReceiveBlockHandler(
      this.chain,
      this.myWallet,
      this.nodes,
      this.messageBus,
      this.chainState
    );
    this.messageBus.subscribe(CODES.BLOCK_FOUND, receiveBlockHandler.handle.bind(receiveBlockHandler));

    /**
     * Receive request for chain
     */
    const getChainHandler = new GetChainHandler(this.chain);
    this.messageBus.subscribe(CODES.CHAINS_REQUEST, getChainHandler.handle.bind(getChainHandler));

    /**
     * Receive request to make new transaction
     */
    const makeNewTransactionHandler = new MakeNewTransactionHandler(this.myWallet, this.nodes, this.messageBus);
    this.messageBus.subscribe(CODES.CLI_MAKE_NEW_TX, makeNewTransactionHandler.handle.bind(makeNewTransactionHandler));

    /**
     * Receive request to view last transactions
     */
    const viewLastTransactionsHandler = new ViewLastTransactionsHandler(this.chain);
    this.messageBus.subscribe(
      CODES.CLI_VIEW_LAST_TX,
      viewLastTransactionsHandler.handle.bind(viewLastTransactionsHandler)
    );

    /**
     * Receive request to show wallet balance
     */
    const showWalletBalanceHandler = new ShowWalletBalanceHandler(this.myWallet);
    this.messageBus.subscribe(CODES.CLI_SHOW_BALANCE, showWalletBalanceHandler.handle.bind(showWalletBalanceHandler));
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

  protected async makeTransaction(amount: number, recipient: string) {
    const index = this.nodes.findIndex((node) => node.pk === recipient);
    const handler = new MakeNewTransactionHandler(this.myWallet, this.nodes, this.messageBus);
    return handler.handle({ amount, nodeId: index.toString(), code: CODES.CLI_MAKE_NEW_TX });
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
