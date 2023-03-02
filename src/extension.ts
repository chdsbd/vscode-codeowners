import vscode from "vscode"
import findUp from "find-up"
import path from "path"

import { OwnershipEngine } from "@snyk/github-codeowners/dist/lib/ownership"

const COMMAND_ID = "github-code-owners.show-owners"

const STATUS_BAR_PRIORITY = 100

async function getOwnership(): Promise<{
  owners: string[]
  lineno: number
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

  return { ...res, owners: res.owners.map((x) => x.replace(/^@/, "")) }
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

export function activate(context: vscode.ExtensionContext) {
  console.log("CODEOWNERS: activated")

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    STATUS_BAR_PRIORITY,
  )

  statusBarItem.command = COMMAND_ID
  context.subscriptions.push(statusBarItem)

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, async () => {
      const owners = await getOwnership()
      if (owners == null) {
        return
      }
      const quickPickItems: vscode.QuickPickItem[] = owners.owners.map(
        (owner) => ({
          label: owner.replace(/^@/, ""),
          description: "View in GitHub",
          detail: `from CODEOWNERS line ${owners.lineno}`,
        }),
      )
      const res = await vscode.window.showQuickPick(quickPickItems)
      if (res != null) {
        const isTeamName = res.label.includes("/")
        const githubUsername = res.label

        if (isTeamName) {
          const [org, name] = githubUsername.split(/\//)
          vscode.env.openExternal(
            vscode.Uri.parse(`https://github.com/orgs/${org}/teams/${name}`),
          )
        } else {
          vscode.env.openExternal(
            vscode.Uri.parse(`https://github.com/${githubUsername}`),
          )
        }
      }
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
