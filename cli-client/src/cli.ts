#!/usr/bin/env node

import dotenv from 'dotenv';
dotenv.config();
import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import { Command } from 'commander';
import { transaction } from './commands/transaction';
import { myParseInt } from './utils/parser';
const program = new Command();

// clear();
console.log(chalk.red(figlet.textSync('noobcash', { horizontalLayout: 'full' })));

program.name('NBC-cli').version('0.0.1').description('A NBC cli client for communication with the blockchain');

program
  .command('t')
  .description('Send money to someone')
  .argument('<recipient_address>', "recipient's wallet address") // The arguments may be <required> or [optional]
  .argument('<amount>', 'amount of NBC coins to send', myParseInt)
  .action(transaction);

program.parse(process.argv);
