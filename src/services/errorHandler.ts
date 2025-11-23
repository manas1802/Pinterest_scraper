import chalk from "chalk";

export default class PinterestError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "PinterestError";
        console.error(chalk.red(`[PinterestError] ${message}`));
    }
}