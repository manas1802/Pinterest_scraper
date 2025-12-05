import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { ProgressLog, Checkpoint } from '../types/pinterest';

export class ProgressTracker {
    private progressLogPath: string;
    private checkpointDir: string;
    private startTime: number;
    private urlStartTime: number;
    private totalUrls: number;
    private processedUrls: number;
    private successCount: number;
    private failureCount: number;
    private totalPins: number;

    constructor(outputDir: string, checkpointDir: string, totalUrls: number) {
        this.progressLogPath = path.join(outputDir, `progress_log_${this.getTimestamp()}.csv`);
        this.checkpointDir = checkpointDir;
        this.totalUrls = totalUrls;
        this.processedUrls = 0;
        this.successCount = 0;
        this.failureCount = 0;
        this.totalPins = 0;
        this.startTime = Date.now();
        this.urlStartTime = Date.now();
        
        this.initializeProgressLog();
        this.ensureCheckpointDir();
    }

    private initializeProgressLog(): void {
        const logDir = path.dirname(this.progressLogPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true });
        }
        
        if (!fs.existsSync(this.progressLogPath)) {
            const header = 'url,status,pins_collected,scrolls_performed,error_message,timestamp,duration\n';
            fs.writeFileSync(this.progressLogPath, header);
        }
    }

    private ensureCheckpointDir(): void {
        if (!fs.existsSync(this.checkpointDir)) {
            fs.mkdirSync(this.checkpointDir, { recursive: true });
        }
    }

    startURL(): void {
        this.urlStartTime = Date.now();
    }

    logURLComplete(log: ProgressLog): void {
        this.processedUrls++;
        
        if (log.status === 'success') {
            this.successCount++;
            this.totalPins += log.pinsCollected;
        } else {
            this.failureCount++;
        }

        const row = `"${log.url}","${log.status}",${log.pinsCollected},${log.scrollsPerformed},"${log.errorMessage}","${log.timestamp}","${log.duration}"\n`;
        fs.appendFileSync(this.progressLogPath, row);
        
        this.displayProgress(log);
    }

    private displayProgress(log: ProgressLog): void {
        const percentage = ((this.processedUrls / this.totalUrls) * 100).toFixed(1);
        const elapsed = Date.now() - this.startTime;
        const avgTimePerUrl = elapsed / this.processedUrls;
        const remainingUrls = this.totalUrls - this.processedUrls;
        const eta = this.formatDuration(avgTimePerUrl * remainingUrls);
        
        console.log(chalk.blue('\n' + '═'.repeat(80)));
        
        if (log.status === 'success') {
            console.log(chalk.green(`✓ URL ${this.processedUrls}/${this.totalUrls} completed`));
            console.log(chalk.white(`  Collected: ${log.pinsCollected} pins in ${log.duration}`));
            console.log(chalk.white(`  Scrolls performed: ${log.scrollsPerformed}`));
        } else {
            console.log(chalk.red(`✗ URL ${this.processedUrls}/${this.totalUrls} failed`));
            console.log(chalk.white(`  Error: ${log.errorMessage}`));
        }
        
        console.log(chalk.cyan(`  Progress: ${this.processedUrls}/${this.totalUrls} (${percentage}%)`));
        console.log(chalk.cyan(`  Total Pins: ${this.totalPins}`));
        console.log(chalk.cyan(`  Success Rate: ${this.successCount}/${this.processedUrls} (${((this.successCount/this.processedUrls)*100).toFixed(1)}%)`));
        console.log(chalk.cyan(`  ETA: ${eta}`));
        console.log(chalk.blue('═'.repeat(80)));
    }

    saveCheckpoint(lastProcessedIndex: number): void {
        const checkpoint: Checkpoint = {
            lastProcessedIndex,
            totalPinsCollected: this.totalPins,
            timestamp: new Date().toISOString(),
            successCount: this.successCount,
            failureCount: this.failureCount
        };

        const checkpointPath = path.join(this.checkpointDir, `checkpoint_${lastProcessedIndex}.json`);
        fs.writeFileSync(checkpointPath, JSON.stringify(checkpoint, null, 2));
        
        console.log(chalk.yellow(`\n💾 Checkpoint saved: ${lastProcessedIndex} URLs processed`));
    }

    loadCheckpoint(): Checkpoint | null {
        try {
            const files = fs.readdirSync(this.checkpointDir);
            const checkpointFiles = files.filter(f => f.startsWith('checkpoint_'));
            
            if (checkpointFiles.length === 0) return null;
            
            // Get the latest checkpoint
            checkpointFiles.sort((a, b) => {
                const numA = parseInt(a.match(/\d+/)?.[0] || '0');
                const numB = parseInt(b.match(/\d+/)?.[0] || '0');
                return numB - numA;
            });
            
            const latestCheckpoint = path.join(this.checkpointDir, checkpointFiles[0]);
            const data = fs.readFileSync(latestCheckpoint, 'utf-8');
            return JSON.parse(data);
        } catch (error) {
            return null;
        }
    }

    private formatDuration(ms: number): string {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) return `${days}d ${hours % 24}h`;
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    }

    getURLDuration(): string {
        return this.formatDuration(Date.now() - this.urlStartTime);
    }

    private getTimestamp(): string {
        return new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    }

    displayFinalSummary(): void {
        const totalDuration = this.formatDuration(Date.now() - this.startTime);
        
        console.log(chalk.blue('\n' + '═'.repeat(80)));
        console.log(chalk.blue.bold('                    FINAL SUMMARY'));
        console.log(chalk.blue('═'.repeat(80)));
        console.log(chalk.white(`  Total URLs Processed: ${this.processedUrls}/${this.totalUrls}`));
        console.log(chalk.green(`  ✓ Successful: ${this.successCount}`));
        console.log(chalk.red(`  ✗ Failed: ${this.failureCount}`));
        console.log(chalk.cyan(`  Total Pins Collected: ${this.totalPins}`));
        console.log(chalk.white(`  Total Duration: ${totalDuration}`));
        console.log(chalk.white(`  Average per URL: ${this.formatDuration((Date.now() - this.startTime) / this.processedUrls)}`));
        console.log(chalk.blue('═'.repeat(80) + '\n'));
    }
}