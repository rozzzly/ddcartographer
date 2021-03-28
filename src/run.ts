import minimist from 'minimist';
import { resolve } from 'node:path';
import { ensureDir, pathExists } from 'fs-extra';
import ddCartographer, { DDCartographerOptions } from './index';
import { parseBytes } from './common';
import { start } from 'node:repl';


const listRegionRegExp = / *((?:\d+) ?(?:B|KB?|MB?|GB?|TB?)?) *, *((?:\d+) ?(?:B|KB?|MB?|GB?|TB?)?)/;

async function run(): Promise<void> {
    debugger;
    const args = minimist(process.argv.slice(2));
    const inputFile = resolve(args._[0]);

    if (!await pathExists(inputFile)) {
        console.error('Input file does not exist', {
            resolvedInputFile: inputFile,
            rawInputFile: args._[0]
        });
        process.exit(1);
    }

    const opts: Partial<DDCartographerOptions> = {
        input: inputFile,
        silent: args.silent,
        listRegion: false,
        writeIndex: false
    };

    if ('list-files' in args) {
        if (args['list-files'] !== true) {
            const match = listRegionRegExp.exec(args['list-files']);
            if (match) {
                const start = parseBytes(match[1]);
                const end = parseBytes(match[2]);
                if (!start) {
                    console.error('Failed to parse list region start offset', {
                        offset: match[1],
                        args
                    });
                    process.exit(1);
                } else if (!end) {
                    process.exit(1);
                    console.error('Failed to parse list region end offset', {
                        offset: match![2],
                        args
                    });
                } else {
                    opts.listRegion = [start, end];
                }
            } else {
                console.log('Failed to parse list region offsets', {
                    offset: args['list-files'],
                    args
                });
                process.exit(1);
            }
        }
    }

    if ('write-index' in args) {
        opts.writeIndex = true;
    }

    if ('s' in args) {
        const size = parseBytes(args.s);
        if (size === null) {
            console.error('Failed to parse value for size argument passed via -s. Need a valid domain size.', {
                value: args.s,
                args: args
            });
            process.exit(1);
        }
        opts.domainSize = size;
    } else if ('domain-size' in args) {
        const padding = parseBytes(args.size);
        if (padding === null) {
            console.error('Failed to parse value for size argument passed via --size. Need a valid domain size.', {
                value: args.size,
                args: args
            });
            process.exit(1);
        }
        opts.padding = padding;
    } else {
        console.error('No domain size was specified. A domain size must be specified with -s or --size.', {
            args: args
        });
        process.exit(1);
    }

    if ('o' in args) {
        await ensureDir(args.o);
        opts.outputDir = args.o;
    } else if ('output-dir' in args) {
        await ensureDir(args['output-dir']);
        opts.outputDir = args['output-dir'];
    } else {
        console.error('No output directory was specified. An output directory must be specified with -o or --output-dir.', {
            args: args
        });
        process.exit(1);
    }

    if ('p' in args) {
        const padding = parseBytes(args.p);
        if (padding === null) {
            console.error('Failed to parse value for padding argument passed via -p. Need a valid padding size.', {
                value: args.p,
                args: args
            });
            process.exit(1);
        }
        opts.padding = padding;
    }
    if ('padding' in args) {
        const padding = parseBytes(args.padding);
        if (padding === null) {
            console.error('Failed to parse value for padding argument passed via --padding. Need a valid padding size.', {
                value: args.padding,
                args: args
            });
            process.exit(1);
        }
        opts.padding = padding;
    }
    if ('a' in args) {
        const alignment = parseBytes(args.a);
        if (alignment === null) {
            console.error('Failed to parse value for alignment argument passed via -a. Need a valid alignment size.', {
                value: args.a,
                args: args
            });
            process.exit(1);
        }
        opts.alignment = alignment;
    }
    if ('alignment' in args) {
        const alignment = parseBytes(args.alignment);
        if (alignment === null) {
            console.error('Failed to parse value for alignment argument passed via --alignment. Need a valid alignment size.', {
                value: args.alignment,
                args: args
            });
            process.exit(1);
        }
        opts.alignment = alignment;
    }

    await ddCartographer(opts as any);
}

run();