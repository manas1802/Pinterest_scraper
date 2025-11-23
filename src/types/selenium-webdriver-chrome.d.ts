declare module 'selenium-webdriver/chrome' {
  interface WindowSize { width: number; height: number; }

  class Options {
    constructor();
    windowSize(size: WindowSize): this;
    addArguments(...args: string[]): this;
    headless?(): this;
    [key: string]: any;
  }

  const chrome: { Options: typeof Options } & any;
  export = chrome;
}