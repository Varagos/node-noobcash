import { CliViewLastTransactions } from './../types';
import chalk from 'chalk';
import { CODES } from '../types';
import { makeRequest } from '../helpers';

import backend from '../backend.json';

export const view = async () => {
  const message: CliViewLastTransactions = {
    code: CODES.CLI_VIEW_LAST_TX,
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
