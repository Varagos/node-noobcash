import { CliViewLastTransactions } from './../types';
import chalk from 'chalk';
import { CODES } from '../types';
import { makeRequest } from '../helpers';

export const view = async () => {
  const message: CliViewLastTransactions = {
    code: CODES.CLI_VIEW_LAST_TX,
  };
  try {
    const response = await makeRequest(message);
    console.log('Response:', response);
  } catch (error) {
    console.log(chalk.red('❌ Error:', error));
  }
  // tell him to make transaction to recipientAddress, with amount
};
