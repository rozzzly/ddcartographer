import path from 'node:path';
import Block from './Block';
import { Ranged } from './common';

export class FileRecord implements Ranged {

    blocks: Block[];
    path: string;
    start: number;
    size: number;
    end: number;

    constructor(path: string, offset: number, size: number) {
        this.path = FileRecord.normalizePath(path);
        this.start = offset;
        this.end = offset + size;
        this.size = size;
        this.blocks = [];
    }

    _sort(): void {
        this.blocks = this.blocks.sort((a, b) => a.start - b.start);
    }

    static normalizePath(rawPath: string): string {
        return path.normalize(rawPath.replace(/^;\\\$Root\\/, ''));
    }
}

export default FileRecord;