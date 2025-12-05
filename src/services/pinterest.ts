// import { Builder, By, ThenableWebDriver } from 'selenium-webdriver';
// import * as chrome from 'selenium-webdriver/chrome';
// import chalk from 'chalk';
// import { PinData } from '../types/pinterest';
// import ErrorHandler from './errorHandler';

// export default class Pinterest {
//     private driver: ThenableWebDriver | null = null;
//     private errorHandler: ErrorHandler;
//     private isLoggedIn: boolean = false;

//     constructor(errorHandler: ErrorHandler) {
//         this.errorHandler = errorHandler;
//     }

//     async initialize(): Promise<void> {
//         const options = new chrome.Options()
//             .windowSize({ width: 1920, height: 1080 })
//             .addArguments(
//                 '--no-sandbox',
//                 '--disable-gpu',
//                 '--disable-dev-shm-usage',
//                 '--disable-blink-features=AutomationControlled',
//                 '--disable-web-security',
//                 '--disable-features=IsolateOrigins,site-per-process',
//                 '--allow-running-insecure-content',
//                 '--disable-setuid-sandbox',
//                 '--no-first-run',
//                 '--no-default-browser-check',
//                 '--disable-infobars',
//                 '--window-position=0,0',
//                 '--ignore-certificate-errors',
//                 '--ignore-certificate-errors-spki-list',
//                 '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
//             )
//             .excludeSwitches(['enable-automation', 'enable-logging']);

//         this.driver = new Builder()
//             .forBrowser('chrome')
//             .setChromeOptions(options)
//             .build();

//         // Inject stealth scripts to hide automation
//         await this.makeStealthy();
//     }

//     private async makeStealthy(): Promise<void> {
//         if (!this.driver) return;

//         try {
//             // Execute stealth scripts
//             await this.driver.executeScript(`
//                 // Override navigator.webdriver
//                 Object.defineProperty(navigator, 'webdriver', {
//                     get: () => undefined
//                 });

//                 // Override chrome property
//                 window.chrome = {
//                     runtime: {}
//                 };

//                 // Override permissions
//                 const originalQuery = window.navigator.permissions.query;
//                 window.navigator.permissions.query = (parameters) => (
//                     parameters.name === 'notifications' ?
//                         Promise.resolve({ state: Notification.permission }) :
//                         originalQuery(parameters)
//                 );

//                 // Override plugins
//                 Object.defineProperty(navigator, 'plugins', {
//                     get: () => [1, 2, 3, 4, 5]
//                 });

//                 // Override languages
//                 Object.defineProperty(navigator, 'languages', {
//                     get: () => ['en-US', 'en']
//                 });
//             `);
//         } catch (error) {
//             // Continue if stealth injection fails
//         }
//     }

//     async login(email: string, password: string, retries: number = 3): Promise<boolean> {
//         if (!this.driver) {
//             throw new Error('Driver not initialized');
//         }

//         for (let attempt = 1; attempt <= retries; attempt++) {
//             try {
//                 await this.driver.get("https://pinterest.com/login");
//                 await this.driver.manage().setTimeouts({ implicit: 5000 });
                
//                 await this.driver.sleep(5000);
                
//                 const emailKey = await this.driver.findElement(By.id("email"));
//                 const passwordKey = await this.driver.findElement(By.id("password"));

//                 // Human-like typing with delays
//                 await this.humanTypeText(emailKey, email);
//                 await this.driver.sleep(800);
//                 await this.humanTypeText(passwordKey, password);
//                 await this.driver.sleep(1200);
                
//                 await this.driver.findElement(By.xpath("//button[@type='submit']")).click();
                
//                 await this.driver.sleep(12000);
                
//                 this.isLoggedIn = true;
//                 this.errorHandler.logSuccess('Login successful');
//                 return true;
                
//             } catch (error) {
//                 this.errorHandler.logError(`Login attempt ${attempt}/${retries} failed`, error as Error);
                
