import fs from 'fs';
import path from 'path';
import YAML from 'yaml';

const myArgs = process.argv.slice(2);
console.log('myArgs', myArgs);
const index = myArgs[0];
if (index === undefined) {
  console.error('Please provide node index');
  process.exit(1);
}
let fileName: string = 'group-view-local';

const totalNodes: number = 5;

if (process.env.NODE_ENV === 'production') {
  fileName = totalNodes === 5 ? 'group-view' : 'group-view-10';
}
console.log('process.env', process.env.NODE_ENV);

const file = fs.readFileSync(path.join(__dirname, `../../../../${fileName}.yaml`), { encoding: 'utf-8', flag: 'r' });
const config = YAML.parse(file);
// const port = index ? config.NODES[+index].port : 5000;
// console.log(config);

const bootstrapNodeInfo = config.NODES[0];
export { config, bootstrapNodeInfo, totalNodes, index };
