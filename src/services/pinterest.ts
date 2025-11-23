import { Builder, By, ThenableWebDriver } from 'selenium-webdriver';
import * as chrome from 'selenium-webdriver/chrome';
import chalk from 'chalk';
import PinterestError from './errorHandler';
import { PinData } from '../types/pinterest';

export default class Pinterest {
    private pinDataList: PinData[];
    private website: string;
    private userAgent: unknown;
    private driver: ThenableWebDriver;
    private processedIds: Set<string>;

    constructor(websiteURL: string) {
        this.pinDataList = [];
        this.processedIds = new Set();
        this.website = websiteURL;

        const options = new chrome.Options()
            .windowSize({ width: 1920, height: 1080 })
            .addArguments( '--no-sandbox', '--disable-gpu', 'log-level=3');

        this.driver = new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        this.userAgent = this.driver.executeScript('return navigator.userAgent;');
    }

    async login(email: string, password: string, scrollCount: number = 1): Promise<PinData[]> {
        try {
            await this.driver.get("https://pinterest.com/login");
            await this.driver.manage().setTimeouts({ implicit: 5000 });
            
            await this.driver.sleep(3000);
            
            const emailKey = await this.driver.findElement(By.id("email"));
            const passwordKey = await this.driver.findElement(By.id("password"));

            await emailKey.sendKeys(email);
            await passwordKey.sendKeys(password);
            await this.driver.sleep(1000);
            await this.driver.findElement(By.xpath("//button[@type='submit']")).click();
            
            await this.driver.sleep(8000);

            const pinData = await this.pinCollector(scrollCount, this.website);
            return pinData;
        } catch (error) {
            throw new PinterestError((error as Error).message);
        }
    }

async pinCollector(scrollCount: number, url: string = this.website): Promise<PinData[]> {
    if (scrollCount < 0) { scrollCount = 999; }

    await this.driver.get(url);
    await this.driver.manage().setTimeouts({ implicit: 5000 });
    
    await this.driver.sleep(8000);
    
    console.log(chalk.cyan('Starting to collect pins...'));

    let noNewContentCount = 0;

    for (let i = 0; i < scrollCount; i++) {
        try {
            const previousCount = this.pinDataList.length;
            
            // Extract current pins
            await this.extractPinData();
            
            // REDUCED: Scroll in TINY steps - only 150px at a time
            console.log(chalk.gray(`  Scrolling slowly (150px x 20 steps)...`));
            for (let step = 0; step < 20; step++) {
                await this.driver.executeScript("window.scrollBy(0, 150);"); // REDUCED from 300-400
                await this.driver.sleep(300); // Wait after each tiny scroll
                
                // Extract pins every 5 steps
                if (step % 5 === 0) {
                    await this.extractPinData();
                }
            }
            
            // Small scroll to trigger Pinterest's infinite load
            await this.driver.executeScript("window.scrollBy(0, 500);");
            
            // INCREASED: Wait longer for Pinterest to load
            console.log(chalk.gray(`  Waiting for Pinterest to load new pins...`));
            await this.driver.sleep(8000); // INCREASED from 5000
            
            // Final extract
            await this.extractPinData();
            
            const newPinsCount = this.pinDataList.length - previousCount;
            
            console.log(chalk.green(
                `Scroll ${(i+1)}/${scrollCount}: Total ${this.pinDataList.length} pins (+${newPinsCount} new)`
            ));
            
            if (newPinsCount > 0) {
                noNewContentCount = 0;
            } else {
                noNewContentCount++;
                console.log(chalk.yellow(`  No new content (attempt ${noNewContentCount}/5)`));
                
                if (noNewContentCount >= 5) {
                    console.log(chalk.yellow('  Reached end'));
                    break;
                }
            }
            
            // Small wait between scroll iterations
            await this.driver.sleep(2000);
            
        } catch (err) {
            console.error(chalk.yellow(`Scroll ${i+1} error: ${(err as Error).message}`));
        }
    }

    console.log(chalk.green(`\n${'='.repeat(60)}`));
    console.log(chalk.green(`Total ${this.pinDataList.length} Pins Collected`));
    console.log(chalk.green('='.repeat(60)));
    
    // Keep browser open to inspect
    console.log(chalk.yellow('\n🔍 Browser stays open for 30 seconds - watch it!'));
    await this.driver.sleep(30000);
    
    await this.driver.quit();

    return this.pinDataList;
}


    private async extractPinData(): Promise<void> {
        try {
            const pageSource: string = await this.driver.getPageSource();
            
            // Find ALL Pinterest image URLs
            const urlMatches = pageSource.match(/https:\/\/i\.pinimg\.com\/[^"'\s]+\.(jpg|png|webp)/gi);
            
            if (!urlMatches) {
                return;
            }

            for (const imageUrl of urlMatches) {
                // Skip thumbnails
                if (imageUrl.includes('/60x60/') || 
                    imageUrl.includes('/75x75/') || 
                    imageUrl.includes('/30x30/') ||
                    imageUrl.includes('/50x/') ||
                    imageUrl.includes('_RS/')) {
                    continue;
                }

                // Extract ID from image URL
                const pinId = this.extractIdFromUrl(imageUrl);
                
                if (this.processedIds.has(pinId)) {
                    continue;
                }

                this.processedIds.add(pinId);
                
                // Get original image URL
                const originalUrl = this.getOriginalUrl(imageUrl);
                
                // Try to find Pinterest link
                const pinLink = this.findPinLink(imageUrl, pageSource);
                
                this.pinDataList.push({
                    id: pinId,
                    link: pinLink,
                    imageOriginal: originalUrl
                });
            }
        } catch (error) {
            // Continue silently
        }
    }

    private findPinLink(imageUrl: string, pageSource: string): string {
        const imgIndex = pageSource.indexOf(imageUrl);
        const contextStart = Math.max(0, imgIndex - 1000);
        const contextEnd = Math.min(pageSource.length, imgIndex + 1000);
        const context = pageSource.substring(contextStart, contextEnd);
        
        const linkMatch = context.match(/href="(\/pin\/\d+[^"]*?)"/);
        if (linkMatch) {
            return 'https://pinterest.com' + linkMatch[1];
        }
        
        return 'Not Available';
    }

    private getOriginalUrl(url: string): string {
        return url
            .replace(/\/(originals|236x|474x|564x|736x|170x|videos\/thumbnails)\//,  '/originals/')
            .replace(/_RS\//, '/')
            .replace(/\/\d+x\d+\//, '/originals/');
    }

    private extractIdFromUrl(url: string): string {
        if (!url) return '';
        
        const match = url.match(/\/([a-f0-9]{32,})\./i);
        if (match) return match[1];
        
        const pathMatch = url.match(/pinimg\.com\/[^/]+\/(.+?)\.(jpg|png|webp)/i);
        if (pathMatch) {
            return pathMatch[1].replace(/\//g, '_').substring(0, 50);
        }
        
        return `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    getPinData(): PinData[] {
        return this.pinDataList;
    }

    getDriver(): ThenableWebDriver {
        return this.driver;
    }
}