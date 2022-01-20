import * as crypto from 'crypto';
import express from 'express';
import { Chain, Wallet } from './libs';

const satoshi = new Wallet();
const bob = new Wallet();
const alice = new Wallet();

satoshi.sendMoney(50, bob.publicKey);
bob.sendMoney(23, alice.publicKey);
alice.sendMoney(5, bob.publicKey);

console.log(Chain.instance);
const app = express();
const port = 5000;
app.get('/', (_, res) => {
  res.status(200).send('OK');
});

app.listen(port, () => console.log(`Running on port ${port}`));
