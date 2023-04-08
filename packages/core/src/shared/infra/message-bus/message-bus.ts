import JsonSocket from 'json-socket';
import net from 'net';
import { MessageType, nodeAddressInfo, nodeInfo } from '../../../core/domain/types';
import { handleError } from '../../../utils/sockets';
import { IMessageBus } from './message-bus.interface';

export class MessageBus implements IMessageBus {
  private server: net.Server;
  topicHandlers: { [topic: string]: (message: MessageType, sendResponse?: any) => Promise<any> } = {};

  constructor(myInfo: any) {
    const { port } = myInfo;
    this.server = net.createServer();
    this.server.listen(port);
    this.server.on('connection', (netSocket) => {
      const socket = new JsonSocket(netSocket);
      socket.on('message', (message) => {
        this.handleReceivedMessage(message, socket);
      });

      //   socket.on('end', () => {
      // console.log('client disconnected');
      //   });
    });

    this.server.on('error', (err) => {
      console.log('❌ Server error ❌', err);
      throw err;
    });
  }
  /**
   *  Improve abstraction by making message-bus keep track of nodes
   */
  public async publish(message: MessageType, nodes: nodeInfo[]) {
    console.log('Broadcasting message to', nodes.length, 'nodes');
    return Promise.all(
      nodes.map((node) => {
        const { host, port } = node;
        // console.log('Sending message to', host, port);
        this.sendOneMessageToNode(host, port, message);
      })
    );
  }

  private async sendOneMessageToNode(host: string, port: number, message: MessageType) {
    return new Promise<void>((resolve, reject) => {
      const socket = new JsonSocket(new net.Socket());
      socket.connect(port, host);
      socket.on('connect', () => {
        socket.sendEndMessage(message, handleError);
        resolve();
      });
      socket.on('error', (error) => {
        console.error('Error sending message:', error);
        reject(error);
      });
    });
  }

  private async handleReceivedMessage(message: MessageType, socket: JsonSocket) {
    if (!message.code) {
      console.log('no code in message');
      return;
    }

    const handler = this.topicHandlers[message.code];
    if (!handler) {
      console.log('no handler for message', message);
      return;
    }
    // TODO Better wrap sendEndMessage of sockets
    const reply = await handler(message, socket);
    if (reply) {
      socket.sendEndMessage(reply, handleError);
    }
  }

  async subscribe(
    topic: string,
    handler: ((message: any) => any) | ((message: any, socket: JsonSocket) => any)
  ): Promise<void> {
    // TODO support many handlers per topic
    console.log(`[MessageBus] Subscribed to topic ${topic}`);
    this.topicHandlers[topic] = handler;
  }

  public async requestReply(message: MessageType, node: nodeAddressInfo): Promise<any> {
    const { port, host } = node;
    return new Promise((resolve, reject) => {
      const socket = new JsonSocket(new net.Socket());
      socket.connect({ host, port });
      socket.on('connect', () => {
        socket.sendMessage(message, handleError);
        socket.on('message', (messageResponse) => {
          resolve(messageResponse);
          console.log('I received id: ', messageResponse);
        });
      });

      socket.on('error', (error) => {
        reject(error);
        console.log('There was an error connecting to server', error);
      });

      socket.on('close', () => {
        console.log('connection to bootstrap node closed');
      });
    });
  }
}
