import { PinData } from '../types/pinterest';
import chalk from 'chalk';
import * as path from 'path';
import * as fs from 'fs';

export function exportToCSV(pinData: PinData[], filename: string = 'pinterest_data'): void {
    try {
        const headers = [
            'ID',
            'Title', 
            'Description',
            'Alt Text',
            'Link',
            'Image 170x URL',
            'Image 236x URL',
            'Image 474x URL',
            'Image 564x URL',
            'Image 736x URL',
            'Image Original URL',
            'Board URL'
        ];
        
        let csv = headers.map(h => `"${h}"`).join(',') + '\n';

        pinData.forEach((pin) => {
            const row = [
                pin.id || '',
                pin.title || 'Not Available',
                pin.description || ' ',
                pin.altText || 'Not Available',
                pin.link || 'Not Available',
                pin.image170x || '',
                pin.image236x || '',
                pin.image474x || '',
                pin.image564x || '',
                pin.image736x || '',
                pin.imageOriginal || '',
                pin.boardUrl || 'Not Available'
            ];

            csv += row.map(field => `"${String(field).replace(/"/g, '""')}"`).join(',') + '\n';
        });
        
        const outputPath = path.join(process.cwd(), `${filename}.csv`);
        fs.writeFileSync(outputPath, csv);
        
        console.log(chalk.green(`\n✓ CSV file saved to: ${outputPath}`));
        console.log(chalk.blue(`  Total pins exported: ${pinData.length}`));
        console.log(chalk.blue(`  Columns: ${headers.length}`));
    } catch (error) {
        console.error(chalk.red(`✗ Error exporting to CSV: ${(error as Error).message}`));
        throw error;
    }
}