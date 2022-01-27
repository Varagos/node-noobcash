import BlockChainNode from './BlockChainNode';
import net from 'net';
import { nodeInfo } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';

export default class BootstrapNode extends BlockChainNode {
  /**
   * Όταν εισαχθούν όλοι οι κόμβοι, ο bootstrap κάνει broadcast σε όλους τα ζεύγη ip address/port
   * καθώς και τα public keys των wallets όλων των κόμβων που συμμετέχουν στο σύστημα
   */
  constructor(private myNodeInfo: nodeInfo, private nodes: nodeInfo[] = [myNodeInfo]) {
    super(myNodeInfo, myNodeInfo, 0);
  }

  override setUpServerListener(): void {
    const { port } = this.myNodeInfo;

    const server = net.createServer();

    server.listen(port, () => {
      console.log(`Bootstrap server created listening port: ${port}`);
    });

    server.on('connection', (netSocket) => {
      const socket = new JsonSocket(netSocket);
      console.log('client connected');

      socket.on('message', (message) => {
        console.log(`Received message from client`, message);
        const response = this.#handleReceivedMessage(message);
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

  #handleReceivedMessage(message: any) {
    if (message.command === 'register') {
      const { host: address, port } = message;
      this.nodes.push({ address, port });
      const nodeIndex = this.nodes.length - 1;
      return { id: nodeIndex };
    }
  }
}
