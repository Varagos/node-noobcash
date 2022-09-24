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
  const node = new BootstrapNode(bootstrapNodeInfo, chainState, totalNodes, messageBus).setUpServerListener();

  // setTimeout(() => {
  //   node.readAndExecuteMyTransactions();
  // }, 5 * 1000);
};

const setupRegularNode = (bootstrapNodeInfo: any, nodeInfo: any, chainState: InMemChainState) => {
  const messageBus = new MessageBus(nodeInfo);
  const node = new BlockChainNode(bootstrapNodeInfo, nodeInfo, chainState, messageBus)
    .setUpServerListener()
    .enterNodeToBlockChain();

  // setTimeout(() => {
  //   node.readAndExecuteMyTransactions();
  // }, 5 * 1000);
};
import { config, bootstrapNodeInfo, totalNodes, index } from '../../config';

if (+index === 0) {
  // Create Bootstrap node

  setupBootstrapNode(bootstrapNodeInfo, chainState, totalNodes);
} else {
  // Create Regular node
  const nodeInfo = config.NODES[+index];
  setupRegularNode(bootstrapNodeInfo, nodeInfo, chainState);
}
