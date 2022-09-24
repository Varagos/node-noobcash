import { chainState } from '../..';
import { WalletRepository } from './wallet-repository';

const walletRepo = new WalletRepository(chainState);

export { walletRepo };
