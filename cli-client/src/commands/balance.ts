import { CliShowBalance } from './../types';
import chalk from 'chalk';
import { CODES } from '../types';
import { makeRequest } from '../helpers';

export const balance = async () => {
  const message: CliShowBalance = {
    code: CODES.CLI_SHOW_BALANCE,
  };
  try {
    const response = await makeRequest(message);
    console.log('Response:', response);
  } catch (error) {
    console.log(chalk.red('❌ Error:', error));
  }
  // tell him to make transaction to recipientAddress, with amount
};
