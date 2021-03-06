// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
const vscode = require('vscode');

const lensProvider = require(`./lensProvider`);

const { DisplayFile } = require(`./dspf`);
const Render = require(`./render`);
const Window = require(`./window`);

const Indicators = require(`./indicators`);

let renderTimeout;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

  // Use the console to output diagnostic information (console.log) and errors (console.error)
  // This line of code will only be executed once when your extension is activated
  console.log('Congratulations, your extension "vscode-displayfile" is now active!');

  Indicators.initialize();

  const lens = new lensProvider();
  
  const config = vscode.workspace.getConfiguration('vscode-displayfile');

  // The command has been defined in the package.json file
  // Now provide the implementation of the command with  registerCommand
  // The commandId parameter must match the command field in package.json
  context.subscriptions.push(
    vscode.commands.registerCommand('vscode-displayfile.render', function (sourceLines, format, type) {
      // The code you place here will be executed every time your command is executed

      try {
        const dspf = new DisplayFile();
        dspf.parse(sourceLines);

        const render = new Render(dspf, Indicators.values, type);

        const html = render.generate(format);

        Window.create();
        Window.update(html);

      } catch (e) {
        console.log(e);
      }
    }),

    vscode.commands.registerCommand(`vscode-displayfile.changeInd`, async () => {
      const inds = Object.keys(Indicators.values);

      vscode.window.showQuickPick(inds.map((ind) => ({
        label: `${ind} - ${Indicators.values[ind]}`,
        value: ind
      })), {
        canPickMany: true,
        placeHolder: `Chose which indicators to switch`
      }).then(chosen => {
        chosen.forEach(ind => {
          const index = Number(ind.value);
          Indicators.values[index] = !Indicators.values[index];
        })
      })
    }),

    vscode.window.onDidChangeTextEditorSelection((event) => {
      const editor = event.textEditor;
      const selection = editor.selection;

      const timeout = config.get(`renderTimeout`) || 1500;

      clearTimeout(renderTimeout);

      renderTimeout = setTimeout(() => {
        if (Window.isActive()) {
          const activeEditor = vscode.window.activeTextEditor;
          if (editor && activeEditor) {
            const document = editor.document;
            const id = document.languageId;
  
            if ([`dds.dspf`, `dds.prtf`].includes(id)) {
              const eol = document.eol === vscode.EndOfLine.CRLF ? `\r\n` : `\n`;
              const sourceLines = document.getText().split(eol);
  
              const dspf = new DisplayFile();
              dspf.parse(sourceLines);
  
              const render = new Render(dspf, Indicators.values, id);
  
              const line = selection.start.line;
  
              const format = dspf.formats.find(f => line >= f.range.start && line < f.range.end);
  
              if (format) {
                const html = render.generate(format.name);
  
                Window.update(html);
              }
            }
          }
        }
      }, timeout);

    }),

    vscode.languages.registerCodeLensProvider(
      {
        language: `dds.dspf`,
      },
      lens
    ),
    vscode.languages.registerCodeLensProvider(
      {
        language: `dds.prtf`,
      },
      lens
    ),
  );
}

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
  activate,
  deactivate
}
