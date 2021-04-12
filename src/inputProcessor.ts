import ora from 'ora';
import pb from 'pretty-bytes';
import fs from 'fs-extra';
import Chalk from 'chalk';
import { Readable } from 'node:stream';
import { AsyncLineReader } from 'async-line-reader';
import { FileRecord } from './FileRecord';
import { snooze } from './common';
import Block, { BlockStatus, BlockPrimitive, StatusCharToStatusEnum, StatusChar } from './Block';
import { DDCartographerOptions } from '.';
import micromatch from 'micromatch';


export async function readFileListFile(stream: Readable, opts: DDCartographerOptions): Promise<FileRecord[]> {
    const reader = new AsyncLineReader(stream);
    const records = [];

    let line: string | null;
    let lineNo = 0;
    let fileOffset = -1, fileSize = -1, totalSize = 0, parts = null;

    const sleep = snooze();
    let o: any = null;

    if (!opts.silent) {
        o = ora({ text: 'Reading file list...', indent: 0 }).start();
        await sleep(1000);
    }

    let excludedCount = 0;
    let excludedSize = 0;
    while ((line = await reader.readLine()) !== null) {
        if (lineNo % 2 == 0) {
            parts = line.split(' ');
            fileOffset = Number.parseInt(parts[0]);
            fileSize = Number.parseInt(parts[1]);
        } else {
            const filePath = FileRecord.normalizePath(line.trim());
            if (opts.fileFilter) {
                if (micromatch.isMatch(filePath, opts.fileFilter)) {
                    totalSize += fileSize;
                    records.push(new FileRecord(filePath, fileOffset, fileSize));
                } else {
                    excludedSize += fileSize;
                    excludedCount++;
                }
                if (!opts.silent && sleep.delta > 250) {
                    o.text = [
                        'Collected ',
                        Chalk.yellow(records.length),
                        ` file records${excludedCount === 0 ? '' : 's'} `,
                        Chalk.cyan(`(${pb(totalSize)})`),
                        ' from file list. ',
                        Chalk.yellow(records.length),
                        ` file record${excludedCount === 0 ? ' was' : 's were'} excluded `,
                        Chalk.cyan(`(${pb(excludedSize)})`),
                    ].join('');
                }
            } else {
                totalSize += fileSize;
                records.push(new FileRecord(line.trim(), fileOffset, fileSize));
                if (!opts.silent && sleep.delta > 250) {
                    o.text = [
                        'Collected ',
                        Chalk.yellow(records.length),
                        ` file records${excludedCount === 0 ? '' : 's'} `,
                        Chalk.cyan(`(${pb(totalSize)})`),
                        ' from file list.'
                    ].join('');
                }
            }
        }
        lineNo++;
    }

    if (!opts.silent) {
        o.succeed(Chalk.green(`Complete. Collected ${Chalk.yellow(records.length)} file records ${Chalk.cyan(`(${pb(totalSize)})`)} from file list.`));
        await sleep(750);
    }
    return records;
}

export async function readFileList(inputPath: string, opts: DDCartographerOptions): Promise<FileRecord[]> {
    const stream = fs.createReadStream(inputPath);
    const files = await readFileListFile(stream, opts);
    stream.close();
    return files;
}

const mapFileRegExp = /\s*(?<startOffset>0x[a-fA-F0-9]+)\s+(?<size>0x[a-fA-F0-9]+)\s+(?<status>[?*/\-+])/;

export async function readMap(stream: Readable, silent: boolean = false): Promise<BlockPrimitive[]> {
    const reader = new AsyncLineReader(stream);
    const blocks: BlockPrimitive[] = [];

    let line: string | null;
    const sleep = snooze();
    let o: ora.Ora = null as any;

    if (!silent) {
        o = ora({ text: 'Reading ddrescue mapfile...', indent: 0 }).start();
        await sleep(1000);
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
                o.text = `${Chalk.yellow(blocks.length - 1)} block${blocks.length === 1 ? '' : 's'} added from ddrescue mapfile.`;
            }
        }
    }

    if (!silent) {
        o.succeed(Chalk.green(`Complete. ${Chalk.yellow(blocks.length - 1)} block${blocks.length === 1 ? '' : 's'} added from ddrescue mapfile.`));
    }

    return blocks;
}

export async function readMapFile(inputPath: string, silent: boolean = false): Promise<BlockPrimitive[]> {
    const stream = fs.createReadStream(inputPath);
    const blocks = await readMap(stream, silent);
    stream.close();
    return blocks;
}