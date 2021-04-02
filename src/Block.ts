import MapRegistry from './MapRegistry';
import { literalsToEnum, LiteralsToUnion, Ranged } from './common';
import FileRecord from './FileRecord';

export const BlockStatus = literalsToEnum(
    'NonTried',
    'NonTrimmed',
    'NonScraped',
    'BadSector',
    'Finished',
    'Unspecified'
);
export type BlockStatus = LiteralsToUnion<typeof BlockStatus>

export const StatusCharToStatusEnum = {
    '?': BlockStatus.NonTried,
    '*': BlockStatus.NonTrimmed,
    '/': BlockStatus.NonScraped,
    '-': BlockStatus.BadSector,
    '+': BlockStatus.Finished
} as const;
export type StatusCharToStatusEnum = typeof StatusCharToStatusEnum;
export type StatusChar = keyof StatusCharToStatusEnum;
export const StatusEnumToStatusChar = {
    [BlockStatus.NonTried]: '?',
    [BlockStatus.NonTrimmed]: '*',
    [BlockStatus.NonScraped]: '/',
    [BlockStatus.BadSector]: '-',
    [BlockStatus.Finished]: '+'
} as const;

export interface BlockPrimitive extends Ranged {
    status: BlockStatus;
    excluded?: boolean;
}

export class Block implements BlockPrimitive {
    excluded: boolean;
    status: BlockStatus;
    registry: MapRegistry;
    start: number;
    size: number;
    end: number;
    files: FileRecord[];

    constructor(registry: MapRegistry, data: BlockPrimitive) {
        this.start = data.start;
        this.end = data.end;
        this.size = this.end - this.start;
        this.files = [ ];
        this.excluded = false;
        this.status = data.status;
        this.registry = registry;
    }

    static merge(a: Block, b: Block, status: BlockStatus = BlockStatus.Unspecified): Block {
        const nBlock = new Block(
            a.registry,
            { start: a.start, end: b.end, status: ((status === BlockStatus.Unspecified)
                ? ((a === b)
                    ? a.status
                    : BlockStatus.Unspecified
                )
                : status
            ) }
        );
        nBlock.files = [ ...a.files, ...b.files ];
        nBlock.files.forEach(f => {
            f.blocks = f.blocks.filter(r => r !== a && r !== b);
            f.blocks.push(nBlock);
            f._sort();
        });
        nBlock.files.sort((a, b) => a.start - b.start);
        return nBlock;
    }
}

export default Block;