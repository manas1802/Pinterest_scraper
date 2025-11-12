"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const pinterest_1 = __importDefault(require("./services/pinterest"));
const errorHandler_1 = __importDefault(require("./services/errorHandler"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const pinterestOptions = {
    websiteURL: process.env.websiteURL || "",
    email: process.env.email || "",
    password: process.env.password || "",
    scrollCount: parseInt(process.env.scrollCount) || 1
};
const pinterest = new pinterest_1.default(pinterestOptions.websiteURL);
pinterest.login(pinterestOptions.email, pinterestOptions.password, pinterestOptions.scrollCount).then((images) => {
    console.log(images);
}).catch((error) => {
    throw new errorHandler_1.default(error.message);
});
