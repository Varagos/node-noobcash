import { walletRepo } from '../../infra/repos/wallet-repository';
import { ShowWalletBalanceUseCase } from './showWalletBalance';

const showWalletBalanceUseCase = new ShowWalletBalanceUseCase(walletRepo);

export { showWalletBalanceUseCase };
