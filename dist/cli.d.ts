#!/usr/bin/env node
type BuildTarget = 'server' | 'client';
export declare function resolveBuildTargets(args: string[]): BuildTarget[];
export declare function buildCommands(args: string[]): string[][];
export declare function isDevBuild(args: string[]): boolean;
export declare function computeAssetSignature(outDir?: string): string;
export declare function writeDevManifest(outDir?: string, now?: number): {
    version: string;
    assets: string;
};
export declare function cleanDevArtifacts(outDir?: string): void;
export {};
//# sourceMappingURL=cli.d.ts.map