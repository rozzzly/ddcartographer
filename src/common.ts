export interface Ranged {
    start: number;
    end: number;
}

export interface SnoozeTimeout {
    sleep(minTimeout: number): Promise<void>;
}


export const snooze = (): SnoozeTimeout=> {
    let lastCall = Date.now();
    return {
        sleep: (minTimeout: number) => {
            const now = Date.now();
            const delta = now - lastCall;
            const timeout = (delta > minTimeout) ? 0 : minTimeout - delta;
            return new Promise<void>(resolve => (
                setTimeout(() => {
                    lastCall = Date.now();
                    resolve();
                }, timeout)
            ));
        }
    };
};

const formatter = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const formatNumber = (n: number) => formatter.format(n);

const bytesRegExp = /^\d+$/;
const humanBytesRegExp = /^(\d+) ?(B|KB?|MB?|GB?|TB?)?$/i;

export const MultiplierKB = 1000;
export const MultiplierMB = 1000 * MultiplierKB;
export const MultiplierGB = 1000 * MultiplierMB;
export const MultiplierTB = 1000 * MultiplierGB;

export const UnitMultipliers = {
    B: 1,
    K: MultiplierKB,
    KB: MultiplierKB,
    M: MultiplierMB,
    MB: MultiplierMB,
    G: MultiplierGB,
    GB: MultiplierGB,
    T: MultiplierTB,
    TB: MultiplierTB
} as const;
export type UnitMultipliers = typeof UnitMultipliers;

export function parseBytes(str: string | number | undefined): number | null {
    const trimmed = String(str).trim().toUpperCase();
    const humanResult = humanBytesRegExp.exec(trimmed);
    if (humanResult) {
        const decimal = humanResult[1];
        const unit: keyof UnitMultipliers = humanResult[2] as any || 'B';
        if (decimal.includes('.') && unit === 'B') {
            console.error(`Failed to parse '${str}'. There cannot be a decimal if the unit is B. We're not dealing it bits here.`);
            return null;
        } else {
            return Number.parseFloat(decimal) * UnitMultipliers[unit];
        }
    } else if (bytesRegExp.test(trimmed)) {
        return Number.parseInt(trimmed);
    } return null;
}
export function literal<T extends boolean>(value: T): T;
export function literal<T extends number>(value: T): T;
export function literal<T extends string>(value: T): T;
export function literal<T extends string[]>(...values: T): LiteralsToUnion<T>;
export function literal<T>(value: T): T;
export function literal<T>(value: T): T {
    return value;
}


export type Key = (
    | number
    | string
    | symbol
);

/**
 * @ https://github.com/Microsoft/TypeScript/issues/28046
 */
export const literalsToList = <T extends Key>(...args: T[]): T[] => (args);
export const literalsToEnum = <T extends Key>(...args: T[]): {
    [K in T]: K;
} => (args.reduce((reduction, lit) => ({
    /* eslint-disable */
    ...reduction,
    [lit]: lit
}), {}) as {
    /* eslint-enable indent */
     [K in T]: K;
});

export type LiteralsToUnion<T> = (
    (T extends ReadonlyArray<infer Literal>
        ? Literal
        : (T extends {}
            ? keyof T
            : never
        )
    )
);