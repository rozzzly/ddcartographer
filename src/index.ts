import { Readable } from 'node:stream';
import FileRecord from './FileRecord';
import RegionRegistry from './RegionRegistry';
import { processFile } from './inputProcessor';
import { UnitMultipliers } from './common';
import { writeIndex, writeMapfile } from './outputProcessor';
import path from 'node:path';
import { exit } from 'node:process';

export interface DDCartographerOptions {
    input: string | Readable;
    outputDir?: string;
    silent?: boolean;
    padding?: number;
    alignment?: number;
    listRegion?: false | [number, number]
    domainSize: number;
    writeIndex: boolean;
}

const defaultOpts: Partial<DDCartographerOptions> = {
    silent: false,
    padding: 10 * UnitMultipliers.MB,
    alignment: 1 * UnitMultipliers.MB
};

export async function ddCartographer(options: DDCartographerOptions): Promise<void> {
    const opts: Required<DDCartographerOptions> = { ...defaultOpts, ...options } as any;
    if (!opts.silent) {
        console.log();
    }

    let files: FileRecord[];
    if (typeof opts.input === 'string') {
        files = await processFile(opts.input, opts.silent);
    } else {
        console.error('stream (stdin) input not yet implemented');
        process.exit(1);
    }

    const registry = new RegionRegistry(opts);
    registry.ingestFileRecords(files);
    await registry.mergeRegions();

    if (opts.listRegion) {
        for (const file of files) {
            if (file.start >= opts.listRegion[0] && file.end <= opts.listRegion[1]) {
                console.log(file.path);
            }
        }
        process.exit(0);
    }

    if (opts.writeIndex) {
        await writeIndex(registry, path.join(opts.outputDir, 'index.json'));
    }

    await writeMapfile(registry, path.join(opts.outputDir, 'mapfile.map'));
    if (!opts.silent) {
        console.log();
    }
}

export default ddCartographer;