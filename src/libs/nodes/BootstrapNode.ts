import BlockChainNode from './BlockChainNode';
import net from 'net';
import { nodeInfo, MessageType, nodeAddressInfo, CODES, InitializeChainMessage, MESSAGE_TYPES } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';
import { Chain } from '..';

// TODO Bootstrap node creates genesis block
// with previous hash=1, nonce=0,
// list of transactions has 1 transaction that gives bootstrapNode 100*n NBC coins from wallet address 0
// only block that doesn't get validated

export default class BootstrapNode extends BlockChainNode {
  /**
   * Όταν εισαχθούν όλοι οι κόμβοι, ο bootstrap κάνει broadcast σε όλους τα ζεύγη ip address/port
   * καθώς και τα public keys των wallets όλων των κόμβων που συμμετέχουν στο σύστημα
   */
  constructor(myNodeAddressInfo: nodeAddressInfo, private totalExpectedNodes = 5) {
    super(myNodeAddressInfo, myNodeAddressInfo);
    const pk = this.myWallet.publicKey;
    const myNodeInfo = {
      ...myNodeAddressInfo,
      pk,
    };
    this.nodes.push(myNodeInfo);
    this.chain = Chain.initialize(pk, totalExpectedNodes);
  }

  /** Override listener function
   * Bootstrap has extra events he listens to
   * (initialization events)
   */
  override setUpServerListener(): void {
    const { port } = this.myInfo;

    const server = net.createServer();

    server.listen(port, () => {
      console.log(`Bootstrap server created listening port: ${port}`);
    });

    server.on('connection', (netSocket) => {
      const socket = new JsonSocket(netSocket);
      console.log('client connected');

      socket.on('message', (message) => {
        console.log(`Received message from client`, message);
        const response = this.handleReceivedMessage(message);
        socket.sendEndMessage(response, handleError);
      });
      socket.on('end', () => {
        console.log('client disconnected');
      });
    });

    server.on('error', (err) => {
      throw err;
    });
  }

  private handleReceivedMessage(message: MessageType) {
    switch (message.code) {
      case CODES.REGISTER:
        const { host, port, pk } = message;
        this.nodes.push({ host, port, pk });
        const nodeIndex = this.nodes.length - 1;
        if (this.isFinalNode(nodeIndex)) {
          console.log('all nodes entered!');
          setTimeout(this.broadcastNodesInfo.bind(this), 1000);
        }
        return { id: nodeIndex };
      default:
        throw new Error(`unknown command ${message.code}`);
    }
  }

  // sends to each node, info of all Nodes
  private broadcastNodesInfo() {
    const msg: InitializeChainMessage = {
      type: MESSAGE_TYPES.BROADCAST,
      code: CODES.INITIALIZE_CHAIN,
      nodes: this.nodes,
      blockChain: this.chain,
    };
    console.log('this nodes', this.nodes);
    for (const node of this.nodes) {
      if (node.pk === this.myWallet.publicKey) continue;

      const socket = new JsonSocket(new net.Socket());
      socket.connect(node.port, node.host);
      socket.on('connect', () => {
        socket.sendEndMessage(msg, handleError);
      });
      socket.on('error', (error) => {
        console.error(error);
      });
      // TODO implement
    }
  }

  private isFinalNode = (nodeIndex: number) => nodeIndex === this.totalExpectedNodes - 1;
}
