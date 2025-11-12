"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const selenium_webdriver_1 = require("selenium-webdriver");
const chrome_1 = __importDefault(require("selenium-webdriver/chrome"));
const chalk_1 = __importDefault(require("chalk"));
const errorHandler_1 = __importDefault(require("./errorHandler"));
/**
 * @class Pinterest
 * @description A class to collect images from Pinterest.
 * @public
 * @example const pinterest = new Pinterest("https://www.pinterest.com/pin/1234567890/");
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
 */
class Pinterest {
    pinList;
    website;
    userAgent;
    driver;
    /**
     * @constructor
     * @description Creates an instance of Pinterest.
     * @param {string} websiteURL
     * @memberof Pinterest
     * @public
     * @example const pinterest = new Pinterest("https://www.pinterest.com/pin/1234567890/");
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     */
    constructor(websiteURL) {
        this.pinList = [];
        this.website = websiteURL;
        this.driver = new selenium_webdriver_1.Builder()
            .forBrowser('chrome')
            .setChromeOptions(new chrome_1.default.Options()
            .windowSize({ width: 1920, height: 1080 })
            .addArguments('--headless')
            .addArguments('disable-gpu', 'log-level=3'))
            .build();
        this.userAgent = this.driver.executeScript("return navigator.userAgent;");
    }
    ;
    /**
     * @method login
     * @description Logs in to the Pinterest account.
     * @param {string} email
     * @param {string} password
     * @param {number} [scrollCount=1]
     * @returns {Promise<string[] | any[]>}
     * @memberof Pinterest
     * @public
     * @example const images = await pinterest.login("[email protected]", "password", 5);
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Number}
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise}
     * @see {@link https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_ThenableWebDriver.html}
     */
    async login(email, password, scrollCount = 1) {
        try {
            await this.driver.get("https://pinterest.com/login");
            await this.driver.manage().setTimeouts({ implicit: 3000 });
            for (let i = 0; i < 3; i++) {
                try {
                    await this.driver.findElement(selenium_webdriver_1.By.id("email"));
                    break;
                }
                catch (error) {
                    await this.driver.sleep(1000);
                }
            }
            const emailKey = await this.driver.findElement(selenium_webdriver_1.By.id("email"));
            const passwordKey = await this.driver.findElement(selenium_webdriver_1.By.id("password"));
            await emailKey.sendKeys(email);
            await passwordKey.sendKeys(password);
            await this.driver.sleep(1000);
            await this.driver.findElement(selenium_webdriver_1.By.xpath("//button[@type='submit']")).click();
            await this.driver.sleep(5000);
            var images = await this.pinCollector(scrollCount, this.website);
            return images;
        }
        catch (error) {
            throw new errorHandler_1.default(error.message);
        }
    }
    ;
    /**
     * @method mouseScrool
     * @description Scrolls the page to the end and collects the images.
     * @returns {Promise<void>}
     * @memberof Pinterest
     * @public
     * @example await pinterest.mouseScrool();
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     */
    async mouseScrool() {
        var timeout = 0;
        var height = await this.driver.executeScript("return document.body.scrollHeight");
        while (true) {
            await this.driver.executeScript("window.scrollTo(0, document.body.scrollHeight);");
            await this.driver.sleep(5000);
            var nowHeight = await this.driver.executeScript("return document.body.scrollHeight");
            if (nowHeight != height) {
                await this.returnImages();
                break;
            }
            else {
                timeout++;
                if (timeout >= 10) {
                    throw new errorHandler_1.default("The page could not be loaded due to your internet connection or we have reached the end of the page.");
                }
            }
        }
        await this.driver.sleep(3000);
    }
    ;
    /**
     * @method pinCollector
     * @description Collects the images from the given Pinterest URL.
     * @param {number} scrollCount
     * @param {string} [url=this.website]
     * @returns {Promise<string[] | any[]>}
     * @memberof Pinterest
     * @public
     * @example const images = await pinterest.pinCollector(5, "https://www.pinterest.com/pin/1234567890/");
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     */
    async pinCollector(scrollCount, url = this.website) {
        if (scrollCount < 0) {
            scrollCount = 999;
        }
        await this.driver.get(url);
        await this.driver.manage().setTimeouts({ implicit: 3000 });
        for (let i = 0; i < scrollCount; i++) {
            try {
                await this.mouseScrool();
            }
            catch (err) {
                console.error(err.message);
            }
            ;
            console.log(chalk_1.default.green(`${(i + 1)} Number of Pages Passed, Currently Collected Pin ${this.pinList.length} Count`));
        }
        console.log(chalk_1.default.green(`Total ${this.pinList.length} Number of Images Collected`));
        this.driver.quit();
        var returnedImages = this.getImages();
        if (returnedImages.length == 0)
            return [];
        return returnedImages;
    }
    ;
    /**
     * @method returnImages
     * @description Returns the collected images.
     * @returns {Promise<string[] | any[]>}
     * @memberof Pinterest
     * @public
     * @example const images = await pinterest.returnImages();
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     */
    async returnImages() {
        const request = await this.driver.getPageSource();
        const pins = request.match(/<img.*?src=["'](.*?)["']/g);
        if (pins === null)
            return [];
        for (const pin of pins) {
            var source = pin.match(/src=["'](.*?)["']/);
            if (source == null)
                continue;
            source = source[1];
            if (!source.includes("75x75_RS") && !source.includes("/30x30_RS/") && !this.pinList.includes(source)) {
                this.pinList.push(this.replacer(source));
            }
        }
        return this.pinList;
    }
    ;
    /**
     * @method getImages
     * @description Returns the collected images.
     * @returns {string[]}
     * @memberof Pinterest
     * @public
     * @example const images = pinterest.getImages();
     * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
     */
    getImages() {
        return this.pinList;
    }
    ;
    /**
     * @method getDriver
     * @description Returns the driver object.
     * @returns {ThenableWebDriver}
     * @memberof Pinterest
     * @public
     * @example const driver = pinterest.getDriver();
     * @see {@link https://seleniumhq.github.io/selenium/docs/api/javascript/module/selenium-webdriver/index_exports_ThenableWebDriver.html}
     */
    getDriver() {
        return this.driver;
    }
    ;
    /**
    * @method replacer
    * @description Replaces the image size with the original size.
    * @param {string} str
    * @returns {string}
    * @memberof Pinterest
    * @public
    * @example const originalSize = pinterest.replacer("https://i.pinimg.com/236x/0d/7e/3e/0d7e3e3e3e3e3e3e3e3e3e3e3e3e3e3e.jpg");
    * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String}
    */
    replacer(str) {
        return str.replace("/236x/", "/originals/")
            .replace("/474x/", "/originals/")
            .replace("/736x/", "/originals/")
            .replace("/564x/", "/originals/");
    }
    ;
}
exports.default = Pinterest;
;
