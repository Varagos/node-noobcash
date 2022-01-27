import net from 'net';
import { Chain } from '..';
import { nodeInfo } from './types';
import JsonSocket from 'json-socket';
import { handleError } from '../../utils/sockets';

/**
 * A node has a wallet-1 pk
 */
// TODO complete class with basic functionalities
export default class BlockChainNode {
  private chain?: Chain;
  constructor(private bootstrapNodeInfo: nodeInfo, private myInfo: nodeInfo, private index?: number) {}

  setUpServerListener(port: number) {
    const server = net.createServer();

    server.listen(port, () => {
      console.log('server bound');
    });

    server.on('connection', (socket) => {
      console.log('client connected');
      socket.on('end', () => {
        console.log('client disconnected');
      });
      socket.write('Hello client, i am a worker\r\n');
    });

    server.on('error', (err) => {
      throw err;
    });
  }

  enterNodeToBlockChain() {
    let flag = false;
    // inform bootstrap node with my address info
    // receive my id from bootstrap node
    const { port, address } = this.bootstrapNodeInfo;
    const socket = new JsonSocket(new net.Socket());
    socket.connect({ host: address, port });
    socket.on('connect', () => {
      socket.sendMessage({ command: 'register', host: address, port }, handleError);
      socket.on('message', (message) => {
        console.log('The result is: ', message);
      });
    });

    socket.on('timeout', () => {
      console.log('timeout received');
      socket.end();
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
}
