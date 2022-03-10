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
exports.view = void 0;
const chalk_1 = __importDefault(require("chalk"));
const types_1 = require("../types");
const helpers_1 = require("../helpers");
const view = () => __awaiter(void 0, void 0, void 0, function* () {
    const message = {
        code: types_1.CODES.CLI_VIEW_LAST_TX,
    };
    try {
        const response = yield (0, helpers_1.makeRequest)(message);
        console.log('Response:', response);
    }
    catch (error) {
        console.log(chalk_1.default.red('❌ Error:', error));
    }
    // tell him to make transaction to recipientAddress, with amount
});
exports.view = view;
