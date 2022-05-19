## Get started

To install yarn do

```
npm install -g yarn
```

```bash
# to use yarn, npm install yarn -g
yarn install # or npm install

# Start bootstrap node
yarn start:dev 0 # or npm run start:dev 0

# On a new terminal, start a client node
yarn start:dev 1
```

#### Some reading and refs

the output of the cryptographic hash function is called a hash or a hash digest.  
refs  
[1] https://bitcoin.stackexchange.com/questions/49549/when-do-miners-stop-waiting-for-new-transactions  
[2] https://www.investopedia.com/terms/n/nonce.asp  
[3] What is Nonce? https://pintu.co.id/en/academy/post/what-is-nonce-and-mining-difficulty
[4] https://www.youtube.com/watch?v=HneatE69814

<hr/>
Cool package

https://www.npmjs.com/package/pm2  
https://firecamp.io/

### Reading on UTXOs

[What-the-heck-is-utxo](https://medium.com/bitbees/what-the-heck-is-utxo-ca68f2651819)
[Are transactions signed?](https://bitcoin.stackexchange.com/questions/106039/are-utxos-signed-with-a-private-key)

## Usage

Capacity and difficulty are optional. Capacity equals the number of transactions per block,
while difficulty the number of required zeros for a successful mine.

```bash
yarn start:dev <NODE_INDEX> [CAPACITY] [DIFFICULTY]

# or
sh test.sh [CAPACITY] [DIFFICULTY]
```

## Roadmap
- Replace setImmediate with new worker_threads module
