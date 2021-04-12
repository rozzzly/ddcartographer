import bfj from 'bfj';
import fs from 'fs-extra';
import ora from 'ora';
import Chalk from 'chalk';
import { fmtNumber, Ranged, snooze, SnoozeTimeout } from './common';
import MapRegistry from './MapRegistry';
import printf from 'printf';


// export interface SerializedBlock extends Ranged {
//     files: {
//         path: string;
//         size: number;
//     }[];
// }

// export interface SerializedFileRecord extends Ranged {
//     block: number;
// }

// export interface SerializedRegistryIndex {
//     blocks: SerializedBlock[];
//     files: {
//         [path: string]: SerializedFileRecord;
//     };
//}

export async function writeMapfile(registry: MapRegistry, mapPath: string) {
    // let s: SnoozeTimeout = null as any;
    // let o: ora.Ora = null as any;
    // if (!registry._opts.silent) {
    //     o = ora({ text: `writing mapfile`, indent: 0 }).start();
    //     sleep = snooze();
    //     await sleep(2000);
    // }
    // await fs.remove(mapPath);
    // let lines = [
    //     '# Rescue log file created by ddcartographer\n',
    //     '# Command line:\n',
    //     '# current_pos  current_status\n',
    //     '0x00000000     +\n',
    //     '#      pos        size  status\n'
    // ];
    // let lastOffset = 0;
    // let blocksWritten = 0;
    // for (const block of registry.blocks) {
    //     if (lastOffset !== block.start) {
    //         lines.push(printf('0x%08X 0x%08X  +\n', lastOffset, block.start - lastOffset));
    //     }
    //     lastOffset = block.end;
    //     lines.push(printf('0x%08X   0x%08X ?\n', block.start, block.size));
    //     blocksWritten++;
    //     if (lines.length >= 20) {
    //         await fs.writeFile(mapPath, lines.join(''), { flag: 'a' });
    //         lines = [];
    //         if (!registry._opts.silent) {
    //             o.text = [
    //                 'writing mapfile: block ',
    //                 Chalk.yellow(blocksWritten),
    //                 ' of ',
    //                 Chalk.yellow(registry.blocks.length),
    //                 ' (',
    //                 formatNumber(blocksWritten/registry.blocks.length),
    //                 '%)'
    //             ].join('');
    //         }
    //     }
    // }
    // if (lastOffset !== registry._opts.domainSize) {
    //     lines.push(printf('0x%08X   0x%08X +\n', lastOffset, registry._opts.domainSize - lastOffset));
    // }
    // if (lines.length) {
    //     await fs.writeFile(mapPath, lines.join(''), { flag: 'a' });
    // }
    // if (!registry._opts.silent) {
    //     o.succeed(Chalk.green(`Complete. ${Chalk.yellow(registry.blocks.length)} blocks written`));
    //}
}

export async function writeIndex(registry: MapRegistry, indexPath: string): Promise<void> {
    const sleep = snooze();
    let o: ora.Ora = null as any;
    if (!registry._opts.silent) {
        o = ora({ text: `Building registry index`, indent: 0 }).start();
        await sleep(2000);
    }
    const obj: string[] = [];
    for (let r = 0; r < registry.blocks.length; r++) {
        const block = registry.blocks[r];
        // obj.blocks.push({
        //     start: block.start,
        //     end: block.end,
        //     size: block.size,
        //     files: block.files.map(r => ({
        //         path: r.path,
        //         size: r.size
        //     }))
        // });
        obj.push(...block.files.map(f => f.path));
    }
    if (!registry._opts.silent) {
        o.text = `Writing registry index to ${Chalk.cyan(indexPath)}`;
        await sleep(1000);
    }

    await bfj.write(indexPath, obj, { spaces: 4 });

    if (!registry._opts.silent) {
        await sleep(1000);
        o.succeed(Chalk.green(`Complete. Registry index written to ${Chalk.cyan(indexPath)}`));
    }
}