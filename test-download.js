// test-download.js
const https = require('https');
const fs = require('fs');
const path = require('path');

// Auto-find CSV file
function findCSVFile() {
    const locations = [
        './',
        './output/',
        './outputs/',
        '../output/',
        '../outputs/'
    ];
    
    for (const loc of locations) {
        if (!fs.existsSync(loc)) continue;
        const files = fs.readdirSync(loc).filter(f => f.endsWith('.csv'));
        if (files.length > 0) {
            const csvPath = path.join(loc, files[0]);
            console.log(`✅ Found CSV: ${csvPath}\n`);
            return csvPath;
        }
    }
    
    console.error('❌ No CSV file found!');
    console.error('Please put your CSV file in the same folder as this script.');
    process.exit(1);
}

const CSV_FILE = findCSVFile();
const OUTPUT_DIR = './test-downloads';

// Create output directory
if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Parse CSV
function parseCSV(filename) {
    const content = fs.readFileSync(filename, 'utf8');
    const lines = content.split('\n').slice(1); // Skip header
    
    const images = [];
    for (const line of lines) {
        if (!line.trim()) continue;
        
        // Simple CSV parsing (handles quoted fields)
        const match = line.match(/"([^"]+)","([^"]+)","([^"]+)"/);
        if (match) {
            const [, id, link, imageUrl] = match;
            images.push({ id, link, imageUrl });
        }
    }
    
    return images;
}

// Download single image
function downloadImage(imageUrl, outputPath) {
    return new Promise((resolve) => {
        const file = fs.createWriteStream(outputPath);
        
        const options = {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Referer': 'https://www.pinterest.com/',
                'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
            },
            timeout: 10000
        };
        
        https.get(imageUrl, options, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve({ success: true, status: 200 });
                });
            } else {
                file.close();
                fs.unlinkSync(outputPath);
                resolve({ success: false, status: response.statusCode });
            }
        }).on('error', (err) => {
            file.close();
            if (fs.existsSync(outputPath)) {
                fs.unlinkSync(outputPath);
            }
            resolve({ success: false, error: err.message });
        });
    });
}

// Main function
async function main() {
    console.log('🔍 Pinterest Direct Download Test - NO LIMITS\n');
    console.log('='.repeat(60));
    
    // Parse CSV
    const images = parseCSV(CSV_FILE);
    const totalImages = images.length;
    
    console.log(`📊 Total images to download: ${totalImages}`);
    console.log(`📁 Output directory: ${OUTPUT_DIR}\n`);
    console.log('='.repeat(60));
    console.log('Starting downloads...\n');
    
    // Statistics
    let successCount = 0;
    let failedCount = 0;
    const errors = {};
    const startTime = Date.now();
    
    // Download ALL images
    for (let i = 0; i < totalImages; i++) {
        const image = images[i];
        const filename = `${image.id}.jpg`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        // Progress indicator
        if (i % 10 === 0 || i === totalImages - 1) {
            const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
            const rate = (i / (Date.now() - startTime) * 1000).toFixed(1);
            process.stdout.write(
                `\r[${i + 1}/${totalImages}] Success: ${successCount} | Failed: ${failedCount} | ${elapsed}s (${rate} img/s)   `
            );
        }
        
        const result = await downloadImage(image.imageUrl, outputPath);
        
        if (result.success) {
            successCount++;
        } else {
            failedCount++;
            const errorKey = result.status || result.error || 'unknown';
            errors[errorKey] = (errors[errorKey] || 0) + 1;
        }
        
        // Tiny delay
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
    const avgRate = (totalImages / (Date.now() - startTime) * 1000).toFixed(2);
    
    // Print results
    console.log('\n\n' + '='.repeat(60));
    console.log('📈 FINAL RESULTS:');
    console.log('='.repeat(60));
    console.log(`✅ Successful downloads: ${successCount} (${((successCount/totalImages)*100).toFixed(1)}%)`);
    console.log(`❌ Failed downloads: ${failedCount} (${((failedCount/totalImages)*100).toFixed(1)}%)`);
    console.log(`⏱️  Total time: ${totalTime}s`);
    console.log(`⚡ Average speed: ${avgRate} images/second`);
    
    if (Object.keys(errors).length > 0) {
        console.log('\n📋 Error breakdown:');
        for (const [error, count] of Object.entries(errors).sort((a, b) => b[1] - a[1])) {
            console.log(`   ${error}: ${count} images (${((count/failedCount)*100).toFixed(1)}% of failures)`);
        }
    }
    
    console.log('\n📁 Downloaded images saved to:', path.resolve(OUTPUT_DIR));
    console.log('='.repeat(60));
    
    // Final verdict
    console.log('\n🎯 VERDICT:');
    const successRate = (successCount / totalImages) * 100;
    if (successRate >= 90) {
        console.log('✅ EXCELLENT! Direct download works great!');
        console.log(`   → ${successCount} images downloaded successfully`);
        console.log('   → You can use simple HTTP downloads for bulk scraping');
        console.log('   → No need for Puppeteer!');
    } else if (successRate >= 50) {
        console.log('⚠️  MODERATE: Partial success');
        console.log(`   → ${successCount} images downloaded (${successRate.toFixed(1)}%)`);
        console.log('   → Consider hybrid approach: Direct download + Puppeteer fallback');
    } else if (successRate >= 10) {
        console.log('⚠️  POOR: Most downloads blocked');
        console.log(`   → Only ${successCount} images downloaded (${successRate.toFixed(1)}%)`);
        console.log('   → You NEED Puppeteer screenshot method for reliable results');
    } else {
        console.log('❌ FAILED: Pinterest blocking almost everything');
        console.log(`   → Only ${successCount} images downloaded (${successRate.toFixed(1)}%)`);
        console.log('   → MUST use Puppeteer screenshot method');
    }
    console.log('='.repeat(60));
    
    // Estimated time for 1M images
    if (successRate > 0) {
        const estimatedTimeFor1M = (1000000 / (totalImages / (Date.now() - startTime) * 1000));
        const hours = (estimatedTimeFor1M / 3600).toFixed(1);
        console.log(`\n💡 If this success rate holds for 1M images:`);
        console.log(`   → Would take approximately ${hours} hours`);
        console.log(`   → Would successfully download ~${((successRate/100) * 1000000).toFixed(0)} images`);
        console.log('='.repeat(60));
    }
}

// Run
main().catch(err => {
    console.error('Error:', err);
    process.exit(1);
});