import fs from 'fs';
import path from 'path';
import net from 'net';
import YAML from 'yaml';
import { Chain, Wallet } from './libs';
import BootstrapNode from './libs/nodes/BootstrapNode';
import BlockChainNode from './libs/nodes/BlockChainNode';

const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);
alice.sendMoney(5, bob.publicKey);

console.log(Chain.instance);

const myArgs = process.argv.slice(2);
console.log('myArgs', myArgs);
const index = myArgs[0];
if (index === undefined) {
  console.error('Please provide node index');
  // process.exit(1);
}
const file = fs.readFileSync(path.join(__dirname, '../nodes.yaml'), { encoding: 'utf-8', flag: 'r' });
const config = YAML.parse(file);
const port = index ? config.NODES[+index].port : 5000;
// console.log(config);

if (+index === 0) {
  // Create Bootstrap node
  const bootstrapNodeInfo = config.NODES[+index];
  const bootstrapNode = new BootstrapNode(bootstrapNodeInfo);
  bootstrapNode.setUpServerListener();
} else {
  // Create Regular node
  const bootstrapNodeInfo = config.NODES[0];
  const nodeInfo = config.NODES[+index];
  const node = new BlockChainNode(bootstrapNodeInfo, nodeInfo);
  node.enterNodeToBlockChain();
}
//www.tutorialspoint.com/nodejs/nodejs_net_module.htm
// const server = net.createServer((connection) => {
//   console.log('client connected');
//   connection.on('end', function () {
//     console.log('client disconnected');
//   });

//   connection.write('Hello.');
//   connection.on('data', (data) => {
//     console.log(data.toString());
//   });
// });

// server.listen(3000, () => {
//   console.log(`Running on port ${server.address()}`);
// });
