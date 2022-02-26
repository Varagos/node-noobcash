import Chain from '../Chain';

export type nodeAddressInfo = {
  host: string;
  port: number;
};
export type nodeInfo = nodeAddressInfo & {
  pk: string;
};

export enum MESSAGE_TYPES {
  BOOTSTRAP = 'bootstrap',
  BROADCAST = 'broadcast',
}

export enum CODES {
  REGISTER = 'register',
  INITIALIZE_CHAIN = 'initializeChain',
}

// Have a type broacast / bootstrap
// and code for extra info(e.g. register, transaction, mined)
export type RegisterNodeMessage = {
  type: MESSAGE_TYPES.BOOTSTRAP;
  code: CODES.REGISTER;
} & nodeInfo;

export type InitializeChainMessage = {
  type: MESSAGE_TYPES.BROADCAST;
  code: CODES.INITIALIZE_CHAIN;
  nodes: nodeInfo[];
  blockChain: Chain;
};

export type MessageType = RegisterNodeMessage | InitializeChainMessage;
