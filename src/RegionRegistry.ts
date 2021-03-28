import pb from 'pretty-bytes';
import ora, { Ora } from 'ora';
import Chalk from 'chalk';
import RegionRecord from './RegionRecord';
import { formatNumber, snooze, SnoozeTimeout, UnitMultipliers } from './common';
import FileRecord from './FileRecord';
import { DDCartographerOptions } from '.';


const defaultPadding = 1000 * 10; // 10 kB
export class RegionRegistry {
    regions: RegionRecord[];

    _opts: Required<DDCartographerOptions>;
    _fileRecordCount: number;
    _fileRecordTotalSize: number;

    constructor(opts: Required<DDCartographerOptions>) {
        this._opts = opts;
        this.regions = [];
        this._fileRecordCount = 0;
        this._fileRecordTotalSize = 0;
    }

    getTotalRegionSize(regions: RegionRecord[] = this.regions): number {
        return this.regions.reduce((reduction, region) => reduction + region.size, 0);
    }

    async ingestFileRecords(files: FileRecord[], silent: boolean = false): Promise<void> {
        let s: SnoozeTimeout = null as any;
        let o: ora.Ora = null as any;
        if (!silent) {
            o = ora({ text: `Region registry ingesting file records`, indent: 0 }).start();
            s = snooze();
            s.sleep(1000);
        }
        this._fileRecordCount = 0;
        this._fileRecordTotalSize = 0;
        for (const file of files) {
            this.regions.push(new RegionRecord(this, file));
            this._fileRecordCount++;
            this._fileRecordTotalSize += file.size;
        }

        // sort the regions
        this.regions.sort((a, b) => a.start - b.start);

        if (!silent) {
            await s.sleep(200);
            o.succeed(Chalk.green('Complete. All file records added to region registry '));
            await s.sleep(500);
        }
    }

    async mergeRegions(): Promise<void> {
        let s: SnoozeTimeout = null as any;
        let o: ora.Ora = null as any;

        const result = [];
        let idx = 0;
        let merges = 0;
        let paddingBloat: number = 0;

        const renderStatus = () => ([
            'Merging region ',
            Chalk.yellow(idx),
            ' of ',
            Chalk.yellow(this.regions.length),
            ' [ merges: ',
            Chalk.yellow(merges),
            ', count reduction: ',
            Chalk.yellow(
                formatNumber((1.0 - (result.length / this._fileRecordCount))*100) + '%'
            ),
            ', padding bloat: ',
            Chalk.cyan(pb(paddingBloat)),
            ' ]'
        ].join(''));

        if (!this._opts.silent) {
            s = snooze();
            await s.sleep(1000);
            o = ora({ text: renderStatus(), indent: 0 }).start();
            await s.sleep(1000);
        }
        let last = this.regions[0];

        // idx declared above so renderStatus() can see it
        for (idx = 1; idx < this.regions.length; idx += 1) {
            if (last.end >= this.regions[idx].start) {
                last = RegionRecord.merge(last, this.regions[idx]);
                merges++;
            } else {
                result.push(last);
                last = this.regions[idx];
                paddingBloat += last.paddingBloat;
            }
            if (!this._opts.silent) {
                o.text = renderStatus();
                await s.sleep(10);
            }
        }
        result.push(last);
        paddingBloat += last.paddingBloat;
        if (!this._opts.silent) {
            o.text = renderStatus();
            const sizeDelta = this.getTotalRegionSize(result) - this._fileRecordTotalSize;
            await s.sleep(2000);
            o.succeed(Chalk.green([
                'Complete. ',
                Chalk.yellow(this.regions.length),
                ' regions merged into ',
                Chalk.yellow(result.length),
                ' regions with ',
                Chalk.cyan(pb(paddingBloat)),
                ' of padding (count reduction: ',
                Chalk.yellow(
                    formatNumber((1.0 - (result.length / this._fileRecordCount))*100) + '%'
                ),
                ', size increase: ',
                Chalk.yellow(
                    formatNumber((sizeDelta / this._fileRecordTotalSize)*100) + '%'
                ),
                ')'
            ].join('')));
        }
        this.regions = result;
    }
}

export default RegionRegistry;
