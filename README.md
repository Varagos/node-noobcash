# Noobcash

Noobcash is a simple implementation of a blockchain using TypeScript. It includes a core blockchain application and a CLI application that allows users to interact with the blockchain.

# Get started

```bash
# Or npm install
yarn

yarn build

./start_nodes

# Otherwise
# Start bootstrap node
yarn start:dev 0 # or npm run start:dev 0

# On a new terminal, start a client node
yarn start:dev 1
```

## Hashing

In a blockchain, hashing is used to create a unique digital fingerprint of each block in the chain. This fingerprint is created by running the block's data through a cryptographic hash function. In Bitcoin, the hash function used is SHA-256.

## Nonce

A nonce is a random number that is added to a block's data before it is hashed. The purpose of the nonce is to change the block's hash so that it meets a certain requirement. In Bitcoin, the requirement is that the hash must start with a certain number of zeroes. The nonce is incremented until the requirement is met.

## Mining Difficulty

Mining difficulty is a measure of how hard it is to find a valid block hash. It is adjusted periodically by the Bitcoin network to ensure that blocks are being created at a steady rate. As more miners join the network, the difficulty increases to maintain the rate.

## UTXOs

UTXOs (unspent transaction outputs) are the outputs of transactions that have not yet been spent. In a blockchain, each block contains a list of UTXOs that are available for spending. When a new transaction is created, it references one or more UTXOs as its inputs and creates new UTXOs as its outputs. This process ensures that all transactions on the blockchain are valid and that there is no double-spending.

In simple terms, a UTXO is the digital equivalent of a coin or a bill in traditional currency. They represent the unspent balance of a transaction.

For example, suppose Alice has 10 bitcoins in her wallet, and she wants to send 5 bitcoins to Bob. To do this, she creates a transaction with two outputs:

- An output of 5 bitcoins to Bob's address
- An output of 5 bitcoins back to her own address (this is known as the "change" output)

When Alice broadcasts this transaction to the network, the 10 bitcoins in her wallet are spent and the UTXO for her wallet address is now marked as spent. However, two new UTXOs are created:

- A UTXO of 5 bitcoins associated with Bob's address
- A UTXO of 5 bitcoins associated with Alice's address

Now, if Alice wants to send more bitcoins in the future, she can use the UTXO associated with her address to create a new transaction. And if Bob wants to spend the bitcoins he received from Alice, he can use the UTXO associated with his address to create a new transaction.

For more information on how Noobcash implements these concepts, please refer to the documentation and code.

#### Some reading and refs

refs  
[1] https://bitcoin.stackexchange.com/questions/49549/when-do-miners-stop-waiting-for-new-transactions  
[2] https://www.investopedia.com/terms/n/nonce.asp  
[3] What is Nonce? https://pintu.co.id/en/academy/post/what-is-nonce-and-mining-difficulty  
[4] https://www.youtube.com/watch?v=HneatE69814

<hr/>

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
