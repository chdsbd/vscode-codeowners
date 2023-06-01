import vscode from "vscode"
import { dirname } from "path"
import fs from "fs"

export class CodeownersHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.Hover> {
    console.log({ document, position, token })
    const line = document.lineAt(position.line)
    // if (line.text.match(/^\s/))
    console.log(line)
    const start = line.text.split(" ")[0]
    console.log({ start })
    const m = line.text.match(/^\s*(\S+)/)?.[1]
    if (m == null) {
      return { contents: [] }
    }
    const idx = line.text.indexOf(m)

    const workspaceDir = dirname(dirname(document.uri.fsPath))
    const myPath = workspaceDir + "/" + m

    let isDirectory: boolean | null = null
    try {
      isDirectory = fs.statSync(myPath).isDirectory()
    } catch (e) {
      console.error(e)
    }
    const x = new vscode.MarkdownString()
    x.appendCodeblock(m)

    const isPattern = !m.startsWith("/")

    const range = new vscode.Range(
      new vscode.Position(position.line, idx),
      new vscode.Position(position.line, idx + m.length),
    )
    if (!range.contains(position)) {
      return { contents: [] }
    }
    return {
      range,
      contents: [
        x,
        isPattern
          ? "Matches all files with same name"
          : isDirectory
          ? `Matches all files in directory and subdirectories`
          : `Matches path exactly`,
        // !isPattern && isDirectory == null ? "Path does not exist" : "",
      ],
    }
    // return { contents: [] }
  }
}
