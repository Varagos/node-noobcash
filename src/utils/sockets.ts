import JsonSocket from 'json-socket';
import net from 'net';
import { ChainResponse, ChainsRequestMessage } from '../libs/nodes/types';

export const handleError = (error: unknown) => {
  // will be called after the message has been sent
  if (error) console.error('error:', error);
};

export const requestChain = (host: string, port: number, message: ChainsRequestMessage): Promise<ChainResponse> => {
  return new Promise((resolve, reject) => {
    const socket = new JsonSocket(new net.Socket());
    socket.connect({ host, port });
    console.log('(0)-Connecting...');
    socket.on('connect', () => {
      console.log('(1)-Sending request msg...');
      socket.sendMessage(message, handleError);
    });

    socket.on('message', (chainResponse) => {
      console.log('(2)-Resolving request msg...');
      resolve(chainResponse);
    });

    socket.on('error', (error) => {
      console.log('There was an error connecting', error);
      console.log('(3)-Rejecting request msg...');
      reject(error);
    });
  });
};
