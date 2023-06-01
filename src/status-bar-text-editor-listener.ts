import vscode from "vscode"
import { getOwnership } from "./show-owners-command"

function formatNames(owners: string[]): string {
  if (owners.length > 2) {
    return `${owners[0]} & ${owners.length - 1} others`
  } else if (owners.length === 2) {
    return `${owners[0]} & 1 other`
  } else if (owners.length === 1) {
    return `${owners[0]}`
  } else {
    return "no owners"
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

export function statusBarTextEditorListener(
  statusBarItem: vscode.StatusBarItem,
  outputChannel: vscode.OutputChannel,
) {
  return async () => {
    const res = await getOwnership(outputChannel)

    if (!res) {
      statusBarItem.hide()
      return
    }

    statusBarItem.text = `$(shield) ${formatNames(res.owners)}`

    statusBarItem.tooltip = formatToolTip(res)
    statusBarItem.show()
  }
}
