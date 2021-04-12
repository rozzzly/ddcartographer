import ora from 'ora';
import pb from 'pretty-bytes';
import Chalk from 'chalk';
import Block, { BlockStatus } from '../Block';
import { snooze, fmtNumber, colorizeReadable, colorizeBytes } from '../common';
import MapRegistry from '../MapRegistry';
import FileRecord from '../FileRecord';

export interface BlockStatusBreakdown {
    size: number;
    humanReadable: string;
    count: number;
    percent: number;
}

export interface FileStatusBreakdown {
    path: string;
    size: number;
    sizeReadable: string;
    offset: number;
    recovered: number;
    recoveredReadable: string;
    unrecovered: number;
    unrecoveredReadable: string;
    blockCount: number;
    blocks: {
        [K in Exclude<BlockStatus, 'Unspecified'>]: BlockStatusBreakdown;
    };
}

export async function analyzeFileRecords(this: MapRegistry): Promise<FileStatusBreakdown[]> {
    const sleep = snooze();
    let o: ora.Ora = null as any;
    if (!this._opts.silent) {
        o = ora({ text: `Analyzing recovery status...`, indent: 0 }).start();
        await sleep(1000);
    }
    const breakdowns = [];
    for (const [i, file] of this.files.entries()) {
        if (!this._opts.silent) {
            o.text = `Analyzing file ${Chalk.yellow(i+1)} of ${Chalk.yellow(this.files.length)}`;
            await sleep(150);
        }
        const fileBreakdown: FileStatusBreakdown = {
            path: file.path,
            size: file.size,
            sizeReadable: pb(file.size),
            offset: file.start,
            recovered: 0,
            recoveredReadable: '',
            unrecovered: 0,
            unrecoveredReadable: '',
            blockCount: file.blocks.length,
            blocks: {
                [BlockStatus.Finished]: {
                    count: 0,
                    size: 0,
                    humanReadable: '',
                    percent: 0
                },
                [BlockStatus.BadSector]: {
                    count: 0,
                    size: 0,
                    humanReadable: '',
                    percent: 0
                },
                [BlockStatus.NonScraped]: {
                    count: 0,
                    size: 0,
                    humanReadable: '',
                    percent: 0
                },
                [BlockStatus.NonTrimmed]: {
                    count: 0,
                    size: 0,
                    humanReadable: '',
                    percent: 0
                },
                [BlockStatus.NonTried]: {
                    count: 0,
                    size: 0,
                    humanReadable: '',
                    percent: 0
                }
            }
        };
        for (const block of file.blocks) {
            fileBreakdown.blocks[block.status].count++;
            fileBreakdown.blocks[block.status].size += (
                Math.min(block.end, file.end)
                -
                Math.max(block.start, file.start)
            );
        }
        fileBreakdown.blocks = Object.entries(fileBreakdown.blocks).reduce((r, [k, b])  => ({
            ...r,
            [k]: {
                ...b,
                percent: b.size / file.size,
                humanReadable: `${pb(b.size)} (${fmtNumber((b.size / file.size) * 100)}%)`
            } as BlockStatusBreakdown
        }), {}) as FileStatusBreakdown['blocks'];
        fileBreakdown.recovered = fileBreakdown.blocks[BlockStatus.Finished].size;
        fileBreakdown.recoveredReadable = [
            pb(fileBreakdown.recovered),
            ' (',
            fmtNumber(fileBreakdown.blocks[BlockStatus.Finished].percent * 100),
            '%)'

        ].join('');
        fileBreakdown.unrecovered = file.size - fileBreakdown.blocks[BlockStatus.Finished].size;
        fileBreakdown.unrecoveredReadable = [
            pb(fileBreakdown.unrecovered),
            ' (',
            fmtNumber((1.0 - fileBreakdown.blocks[BlockStatus.Finished].percent) * 100),
            '%)'

        ].join('');
        breakdowns.push(fileBreakdown);
    }
    if (!this._opts.silent) {
        o.succeed(Chalk.green(`Complete. Analyzed ${Chalk.yellow(this.files.length)} files.`));
        await sleep(2000);
        console.log();
        console.log(Chalk.blue('┌───────────────────────┐'));
        console.log(Chalk.blue('│ File Status Breakdown │'));
        console.log(Chalk.blue('└───────────────────────┘'));
        for (const file of breakdowns) {
            console.log('');
            if (file.unrecovered) {
                console.log(Chalk.blue.dim(file.path));
            } else {
                console.log(Chalk.green.dim(file.path));
            }
            console.log(`  size: ${colorizeBytes(file.sizeReadable)}`);
            if (!file.unrecovered) {
                console.log(`  ${Chalk.green('recovered')}: ${colorizeReadable(file.recoveredReadable)}`);
            } else {
                console.log(`  block count: ${Chalk.cyan(file.blockCount)}`);
                console.log(`  ${Chalk.yellow('recovered')}: ${colorizeReadable(file.recoveredReadable)}`);
                console.log(`  ${Chalk.yellow('unrecovered')}: ${colorizeReadable(file.unrecoveredReadable)}`);
                for (const [kind, block] of Object.entries(file.blocks)) {
                    if (block.size === 0 || kind === BlockStatus.Finished) continue; // don't report unless there's blocks of this kind
                    console.log(`  ${Chalk.red(kind)}: ${colorizeReadable(block.humanReadable)}`);
                }
            }
        }
        console.log();
    }
    return breakdowns;
}

export async function ingestFileRecords(this: MapRegistry, files: FileRecord[]): Promise<void> {
    const sleep = snooze();
    let o: ora.Ora = null as any;
    if (!this._opts.silent) {
        o = ora({ text: `ingesting file records...`, indent: 0 }).start();
        await sleep(1000);
    }
    this.files = files;
    if (this.blocks.length) {
        let r = 0, cBlock = this.blocks[r];
        for (const [i, file] of files.entries()) {
            while (cBlock && cBlock.start >= file.end) {
                // keep moving block cursor forward until file is found.
                cBlock = this.blocks[++r];
            }
            if (!this._opts.silent && sleep.delta > 250) {
                o.text = `ingested file ${Chalk.yellow(i)} of ${Chalk.yellow(files.length)} ${Chalk.cyan(`(${ fmtNumber((i / files.length) * 100)}%)`)})`;
            }

            if (!cBlock) break;
            do {
                cBlock.files.push(file);
                file.blocks.push(cBlock);
            } while (file.end > cBlock.end && (cBlock = this.blocks[++r]));

        }
    } else {
        for (const file of files) {
            this.blocks.push(new Block(this, { start: file.start, end: file.end, status: BlockStatus.NonTried}));
            this._fileRecordCount++;
            this._fileRecordTotalSize += file.size;
        }
    }

    // sort the blocks
    // this.blocks.sort((a, b) => a.start - b.start);

    if (!this._opts.silent) {
        await sleep(200);
        o.succeed(Chalk.green('Complete. All file records added to block registry '));
        await sleep(500);
    }
}