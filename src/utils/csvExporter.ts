import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { PinData } from '../types/pinterest';

export class CSVExporter {
    private outputPath: string;
    private isInitialized: boolean = false;

    constructor(outputDir: string, filename: string) {
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        this.outputPath = path.join(outputDir, `${filename}.csv`);
    }

    private initialize(): void {
        if (!this.isInitialized) {
            const header = 'id,link,image_original_url,source_url,scraped_at,status\n';
            fs.writeFileSync(this.outputPath, header);
            this.isInitialized = true;
        }
    }

    appendPins(pins: PinData[]): void {
        this.initialize();
        
        if (pins.length === 0) return;

        const rows = pins.map(pin => {
            return `"${pin.id}","${pin.link}","${pin.imageOriginalUrl}","${pin.sourceUrl}","${pin.scrapedAt}","${pin.status}"\n`;
        });

        fs.appendFileSync(this.outputPath, rows.join(''));
    }

    getOutputPath(): string {
        return this.outputPath;
    }

    getPinCount(): number {
        if (!fs.existsSync(this.outputPath)) return 0;
        
        const content = fs.readFileSync(this.outputPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        return Math.max(0, lines.length - 1); // Subtract header
    }
}