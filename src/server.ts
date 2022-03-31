import fs from 'fs';
const http = require('http');
import path from 'path';
import net from 'net';
import YAML from 'yaml';
import { Chain, Wallet } from './libs';
import BootstrapNode from './libs/nodes/BootstrapNode';
import BlockChainNode from './libs/nodes/Node';
import { chainState } from './services';

const myArgs = process.argv.slice(2);
console.log('myArgs', myArgs);
const index = myArgs[0];
if (index === undefined) {
  console.error('Please provide node index');
  process.exit(1);
}
let fileName: string = 'group-view-local';

export const totalNodes: number = 10;
if (process.env.NODE_ENV === 'production') {
  fileName = totalNodes === 5 ? 'group-view' : 'group-view-10';
}
console.log('process.env', process.env.NODE_ENV);

const file = fs.readFileSync(path.join(__dirname, `../${fileName}.yaml`), { encoding: 'utf-8', flag: 'r' });
const config = YAML.parse(file);
// const port = index ? config.NODES[+index].port : 5000;
// console.log(config);

const bootstrapNodeInfo = config.NODES[0];
if (+index === 0) {
  // Create Bootstrap node
  const bootstrapNode = new BootstrapNode(bootstrapNodeInfo, chainState, totalNodes);
  bootstrapNode.setUpServerListener();
} else {
  // Create Regular node
  const nodeInfo = config.NODES[+index];
  const node = new BlockChainNode(bootstrapNodeInfo, nodeInfo, chainState);
  node.setUpServerListener();
  node.enterNodeToBlockChain();
}
