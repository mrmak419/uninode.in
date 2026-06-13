import fs from 'fs';
import zlib from 'zlib';
import { promisify } from 'util';
const brotliCompress = promisify(zlib.brotliCompress);

async function test() {
    const data = fs.readFileSync('public/data_engineering.json');
    console.log(`Original size: ${(data.length/1024/1024).toFixed(2)} MB`);
    
    console.time('Brotli Quality 11 (Default)');
    const b11 = await brotliCompress(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 11 }});
    console.timeEnd('Brotli Quality 11 (Default)');
    console.log(`Size 11: ${(b11.length/1024/1024).toFixed(2)} MB\n`);

    console.time('Brotli Quality 4');
    const b4 = await brotliCompress(data, { params: { [zlib.constants.BROTLI_PARAM_QUALITY]: 4 }});
    console.timeEnd('Brotli Quality 4');
    console.log(`Size 4: ${(b4.length/1024/1024).toFixed(2)} MB\n`);
}
test();