//                 if (attempt < retries) {
//                     const waitTime = attempt * 5000;
//                     this.errorHandler.logInfo(`Retrying in ${waitTime/1000} seconds...`);
//                     await this.driver.sleep(waitTime);
//                 }
//             }
//         }
        
//         return false;
//     }

//     private async humanTypeText(element: any, text: string): Promise<void> {
//         // Type like a human with random delays
//         for (const char of text) {
//             await element.sendKeys(char);
//             await this.driver!.sleep(Math.random() * 100 + 50); // 50-150ms per character
//         }
//     }

//     async scrapeURL(
//         url: string, 
//         maxScrollAttempts: number, 
//         noNewContentLimit: number
//     ): Promise<{ pins: PinData[], scrollsPerformed: number }> {
//         if (!this.driver || !this.isLoggedIn) {
//             throw new Error('Not logged in or driver not initialized');
//         }

//         const pinDataList: PinData[] = [];
//         const processedIds: Set<string> = new Set();
//         let scrollsPerformed = 0;
//         let noNewContentCount = 0;

//         try {
//             await this.driver.get(url);
//             await this.driver.manage().setTimeouts({ implicit: 5000 });
            
//             // Longer initial wait for page to fully load
//             await this.driver.sleep(15000);

//             console.log(chalk.gray(`  Starting auto-scroll (stops when no new content)...`));

//             // Extract initial visible pins
//             await this.extractPins(pinDataList, processedIds, url);
//             console.log(chalk.gray(`    Initial load: ${pinDataList.length} pins`));

//             // Auto-scroll until no new content or max scrolls reached
//             while (scrollsPerformed < maxScrollAttempts && noNewContentCount < noNewContentLimit) {
//                 const previousCount = pinDataList.length;
                
//                 // Human-like scrolling with random variations
//                 const scrollSteps = Math.floor(Math.random() * 5) + 28; // 28-33 steps
                
//                 for (let step = 0; step < scrollSteps; step++) {
//                     // Random scroll distance (80-120px)
//                     const scrollAmount = Math.floor(Math.random() * 40) + 80;
//                     await this.driver.executeScript(`window.scrollBy(0, ${scrollAmount});`);
                    
//                     // Random wait time (350-500ms)
//                     const waitTime = Math.floor(Math.random() * 150) + 350;
//                     await this.driver.sleep(waitTime);
                    
//                     // Extract frequently
//                     if (step % 3 === 0) {
//                         await this.extractPins(pinDataList, processedIds, url);
//                     }
//                 }
                
//                 // Small random scroll at end
//                 const finalScroll = Math.floor(Math.random() * 100) + 250; // 250-350px
//                 await this.driver.executeScript(`window.scrollBy(0, ${finalScroll});`);
                
//                 // Wait for content to load (with randomization)
//                 const loadWait = Math.floor(Math.random() * 2000) + 10000; // 10-12 seconds
//                 await this.driver.sleep(loadWait);
                
//                 // Check if page height increased (sign of new content loading)
//                 const pageHeight = await this.driver.executeScript('return document.body.scrollHeight;');
                
//                 // Final extract after waiting
//                 await this.extractPins(pinDataList, processedIds, url);
                
//                 scrollsPerformed++;
//                 const newPinsCount = pinDataList.length - previousCount;
                
//                 if (newPinsCount > 0) {
//                     noNewContentCount = 0;
//                     console.log(chalk.gray(`    Scroll ${scrollsPerformed}: +${newPinsCount} new pins (Total: ${pinDataList.length})`));
//                 } else {
//                     noNewContentCount++;
//                     console.log(chalk.yellow(`    Scroll ${scrollsPerformed}: No new content (${noNewContentCount}/${noNewContentLimit})`));
                    
//                     // Try scrolling up a bit and back down (sometimes triggers loading)
//                     if (noNewContentCount === 2 || noNewContentCount === 4) {
//                         console.log(chalk.gray(`    Attempting recovery scroll...`));
//                         await this.driver.executeScript('window.scrollBy(0, -500);');
//                         await this.driver.sleep(2000);
//                         await this.driver.executeScript('window.scrollBy(0, 600);');
//                         await this.driver.sleep(3000);
//                         await this.extractPins(pinDataList, processedIds, url);
//                     }
//                 }
//             }

