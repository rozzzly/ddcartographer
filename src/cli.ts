import { Command } from 'commander';
import { resolve } from 'node:path';
import fs from 'fs-extra';
import ddCartographer, { DDCartographerOptions } from './index';
import { parseBytes } from './common';
import { BlockStatus } from './Block';
import { report } from 'node:process';


const listBlockRegExp = / *((?:\d+) ?(?:B|KB?|MB?|GB?|TB?)?) *, *((?:\d+) ?(?:B|KB?|MB?|GB?|TB?)?)/;


async function run(): Promise<void> {
    const program = (new Command()
        .name('ddcartographer')
        .version('0.0.1', '--version')
        .option('-s, --silent', 'disable interactive cli interface')
    );

    const status = new Command('status');
    status.description('lists files with a specific recovery status');
    (status
        .command('complete <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files with 100% finished blocks', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        })
    );
    (status
        .command('incomplete <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files that are not 100% recovered (including those with non-scraped, non-trimmed, bad sectors)', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        })
    );
    (status
        .command('failed <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files where all blocks are tried but some are failed (ie: non-scraped, non-trimmed, bad sectors)', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        })
    );
    (status
        .command('bad <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files that contain bad sectors but no non-scrapped or non-trimmed blocks', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        }).action(async (mapFilePath, fileListPath, reportPath, options, command) => {
            const registry = await ddCartographer({
                mapFilePath,
                reportPath,
                indexFilePath: fileListPath
            });
            console.log('okay gonna try to filter for bad ones now');
            const bad = [];
            for (const file of registry.files) {
                for (const block of file.blocks) {
                    if (block.status === BlockStatus.BadSector) {
                        bad.push(file.path);
                        console.log(file.path);
                        break;
                    }
                }
            }
            console.log(`okay found ${bad.length} bad files... gonna write it now`);
            await fs.writeJson(reportPath, bad);
        })
    );
    program.addCommand(status);

    await program.parseAsync(process.argv);
}

// async function run(): Promise<void> {
//     debugger;
//     const args = minimist(process.argv.slice(2));
//     const listFile = resolve(args._[0]);
//     const mapFile = resolve(args._[1]);

//     if (!await pathExists(listFile)) {
//         console.error('Input file does not exist', {
//             resolvedInputFile: listFile,
//             rawInputFilePath: args._[0],
//             args
//         });
//         process.exit(1);
//     }
//     if (mapFile && !await pathExists(mapFile)) {
//         console.error('mapFile file does not exist', {
//             resolvedInputFile: mapFile,
//             rawInputFilePath: args._[1],
//             args
//         });
//         process.exit(1);
//     }
//     const opts: Partial<DDCartographerOptions> = {
//         indexFile: listFile,
//         mapFile: mapFile,
//         silent: args.silent,
//         listBlock: false,
//         writeIndex: false
//     };

//     if ('list-files' in args) {
//         if (args['list-files'] !== true) {
//             const match = listBlockRegExp.exec(args['list-files']);
//             if (match) {
//                 const start = parseBytes(match[1]);
//                 const end = parseBytes(match[2]);
//                 if (!start) {
//                     console.error('Failed to parse list block start offset', {
//                         offset: match[1],
//                         args
//                     });
//                     process.exit(1);
//                 } else if (!end) {
//                     process.exit(1);
//                     console.error('Failed to parse list block end offset', {
//                         offset: match![2],
//                         args
//                     });
//                 } else {
//                     opts.listBlock = [start, end];
//                 }
//             } else {
//                 console.log('Failed to parse list block offsets', {
//                     offset: args['list-files'],
//                     args
//                 });
//                 process.exit(1);
//             }
//         }
//     }

//     if ('write-index' in args) {
//         opts.writeIndex = true;
//     }

//     if ('s' in args) {
//         const size = parseBytes(args.s);
//         if (size === null) {
//             console.error('Failed to parse value for size argument passed via -s. Need a valid domain size.', {
//                 value: args.s,
//                 args: args
//             });
//             process.exit(1);
//         }
//         opts.domainSize = size;
//     } else if ('domain-size' in args) {
//         const padding = parseBytes(args.size);
//         if (padding === null) {
//             console.error('Failed to parse value for size argument passed via --size. Need a valid domain size.', {
//                 value: args.size,
//                 args: args
//             });
//             process.exit(1);
//         }
//         opts.padding = padding;
//     } else {
//         console.error('No domain size was specified. A domain size must be specified with -s or --size.', {
//             args: args
//         });
//         process.exit(1);
//     }

//     if ('o' in args) {
//         await ensureDir(args.o);
//         opts.outputDir = args.o;
//     } else if ('output-dir' in args) {
//         await ensureDir(args['output-dir']);
//         opts.outputDir = args['output-dir'];
//     }
//     // } else {
//     //     console.error('No output directory was specified. An output directory must be specified with -o or --output-dir.', {
//     //         args: args
//     //     });
//     //     process.exit(1);
//     // }


//     await ddCartographer(opts as any);
// }

run();