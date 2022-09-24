import JsonSocket from 'json-socket';
import { MessageType, nodeAddressInfo, nodeInfo } from '../../../core/domain/types';

export interface IMessageBus {
  subscribe(
    topic: string,
    handler: ((message: any) => any) | ((message: any, socket: JsonSocket) => any)
  ): Promise<void>;
  publish(message: MessageType, nodes: nodeAddressInfo[]): Promise<void[]>;
  requestReply(message: MessageType, node: nodeAddressInfo): Promise<any>;
}
