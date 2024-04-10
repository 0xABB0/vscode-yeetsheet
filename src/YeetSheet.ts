import * as vscode from 'vscode';

class Yeet {
    public document: vscode.TextDocument;

    public range: vscode.Range;

    constructor(document: vscode.TextDocument, range: vscode.Range) {
        this.document = document;
        this.range = range;
    }
};

export class YeetSheet {
    document: vscode.TextDocument;

    yeets: Yeet[];

    filenames: Set<string>;
    yeetMap: Map<string, Yeet[]>;

    isUpdating: boolean;

    constructor(document: vscode.TextDocument) {
        this.document = document;

        this.yeets = [];
        this.filenames = new Set<string>();
        this.yeetMap = new Map<string, Yeet[]>();

        this.isUpdating = false;

        vscode.workspace.onDidChangeTextDocument(this.onDocumentChange.bind(this));
    }

    public yeet() {
        let selection = vscode.window.activeTextEditor?.selection;
        if (!selection) {
            return;
        }

        let range = new vscode.Range(selection.start, selection.end);
        range = range.with({
            start: range.start.with({ character: 0 }),
            end: range.end.with({ line: range.end.line + 1, character: 0 })
        });
        const document = vscode.window.activeTextEditor?.document;
        if (!document) {
            return;
        }
        let filename = document.fileName;

        if (!filename) {
            return;
        }

        if (this.document.fileName === filename) {
            return;
        }

        let yeet = new Yeet(document, range);
        this.yeets.push(yeet);
        this.filenames.add(filename);
        if (!this.yeetMap.has(filename)) {
            this.yeetMap.set(filename, []);
        }
        this.yeetMap.get(filename)?.push(yeet);
    }

    public unyeet() {
    }

    public clear() {
    }

    public getText() : string {
        let text = this.yeets.map(yeet => {
            return yeet.document.getText(yeet.range);
        }).join('\n--------------------------------\n');
        
        return text;
    }

    public updateDocumentContent() {
        let edit = new vscode.WorkspaceEdit();

        edit.replace(this.document.uri, new vscode.Range(0, 0, this.document.lineCount, 0), this.getText());

        vscode.workspace.applyEdit(edit);
    }

    private isRangeBeforeYeet(range: vscode.Range, yeet: Yeet) {
        return range.end.isBefore(yeet.range.start);
    }

    private isRangeIncludingYeetStart(range: vscode.Range, yeet: Yeet) {
        return range.contains(yeet.range.start);
    }

    private isRangeIncludingYeetEnd(range: vscode.Range, yeet: Yeet) {
        return range.contains(yeet.range.end);
    }

    private isRangeAfterYeet(range: vscode.Range, yeet: Yeet) {
        return range.start.isAfter(yeet.range.end);
    }

    private otherDocumentChanged(event: vscode.TextDocumentChangeEvent) {
        const yeets = this.yeetMap.get(event.document.fileName);
        if (!yeets) {
            return;
        }

        for (const change of event.contentChanges) {
            const newlinesAdded = change.text.split('\n').length - 1;
            const deletedNewlines = change.range.end.line - change.range.start.line;
            const delta = newlinesAdded - deletedNewlines;

            for (const yeet of yeets) {
                if (this.isRangeBeforeYeet(change.range, yeet)) {
                    yeet.range = yeet.range.with({
                        start: yeet.range.start.translate(delta, 0),
                        end: yeet.range.end.translate(delta, 0)
                    });
                } else if (this.isRangeIncludingYeetStart(change.range, yeet)) {
                    // Rimpicciolisco il range
                    yeet.range = yeet.range.with({
                        start: change.range.end
                    });
                } else if (this.isRangeIncludingYeetEnd(change.range, yeet)) {
                    // rimpicciolisco anche qua
                    yeet.range = yeet.range.with({
                        end: change.range.start
                    });
                } else if (this.isRangeAfterYeet(change.range, yeet)) {
                    // nothing
                } else {
                    yeet.range = yeet.range.with({
                        end: yeet.range.end.translate(delta, 0)
                    });
                }

            }
        }

        this.updateDocumentContent();
    }

    private getYeetAtPosition(position: vscode.Position) : {yeet: Yeet, yeetDocumentRange: vscode.Range} {
        let lineCounter = 0;


        for (const yeet of this.yeets) {
            let yeetSize = yeet.range.end.line - yeet.range.start.line;
            let yeetDocumentRange = new vscode.Range(lineCounter, 0, lineCounter + yeetSize, 0);
            if (yeetDocumentRange.contains(position)) {
                return {yeet: yeet, yeetDocumentRange};
            }
            let documentYeetSize = yeetSize + 3;
            lineCounter += documentYeetSize;
        }

        throw new Error('No yeet found at position');
    }


    private thisDocumentChanged(event: vscode.TextDocumentChangeEvent) {        
        let edit = new vscode.WorkspaceEdit();

        for (const change of event.contentChanges) {
            const newlinesAdded = change.text.split('\n').length - 1;
            const deletedNewlines = change.range.end.line - change.range.start.line;
            const delta = newlinesAdded - deletedNewlines;

            const {yeet, yeetDocumentRange} = this.getYeetAtPosition(change.range.start);

            let newYeetText = this.document.getText(yeetDocumentRange);

            edit.replace(yeet.document.uri, yeet.range, newYeetText);

            yeet.range = yeet.range.with({
                end: yeet.range.end.translate(delta, 0)
            });

        }

        this.isUpdating = true;
        vscode.workspace.applyEdit(edit).then(() => {
            this.isUpdating = false;
        });
    }

    public onDocumentChange(event: vscode.TextDocumentChangeEvent) {
        if (this.isUpdating) {
            return;
        }

        if (event.document === this.document) {
            this.thisDocumentChanged(event);
        } else if (this.filenames.has(event.document.fileName)) {
            this.otherDocumentChanged(event);
        }
    }
};
