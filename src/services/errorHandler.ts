import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

export default class ErrorHandler {
    private errorLogPath: string;

    constructor(outputDir: string) {
        this.errorLogPath = path.join(outputDir, `errors_${this.getTimestamp()}.log`);
        this.initializeErrorLog();
    }

    private initializeErrorLog(): void {
        const logDir = path.dirname(this.errorLogPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.errorLogPath)) {
            fs.writeFileSync(this.errorLogPath, `Error Log - ${new Date().toISOString()}\n${'='.repeat(80)}\n\n`);
        }
    }

    logError(context: string, error: Error | string, url?: string): void {
        const timestamp = new Date().toISOString();
        const errorMessage = error instanceof Error ? error.message : error;
        const stackTrace = error instanceof Error ? error.stack : '';
        
        const logEntry = `
[${timestamp}] ${context}
URL: ${url || 'N/A'}
Error: ${errorMessage}
${stackTrace ? `Stack: ${stackTrace}` : ''}
${'='.repeat(80)}
`;

        fs.appendFileSync(this.errorLogPath, logEntry);
        console.error(chalk.red(`✗ ${context}: ${errorMessage}`));
    }

    logWarning(message: string): void {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] WARNING: ${message}\n`;
        fs.appendFileSync(this.errorLogPath, logEntry);
        console.warn(chalk.yellow(`⚠ ${message}`));
    }

    logInfo(message: string): void {
        console.log(chalk.cyan(`ℹ ${message}`));
    }

    logSuccess(message: string): void {
        console.log(chalk.green(`✓ ${message}`));
    }

    private getTimestamp(): string {
        return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    }
}