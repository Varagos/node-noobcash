import { Chain, Wallet } from '../../domain';
import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';
import { IApplicationHandler } from '../definitions';

export class ViewLastTransactionsHandler implements IApplicationHandler {
  constructor(private chain: Chain) {}
  handle(): any {
    console.log('handle view last transactions');

    const lastTransactions = this.chain.lastBlock.transactions;
    return { response: lastTransactions, error: null };
  }
}
