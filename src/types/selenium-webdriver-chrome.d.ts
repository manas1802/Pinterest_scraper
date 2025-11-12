declare module 'selenium-webdriver/chrome' {
  // Minimal, safe shim for the chrome submodule to satisfy TS.
  // It provides the Options class members you're using in the repo.
  interface WindowSize { width: number; height: number; }

  class Options {
    constructor();
    windowSize(size: WindowSize): this;
    addArguments(...args: string[]): this;
    // Some versions of the API include headless() helper
    headless?(): this;
    // keep flexible for other calls
    [key: string]: any;
  }

  const chrome: { Options: typeof Options } & any;
  export = chrome;
}