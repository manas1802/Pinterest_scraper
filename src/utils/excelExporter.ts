import { PinData } from '../types/pinterest';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';

export function exportToCSV(pinData: PinData[], filename: string = 'pinterest_data'): void {
    try {
        const headers = ['ID', 'Link', 'Image URL'];
        let csv = headers.map(h => `"${h}"`).join(',') + '\n';

        pinData.forEach((pin) => {
            const row = [
                pin.id || '',
                pin.link || 'Not Available',
                pin.imageOriginal || ''
            ];

            csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const outputPath = path.join(process.cwd(), `${filename}.csv`);
        fs.writeFileSync(outputPath, csv);
        
        console.log(chalk.green(`\n✓ CSV file saved to: ${outputPath}`));
        console.log(chalk.blue(`  Total pins exported: ${pinData.length}`));
    } catch (error) {
        console.error(chalk.red(`✗ Error exporting to CSV: ${(error as Error).message}`));
        throw error;
    }
}