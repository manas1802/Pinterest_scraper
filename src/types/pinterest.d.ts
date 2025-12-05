export interface PinterestConfig {
    email: string;
    password: string;
    inputCSV: string;
    outputDir: string;
    checkpointInterval: number;
    browserRestartInterval: number;
    maxRetries: number;
    timeoutSeconds: number;
    continueOnError: boolean;
    maxScrollAttempts: number; // Maximum scrolls before giving up
    noNewContentLimit: number; // Stop after N scrolls with no new content
}

export interface URLInput {
    url: string;
}

export interface PinData {
    id: string;
    link: string;
    imageOriginalUrl: string;
    sourceUrl: string;
    scrapedAt: string;
    status: 'success' | 'failed';
}

export interface ProgressLog {
    url: string;
    status: 'success' | 'failed' | 'skipped';
    pinsCollected: number;
    scrollsPerformed: number;
    errorMessage: string;
    timestamp: string;
    duration: string;
}

export interface Checkpoint {
    lastProcessedIndex: number;
    totalPinsCollected: number;
    timestamp: string;
    successCount: number;
    failureCount: number;
}