"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleError = void 0;
const handleError = (error) => {
    // will be called after the message has been sent
    if (error)
        console.error('error:', error);
};
exports.handleError = handleError;
