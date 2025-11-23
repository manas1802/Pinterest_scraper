import Pinterest from "./services/pinterest";
import { PinterestDeclaration } from './types/pinterest';
import PinterestError from "./services/errorHandler";
import { exportToCSV } from './utils/excelExporter';
import dotenv from "dotenv";
import chalk from "chalk";

dotenv.config();

async function main() {
    try {
        const pinterestOptions: PinterestDeclaration = {
            websiteURL: process.env.websiteURL as string || "",
            email: process.env.email as string || "",
            password: process.env.password as string || "",
            scrollCount: parseInt(process.env.scrollCount as string) || 50
        };

        console.log(chalk.blue('='.repeat(60)));
        console.log(chalk.blue('Pinterest Scraper - Simplified'));
        console.log(chalk.blue('='.repeat(60)));
        console.log(chalk.cyan(`Target URL: ${pinterestOptions.websiteURL}`));
        console.log(chalk.cyan(`Scroll Count: ${pinterestOptions.scrollCount}`));
        console.log(chalk.blue('='.repeat(60)));

        const pinterest = new Pinterest(pinterestOptions.websiteURL);

        const pinData = await pinterest.login(
            pinterestOptions.email, 
            pinterestOptions.password, 
            pinterestOptions.scrollCount
        );

        console.log(chalk.blue('\n' + '='.repeat(60)));
        console.log(chalk.green('✓ Scraping completed!'));
        console.log(chalk.blue('='.repeat(60)));
        
        if (pinData && pinData.length > 0) {
            console.log(chalk.cyan(`\nCollected ${pinData.length} pins`));
            
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
            const filename = `pinterest_simple_${timestamp}`;
            
            exportToCSV(pinData, filename);
            
            console.log(chalk.yellow('\n📁 File saved in:'));
            console.log(chalk.white(`   ${process.cwd()}`));
            console.log(chalk.yellow('\n📄 File:'));
            console.log(chalk.white(`   ${filename}.csv`));
            
            console.log(chalk.cyan('\n📊 Preview (first 3):'));
            pinData.slice(0, 3).forEach((pin, index) => {
                console.log(chalk.yellow(`\n[${index + 1}]`));
                console.log(chalk.white(`  ID: ${pin.id}`));
                console.log(chalk.white(`  Link: ${pin.link}`));
                console.log(chalk.white(`  Image: ${pin.imageOriginal.substring(0, 60)}...`));
            });
        } else {
            console.log(chalk.yellow('⚠ No pins collected'));
        }
        
        console.log(chalk.blue('\n' + '='.repeat(60)));
        console.log(chalk.green('Done!'));
        console.log(chalk.blue('='.repeat(60) + '\n'));
        
    } catch (error) {
        console.error(chalk.red('✗ Error:'), error);
        process.exit(1);
    }
}

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});