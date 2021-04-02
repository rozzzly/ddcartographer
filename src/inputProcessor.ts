import ora from 'ora';
import pb from 'pretty-bytes';
import fs from 'fs-extra';
import Chalk from 'chalk';
import { Readable } from 'node:stream';
import { AsyncLineReader } from 'async-line-reader';
import { FileRecord } from './FileRecord';
import { snooze, SnoozeTimeout } from './common';
import Block, { BlockStatus, BlockPrimitive, StatusCharToStatusEnum, StatusChar } from './Block';


export async function readIndexFile(stream: Readable, silent: boolean = false): Promise<FileRecord[]> {
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
        await s.sleep(1000);
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

export async function readIndex(inputPath: string, silent: boolean = false): Promise<FileRecord[]> {
    const stream = fs.createReadStream(inputPath);
    const files = await readIndexFile(stream, silent);
    stream.close();
    return files;
}

const mapFileRegExp = /\s*(?<startOffset>0x[a-fA-F0-9]+)\s+(?<size>0x[a-fA-F0-9]+)\s+(?<status>[?*/\-+])/;

export async function readMap(stream: Readable, silent: boolean = false): Promise<BlockPrimitive[]> {
    const reader = new AsyncLineReader(stream);
    const blocks: BlockPrimitive[] = [];

    let line: string | null;
    let s: SnoozeTimeout = null as any;
    let o: ora.Ora = null as any;

    if (!silent) {
        o = ora({ text: 'Reading ddrescue mapfile', indent: 0 }).start();
        s = snooze();
        await s.sleep(1000);
    }

    while ((line = await reader.readLine()) !== null) {
        const match = mapFileRegExp.exec(line);
        if (match) {
            const start = parseInt(match.groups!.startOffset);
            const size = parseInt(match.groups!.size);
            const end = start + size;

            blocks.push({
                start, end,
                status: StatusCharToStatusEnum[match.groups!.status as any as StatusChar]
            });
            if (!silent) {
                o.text = `Read ddrescue mapfile. ${Chalk.yellow(blocks.length - 1)} block${blocks.length === 1 ? '' : 's'} added.`;
            }
        }
    }

    if (!silent) {
        o.succeed(Chalk.green(`Processed mapfile. ${Chalk.yellow(blocks.length - 1)} block${blocks.length === 1 ? '' : 's'} added.`));
    }

    return blocks;
}

export async function readMapFile(inputPath: string, silent: boolean = false): Promise<BlockPrimitive[]> {
    const stream = fs.createReadStream(inputPath);
    const blocks = await readMap(stream, silent);
    stream.close();
    return blocks;
}