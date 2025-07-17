import * as vscode from 'vscode';
export declare function activate(context: vscode.ExtensionContext): void;
export declare function deactivate(): void;
export declare function readFileContent(filePath: string): Promise<string>;
export declare function writeFileContent(filePath: string, content: string): Promise<void>;
export declare function createTempFile(content: string, extension?: string): Promise<string>;
export declare function validateStructureFile(content: string): boolean;
export declare function detectFileFormat(filename: string, content: string): string;
export declare function validateFASTAContent(content: string): boolean;
export declare function parseFASTASequences(content: string): Array<{
    header: string;
    sequence: string;
}>;
//# sourceMappingURL=extension.d.ts.map