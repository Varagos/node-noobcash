import chalk from 'chalk';
import { CliNewTransactionMessage, CODES } from '../types';
import { makeRequest } from './../helpers';

import backend from '../backend.json';
/** The action handler gets passed a parameter
 * for each command-argument you declared, and
 *  two additional parameters which are the
 * parsed options and the command object itself.
 */
export const transaction = async (recipientAddress: string, amount: number) => {
  console.log('Hello first command');
  // talk to my backend

  const message: CliNewTransactionMessage = {
    code: CODES.CLI_MAKE_NEW_TX,
    recipientAddress,
    amount,
  };
  try {
    backend.nodes.forEach(async ({ host, port }) => {
      const response = await makeRequest(host, port, message);
      console.log(`Response from ${port}:`, response);
    });
  } catch (error) {
    console.log(chalk.red('❌ Error:', error));
  }
  // tell him to make transaction to recipientAddress, with amount
};
