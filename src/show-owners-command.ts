import vscode from "vscode"
import path from "path"

import { OwnershipEngine } from "@snyk/github-codeowners/dist/lib/ownership"

async function fileExists(path: string): Promise<boolean> {
  try {
    await vscode.workspace.fs.stat(vscode.Uri.parse(path))
    return true
  } catch (e: unknown) {
    // @ts-expect-error we should see this error.
    if (e.code !== "FileNotFound") {
      console.error(e)
    }
    return false
  }
}
const PathOptions = [".github/CODEOWNERS", "CODEOWNERS"]

async function findCodeOwnersFile(
  startDirectory: string,
): Promise<string | null> {
  for (const pathOption of PathOptions) {
    const codeownersPath = path.join(startDirectory, pathOption)
    if (await fileExists(codeownersPath)) {
      return codeownersPath
    }
  }
  return null
}

export async function getOwnership(
  outputChannel: vscode.OutputChannel,
): Promise<
  | {
      kind: "match"
      owners: string[]
      lineno: number
      filePath: string
    }
  | { kind: "no-match"; filePath: string; owners: []; lineno: 0 }
  | null
> {
  if (!vscode.window.activeTextEditor) {
    return null
  }

  const { fileName, uri } = vscode.window.activeTextEditor.document

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)

  if (workspaceFolder == null) {
    outputChannel.appendLine(`Could not locate workspace for file: ${uri}`)
    return null
  }

  const {
    uri: { fsPath: workspacePath },
  } = workspaceFolder

  const codeownersFilePath = await findCodeOwnersFile(workspacePath)
  if (codeownersFilePath == null) {
    outputChannel.appendLine(
      `Could not find code owners file for workspace path: ${workspacePath}`,
    )
    return null
  }

  const file = fileName.split(`${workspacePath}${path.sep}`)[1]

  const codeOwners = OwnershipEngine.FromCodeownersFile(codeownersFilePath)
  const res = codeOwners.calcFileOwnership(file)

  if (res == null) {
    outputChannel.appendLine(`No owners for file: ${file}`)
    return {
      kind: "no-match",
      filePath: codeownersFilePath,
      owners: [],
      lineno: 0,
    }
  }

  outputChannel.appendLine(`Found code owners for file: ${workspacePath}`)

  return {
    ...res,
    kind: "match",
    owners: res.owners.map((x) => x.replace(/^@/, "")),
    filePath: codeownersFilePath,
  }
}

export function showOwnersCommandHandler(outputChannel: vscode.OutputChannel) {
  return async () => {
    const ownership = await getOwnership(outputChannel)
    if (ownership == null) {
      return
    }
    const doc = await vscode.workspace.openTextDocument(ownership.filePath)
    if (ownership.kind === "match") {
      const textEditor = await vscode.window.showTextDocument(doc)
      const line = doc.lineAt(ownership.lineno)

      // select the line.
      textEditor.selection = new vscode.Selection(
        line.range.start,
        line.range.end,
      )
      // scroll the line into focus.
      textEditor.revealRange(line.range)
    }
  }
}
