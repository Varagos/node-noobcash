"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = void 0;
/** The action handler gets passed a parameter
 * for each command-argument you declared, and
 *  two additional parameters which are the
 * parsed options and the command object itself.
 */
const transaction = (recipientAddress, amount) => {
    console.log('Hello first command');
};
exports.transaction = transaction;
