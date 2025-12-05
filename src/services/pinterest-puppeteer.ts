import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page } from 'puppeteer';
import chalk from 'chalk';
import { PinData } from '../types/pinterest';
import ErrorHandler from './errorHandler';

puppeteer.use(StealthPlugin());

export default class PinterestPuppeteer {
    private browser: Browser | null = null;
    private page: Page | null = null;
    private errorHandler: ErrorHandler;
    private isLoggedIn: boolean = false;

    constructor(errorHandler: ErrorHandler) {
        this.errorHandler = errorHandler;
    }

    private async wait(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async initialize(): Promise<void> {
        this.browser = await puppeteer.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu',
                '--window-size=1920,1080',
                '--disable-blink-features=AutomationControlled'
            ]
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1920, height: 1080 });
        await this.page.setExtraHTTPHeaders({
            'Accept-Language': 'en-US,en;q=0.9'
        });
    }

    async login(email: string, password: string, retries: number = 3): Promise<boolean> {
        if (!this.page) throw new Error('Page not initialized');

        for (let attempt = 1; attempt <= retries; attempt++) {
            try {
                await this.page.goto('https://pinterest.com/login', { 
                    waitUntil: 'networkidle0',
                    timeout: 30000 
                });
                
                await this.wait(2000);
                
                await this.page.waitForSelector('#email', { timeout: 10000 });
                await this.page.type('#email', email, { delay: 50 });
                await this.wait(300);
                await this.page.type('#password', password, { delay: 50 });
                await this.wait(300);
                await this.page.click('button[type="submit"]');
                
                await this.wait(5000);
                
                this.isLoggedIn = true;
                this.errorHandler.logSuccess('Login successful');
                return true;
                
            } catch (error) {
                this.errorHandler.logError(`Login attempt ${attempt}/${retries} failed`, error as Error);
                if (attempt < retries) {
                    await this.wait(3000);
                }
            }
        }
        return false;
    }

    async scrapeURL(
        url: string, 
        maxScrollAttempts: number, 
        noNewContentLimit: number
    ): Promise<{ pins: PinData[], scrollsPerformed: number }> {
        if (!this.page || !this.isLoggedIn) {
            throw new Error('Not logged in or page not initialized');
        }

        const pinDataList: PinData[] = [];
        const processedIds: Set<string> = new Set();
        let scrollsPerformed = 0;
        let noNewContentCount = 0;

        try {
            await this.page.goto(url, { 
                waitUntil: 'networkidle0',
                timeout: 30000 
            });
            
            // REDUCED: Initial wait from 15s to 5s
            await this.wait(5000);

            console.log(chalk.gray(`  Starting auto-scroll (stops when no new content)...`));

            // Extract initial pins
            await this.extractPins(this.page, pinDataList, processedIds, url);
            console.log(chalk.gray(`    Initial load: ${pinDataList.length} pins`));

            // OPTIMIZED: Scroll much faster
            while (scrollsPerformed < maxScrollAttempts && noNewContentCount < noNewContentLimit) {
                const previousCount = pinDataList.length;
                
                // FASTER: Fewer, bigger scrolls
                const scrollSteps = 15; // REDUCED from 28-33 to 15
                
                for (let step = 0; step < scrollSteps; step++) {
                    // BIGGER: 200px scrolls instead of 80-120px
                    await this.page.evaluate(() => window.scrollBy(0, 200));
                    
                    // FASTER: 200ms wait instead of 350-500ms
                    await this.wait(200);
                    
                    // Extract every 4 steps instead of 3
                    if (step % 4 === 0) {
                        await this.extractPins(this.page, pinDataList, processedIds, url);
                    }
                }
                
                // Big scroll to trigger more loading
                await this.page.evaluate(() => window.scrollBy(0, 500));
                
                // REDUCED: Wait only 4s instead of 10-12s
                await this.wait(4000);
                
                await this.extractPins(this.page, pinDataList, processedIds, url);
                
                scrollsPerformed++;
                const newPinsCount = pinDataList.length - previousCount;
                
                if (newPinsCount > 0) {
                    noNewContentCount = 0;
                    console.log(chalk.gray(`    Scroll ${scrollsPerformed}: +${newPinsCount} new pins (Total: ${pinDataList.length})`));
                } else {
                    noNewContentCount++;
                    console.log(chalk.yellow(`    Scroll ${scrollsPerformed}: No new content (${noNewContentCount}/${noNewContentLimit})`));
                }
            }

            if (scrollsPerformed >= maxScrollAttempts) {
                console.log(chalk.yellow(`  ⚠ Reached max scroll limit (${maxScrollAttempts})`));
            } else {
                console.log(chalk.green(`  ✓ Reached end of content`));
            }

            return { pins: pinDataList, scrollsPerformed };
            
        } catch (error) {
            this.errorHandler.logError('Error scraping URL', error as Error, url);
            return { pins: pinDataList, scrollsPerformed };
        }
    }

