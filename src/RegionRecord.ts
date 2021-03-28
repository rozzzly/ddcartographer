import RegionRegistry from './RegionRegistry';
import { Ranged } from './common';
import FileRecord from './FileRecord';

export class RegionRecord implements Ranged {

    registry: RegionRegistry;
    start: number;
    size: number;
    end: number;
    files: FileRecord[];

    get paddedStart(): number {
        return Math.max(0, this.start - this.registry._opts.padding);
    }

    get paddedEnd(): number {
        return Math.min(this.registry._opts.domainSize, this.end + this.registry._opts.padding);
    }

    get paddingBloat(): number {
        return this.size - this.files.reduce((r, f) => r + f.size, 0);
    }

    constructor(registry: RegionRegistry, ...files: FileRecord[]) {
        // get typescript to shut up about uninitiated properties, they will be set properly in _recalculate();
        this.start = -1;
        this.end = -1;
        this.size = -1;
        this.files = [ ...files ];
        this.registry = registry;
        this._recalculate();
    }

    _recalculate(): void {
        this.files.sort((a, b) => a.start - b.start);
        this.files.forEach(file => {
            file.region = this;
        });

        this.start = this.files[0].start;
        this.end = this.files[this.files.length - 1].end;
        // this.start = Math.max(0, rawStart - (rawStart % this.registry._opts.alignment) );
        // this.end = Math.min(this.registry._opts.domainSize, rawEnd - (rawEnd % this.registry._opts.alignment) + this.registry._opts.alignment);
        this.size = this.end - this.start;
    }

    static merge(a: RegionRecord, b: RegionRecord): RegionRecord {
        return new RegionRecord(
            a.registry,
            ...a.files,
            ...b.files
        );
    }
}

export default RegionRecord;