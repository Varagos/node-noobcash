#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const figlet_1 = __importDefault(require("figlet"));
const commander_1 = require("commander");
const program = new commander_1.Command();
// clear();
console.log(chalk_1.default.red(figlet_1.default.textSync('noobcash', { horizontalLayout: 'full' })));
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
