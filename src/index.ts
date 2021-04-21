import { Readable } from 'node:stream';
import MapRegistry from './MapRegistry';
import { readFileList, readMapFile } from './inputProcessor';
import Block, { BlockPrimitive } from './Block';

export interface DDCartographerOptions {
    fileListPath: string | Readable;
    fileFilter?: string;
    domainFilePath?: string;
    mapFilePath?: string | Readable;
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

    return registry;
}

export default ddCartographer;