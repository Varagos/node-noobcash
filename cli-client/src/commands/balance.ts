import { CliShowBalance } from './../types';
import chalk from 'chalk';
import { CODES } from '../types';
import { makeRequest } from '../helpers';
import backend from '../backend.json';

export const balance = async () => {
  const message: CliShowBalance = {
    code: CODES.CLI_SHOW_BALANCE,
  };
  try {
    const host = '127.0.0.1';
    const port = 8080;
    backend.nodes.forEach(async ({ host, port }) => {
      const response = await makeRequest(host, port, message);
      console.log(`Response from ${port}:`, response);
    });
  } catch (error) {
    console.log(chalk.red('❌ Error:', error));
  }
  // tell him to make transaction to recipientAddress, with amount
};
