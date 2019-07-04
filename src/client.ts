/* --------------------------------------------------------------------------------------------
 * Copyright (c) 2018 TypeFox GmbH (http://www.typefox.io). All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
import { getLanguageService, getJSONLanguageService, TextDocument, parse7 as parseYaml7, parse4 as parseYaml4 ,SchemaRequestService, CustomFormatterOptions } from "yaml-language-server";
import { MonacoToProtocolConverter, ProtocolToMonacoConverter } from 'monaco-languageclient/lib/monaco-converter';
import * as URL from 'url';

const LANGUAGE_ID = 'yaml';
const MODEL_URI = 'inmemory://model.yaml'
const MONACO_URI = monaco.Uri.parse(MODEL_URI);

// register the JSON language with Monaco
monaco.languages.register({
    id: LANGUAGE_ID,
    extensions: ['.yml', '.yaml'],
    aliases: ['YAML', 'yaml'],
    mimetypes: ['application/yaml'],
});

// create the Monaco editor
const value = `apiVersion: v1`;
monaco.editor.create(document.getElementById("container")!, {
    model: monaco.editor.createModel(value, LANGUAGE_ID, MONACO_URI),
    glyphMargin: true,
    lightbulb: {
        enabled: true
    }
});

function getModel(): monaco.editor.IModel {
    return monaco.editor.getModel(MONACO_URI);
}

function createDocument(model: monaco.editor.IReadOnlyModel) {
    return TextDocument.create(MODEL_URI, model.getModeId(), model.getVersionId(), model.getValue());
}

var resolveSchema:SchemaRequestService = function (url: string): Promise<string> {
    const promise = new Promise<string>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.onload = () => resolve(xhr.responseText);
        xhr.onerror = () => reject(xhr.statusText);
        xhr.open("GET", url, true);
        xhr.send();
        console.log('resolving schema ' + url);
    });
    return promise;
}
const workspaceContext = {
  resolveRelativePath: (relativePath: string, resource: string) =>
      URL.resolve(resource, relativePath)
};

const m2p = new MonacoToProtocolConverter();
const p2m = new ProtocolToMonacoConverter();
const yamlService = getLanguageService( resolveSchema, workspaceContext, []);
const jsonLanguageService = getJSONLanguageService({
    schemaRequestService: resolveSchema,
    workspaceContext
});
const schemas = [{
  uri:  'https://raw.githubusercontent.com/garethr/kubernetes-json-schema/master/v1.14.0-standalone-strict/all.json',
  fileMatch: [ "*"]
}];
jsonLanguageService.configure({
  allowComments: true,
  validate: true,
  schemas: schemas
});
yamlService.configure({
  allowComments: true,
  validate: true,
  schemas: schemas,
  hover: true,
  completion: true
});

const pendingValidationRequests = new Map<string, number>();

monaco.languages.registerCompletionItemProvider(LANGUAGE_ID, {
    provideCompletionItems(model, position, token): monaco.languages.CompletionItem[] | Thenable<monaco.languages.CompletionItem[]> | monaco.languages.CompletionList | Thenable<monaco.languages.CompletionList> {
        const document = createDocument(model);
        const yamlDocument = parseYaml4(document.getText());
        return yamlService.doComplete(document, m2p.asPosition(position.lineNumber, position.column), yamlDocument).then((list) => {
            return p2m.asCompletionResult(list);
        });
    },

    resolveCompletionItem(item, token): monaco.languages.CompletionItem | Thenable<monaco.languages.CompletionItem> {
        return yamlService.doResolve(m2p.asCompletionItem(item)).then(result => p2m.asCompletionItem(result));
    }
});

monaco.languages.registerDocumentFormattingEditProvider(LANGUAGE_ID, {
  provideDocumentFormattingEdits(model,options,token):monaco.languages.TextEdit[] | Thenable<monaco.languages.TextEdit[]> {
    const document = createDocument(model);
    let yamlFormatterSettings = {
      singleQuote: false,
      bracketSpacing: true,
      proseWrap: 'preserve',
      printWidth: 80,
      enable: true
  } as CustomFormatterOptions;
    const edits = yamlService.doFormat(document, yamlFormatterSettings);
    return p2m.asTextEdits(edits);
  }

});

monaco.languages.registerDocumentSymbolProvider(LANGUAGE_ID, {
    provideDocumentSymbols(model, token): monaco.languages.DocumentSymbol[] | Thenable<monaco.languages.DocumentSymbol[]> {
        const document = createDocument(model);
        const yamlDocument = parseYaml7(document.getText());
        return p2m.asSymbolInformations(yamlService.findDocumentSymbols(jsonLanguageService, document, yamlDocument));
    }
});

monaco.languages.registerHoverProvider(LANGUAGE_ID, {
    provideHover(model, position, token): monaco.languages.Hover | Thenable<monaco.languages.Hover> {
        const document = createDocument(model);
        const yamlDocument = parseYaml7(document.getText());
        return yamlService.doHover(jsonLanguageService, document, m2p.asPosition(position.lineNumber, position.column), yamlDocument).then((hover) => {
            return p2m.asHover(hover)!;
        });
    }
});

getModel().onDidChangeContent((event) => {
    validate();
});

function validate(): void {
    const document = createDocument(getModel());
    cleanPendingValidation(document);
    pendingValidationRequests.set(document.uri, setTimeout(() => {
        pendingValidationRequests.delete(document.uri);
        doValidate(document);
    }));
}

function cleanPendingValidation(document: TextDocument): void {
    const request = pendingValidationRequests.get(document.uri);
    if (request !== undefined) {
        clearTimeout(request);
        pendingValidationRequests.delete(document.uri);
    }
}

function doValidate(document: TextDocument): void {
    if (document.getText().length === 0) {
        cleanDiagnostics();
        return;
    }
    const yamlDocument = parseYaml7(document.getText());
    yamlService.doValidation(jsonLanguageService, document, yamlDocument, true).then((diagnostics) => {
        const markers = p2m.asDiagnostics(diagnostics);
        monaco.editor.setModelMarkers(getModel(), 'default', markers);
    });
}

function cleanDiagnostics(): void {
    monaco.editor.setModelMarkers(monaco.editor.getModel(MONACO_URI), 'default', []);
}
