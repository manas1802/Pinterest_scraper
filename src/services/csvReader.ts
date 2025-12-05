import * as fs from 'fs';
import * as path from 'path';
import { URLInput } from '../types/pinterest';

export class CSVReader {
    static readURLs(csvPath: string): URLInput[] {
        if (!fs.existsSync(csvPath)) {
            throw new Error(`CSV file not found: ${csvPath}`);
        }

        const content = fs.readFileSync(csvPath, 'utf-8');
        const lines = content.split('\n').filter(line => line.trim());
        
        // Skip header
        const dataLines = lines.slice(1);
        
        const urls: URLInput[] = [];
        
        for (let i = 0; i < dataLines.length; i++) {
            const line = dataLines[i].trim();
            if (!line) continue;
            
            // Support both single column (just URL) and legacy format (URL,scroll_count)
            const url = line.split(',')[0].trim();
            
            if (url && url.startsWith('http')) {
                urls.push({ url });
            } else {
                console.warn(`Skipping invalid line ${i + 2}: ${line}`);
            }
        }
        
        return urls;
    }

    static validateCSV(csvPath: string): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        if (!fs.existsSync(csvPath)) {
            errors.push(`CSV file not found: ${csvPath}`);
            return { valid: false, errors };
        }

        try {
            const urls = this.readURLs(csvPath);
            
            if (urls.length === 0) {
                errors.push('No valid URLs found in CSV');
            }
            
            return { valid: errors.length === 0, errors };
        } catch (error) {
            errors.push(`Error reading CSV: ${(error as Error).message}`);
            return { valid: false, errors };
        }
    }
}