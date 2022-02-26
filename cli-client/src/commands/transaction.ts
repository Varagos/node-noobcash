/** The action handler gets passed a parameter
 * for each command-argument you declared, and
 *  two additional parameters which are the
 * parsed options and the command object itself.
 */
export const transaction = (recipientAddress: string, amount: number) => {
  console.log('Hello first command');
  // talk to my backend

  // tell him to make transaction to recipientAddress, with amount
};
