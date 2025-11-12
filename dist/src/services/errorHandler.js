"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
class PinterestError extends Error {
    constructor(message) {
        super(message);
        this.name = "PinterestError";
        throw Error(chalk_1.default.red(message));
    }
}
exports.default = PinterestError;
