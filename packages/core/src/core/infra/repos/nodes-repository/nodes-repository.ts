import { nodeAddressInfo, nodeInfo } from '../../../domain/types';

export class NetworkNodesRepository {
  private id?: number;
  //   private nodes: nodeInfo[] = [];

  //   private readonly bootstrapNodeInfo: nodeAddressInfo;
  //   protected readonly myInfo: nodeAddressInfo;

  // TODO keep list with all nodes in order to interchange msgs
  constructor(
    private nodes: nodeInfo[] = [],
    private readonly bootstrapNodeInfo: nodeAddressInfo,
    private readonly myInfo: nodeAddressInfo
  ) {}

  addNode(node: nodeInfo): void {
    this.nodes.push(node);
  }

  getNodes(): nodeInfo[] {
    return this.nodes;
  }
}
