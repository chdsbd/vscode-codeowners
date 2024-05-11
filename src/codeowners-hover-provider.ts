import vscode from "vscode"
import { dirname } from "path"
import fs from "fs"

export class CodeownersHoverProvider implements vscode.HoverProvider {
  provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<vscode.Hover> {
    const line = document.lineAt(position.line)
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
      console.error("github-code-owners", e)
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
      ],
    }
  }
}
