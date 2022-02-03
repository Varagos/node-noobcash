#!/usr/bin/env node

import chalk from 'chalk';
import clear from 'clear';
import figlet from 'figlet';
import path from 'path';
import { Command } from 'commander';
const program = new Command();

// clear();
console.log(chalk.red(figlet.textSync('noobcash', { horizontalLayout: 'full' })));

program.name('noobcash-client').version('0.0.1').description("An example CLI for ordering pizza's");

program
  .command('split')
  .description('Split a string into substrings')
  .argument('<string>', 'string to split')
  .option('--first', 'display just the first substring')
  .option('-s, --separator <char>', 'separator character', ',')
  .action((str, options) => {
    const limit = options.first ? 1 : undefined;
    console.log(program.opts());
    console.log(options);
    console.log(str.split(options.separator, limit));
  });

program.parse(process.argv);
