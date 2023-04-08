import { MessageType } from '../domain/types';

export interface IApplicationHandler {
  handle(message: MessageType): Promise<any> | any;
}
