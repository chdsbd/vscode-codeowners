import vscode from "vscode"
import { dirname } from "path"
import fs from "fs"
import _ from "lodash"

export class PathCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const line = document.lineAt(position.line)
    if (!line.text.startsWith("/")) {
      return []
    }
    const t = document.getText(
      new vscode.Range(new vscode.Position(position.line, 0), position),
    )

    const x = dirname(dirname(document.uri.fsPath))
    const myPath = x + t
    let files = []
    try {
      files = fs.readdirSync(myPath, { withFileTypes: true })
    } catch (e) {
      return []
    }

    const completionItems = files.map((x): vscode.CompletionItem => {
      const isDirectory = x.isDirectory()
      const kind = isDirectory
        ? vscode.CompletionItemKind.Folder
        : vscode.CompletionItemKind.File
      return {
        label: x.name,
        sortText: `${isDirectory ? "a" : "b"}:${x.name}`,
        kind,
      }
    })

    return _.sortBy(completionItems, (x) => x.kind + "?" + x.label)
  }
}
