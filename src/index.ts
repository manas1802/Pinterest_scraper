import dotenv from 'dotenv';
import chalk from 'chalk';
import { CSVReader } from './services/csvReader';
import { ProgressTracker } from './services/progressTracker';
import { CSVExporter } from './utils/csvExporter';
import Pinterest from './services/pinterest-puppeteer';
import ErrorHandler from './services/errorHandler';
import { PinterestConfig, URLInput } from './types/pinterest';

dotenv.config();

// ... existing imports ...

async function main() {
    const config: PinterestConfig = {
        email: process.env.EMAIL as string,
        password: process.env.PASSWORD as string,
        inputCSV: process.env.INPUT_CSV || 'input/urls.csv',
        outputDir: process.env.OUTPUT_DIR || 'output',
        checkpointInterval: parseInt(process.env.CHECKPOINT_INTERVAL || '50'),
        browserRestartInterval: parseInt(process.env.BROWSER_RESTART_INTERVAL || '200'),
        maxRetries: parseInt(process.env.MAX_RETRIES || '1'),
        timeoutSeconds: parseInt(process.env.TIMEOUT_SECONDS || '120'),
        continueOnError: process.env.CONTINUE_ON_ERROR !== 'false',
        maxScrollAttempts: parseInt(process.env.MAX_SCROLL_ATTEMPTS || '100'),
        noNewContentLimit: parseInt(process.env.NO_NEW_CONTENT_LIMIT || '5')
    };

    // ADD: URL delay configuration
    const urlDelay = parseInt(process.env.URL_DELAY_SECONDS || '5'); 

    console.log(chalk.blue('═'.repeat(80)));
    console.log(chalk.blue.bold('       Pinterest Bulk Scraper - Auto-Scroll Edition'));
    console.log(chalk.blue('═'.repeat(80)));

    const errorHandler = new ErrorHandler(config.outputDir);

    try {
        errorHandler.logInfo('Validating input CSV...');
        const validation = CSVReader.validateCSV(config.inputCSV);
        
        if (!validation.valid) {
            validation.errors.forEach(err => errorHandler.logError('CSV Validation', err));
            process.exit(1);
        }

        const urls: URLInput[] = CSVReader.readURLs(config.inputCSV);
        errorHandler.logSuccess(`Loaded ${urls.length} URLs from CSV`);
        errorHandler.logInfo(`Auto-scroll enabled: Stops after ${config.noNewContentLimit} scrolls with no new content`);
        errorHandler.logInfo(`Maximum scrolls per URL: ${config.maxScrollAttempts}`);
        errorHandler.logInfo(`Delay between URLs: ${urlDelay} seconds`); // ADD THIS

        const progressTracker = new ProgressTracker(
            config.outputDir,
            'checkpoints',
            urls.length
        );

        const checkpoint = progressTracker.loadCheckpoint();
        let startIndex = 0;
        
        if (checkpoint && process.argv.includes('--resume')) {
            startIndex = checkpoint.lastProcessedIndex + 1;
            errorHandler.logInfo(`Resuming from checkpoint: URL ${startIndex + 1}/${urls.length}`);
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
        const csvExporter = new CSVExporter(config.outputDir, `pinterest_data_${timestamp}`);

        const pinterest = new Pinterest(errorHandler);
        await pinterest.initialize();

        errorHandler.logInfo('Logging in to Pinterest...');
        const loginSuccess = await pinterest.login(config.email, config.password, 3);
        
        if (!loginSuccess) {
            errorHandler.logError('Login Failed', 'Could not log in after 3 attempts');
            process.exit(1);
        }

        console.log(chalk.blue('\n' + '═'.repeat(80)));
        console.log(chalk.cyan.bold(`Starting to process ${urls.length - startIndex} URLs...`));
        console.log(chalk.blue('═'.repeat(80) + '\n'));

        for (let i = startIndex; i < urls.length; i++) {
            const urlInput = urls[i];
            
            try {
                console.log(chalk.cyan(`\n[${i + 1}/${urls.length}] Processing: ${urlInput.url}`));
                console.log(chalk.gray(`Auto-scroll mode: Will stop when no new content detected`));
                
                progressTracker.startURL();
                
                const result = await pinterest.scrapeURL(
                    urlInput.url,
                    config.maxScrollAttempts,
                    config.noNewContentLimit
                );

                csvExporter.appendPins(result.pins);

                progressTracker.logURLComplete({
                    url: urlInput.url,
                    status: result.pins.length > 0 ? 'success' : 'failed',
                    pinsCollected: result.pins.length,
                    scrollsPerformed: result.scrollsPerformed,
                    errorMessage: result.pins.length === 0 ? 'No pins collected' : '',
                    timestamp: new Date().toISOString(),
                    duration: progressTracker.getURLDuration()
                });

                if ((i + 1) % config.checkpointInterval === 0) {
                    progressTracker.saveCheckpoint(i);
                }

                if ((i + 1) % config.browserRestartInterval === 0) {
                    errorHandler.logInfo('Restarting browser to free memory...');
                    await pinterest.restart();
                    const loginSuccess = await pinterest.login(config.email, config.password);
                    if (!loginSuccess) {
                        errorHandler.logError('Re-login Failed', 'Could not re-login after browser restart');
                        break;
                    }
                }

                // ADD: Delay between URLs (except for the last one)
                if (i < urls.length - 1) {
                    console.log(chalk.yellow(`\n⏳ Cooling down for ${urlDelay} seconds before next URL...`));
                    await new Promise(resolve => setTimeout(resolve, urlDelay * 1000));
                }

            } catch (error) {
                errorHandler.logError(`Failed to process URL ${i + 1}`, error as Error, urlInput.url);
                
                progressTracker.logURLComplete({
                    url: urlInput.url,
                    status: 'failed',
                    pinsCollected: 0,
                    scrollsPerformed: 0,
                    errorMessage: (error as Error).message,
                    timestamp: new Date().toISOString(),
                    duration: progressTracker.getURLDuration()
                });

                if (!config.continueOnError) {
                    errorHandler.logError('Critical Error', 'Stopping execution due to error');
                    break;
                }
            }
        }

        await pinterest.quit();
        progressTracker.displayFinalSummary();
        
        console.log(chalk.green(`\n✓ Output saved to: ${csvExporter.getOutputPath()}`));
        console.log(chalk.cyan(`  Total pins in CSV: ${csvExporter.getPinCount()}`));

    } catch (error) {
        errorHandler.logError('Fatal Error', error as Error);
        process.exit(1);
    }
}

process.on('SIGINT', async () => {
    console.log(chalk.yellow('\n\n⚠ Process interrupted. Saving progress...'));
    process.exit(0);
});

main().catch(error => {
    console.error(chalk.red('Fatal error:'), error);
    process.exit(1);
});