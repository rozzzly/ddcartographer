import bfj from 'bfj';
import fs from 'fs-extra';
import ora from 'ora';
import Chalk from 'chalk';
import { formatNumber, Ranged, snooze, SnoozeTimeout } from './common';
import RegionRegistry from './RegionRegistry';
import printf from 'printf';


// export interface SerializedRegion extends Ranged {
//     files: {
//         path: string;
//         size: number;
//     }[];
// }

// export interface SerializedFileRecord extends Ranged {
//     region: number;
// }

// export interface SerializedRegistryIndex {
//     regions: SerializedRegion[];
//     files: {
//         [path: string]: SerializedFileRecord;
//     };
//}

export async function writeMapfile(registry: RegionRegistry, mapPath: string) {
    let s: SnoozeTimeout = null as any;
    let o: ora.Ora = null as any;
    if (!registry._opts.silent) {
        o = ora({ text: `writing mapfile`, indent: 0 }).start();
        s = snooze();
        s.sleep(2000);
    }
    await fs.remove(mapPath);
    let lines = [
        '# Rescue log file created by ddcartographer\n',
        '# Command line:\n',
        '# current_pos  current_status\n',
        '0x00000000     +\n',
        '#      pos        size  status\n'
    ];
    let lastOffset = 0;
    let regionsWritten = 0;
    for (const region of registry.regions) {
        if (lastOffset !== region.start) {
            lines.push(printf('0x%08X 0x%08X  +\n', lastOffset, region.start - lastOffset));
        }
        lastOffset = region.end;
        lines.push(printf('0x%08X   0x%08X ?\n', region.start, region.size));
        regionsWritten++;
        if (lines.length >= 20) {
            await fs.writeFile(mapPath, lines.join(''), { flag: 'a' });
            lines = [];
            if (!registry._opts.silent) {
                o.text = [
                    'writing mapfile: region ',
                    Chalk.yellow(regionsWritten),
                    ' of ',
                    Chalk.yellow(registry.regions.length),
                    ' (',
                    formatNumber(regionsWritten/registry.regions.length),
                    '%)'
                ].join('');
            }
        }
    }
    if (lastOffset !== registry._opts.domainSize) {
        lines.push(printf('0x%08X   0x%08X +\n', lastOffset, registry._opts.domainSize - lastOffset));
    }
    if (lines.length) {
        await fs.writeFile(mapPath, lines.join(''), { flag: 'a' });
    }
    if (!registry._opts.silent) {
        o.succeed(Chalk.green(`Complete. ${Chalk.yellow(registry.regions.length)} regions written`));
    }
}

export async function writeIndex(registry: RegionRegistry, indexPath: string): Promise<void> {
    let s: SnoozeTimeout = null as any;
    let o: ora.Ora = null as any;
    if (!registry._opts.silent) {
        o = ora({ text: `Building registry index`, indent: 0 }).start();
        s = snooze();
        s.sleep(2000);
    }
    const obj: string[] = [];
    for (let r = 0; r < registry.regions.length; r++) {
        const region = registry.regions[r];
        // obj.regions.push({
        //     start: region.start,
        //     end: region.end,
        //     size: region.size,
        //     files: region.files.map(r => ({
        //         path: r.path,
        //         size: r.size
        //     }))
        // });
        obj.push(...region.files.map(f => f.path));
    }
    if (!registry._opts.silent) {
        o.text = `Writing registry index to ${Chalk.cyan(indexPath)}`;
        s.sleep(1000);
    }

    await bfj.write(indexPath, obj, { spaces: 4 });

    if (!registry._opts.silent) {
        s.sleep(1000);
        o.succeed(Chalk.green(`Complete. Registry index written to ${Chalk.cyan(indexPath)}`));
    }
}