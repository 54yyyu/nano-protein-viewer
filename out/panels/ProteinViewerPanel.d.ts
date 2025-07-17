import * as vscode from 'vscode';
interface FileData {
    name: string;
    content: string;
    path: string;
}
export declare class ProteinViewerPanel {
    static currentPanel: ProteinViewerPanel | undefined;
    private readonly _panel;
    private readonly _extensionUri;
    private _disposables;
    private constructor();
    static render(extensionUri: vscode.Uri): void;
    static renderWithPDBFiles(extensionUri: vscode.Uri, files: FileData[]): void;
    static renderWithFolder(extensionUri: vscode.Uri, files: FileData[]): void;
    static renderWithFASTA(extensionUri: vscode.Uri, content: string): void;
    dispose(): void;
    private _getWebviewContent;
    private _getErrorWebviewContent;
    private _loadPDBFiles;
    private _loadFolder;
    private _loadFASTA;
    private _handleRequestPDBFiles;
    private _handleRequestFolder;
    private _handleRequestFASTA;
    private _handleDownloadStructure;
    private _handleDownloadAnimation;
    private _handleDownloadZipFile;
    private _handleDownloadVideoFile;
}
export {};
//# sourceMappingURL=ProteinViewerPanel.d.ts.map