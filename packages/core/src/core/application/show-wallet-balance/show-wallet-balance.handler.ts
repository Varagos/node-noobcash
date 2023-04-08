import { Wallet } from '../../domain';
import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';
import { IApplicationHandler } from '../definitions';

export class ShowWalletBalanceHandler implements IApplicationHandler {
  constructor(private myWallet: Wallet) {}
  handle(): any {
    return {
      response: this.myWallet.myWalletBalance(),
      // chainState: this.chainState.localStorage
    };
  }
}
