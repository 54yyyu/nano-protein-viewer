import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { ProteinViewerPanel } from './panels/ProteinViewerPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('Nano Protein Viewer extension is now active!');

    // Register command to start the protein viewer
    const startCommand = vscode.commands.registerCommand('nano-protein-viewer.start', async () => {
        const accession = await vscode.window.showInputBox({
            value: '',
            placeHolder: 'Enter a PDB or AlphaFoldDB (UniProt) accession (or leave empty to start without loading)',
            prompt: 'PDB/AFDB ID (optional)'
        });
        
        ProteinViewerPanel.render(context.extensionUri, accession);
    });

    // Register command to load PDB files
    const loadPDBFilesCommand = vscode.commands.registerCommand('nano-protein-viewer.loadPDBFiles', async (uri: vscode.Uri, selectedFiles: vscode.Uri[]) => {
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
            
            ProteinViewerPanel.renderWithPDBFiles(context.extensionUri, files);
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading PDB files: ${error}`);
        }
    });

    // Register command to load folder
    const loadFolderCommand = vscode.commands.registerCommand('nano-protein-viewer.loadFolder', async (folderUri: vscode.Uri) => {
        try {
            const files = await vscode.workspace.findFiles(
                new vscode.RelativePattern(folderUri, '**/*.{pdb,PDB,cif,CIF,mmcif,MMCIF}')
            );
            
            const fileContents = await Promise.all(files.map(async (fileUri) => {
                const content = await fs.promises.readFile(fileUri.fsPath, 'utf8');
                return {
                    name: path.basename(fileUri.fsPath),
                    content: content,
                    path: fileUri.fsPath
                };
            }));
            
            ProteinViewerPanel.renderWithFolder(context.extensionUri, fileContents);
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading folder: ${error}`);
        }
    });

    // Register command to load FASTA
    const loadFASTACommand = vscode.commands.registerCommand('nano-protein-viewer.loadFASTA', async (uri: vscode.Uri) => {
        try {
            const content = await fs.promises.readFile(uri.fsPath, 'utf8');
            ProteinViewerPanel.renderWithFASTA(context.extensionUri, content);
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading FASTA file: ${error}`);
        }
    });

    // ESMFold functionality is handled in the webview interface

    // Add all commands to subscriptions
    context.subscriptions.push(
        startCommand,
        loadPDBFilesCommand,
        loadFolderCommand,
        loadFASTACommand
    );
}

export function deactivate() {
    console.log('Nano Protein Viewer extension is now deactivated!');
}

// Helper function to read file content
export async function readFileContent(filePath: string): Promise<string> {
    return fs.promises.readFile(filePath, 'utf8');
}

// Helper function to write file content
export async function writeFileContent(filePath: string, content: string): Promise<void> {
    await fs.promises.writeFile(filePath, content, 'utf8');
}

// Helper function to create temporary file
export async function createTempFile(content: string, extension: string = '.pdb'): Promise<string> {
    const tempDir = require('os').tmpdir();
    const tempFilePath = path.join(tempDir, `nano_temp_${Date.now()}${extension}`);
    await writeFileContent(tempFilePath, content);
    return tempFilePath;
}

// Helper function to validate PDB/mmCIF file
export function validateStructureFile(content: string): boolean {
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

// Helper function to determine file format
export function detectFileFormat(filename: string, content: string): string {
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

// Helper function to validate FASTA content
export function validateFASTAContent(content: string): boolean {
    // Basic FASTA validation
    const lines = content.split('\n').filter(line => line.trim());
    if (lines.length === 0) return false;
    
    let hasHeader = false;
    let hasSequence = false;
    
    for (const line of lines) {
        if (line.startsWith('>')) {
            hasHeader = true;
        } else if (line.trim() && /^[ACDEFGHIKLMNPQRSTVWY\s]+$/i.test(line)) {
            hasSequence = true;
        }
    }
    
    return hasHeader && hasSequence;
}

// Helper function to parse FASTA sequences
export function parseFASTASequences(content: string): Array<{header: string, sequence: string}> {
    const sequences: Array<{header: string, sequence: string}> = [];
    const lines = content.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentHeader = '';
    let currentSequence = '';
    
    for (const line of lines) {
        if (line.startsWith('>')) {
            if (currentHeader && currentSequence) {
                sequences.push({
                    header: currentHeader.substring(1), // Remove '>'
                    sequence: currentSequence
                });
            }
            currentHeader = line;
            currentSequence = '';
        } else {
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