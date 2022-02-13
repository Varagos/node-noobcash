"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.myParseInt = void 0;
const commander_1 = require("commander");
const myParseInt = (value, dummyPrevious) => {
    console.log(value, typeof value);
    // parseInt takes a string and a radix
    // const parsedValue = parseInt(value, 10);
    const parsedValue = parseFloat(value);
    console.log(parsedValue, typeof parsedValue);
    if (isNaN(parsedValue)) {
        throw new commander_1.InvalidArgumentError('Not a number.');
    }
    return parsedValue;
};
exports.myParseInt = myParseInt;
