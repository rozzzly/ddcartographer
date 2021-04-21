import Chalk from 'chalk';
import pb from 'pretty-bytes';
import fs from 'fs-extra';
import commander, { addOption } from 'commander';
import ddCartographer from '../index';
import { parseBytes } from 'iec-bytes-parser';
import Block, { BlockPrimitive, BlockStatus } from '../Block';
import { fmtNumber, snooze } from '../common';
import ora from 'ora';
import { readFileList } from '../inputProcessor';
import { start } from 'node:repl';
import { writeMapfile } from '../outputProcessor';

const fileFilterOption = () => new commander.Option(
    '-f, --file-filter <pattern>',
    'filters using a glob matched whitelist. See docs for the "micromatch" package on npm for supported patterns (bash 4.3 interoperability)'
);

const headsOption = () => new commander.Option(
    '-h, --heads',
    'include only the first 10% of a file (can be used in conjunction with --tails)'
);

const tailsOption = () => new commander.Option(
    '-t, --tails',
    'include only the last 10% of a file (can be used in conjunction with --heads)'
);

interface DomainOptions {
    fileFilter: string | undefined;
    heads: boolean;
    tails: boolean;
}


export function addSubcommand_domain(root: commander.Command): void {
    const domain = new commander.Command('domain');
    domain.description('generates a custom domain file');

    (domain
        .command('fromFileList <fileListPath> <domainFilePath> <size>')
        .description('generates a domain file from a file list', {
            fileListPath: 'path to file list',
            domainFilePath: 'path domainFile will be written to',
            size: 'size of entire disk (in bytes)'
        })
        .addOption(fileFilterOption())
        .addOption(headsOption())
        .addOption(tailsOption())
        .action(async (fileListPath: string, domainFilePath: string, sizeRaw: string, opts: DomainOptions) => {
            const registry = await ddCartographer({
                domainFilePath,
                fileListPath: fileListPath,
                ...root.opts(),
                ...opts
            });
            if (typeof fileListPath !== 'string') {
                console.error('stream (stdin) input not yet implemented');
                process.exit(1);
            } else {
                const files = await readFileList(fileListPath, registry._opts);
                const sizeParsed = parseBytes(sizeRaw);
                let offset = 0;
                const blocks: BlockPrimitive[] = [];
                for (const file of files) {
                    if (offset < file.start && file.start !== 0) {
                        blocks.push({
                            status: BlockStatus.BadSector,
                            start: offset,
                            end: file.start
                        });
                    }
                    if (opts.heads || opts.tails) {
                        if (opts.heads) {
                            blocks.push({
                                status: BlockStatus.Finished,
                                start: file.start,
                                end: file.start + Math.floor(file.size/10)
                            });
                            if (!opts.tails) {
                                blocks.push({
                                    status: BlockStatus.BadSector,
                                    start: file.start + Math.floor(file.size/10),
                                    end: file.end
                                });
                            }
                        }
                        if (opts.heads && opts.tails) {
                            blocks.push({
                                status: BlockStatus.BadSector,
                                start: file.start + Math.floor(file.size/10),
                                end: file.end - Math.floor(file.size/10),
                            });
                        }
                        if (opts.tails) {
                            if (!opts.heads) {
                                blocks.push({
                                    status: BlockStatus.BadSector,
                                    start: file.start,
                                    end: file.end - Math.floor(file.size/10),
                                });
                            }
                            blocks.push({
                                status: BlockStatus.Finished,
                                start: file.end - Math.floor(file.size/10),
                                end: file.end
                            });
                        }
                    } else {
                        blocks.push({
                            status: BlockStatus.Finished,
                            start: file.start,
                            end: file.end
                        });
                    }
                    offset = blocks[blocks.length - 1].end;
                }
                if (offset < sizeParsed) {
                    blocks.push({
                        status: BlockStatus.BadSector,
                        start: offset,
                        end: sizeParsed
                    });
                }
                for (const block of blocks) {
                    registry.blocks.push(new Block(registry, block));
                }
                await registry.ingestFileRecords(files);
                writeMapfile(registry, domainFilePath);
            }
        })
    );
    root.addCommand(domain);
}
export default addSubcommand_domain;