"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProteinViewerPanel = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const extension_1 = require("../extension");
class ProteinViewerPanel {
    constructor(panel, extensionUri) {
        this._disposables = [];
        this._panel = panel;
        this._extensionUri = extensionUri;
        // Set the webview's HTML content
        this._panel.webview.html = this._getWebviewContent();
        // Listen for when the panel is disposed
        this._panel.onDidDispose(this.dispose, null, this._disposables);
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage((message) => {
            switch (message.command) {
                case 'requestPDBFiles':
                    this._handleRequestPDBFiles();
                    break;
                case 'requestFolder':
                    this._handleRequestFolder();
                    break;
                case 'requestFASTA':
                    this._handleRequestFASTA();
                    break;
                case 'downloadStructure':
                    this._handleDownloadStructure(message.data, message.filename, message.format);
                    break;
                case 'downloadAnimation':
                    this._handleDownloadAnimation(message.steps);
                    break;
                case 'downloadVideoFile':
                    this._handleDownloadVideoFile(message.data, message.filename, message.mimeType);
                    break;
                case 'downloadZipFile':
                    this._handleDownloadZipFile(message.data, message.filename);
                    break;
                case 'showError':
                    vscode.window.showErrorMessage(message.message);
                    break;
                case 'webviewReady':
                    console.log('Webview is ready');
                    break;
            }
        }, null, this._disposables);
    }
    static render(extensionUri, accession) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;
        // If we already have a panel, show it
        if (ProteinViewerPanel.currentPanel) {
            ProteinViewerPanel.currentPanel._panel.reveal(column);
            // If accession is provided, load it
            if (accession && accession.trim()) {
                ProteinViewerPanel.currentPanel._loadAccession(accession.trim());
            }
            return;
        }
        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel('nanoProteinViewer', 'Nano Protein Viewer', column || vscode.ViewColumn.One, {
            enableScripts: true,
            retainContextWhenHidden: true,
            localResourceRoots: [
                vscode.Uri.joinPath(extensionUri, 'media'),
                vscode.Uri.joinPath(extensionUri, 'out'),
                vscode.Uri.joinPath(extensionUri, 'src')
            ]
        });
        ProteinViewerPanel.currentPanel = new ProteinViewerPanel(panel, extensionUri);
        // If accession is provided, load it after the panel is created
        if (accession && accession.trim()) {
            ProteinViewerPanel.currentPanel._loadAccession(accession.trim());
        }
    }
    static renderWithPDBFiles(extensionUri, files) {
        ProteinViewerPanel.render(extensionUri);
        if (ProteinViewerPanel.currentPanel) {
            ProteinViewerPanel.currentPanel._loadPDBFiles(files);
        }
    }
    static renderWithFolder(extensionUri, files) {
        ProteinViewerPanel.render(extensionUri);
        if (ProteinViewerPanel.currentPanel) {
            ProteinViewerPanel.currentPanel._loadFolder(files);
        }
    }
    static renderWithFASTA(extensionUri, content) {
        ProteinViewerPanel.render(extensionUri);
        if (ProteinViewerPanel.currentPanel) {
            ProteinViewerPanel.currentPanel._loadFASTA(content);
        }
    }
    // ESMFold functionality moved to webview interface
    dispose() {
        ProteinViewerPanel.currentPanel = undefined;
        // Clean up our resources
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
    _getWebviewContent() {
        // Read the webview HTML file
        const webviewPath = vscode.Uri.joinPath(this._extensionUri, 'src', 'webview.html');
        try {
            const htmlContent = fs.readFileSync(webviewPath.fsPath, 'utf8');
            // Replace any relative paths with webview URIs if needed
            // For now, we're using CDN links so this might not be necessary
            return htmlContent;
        }
        catch (error) {
            console.error('Error reading webview HTML:', error);
            return this._getErrorWebviewContent(`Error loading webview: ${error}`);
        }
    }
    _getErrorWebviewContent(errorMessage) {
        return `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
            </head>
            <body>
                <h1>Error</h1>
                <p>${errorMessage}</p>
            </body>
            </html>
        `;
    }
    _loadPDBFiles(files) {
        // Validate files
        const validFiles = files.filter(file => {
            if (!(0, extension_1.validateStructureFile)(file.content)) {
                vscode.window.showWarningMessage(`File ${file.name} does not appear to be a valid PDB/mmCIF file`);
                return false;
            }
            return true;
        });
        if (validFiles.length === 0) {
            vscode.window.showErrorMessage('No valid PDB/mmCIF files found');
            return;
        }
        // Send files to webview
        this._panel.webview.postMessage({
            command: 'loadPDBFiles',
            files: validFiles
        });
    }
    _loadFolder(files) {
        // Validate files
        const validFiles = files.filter(file => {
            if (!(0, extension_1.validateStructureFile)(file.content)) {
                console.warn(`File ${file.name} does not appear to be a valid PDB/mmCIF file`);
                return false;
            }
            return true;
        });
        if (validFiles.length === 0) {
            vscode.window.showErrorMessage('No valid PDB/mmCIF files found in folder');
            return;
        }
        // Send files to webview
        this._panel.webview.postMessage({
            command: 'loadFolder',
            files: validFiles
        });
    }
    _loadFASTA(content) {
        if (!(0, extension_1.validateFASTAContent)(content)) {
            vscode.window.showErrorMessage('Invalid FASTA content');
            return;
        }
        // Send FASTA to webview
        this._panel.webview.postMessage({
            command: 'loadFASTA',
            content: content
        });
    }
    _loadAccession(accession) {
        // Send accession to webview
        this._panel.webview.postMessage({
            command: 'loadAccession',
            accession: accession
        });
    }
    // ESMFold functionality moved to webview interface
    async _handleRequestPDBFiles() {
        const options = {
            canSelectMany: true,
            openLabel: 'Select PDB/mmCIF files',
            filters: {
                'Structure Files': ['pdb', 'PDB', 'cif', 'CIF', 'mmcif', 'MMCIF'],
                'All Files': ['*']
            }
        };
        try {
            const fileUris = await vscode.window.showOpenDialog(options);
            if (!fileUris || fileUris.length === 0) {
                console.log('No files selected or dialog cancelled');
                return;
            }
            const files = await Promise.all(fileUris.map(async (uri) => {
                if (!uri || !uri.fsPath) {
                    throw new Error('Invalid file URI');
                }
                const content = await (0, extension_1.readFileContent)(uri.fsPath);
                return {
                    name: path.basename(uri.fsPath),
                    content: content,
                    path: uri.fsPath
                };
            }));
            this._loadPDBFiles(files);
        }
        catch (error) {
            console.error('Error in _handleRequestPDBFiles:', error);
            vscode.window.showErrorMessage(`Error loading files: ${error}`);
        }
    }
    async _handleRequestFolder() {
        const options = {
            canSelectFolders: true,
            canSelectMany: false,
            openLabel: 'Select folder containing structure files'
        };
        try {
            const folderUris = await vscode.window.showOpenDialog(options);
            if (!folderUris || folderUris.length === 0) {
                console.log('No folder selected or dialog cancelled');
                return;
            }
            if (!folderUris[0] || !folderUris[0].fsPath) {
                throw new Error('Invalid folder URI');
            }
            const folderUri = folderUris[0];
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folderUri, '**/*.{pdb,PDB,cif,CIF,mmcif,MMCIF}'));
            const fileContents = await Promise.all(files.map(async (uri) => {
                if (!uri || !uri.fsPath) {
                    throw new Error('Invalid file URI in folder');
                }
                const content = await (0, extension_1.readFileContent)(uri.fsPath);
                return {
                    name: path.basename(uri.fsPath),
                    content: content,
                    path: uri.fsPath
                };
            }));
            this._loadFolder(fileContents);
        }
        catch (error) {
            console.error('Error in _handleRequestFolder:', error);
            vscode.window.showErrorMessage(`Error loading folder: ${error}`);
        }
    }
    async _handleRequestFASTA() {
        const options = {
            canSelectMany: false,
            openLabel: 'Select FASTA file',
            filters: {
                'FASTA Files': ['fasta', 'FASTA', 'fa', 'FA', 'fas', 'FAS'],
                'All Files': ['*']
            }
        };
        try {
            const fileUris = await vscode.window.showOpenDialog(options);
            if (!fileUris || fileUris.length === 0) {
                console.log('No FASTA file selected or dialog cancelled');
                return;
            }
            if (!fileUris[0] || !fileUris[0].fsPath) {
                throw new Error('Invalid file URI');
            }
            const content = await (0, extension_1.readFileContent)(fileUris[0].fsPath);
            this._loadFASTA(content);
        }
        catch (error) {
            console.error('Error in _handleRequestFASTA:', error);
            vscode.window.showErrorMessage(`Error loading FASTA file: ${error}`);
        }
    }
    async _handleDownloadStructure(data, filename, format) {
        const options = {
            defaultUri: vscode.Uri.file(filename),
            filters: {}
        };
        if (format === 'pdb') {
            options.filters['PDB Files'] = ['pdb'];
        }
        else if (format === 'mmcif') {
            options.filters['mmCIF Files'] = ['cif', 'mmcif'];
        }
        options.filters['All Files'] = ['*'];
        const saveUri = await vscode.window.showSaveDialog(options);
        if (!saveUri) {
            return;
        }
        try {
            await (0, extension_1.writeFileContent)(saveUri.fsPath, data);
            vscode.window.showInformationMessage(`Structure saved to ${saveUri.fsPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error saving structure: ${error}`);
        }
    }
    async _handleDownloadAnimation(steps) {
        // This is kept for backward compatibility but not used anymore
        // The new approach uses _handleDownloadZipFile for canvas frames
        const tempDir = path.join(require('os').tmpdir(), 'nano_animation_' + Date.now());
        await fs.promises.mkdir(tempDir, { recursive: true });
        await Promise.all(steps.map(async (step) => {
            const framePath = path.join(tempDir, step.name);
            await (0, extension_1.writeFileContent)(framePath, step.data);
        }));
        vscode.window.showInformationMessage(`Animation frames saved to: ${tempDir}`);
    }
    async _handleDownloadZipFile(base64Data, filename) {
        const options = {
            defaultUri: vscode.Uri.file(filename),
            filters: {
                'ZIP Files': ['zip'],
                'All Files': ['*']
            }
        };
        const saveUri = await vscode.window.showSaveDialog(options);
        if (!saveUri) {
            return;
        }
        try {
            // Convert base64 back to binary data
            const binaryData = Buffer.from(base64Data, 'base64');
            await fs.promises.writeFile(saveUri.fsPath, binaryData);
            vscode.window.showInformationMessage(`Animation frames ZIP saved to ${saveUri.fsPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error saving ZIP file: ${error}`);
        }
    }
    async _handleDownloadVideoFile(base64Data, filename, mimeType) {
        const options = {
            defaultUri: vscode.Uri.file(filename),
            filters: {}
        };
        if (mimeType.includes('webm')) {
            options.filters['WebM Files'] = ['webm'];
        }
        else if (mimeType.includes('mp4')) {
            options.filters['MP4 Files'] = ['mp4'];
        }
        options.filters['All Files'] = ['*'];
        const saveUri = await vscode.window.showSaveDialog(options);
        if (!saveUri) {
            return;
        }
        try {
            // Convert base64 back to binary data
            const binaryData = Buffer.from(base64Data, 'base64');
            await fs.promises.writeFile(saveUri.fsPath, binaryData);
            vscode.window.showInformationMessage(`Video saved to ${saveUri.fsPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error saving video: ${error}`);
        }
    }
}
exports.ProteinViewerPanel = ProteinViewerPanel;
//# sourceMappingURL=ProteinViewerPanel.js.map