private async extractPins(page: Page, pinDataList: PinData[], processedIds: Set<string>, sourceUrl: string): Promise<void> {
    try {
        const content = await page.content();
        
        // Extract all image URLs with their surrounding context
        const imagePattern = /https:\/\/i\.pinimg\.com\/[^"'\s]+\.(jpg|png|webp)/gi;
        let match;
        
        while ((match = imagePattern.exec(content)) !== null) {
            const imageUrl = match[0];
            const imagePosition = match.index;
            
            // Skip thumbnails
            if (imageUrl.includes('/60x60/') || 
                imageUrl.includes('/75x75/') || 
                imageUrl.includes('/30x30/') ||
                imageUrl.includes('/50x/') ||
                imageUrl.includes('_RS/')) {
                continue;
            }

            const pinId = this.extractIdFromUrl(imageUrl);
            
            if (processedIds.has(pinId)) continue;
            processedIds.add(pinId);
            
            // Find the EXACT pin URL that contains this specific image
            const pinLink = this.findExactPinLink(imageUrl, content, imagePosition);
            const originalUrl = this.getOriginalUrl(imageUrl);
            
            pinDataList.push({
                id: pinId,
                link: pinLink,
                imageOriginalUrl: originalUrl,
                sourceUrl: sourceUrl,
                scrapedAt: new Date().toISOString(),
                status: 'success'
            });
        }
    } catch (error) {
        // Continue silently
    }
}

private findExactPinLink(imageUrl: string, pageSource: string, imagePosition: number): string {
    // Extract a focused context around this specific image (3000 chars before and after)
    const contextStart = Math.max(0, imagePosition - 3000);
    const contextEnd = Math.min(pageSource.length, imagePosition + 3000);
    const context = pageSource.substring(contextStart, contextEnd);
    
    // Strategy 1: Find the closest pin link BEFORE the image (most reliable)
    const beforeContext = pageSource.substring(contextStart, imagePosition);
    const pinLinksBeforeImage = [...beforeContext.matchAll(/href="(\/pin\/\d+[^"]*?)"/g)];
    
    if (pinLinksBeforeImage.length > 0) {
        // Get the LAST (closest) pin link before the image
        const closestLink = pinLinksBeforeImage[pinLinksBeforeImage.length - 1];
        return 'https://pinterest.com' + closestLink[1];
    }
    
    // Strategy 2: Find pin link in the immediate vicinity (within 1500 chars)
    const tightContext = pageSource.substring(
        Math.max(0, imagePosition - 1500), 
        Math.min(pageSource.length, imagePosition + 500)
    );
    
    const tightLinkMatch = tightContext.match(/href="(\/pin\/\d+[^"]*?)"/);
    if (tightLinkMatch) {
        return 'https://pinterest.com' + tightLinkMatch[1];
    }
    
    // Strategy 3: Look in the broader context
    const broadLinkMatch = context.match(/href="(\/pin\/\d+[^"]*?)"/);
    if (broadLinkMatch) {
        return 'https://pinterest.com' + broadLinkMatch[1];
    }
    
    // Strategy 4: Try to extract pin ID from parent container
    // Look for data attributes that might contain pin ID
    const dataIdMatch = context.match(/data-pin-id="(\d+)"/);
    if (dataIdMatch) {
        return `https://pinterest.com/pin/${dataIdMatch[1]}/`;
    }
    
    const dataPinMatch = context.match(/data-pin="(\d+)"/);
    if (dataPinMatch) {
        return `https://pinterest.com/pin/${dataPinMatch[1]}/`;
    }
    
    // Strategy 5: Look for pin ID in nearby JSON data
    const jsonMatch = context.match(/"id":"(\d+)"/);
    if (jsonMatch) {
        return `https://pinterest.com/pin/${jsonMatch[1]}/`;
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

    async restart(): Promise<void> {
        await this.quit();
        await this.initialize();
    }

    async quit(): Promise<void> {
        if (this.browser) {
            try {
                await this.browser.close();
            } catch (error) {
                // Ignore
            }
            this.browser = null;
            this.page = null;
            this.isLoggedIn = false;
        }
    }
}