import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';

export class ShowWalletBalanceUseCase {
  constructor(private walletRepository: IWalletRepository) {}
  execute(): number {
    const wallet = this.walletRepository.getWallet();
    const balance = wallet.myWalletBalance();
    return balance;
  }
}
