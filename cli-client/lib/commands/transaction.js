"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transaction = void 0;
const chalk_1 = __importDefault(require("chalk"));
const types_1 = require("../types");
const helpers_1 = require("./../helpers");
const backend_json_1 = __importDefault(require("../backend.json"));
/** The action handler gets passed a parameter
 * for each command-argument you declared, and
 *  two additional parameters which are the
 * parsed options and the command object itself.
 */
const transaction = (nodeId, amount) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Hello first command');
    // talk to my backend
    const message = {
        code: types_1.CODES.CLI_MAKE_NEW_TX,
        nodeId,
        amount,
    };
    try {
        backend_json_1.default.nodes.forEach(({ host, port }) => __awaiter(void 0, void 0, void 0, function* () {
            const response = yield (0, helpers_1.makeRequest)(host, port, message);
            console.log(`Response from ${port}:`, response);
        }));
    }
    catch (error) {
        console.log(chalk_1.default.red('❌ Error:', error));
    }
    // tell him to make transaction to recipientAddress, with amount
});
exports.transaction = transaction;
