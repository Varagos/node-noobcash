import JsonSocket from 'json-socket';
import net from 'net';
import { handleError } from './utils/sockets';

export const makeRequest = (message: any): any => {
  return new Promise((resolve, reject) => {
    const host = '127.0.0.1';
    const port = 8080;
    const socket = new JsonSocket(new net.Socket());
    socket.connect({ host, port });
    socket.on('connect', () => {
      socket.sendMessage(message, handleError);
      socket.on('message', (response) => {
        console.log('I received response: ', response);
        resolve(response);
      });
    });

    socket.on('error', (error) => {
      reject(error);
      //   console.log('There was an error connecting to server', error);
    });

    // socket.on('close', () => {
    //   console.log('connection to bootstrap node closed');
    // });
  });
};
