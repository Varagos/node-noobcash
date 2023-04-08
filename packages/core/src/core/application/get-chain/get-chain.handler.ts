import { Chain, Wallet } from '../../domain';
import { ChainResponse } from '../../domain/types';
import { IWalletRepository } from '../../infra/repos/wallet-repository/wallet-repository';
import { IApplicationHandler } from '../definitions';

export class GetChainHandler implements IApplicationHandler {
  constructor(private chain: Chain) {}
  handle() {
    console.log('ChainsRequest');
    const msg: ChainResponse = { blockChain: this.chain };
    return msg;
  }
}
