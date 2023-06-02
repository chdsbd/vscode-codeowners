import vscode from "vscode"
import path from "path"
import fs from "fs"
import child_process from "child_process"
import _ from "lodash"
import util from "util"
const exec = util.promisify(child_process.exec)

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
  async provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): Promise<
    | vscode.CompletionItem[]
    | vscode.CompletionList<vscode.CompletionItem>
    | null
    | undefined
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

    const ignoredPaths = new Set<string>()
    // ignore git directory explicitly because git check-ignore won't.
    const gitDirectory = path.join(repositoryRoot, ".git")
    ignoredPaths.add(gitDirectory)

    const fileArgs = files.map((x) => path.join(patternPath, x.name)).join(" ")
    try {
      const { stdout } = await exec(`git check-ignore ${fileArgs}`, {
        cwd: repositoryRoot,
      })
      for (const ignoredPath of stdout.split("\n")) {
        if (ignoredPath != null) {
          ignoredPaths.add(ignoredPath)
        }
      }
      // git-check-ignore errors when there are no matching ignored files.
      // so we'll get an exception in our common flow.
    } catch {}

    const completionItems = files
      .filter((x) => {
        const absolutePath = path.join(patternPath, x.name)
        return !ignoredPaths.has(absolutePath)
      })
      .map((x): vscode.CompletionItem => {
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
