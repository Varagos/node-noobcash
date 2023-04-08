import { Wallet } from '../../../domain';
import { IChainState } from '../../chain-state/chain-state.interface';

export interface IWalletRepository {
  getWallet(): Wallet;
}
export class WalletRepository implements IWalletRepository {
  private wallet: Wallet;
  constructor(chainState: IChainState) {
    this.wallet = new Wallet(chainState);
  }
  getWallet(): Wallet {
    return this.wallet;
  }
}
