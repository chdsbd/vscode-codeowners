import vscode from "vscode"
import { dirname } from "path"
import fs from "fs"
import _ from "lodash"

function parseAbsolutePatternFromLine(line: vscode.TextLine) {
  const text = line.text.split("#", 2)[0]
  const match = text.match(/^\s*(\/\S*)/)
  return match?.[1]
}

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

    const pattern = parseAbsolutePatternFromLine(line)
    if (pattern == null) {
      return []
    }

    // FIXME: correctly discover .git root.
    const repositoryRoot = dirname(dirname(document.uri.fsPath))
    const myPath = repositoryRoot + pattern
    let files = []
    try {
      files = fs.readdirSync(myPath, { withFileTypes: true })
    } catch (e) {
      return []
    }

    // FIXME: remove .gitignored files from options
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