//             if (scrollsPerformed >= maxScrollAttempts) {
//                 console.log(chalk.yellow(`  ⚠ Reached max scroll limit (${maxScrollAttempts})`));
//             } else {
//                 console.log(chalk.green(`  ✓ Reached end of content (${noNewContentCount} scrolls with no new pins)`));
//             }

//             return { pins: pinDataList, scrollsPerformed };
            
//         } catch (error) {
//             this.errorHandler.logError('Error scraping URL', error as Error, url);
//             return { pins: pinDataList, scrollsPerformed };
//         }
//     }

//     private async extractPins(pinDataList: PinData[], processedIds: Set<string>, sourceUrl: string): Promise<void> {
//         if (!this.driver) return;

//         try {
//             const pageSource: string = await this.driver.getPageSource();
//             const urlMatches = pageSource.match(/https:\/\/i\.pinimg\.com\/[^"'\s]+\.(jpg|png|webp)/gi);
            
//             if (!urlMatches) return;

//             for (const imageUrl of urlMatches) {
//                 if (imageUrl.includes('/60x60/') || 
//                     imageUrl.includes('/75x75/') || 
//                     imageUrl.includes('/30x30/') ||
//                     imageUrl.includes('/50x/') ||
//                     imageUrl.includes('_RS/')) {
//                     continue;
//                 }

//                 const pinId = this.extractIdFromUrl(imageUrl);
                
//                 if (processedIds.has(pinId)) continue;
//                 processedIds.add(pinId);
                
//                 const pinLink = this.findPinLink(imageUrl, pageSource);
//                 const originalUrl = this.getOriginalUrl(imageUrl);
                
//                 pinDataList.push({
//                     id: pinId,
//                     link: pinLink,
//                     imageOriginalUrl: originalUrl,
//                     sourceUrl: sourceUrl,
//                     scrapedAt: new Date().toISOString(),
//                     status: 'success'
//                 });
//             }
//         } catch (error) {
//             // Continue silently
//         }
//     }

//     private findPinLink(imageUrl: string, pageSource: string): string {
//         const imgIndex = pageSource.indexOf(imageUrl);
//         const contextStart = Math.max(0, imgIndex - 1000);
//         const contextEnd = Math.min(pageSource.length, imgIndex + 1000);
//         const context = pageSource.substring(contextStart, contextEnd);
        
//         const linkMatch = context.match(/href="(\/pin\/\d+[^"]*?)"/);
//         if (linkMatch) {
//             return 'https://pinterest.com' + linkMatch[1];
//         }
        
//         return 'Not Available';
//     }

//     private getOriginalUrl(url: string): string {
//         return url
//             .replace(/\/(originals|236x|474x|564x|736x|170x|videos\/thumbnails)\//,  '/originals/')
//             .replace(/_RS\//, '/')
//             .replace(/\/\d+x\d+\//, '/originals/');
//     }

//     private extractIdFromUrl(url: string): string {
//         if (!url) return '';
        
//         const match = url.match(/\/([a-f0-9]{32,})\./i);
//         if (match) return match[1];
        
//         const pathMatch = url.match(/pinimg\.com\/[^/]+\/(.+?)\.(jpg|png|webp)/i);
//         if (pathMatch) {
//             return pathMatch[1].replace(/\//g, '_').substring(0, 50);
//         }
        
//         return `pin_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
//     }

//     async restart(): Promise<void> {
//         await this.quit();
//         await this.initialize();
//     }

//     async quit(): Promise<void> {
//         if (this.driver) {
//             try {
//                 await this.driver.quit();
//             } catch (error) {
//                 // Ignore quit errors
//             }
//             this.driver = null;
//             this.isLoggedIn = false;
//         }
//     }
// }