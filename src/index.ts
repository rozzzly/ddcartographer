import { Readable } from 'node:stream';
import FileRecord from './FileRecord';
import MapRegistry from './MapRegistry';
import { readIndex as readIndex, readMapFile } from './inputProcessor';

import { writeIndex, writeMapfile as writeMapFile } from './outputProcessor';
import path from 'node:path';
import Block, { BlockPrimitive } from './Block';

export interface DDCartographerOptions {
    indexFilePath: string | Readable;
    mapFilePath: string | Readable;
    reportPath?: string;
    silent?: boolean;
}

const defaultOpts: Partial<DDCartographerOptions> = {
    silent: false
};

export async function ddCartographer(options: DDCartographerOptions): Promise<MapRegistry> {
    const opts: Required<DDCartographerOptions> = { ...defaultOpts, ...options } as any;
    if (!opts.silent) {
        console.log();
    }

    const registry = new MapRegistry(opts);

    if (options.mapFilePath) {
        if (typeof opts.mapFilePath === 'string') {
            const blockPrimitives = await readMapFile(opts.mapFilePath, opts.silent);
            for (const primitive of blockPrimitives) {
                registry.blocks.push(new Block(registry, primitive));
            }
        } else {
            console.error('stream (stdin) input not yet implemented');
            process.exit(1);
        }
    }

    if (typeof opts.indexFilePath === 'string') {
        const files = await readIndex(opts.indexFilePath, opts.silent);
        await registry.ingestFileRecords(files);
    } else {
        console.error('stream (stdin) input not yet implemented');
        process.exit(1);
    }

    return registry;
    // await registry.mergeBlocks();

    // if (opts.listBlock) {
    //     for (const file of files) {
    //         if (file.start >= opts.listBlock[0] && file.end <= opts.listBlock[1]) {
    //             console.log(file.path);
    //         }
    //     }
    //     process.exit(0);
    // }

    // if (opts.writeIndex) {
    //     await writeIndex(registry, path.join(opts.outputDir, 'index.json'));
    // }

    // await writeMapFile(registry, path.join(opts.outputDir, 'mapfile.map'));
    // if (!opts.silent) {
    //     console.log();
    // }
}

export default ddCartographer;