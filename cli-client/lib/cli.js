#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = require("commander");
const transaction_1 = require("./commands/transaction");
const parser_1 = require("./utils/parser");
const balance_1 = require("./commands/balance");
const view_1 = require("./commands/view");
const program = new commander_1.Command();
// clear();
console.log(chalk_1.default.red(figlet_1.default.textSync('noobcash', { horizontalLayout: 'full' })));
program.name('NBC-cli').version('0.0.1').description('A NBC cli client for communication with the blockchain');
program
    .command('t')
    .description('Send money to someone')
    .argument('<recipient_node_id>', 'recipient node id') // The arguments may be <required> or [optional]
    .argument('<amount>', 'amount of NBC coins to send', parser_1.myParseInt)
    .action(transaction_1.transaction);
program.command('view').description('View transactions of last valid block in the blockchain').action(view_1.view);
program.command('balance').description('Show remaining balance of wallet').action(balance_1.balance);
program.parse(process.argv);
