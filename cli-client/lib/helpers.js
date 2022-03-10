"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRequest = void 0;
const json_socket_1 = __importDefault(require("json-socket"));
const net_1 = __importDefault(require("net"));
const sockets_1 = require("./utils/sockets");
const makeRequest = (message) => {
    return new Promise((resolve, reject) => {
        const host = '127.0.0.1';
        const port = 8080;
        const socket = new json_socket_1.default(new net_1.default.Socket());
        socket.connect({ host, port });
        socket.on('connect', () => {
            socket.sendMessage(message, sockets_1.handleError);
            socket.on('message', (response) => {
                console.log('I received response: ', response);
                resolve(response);
            });
        });
        socket.on('error', (error) => {
            reject(error);
            console.log('There was an error connecting to server', error);
        });
        socket.on('close', () => {
            console.log('connection to bootstrap node closed');
        });
    });
};
exports.makeRequest = makeRequest;
