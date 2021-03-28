import path from 'node:path';
import RegionRecord from './RegionRecord';
import { Ranged } from './common';

export class FileRecord implements Ranged {

    region: RegionRecord | null;
    path: string;
    start: number;
    size: number;
    end: number;

    constructor(path: string, offset: number, size: number) {
        this.path = FileRecord.normalizePath(path);
        this.start = offset;
        this.end = offset + size;
        this.size = size;
        this.region = null;
    }

    static normalizePath(rawPath: string): string {
        return path.normalize(rawPath.replace(/^;\\\$Root\\/, ''));
    }
}

export default FileRecord;