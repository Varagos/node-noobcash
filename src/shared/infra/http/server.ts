import fs from 'fs';
import path from 'path';
import YAML from 'yaml';
import { chainState } from '../../../core/infra';
import { InMemChainState } from '../../../core/infra/chain-state/ChainState';
import { MessageBus } from '../message-bus/message-bus';
import BootstrapNode from '../../../core/infra/nodes/BootstrapNode';
import BlockChainNode from '../../../core/infra/nodes/Node';

const setupBootstrapNode = (bootstrapNodeInfo: any, chainState: InMemChainState, totalNodes: number) => {
  const messageBus = new MessageBus(bootstrapNodeInfo);
  const bootstrapNode = new BootstrapNode(bootstrapNodeInfo, chainState, totalNodes, messageBus);
  bootstrapNode.setUpServerListener();
};

const setupRegularNode = (bootstrapNodeInfo: any, nodeInfo: any, chainState: InMemChainState) => {
  const messageBus = new MessageBus(nodeInfo);
  const node = new BlockChainNode(bootstrapNodeInfo, nodeInfo, chainState, messageBus);
  node.setUpServerListener();
  node.enterNodeToBlockChain();
};

const myArgs = process.argv.slice(2);
console.log('myArgs', myArgs);
const index = myArgs[0];
if (index === undefined) {
  console.error('Please provide node index');
  process.exit(1);
}
let fileName: string = 'group-view-local';

export const totalNodes: number = 5;

if (process.env.NODE_ENV === 'production') {
  fileName = totalNodes === 5 ? 'group-view' : 'group-view-10';
}
console.log('process.env', process.env.NODE_ENV);

const file = fs.readFileSync(path.join(__dirname, `../../../../${fileName}.yaml`), { encoding: 'utf-8', flag: 'r' });
const config = YAML.parse(file);
// const port = index ? config.NODES[+index].port : 5000;
// console.log(config);

const bootstrapNodeInfo = config.NODES[0];
if (+index === 0) {
  // Create Bootstrap node

  setupBootstrapNode(bootstrapNodeInfo, chainState, totalNodes);
} else {
  // Create Regular node
  const nodeInfo = config.NODES[+index];
  setupRegularNode(bootstrapNodeInfo, nodeInfo, chainState);
}
