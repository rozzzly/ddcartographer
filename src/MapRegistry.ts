import ora from 'ora';
import Chalk from 'chalk';
import Block, { BlockPrimitive, BlockStatus } from './Block';
import { fmtNumber, Ranged, snooze, SnoozeTimeout } from './common';
import FileRecord from './FileRecord';
import { DDCartographerOptions } from './index';
import { analyzeFileRecords, FileStatusBreakdown, ingestFileRecords } from './registryDelegates/files';

export class MapRegistry {
    dirty: boolean;
    blocks: Block[];
    files: FileRecord[];
    _opts: Required<DDCartographerOptions>;
    _fileRecordCount: number;
    _fileRecordTotalSize: number;

    constructor(opts: Required<DDCartographerOptions>) {
        this.dirty = true;
        this._opts = opts;
        this.blocks = [];
        this.files = [];
        this._fileRecordCount = 0;
        this._fileRecordTotalSize = 0;
    }

    locate(offset: number): Block {
        return this.blocks[this.locateIndex(offset)];
    }

    locateIndex(offset: number): number {
        if (this.blocks.length === 0 || offset < 0 || offset >= this.blocks.length) {
            throw new RangeError(`offset ${offset} out of range`);
        } else {
            let low = 0;
            let high = this.blocks.length - 1;
            let mid = -1;
            let oldMid = -1;
            let cBlock: Block;
            do {
                oldMid = mid;
                mid = Math.floor((high + low) / 2);
                if (mid === oldMid) {
                    const e = new Error(`Encountered infinite recursion on range when searching for offset ${offset}`);
                    console.error(e, this);
                    throw e;
                }
                cBlock = this.blocks[mid];

                if (cBlock.start > offset) { // cNode start too late, move cursor left
                    high = mid - 1;
                } else if (cBlock.end <= offset) { // cNode ends too early, more cursor right
                    low = mid + 1;
                }
            } while (cBlock.start > offset || cBlock.end <= offset);
            return mid;
        }
    }

    write(startOffset: number, pBlocks: BlockPrimitive[]): void {

    }

    getTotalBlockSize(blocks: Block[] = this.blocks): number {
        return this.blocks.reduce((reduction, block) => reduction + block.size, 0);
    }

    async analyzeFileRecords(): Promise<FileStatusBreakdown[]> {
        return analyzeFileRecords.call(this);
    }


    async ingestFileRecords(files: FileRecord[]): Promise<void> {
        return ingestFileRecords.call(this, files);
    }
}

export default MapRegistry;
