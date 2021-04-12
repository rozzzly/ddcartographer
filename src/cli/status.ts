import Chalk from 'chalk';
import pb from 'pretty-bytes';
import fs from 'fs-extra';
import commander from 'commander';
import ddCartographer from '../index';
import { BlockStatus } from '../Block';
import { fmtNumber, snooze } from '../common';
import ora from 'ora';

const fileFilterOption = () => new commander.Option(
    '-f, --file-filter <pattern>',
    'filters using a glob matched whitelist. See docs for the "micromatch" package on npm for supported patterns (bash 4.3 interoperability)'
);


interface StatusOptions {
    fileFilter: string | undefined;
}


export function addSubcommand_status(root: commander.Command): void {
    const status = new commander.Command('status');
    status.description('lists files with a specific recovery status');
    (status
        .command('breakdown <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files with 100% finished blocks', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        })
        .addOption(fileFilterOption())
        .action(async (mapFilePath: string, fileListPath: string, reportPath:string, opts: StatusOptions) => {
            const registry = await ddCartographer({
                mapFilePath,
                reportPath,
                fileListPath: fileListPath,
                ...root.opts(),
                ...opts
            });
            const breakdowns = await registry.analyzeFileRecords();
            await fs.writeJson(reportPath, breakdowns);
        })
    );
    (status
        .command('complete <mapFilePath> <fileListPath> <reportPath>')
        .description('lists files with 100% finished blocks', {
            mapFilePath: 'path to ddrescue mapfile',
            fileListPath: 'path to file list',
            reportPath: 'path file report will be written to'
        })
        .addOption(fileFilterOption())
        .action(async (mapFilePath: string, fileListPath: string, reportPath:string, options: StatusOptions, command) => {
            const registry = await ddCartographer({
                mapFilePath,
                reportPath,
                fileListPath: fileListPath,
                ...options
            });
            console.log('okay gonna try to filter for good ones now');
            const complete = [];
            for (const file of registry.files) {
                let rejected = false;
                for (const block of file.blocks) {
                    if (block.status !== BlockStatus.Finished) {
                        rejected = true;
                        break;
                    }
                }
                if (!rejected) {
                    complete.push(file.path);
                    console.log(file.path);
                }
            }
            console.log(`okay found ${complete.length} good files... gonna write it now`);
            await fs.writeJson(reportPath, complete);
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
                fileListPath: fileListPath
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
    root.addCommand(status);
}

export default addSubcommand_status;