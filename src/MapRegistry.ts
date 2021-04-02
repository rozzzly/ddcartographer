import ora from 'ora';
import Chalk from 'chalk';
import Block, { BlockStatus } from './Block';
import { formatNumber, snooze, SnoozeTimeout } from './common';
import FileRecord from './FileRecord';
import { DDCartographerOptions } from './index';

export class MapRegistry {
    blocks: Block[];
    files: FileRecord[];
    _opts: Required<DDCartographerOptions>;
    _fileRecordCount: number;
    _fileRecordTotalSize: number;

    constructor(opts: Required<DDCartographerOptions>) {
        this._opts = opts;
        this.blocks = [];
        this.files = [];
        this._fileRecordCount = 0;
        this._fileRecordTotalSize = 0;
    }

    getTotalBlockSize(blocks: Block[] = this.blocks): number {
        return this.blocks.reduce((reduction, block) => reduction + block.size, 0);
    }

    async ingestFileRecords(files: FileRecord[]): Promise<void> {
        let s: SnoozeTimeout = null as any;
        let o: ora.Ora = null as any;
        if (!this._opts.silent) {
            o = ora({ text: `Block registry ingesting file records`, indent: 0 }).start();
            s = snooze();
            s.sleep(1000);
        }
        this.files = files;
        if (this.blocks.length) {
            let r = 0, cBlock = this.blocks[r];
            for (const file of files) {
                while (cBlock && cBlock.start >= file.end) {
                    // keep moving block cursor forward until file is found.
                    cBlock = this.blocks[++r];
                }

                if (!cBlock) break;
                do {
                    cBlock.files.push(file);
                    file.blocks.push(cBlock);
                } while (file.end > cBlock.end && (cBlock = this.blocks[++r]));

            }
        } else {
            for (const file of files) {
                this.blocks.push(new Block(this, { start: file.start, end: file.end, status: BlockStatus.Unspecified}));
                this._fileRecordCount++;
                this._fileRecordTotalSize += file.size;
            }
        }

        // sort the blocks
        this.blocks.sort((a, b) => a.start - b.start);

        if (!this._opts.silent) {
            await s.sleep(200);
            o.succeed(Chalk.green('Complete. All file records added to block registry '));
            await s.sleep(500);
        }
    }

    async mergeBlocks(): Promise<void> {
        let s: SnoozeTimeout = null as any;
        let o: ora.Ora = null as any;

        const result = [];
        let idx = 0;
        let merges = 0;

        const renderStatus = () => ([
            'Merging block ',
            Chalk.yellow(idx),
            ' of ',
            Chalk.yellow(this.blocks.length),
            ' [ merges: ',
            Chalk.yellow(merges),
            ', count reduction: ',
            Chalk.yellow(
                formatNumber((1.0 - (result.length / this._fileRecordCount))*100) + '%'
            ),
            ' ]'
        ].join(''));

        if (!this._opts.silent) {
            s = snooze();
            await s.sleep(1000);
            o = ora({ text: renderStatus(), indent: 0 }).start();
            await s.sleep(1000);
        }
        let last = this.blocks[0];

        // idx declared above so renderStatus() can see it
        for (idx = 1; idx < this.blocks.length; idx += 1) {
            if (last.end >= this.blocks[idx].start) {
                last = Block.merge(last, this.blocks[idx]);
                merges++;
            } else {
                result.push(last);
                last = this.blocks[idx];
            }
            if (!this._opts.silent) {
                o.text = renderStatus();
                // await s.sleep(10);
            }
        }
        result.push(last);
        if (!this._opts.silent) {
            o.text = renderStatus();
            const sizeDelta = this.getTotalBlockSize(result) - this._fileRecordTotalSize;
            await s.sleep(2000);
            o.succeed(Chalk.green([
                'Complete. ',
                Chalk.yellow(this.blocks.length),
                ' blocks merged into ',
                Chalk.yellow(result.length),
                ' blocks (count reduction: ',
                Chalk.yellow(
                    formatNumber((1.0 - (result.length / this._fileRecordCount))*100) + '%'
                ),
                ')'
            ].join('')));
        }
        this.blocks = result;
    }
}

export default MapRegistry;
