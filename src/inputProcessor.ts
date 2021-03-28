import ora from 'ora';
import pb from 'pretty-bytes';
import fs from 'fs-extra';
import Chalk from 'chalk';
import { AsyncLineReader } from 'async-line-reader';
import { Readable } from 'node:stream';
import { FileRecord } from './FileRecord';
import { snooze } from './common';


export async function processInput(stream: Readable, silent: boolean = false): Promise<FileRecord[]> {
    const reader = new AsyncLineReader(stream);

    const records = [];

    let line: string | null;
    let lineNo = 0;
    let recordOffset = -1, recordSize = -1, totalSize = 0, parts = null;

    let s: any = null;
    let o: any = null;

    if (!silent) {
        o = ora({ text: 'Processing custer data from MFT', indent: 0 }).start();
        s = snooze();
        await s.sleep(3000);
    }

    while ((line = await reader.readLine()) !== null) {
        if (lineNo % 2 == 0) {
            parts = line.split(' ');
            recordOffset = Number.parseInt(parts[0]);
            recordSize = Number.parseInt(parts[1]);
            totalSize += recordSize;
        } else {
            records.push(new FileRecord(line.trim(), recordOffset, recordSize));
            if (!silent) {
                o.text = `Processed ${Chalk.yellow(records.length)} file records ${Chalk.cyan(`(${pb(totalSize)})`)}`;
            }
        }
        lineNo++;
    }

    if (!silent) {
        o.succeed(Chalk.green(`Complete. Processed ${Chalk.yellow(records.length)} file records ${Chalk.cyan(`(${pb(totalSize)})`)}`));
        await s.sleep(750);
    }
    return records;
}

export async function processFile(inputPath: string, silent: boolean = false): Promise<FileRecord[]> {
    const stream = fs.createReadStream(inputPath);
    const input = await processInput(stream, silent);
    stream.close();
    return input;
}