import vscode from "vscode"
import path from "path"
import fs from "fs"
import _ from "lodash"

function parseAbsolutePatternFromLine(line: vscode.TextLine) {
  const text = line.text.split("#", 2)[0]
  const match = text.match(/^\s*(\/\S*)/)
  return match?.[1]
}

function findRepositoryRoot(startPath: string) {
  let directory = startPath
  while (true) {
    // parent folder will have git directory
    const newPath = path.resolve(directory, ".git/index")
    if (fs.existsSync(newPath)) {
      return directory
    }
    const newParentDir = path.dirname(directory)
    if (newParentDir === directory) {
      return null
    }
    directory = newParentDir
  }
}

export class PathCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  outputChannel: vscode.OutputChannel
  constructor(outputChannel: vscode.OutputChannel) {
    this.outputChannel = outputChannel
  }
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const line = document.lineAt(position.line)

    const repositoryRoot = findRepositoryRoot(document.uri.fsPath)
    if (repositoryRoot == null) {
      this.outputChannel.appendLine("Could not find repository root from file")
      return []
    }

    const pattern = parseAbsolutePatternFromLine(line)
    if (pattern == null) {
      return []
    }

    const patternPath = path.join(repositoryRoot, pattern)
    let files = []
    try {
      files = fs.readdirSync(patternPath, { withFileTypes: true })
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
