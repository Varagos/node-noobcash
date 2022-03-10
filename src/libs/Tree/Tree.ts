import Block from '../Block';

/**
 * Each TreeNode is a Block
 */
export class TreeNode {
  public key: string;
  public children: TreeNode[] = [];
  constructor(private value: Block, private parent: TreeNode | null = null) {
    this.key = value.currentHash;
  }

  get isLeaf(): boolean {
    return this.children.length === 0;
  }

  get hasChildren(): boolean {
    return !this.isLeaf;
  }
}

export class Tree {
  private root: TreeNode;
  constructor(value: Block) {
    this.root = new TreeNode(value);
  }

  *preOrderTraversal(node = this.root): IterableIterator<TreeNode> {
    yield node;
    if (node.children.length) {
      for (let child of node.children) {
        yield* this.preOrderTraversal(child);
      }
    }
  }

  *postOrderTraversal(node = this.root): IterableIterator<TreeNode> {
    if (node.children.length) {
      for (let child of node.children) {
        yield* this.postOrderTraversal(child);
      }
    }
    yield node;
  }

  insert(parentNodeKey: string, key: string, value: Block) {
    for (let node of this.preOrderTraversal()) {
      if (node.key === parentNodeKey) {
        node.children.push(new TreeNode(value, node));
        return true;
      }
    }
    return false;
  }

  remove(key: string) {
    for (let node of this.preOrderTraversal()) {
      const filtered = node.children.filter((c) => c.key !== key);
      if (filtered.length !== node.children.length) {
        node.children = filtered;
        return true;
      }
    }
    return false;
  }

  find(key: string): TreeNode | null {
    for (let node of this.preOrderTraversal()) {
      if (node.key === key) return node;
    }
    return null;
  }

  hasBranch(): boolean {
    for (let node of this.preOrderTraversal()) {
      if (node.children.length > 1) return true;
    }
    return false;
  }
}
