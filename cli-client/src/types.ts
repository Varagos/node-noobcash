export enum CODES {
  CLI_MAKE_NEW_TX = 'cliMakeTransaction',
  CLI_VIEW_LAST_TX = 'cliViewLastTransactions',
  CLI_SHOW_BALANCE = 'cliShowBalance',
}

/**
 * The END_MINING event is triggered when one of the nodes successfully mine the block.
 * It sets a flag to true which tells the other nodes on the network to stop mining
 * and start verifying the solution.
 */
export type CliNewTransactionMessage = {
  code: CODES.CLI_MAKE_NEW_TX;
  nodeId: string;
  amount: number;
};

export type CliViewLastTransactions = {
  code: CODES.CLI_VIEW_LAST_TX;
};

export type CliShowBalance = {
  code: CODES.CLI_SHOW_BALANCE;
};

export type MessageType = CliNewTransactionMessage | CliViewLastTransactions | CliShowBalance;
