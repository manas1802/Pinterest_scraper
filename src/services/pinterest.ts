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
                
                // Scroll in TINY steps
                for (let step = 0; step < 20; step++) {
                    await this.driver.executeScript("window.scrollBy(0, 150);");
                    await this.driver.sleep(300);
                    
                    if (step % 5 === 0) {
                        await this.extractPinData();
                    }
                }
                
                await this.driver.executeScript("window.scrollBy(0, 500);");
                
                await this.driver.sleep(8000);
                
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
                
                await this.driver.sleep(2000);
                
            } catch (err) {
                console.error(chalk.yellow(`Scroll ${i+1} error: ${(err as Error).message}`));
            }
        }

        console.log(chalk.green(`\n${'='.repeat(60)}`));
        console.log(chalk.green(`Total ${this.pinDataList.length} Pins Collected`));
        console.log(chalk.green('='.repeat(60)));
        
        await this.driver.quit();

        return this.pinDataList;
    }

    private async extractPinData(): Promise<void> {
        try {
            const pageSource: string = await this.driver.getPageSource();
            
            const urlMatches = pageSource.match(/https:\/\/i\.pinimg\.com\/[^"'\s]+\.(jpg|png|webp)/gi);
            
            if (!urlMatches) {
                return;
            }

            for (const imageUrl of urlMatches) {
                if (imageUrl.includes('/60x60/') || 
                    imageUrl.includes('/75x75/') || 
                    imageUrl.includes('/30x30/') ||
                    imageUrl.includes('/50x/') ||
                    imageUrl.includes('_RS/')) {
                    continue;
                }

                const pinId = this.extractIdFromUrl(imageUrl);
                
                if (this.processedIds.has(pinId)) {
                    continue;
                }

                this.processedIds.add(pinId);
                
                const pinData = this.extractMetadata(imageUrl, pageSource);
                this.pinDataList.push(pinData);
            }
        } catch (error) {
            // Continue silently
        }
    }

    private extractMetadata(imageUrl: string, pageSource: string): PinData {
        const pinId = this.extractIdFromUrl(imageUrl);
        
        const imgIndex = pageSource.indexOf(imageUrl);
        const contextStart = Math.max(0, imgIndex - 3000);
        const contextEnd = Math.min(pageSource.length, imgIndex + 3000);
        const context = pageSource.substring(contextStart, contextEnd);
        
        // Extract alt text
        let altText = 'Not Available';
        const altMatch = context.match(/alt="([^"]{5,}?)"/);
        if (altMatch) {
            altText = altMatch[1]
                .replace(/^This may contain:\s*/i, '')
                .replace(/^This contains an image of:\s*/i, '')
                .trim();
        }
        
        // Extract title
        let title = altText;
        const titlePatterns = [
            /aria-label="([^"]{10,}?)"/,
            /data-test-id="pin-title"[^>]*>([^<]+)</,
        ];
        
        for (const pattern of titlePatterns) {
            const match = context.match(pattern);
            if (match && match[1].length > 5) {
                title = match[1].trim().substring(0, 200);
                break;
            }
        }
        
        // Extract description
        let description = ' ';
        const descPatterns = [
            /"description":"([^"]{20,}?)"/,
            /description['":\s]+["']([^"']{20,}?)["']/i,
        ];
        
        for (const pattern of descPatterns) {
            const match = context.match(pattern);
            if (match && match[1].length > 10) {
                description = match[1].trim().substring(0, 500);
                break;
            }
        }
        
        // Extract pin link
        let pinLink = 'Not Available';
        const linkMatch = context.match(/href="(\/pin\/\d+[^"]*?)"/);
        if (linkMatch) {
            pinLink = 'https://pinterest.com' + linkMatch[1];
        }
        
        // Extract board URL
        let boardUrl = 'Not Available';
        const boardMatch = context.match(/href="(\/[^/]+\/[^/]+\/[^"]*?)"/);
        if (boardMatch && !boardMatch[1].includes('/pin/')) {
            boardUrl = 'https://pinterest.com' + boardMatch[1];
        }
        
        return {
            id: pinId,
            title: title || 'Not Available',
            description: description,
            altText: altText,
            link: pinLink,
            image170x: this.generateSizedUrl(imageUrl, '170x'),
            image236x: this.generateSizedUrl(imageUrl, '236x'),
            image474x: this.generateSizedUrl(imageUrl, '474x'),
            image564x: this.generateSizedUrl(imageUrl, '564x'),
            image736x: this.generateSizedUrl(imageUrl, '736x'),
            imageOriginal: this.generateSizedUrl(imageUrl, 'originals'),
            boardUrl: boardUrl
        };
    }

    private generateSizedUrl(url: string, size: string): string {
        return url
            .replace(/\/(originals|236x|474x|564x|736x|170x|videos\/thumbnails)\//,  `/${size}/`)
            .replace(/_RS\//, '/')
            .replace(/\/\d+x\d+\//, `/${size}/`);
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