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
exports.parseFASTASequences = exports.validateFASTAContent = exports.detectFileFormat = exports.validateStructureFile = exports.createTempFile = exports.writeFileContent = exports.readFileContent = exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ProteinViewerPanel_1 = require("./panels/ProteinViewerPanel");
function activate(context) {
    console.log('Nano Protein Viewer extension is now active!');
    // Register command to start the protein viewer
    const startCommand = vscode.commands.registerCommand('nano-protein-viewer.start', async () => {
        const accession = await vscode.window.showInputBox({
            value: '',
            placeHolder: 'Enter a PDB or AlphaFoldDB (UniProt) accession (or leave empty to start without loading)',
            prompt: 'PDB/AFDB ID (optional)'
        });
        ProteinViewerPanel_1.ProteinViewerPanel.render(context.extensionUri, accession);
    });
    // Register command to load PDB files
    const loadPDBFilesCommand = vscode.commands.registerCommand('nano-protein-viewer.loadPDBFiles', async (uri, selectedFiles) => {
        const filesToLoad = selectedFiles && selectedFiles.length > 0 ? selectedFiles : [uri];
        try {
            const files = await Promise.all(filesToLoad.map(async (fileUri) => {
                const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
                return {
                    name: path.basename(fileUri.fsPath),
                    content: content,
                    path: fileUri.fsPath
                };
            }));
            ProteinViewerPanel_1.ProteinViewerPanel.renderWithPDBFiles(context.extensionUri, files);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading PDB files: ${error}`);
        }
    });
    // Register command to load folder
    const loadFolderCommand = vscode.commands.registerCommand('nano-protein-viewer.loadFolder', async (folderUri) => {
        try {
            const files = await vscode.workspace.findFiles(new vscode.RelativePattern(folderUri, '**/*.{pdb,PDB,cif,CIF,mmcif,MMCIF}'));
            const fileContents = await Promise.all(files.map(async (fileUri) => {
                const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
                return {
                    name: path.basename(fileUri.fsPath),
                    content: content,
                    path: fileUri.fsPath
                };
            }));
            ProteinViewerPanel_1.ProteinViewerPanel.renderWithFolder(context.extensionUri, fileContents);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading folder: ${error}`);
        }
    });
    // Register command to load FASTA
    const loadFASTACommand = vscode.commands.registerCommand('nano-protein-viewer.loadFASTA', async (uri) => {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            ProteinViewerPanel_1.ProteinViewerPanel.renderWithFASTA(context.extensionUri, content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading FASTA file: ${error}`);
        }
    });
    // ESMFold functionality is handled in the webview interface
    // Add all commands to subscriptions
    context.subscriptions.push(startCommand, loadPDBFilesCommand, loadFolderCommand, loadFASTACommand);
}
exports.activate = activate;
function deactivate() {
    console.log('Nano Protein Viewer extension is now deactivated!');
}
exports.deactivate = deactivate;
// Helper function to read file content
async function readFileContent(filePath) {
    return fs.promises.readFile(filePath, 'utf8');
}
exports.readFileContent = readFileContent;
// Helper function to write file content
async function writeFileContent(filePath, content) {
    await fs.promises.writeFile(filePath, content, 'utf8');
}
exports.writeFileContent = writeFileContent;
// Helper function to create temporary file
async function createTempFile(content, extension = '.pdb') {
    const tempDir = require('os').tmpdir();
    const tempFilePath = path.join(tempDir, `nano_temp_${Date.now()}${extension}`);
    await writeFileContent(tempFilePath, content);
    return tempFilePath;
}
exports.createTempFile = createTempFile;
// Helper function to validate PDB/mmCIF file
function validateStructureFile(content) {
    // Basic validation - check for common PDB/mmCIF markers
    const pdbMarkers = ['ATOM', 'HETATM', 'HEADER', 'TITLE'];
    const mmcifMarkers = ['data_', '_atom_site', '_struct'];
    const contentUpper = content.toUpperCase();
    // Check for PDB markers
    if (pdbMarkers.some(marker => contentUpper.includes(marker))) {
        return true;
    }
    // Check for mmCIF markers
    if (mmcifMarkers.some(marker => contentUpper.includes(marker))) {
        return true;
    }
    return false;
}
exports.validateStructureFile = validateStructureFile;
// Helper function to determine file format
function detectFileFormat(filename, content) {
    const extension = path.extname(filename).toLowerCase();
    // Check extension first
    if (extension === '.cif' || extension === '.mmcif') {
        return 'mmcif';
    }
    if (extension === '.pdb') {
        return 'pdb';
    }
    // Check content if extension is ambiguous
    if (content.includes('data_') || content.includes('_atom_site')) {
        return 'mmcif';
    }
    return 'pdb'; // Default to PDB
}
exports.detectFileFormat = detectFileFormat;
// Helper function to validate FASTA content
function validateFASTAContent(content) {
    // Basic FASTA validation
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0)
        return false;
    let hasHeader = false;
    let hasSequence = false;
    for (const line of lines) {
        if (line.startsWith('>')) {
            hasHeader = true;
        }
        else if (line.trim() && /^[ACDEFGHIKLMNPQRSTVWY\s]+$/i.test(line)) {
            hasSequence = true;
        }
    }
    return hasHeader && hasSequence;
}
exports.validateFASTAContent = validateFASTAContent;
// Helper function to parse FASTA sequences
function parseFASTASequences(content) {
    const sequences = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    let currentHeader = '';
    let currentSequence = '';
    for (const line of lines) {
        if (line.startsWith('>')) {
            if (currentHeader && currentSequence) {
                sequences.push({
                    header: currentHeader.substring(1),
                    sequence: currentSequence
                });
            }
            currentHeader = line;
            currentSequence = '';
        }
        else {
            currentSequence += line.replace(/[^A-Za-z]/g, '').toUpperCase();
        }
    }
    // Add the last sequence
    if (currentHeader && currentSequence) {
        sequences.push({
            header: currentHeader.substring(1),
            sequence: currentSequence
        });
    }
    return sequences;
}
exports.parseFASTASequences = parseFASTASequences;
//# sourceMappingURL=extension.js.map