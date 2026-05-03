#!/usr/bin/env node
type BuildTarget = 'server' | 'client';
type InitOptions = {
    cwd?: string;
    force?: boolean;
    dryRun?: boolean;
    template?: string;
};
type InitResult = {
    changed: string[];
    skipped: string[];
    notes: string[];
};
type CreateOptions = InitOptions & {
    name: string;
};
export declare function resolveBuildTargets(args: string[]): BuildTarget[];
export declare function buildCommands(args: string[]): string[][];
export declare function isDevBuild(args: string[]): boolean;
export declare function computeAssetSignature(outDir?: string): string;
export declare function writeDevManifest(outDir?: string, now?: number): {
    version: string;
    assets: string;
};
export declare function cleanDevArtifacts(outDir?: string): void;
export declare function patchPackageJson(file: string, packageName?: string): boolean;
export declare function patchWranglerJsonText(input: string, workerName?: string): string;
export declare function patchWranglerJson(file: string, workerName?: string): boolean;
export declare function initProject(options?: InitOptions): InitResult;
export declare function createProject(options: CreateOptions): InitResult;
export {};
//# sourceMappingURL=cli.d.ts.map