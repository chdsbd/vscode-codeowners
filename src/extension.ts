import vscode from "vscode"
import findUp from "find-up"
import path from "path"

import { OwnershipEngine } from "@snyk/github-codeowners/dist/lib/ownership"

const COMMAND_ID = "github-code-owners.show-owners"

const STATUS_BAR_PRIORITY = 100

async function getOwnership(): Promise<{
  owners: string[]
  lineno: number
  filePath: string
} | null> {
  if (!vscode.window.activeTextEditor) {
    return null
  }

  const { fileName, uri } = vscode.window.activeTextEditor.document

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(uri)

  if (workspaceFolder == null) {
    return null
  }

  const {
    uri: { fsPath: workspacePath },
  } = workspaceFolder

  const codeownersFilePath = findUp.sync("CODEOWNERS", { cwd: workspacePath })
  if (codeownersFilePath == null) {
    return null
  }

  const file = fileName.split(`${workspacePath}${path.sep}`)[1]

  const codeOwners = OwnershipEngine.FromCodeownersFile(codeownersFilePath)
  const res = codeOwners.calcFileOwnership(file)

  if (res == null) {
    return null
  }

  return {
    ...res,
    owners: res.owners.map((x) => x.replace(/^@/, "")),
    filePath: codeownersFilePath,
  }
}

function formatNames(owners: string[]): string {
  if (owners.length > 2) {
    return `${owners[0]} & ${owners.length - 1} others`
  } else if (owners.length === 2) {
    return `${owners[0]} & 1 other`
  } else if (owners.length === 1) {
    return `${owners[0]}`
  } else {
    return "None"
  }
}

function formatToolTip({
  owners,
  lineno,
}: {
  owners: string[]
  lineno: number
}): string {
  if (owners.length === 0) {
    return "No Owners"
  }

  if (owners.length <= 2) {
    return `Owned by ${owners.join(" and ")}\n(from CODEOWNERS line ${lineno})`
  }

  return `Owned by ${owners.slice(0, owners.length - 1).join(", ")} and ${
    owners[owners.length - 1]
  }\n(from CODEOWNERS line ${lineno})`
}

class LinkProvider implements vscode.DocumentLinkProvider {
  public provideDocumentLinks(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const regex = new RegExp(/\S*@\S+/g)
    const text = document.getText()
    let matches
    const links = []
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line)
      const indexOf = line.text.indexOf(matches[0])
      const position = new vscode.Position(line.lineNumber, indexOf)
      const range = document.getWordRangeAtPosition(
        position,
        new RegExp(/\S*@\S+/g),
      )

      if (range) {
        const md = new vscode.MarkdownString()
        const username = document.getText(range)
        md.appendMarkdown(
          `[View ${username} on GitHub](${githubUserToUrl(
            username.replace(/^@/, ""),
          )})`,
        )
        // this.codeLenses.push(new vscode.CodeLens(range))
        const link = new vscode.DocumentLink(
          range,
          githubUserToUrl(username.replace(/^@/, "")),
        )
        link.tooltip = "View user in Github"

        links.push(link)
      }
    }
    return links
  }
}

function githubUserToUrl(username: string): vscode.Uri {
  const isTeamName = username.includes("/")

  if (isTeamName) {
    const [org, name] = username.split(/\//)
    return vscode.Uri.parse(`https://github.com/orgs/${org}/teams/${name}`)
  }
  return vscode.Uri.parse(`https://github.com/${username}`)
}

export function activate(context: vscode.ExtensionContext) {
  console.log("CODEOWNERS: activated")

  vscode.languages.registerDocumentLinkProvider(
    "codeowners",
    new LinkProvider(),
  )

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    STATUS_BAR_PRIORITY,
  )

  statusBarItem.command = COMMAND_ID
  context.subscriptions.push(statusBarItem)

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, async () => {
      const ownership = await getOwnership()
      if (ownership == null) {
        return
      }
      const quickPickItems: vscode.QuickPickItem[] = ownership.owners.map(
        (owner) => ({
          label: owner.replace(/^@/, ""),
          description: "View in GitHub",
          detail: `from CODEOWNERS line ${ownership.lineno}`,
        }),
      )
      const doc = await vscode.workspace.openTextDocument(ownership.filePath)
      const textEditor = await vscode.window.showTextDocument(doc)
      const line = doc.lineAt(ownership.lineno)

      textEditor.selection = new vscode.Selection(
        line.range.start,
        line.range.end,
      )
      textEditor.revealRange(line.range)
    }),
  )

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(async () => {
      const res = await getOwnership()

      if (!res) {
        statusBarItem.hide()
        return
      }

      statusBarItem.text = `$(shield) ${formatNames(res.owners)}`

      statusBarItem.tooltip = formatToolTip(res)
      statusBarItem.show()
    }),
  )
}
