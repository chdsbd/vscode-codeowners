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

class GoDefinitionProvider implements vscode.DefinitionProvider {
  public provideDefinition(
    document: vscode.TextDocument,
    position: vscode.Position,
    token: vscode.CancellationToken,
  ): Thenable<vscode.Location> {
    console.log(document, position, token)
    return Promise.resolve(
      new vscode.Location(
        vscode.Uri.parse("https://github.com"),

        new vscode.Range(new vscode.Position(5, 0), new vscode.Position(5, 15)),
      ),
    )
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

/**
 * CodelensProvider
 */
export class CodelensProvider implements vscode.CodeLensProvider {
  private codeLenses: vscode.CodeLens[] = []
  private regex: RegExp
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> =
    new vscode.EventEmitter<void>()
  public readonly onDidChangeCodeLenses: vscode.Event<void> =
    this._onDidChangeCodeLenses.event

  constructor() {
    this.regex = /\S*@\S+/g

    vscode.workspace.onDidChangeConfiguration((_) => {
      this._onDidChangeCodeLenses.fire()
    })
  }

  public provideCodeLenses(
    document: vscode.TextDocument,
    token: vscode.CancellationToken,
  ): vscode.CodeLens[] | Thenable<vscode.CodeLens[]> {
    if (true) {
      this.codeLenses = []
      const regex = new RegExp(this.regex)
      const text = document.getText()
      let matches
      while ((matches = regex.exec(text)) !== null) {
        const line = document.lineAt(document.positionAt(matches.index).line)
        const indexOf = line.text.indexOf(matches[0])
        const position = new vscode.Position(line.lineNumber, indexOf)
        const range = document.getWordRangeAtPosition(
          position,
          new RegExp(this.regex),
        )
        if (range) {
          this.codeLenses.push(new vscode.CodeLens(range))
        }
      }
      return this.codeLenses
    }
    return []
  }

  public resolveCodeLens(
    codeLens: vscode.CodeLens,
    token: vscode.CancellationToken,
  ) {
    if (true) {
      codeLens.command = {
        title: "Open @vercel/turbo-oss in GitHub",
        tooltip: "Tooltip provided by sample extension",
        command: "codelens-sample.codelensAction",
        arguments: ["Argument 1", false],
      }
      return codeLens
    }
    return null
  }
}

class HoverProvider implements vscode.HoverProvider {
  public provideHover(
    document: vscode.TextDocument,
    hoverPosition: vscode.Position,
    token: vscode.CancellationToken,
  ): vscode.Hover | null {
    const regex = new RegExp(/\S*@\S+/g)
    const text = document.getText()
    let matches
    while ((matches = regex.exec(text)) !== null) {
      const line = document.lineAt(document.positionAt(matches.index).line)
      const indexOf = line.text.indexOf(matches[0])
      const position = new vscode.Position(line.lineNumber, indexOf)
      const range = document.getWordRangeAtPosition(
        position,
        new RegExp(/\S*@\S+/g),
      )

      if (range && range.contains(hoverPosition)) {
        const md = new vscode.MarkdownString()
        const username = document.getText(range)
        md.appendMarkdown(
          `[View ${username} on GitHub](${githubUserToUrl(
            username.replace(/^@/, ""),
          )})`,
        )
        // this.codeLenses.push(new vscode.CodeLens(range))
        return new vscode.Hover(md, range)
      }
    }

    // const ref = trackedSearch.findInlineAt(IDENTIFIER_REGEX, document, position)
    // if (ref) {
    //   const md = new vscode.MarkdownString()
    //   const potentialDeclarationRe = new RegExp(
    //     "\\b(parameter|localparam|input|output|inout|wire|bit|logic|reg)\\b.*?" +
    //       trackedSearch.escapeRegex(ref.text),
    //     "g",
    //   )
    //   const decl = trackedSearch.findNext(potentialDeclarationRe, document)
    //   if (decl) {
    //     const declLine = document.lineAt(decl.range.start.line).text.trim()
    //     md.appendText("sample\n\n")
    //     md.appendCodeblock(declLine, document.languageId)
    //     return new vscode.Hover(md, ref.range)
    //   }
    // }
    return null
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

  // const codelensProvider = new CodelensProvider()

  const hoverProvider = new HoverProvider()
  vscode.languages.registerHoverProvider("codeowners", hoverProvider)
  // vscode.languages.registerCodeLensProvider("codeowners", codelensProvider)

  context.subscriptions.push(
    vscode.languages.registerDefinitionProvider(
      "codeowners",
      new GoDefinitionProvider(),
    ),
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
      // const res = await vscode.window.showQuickPick(quickPickItems)
      // if (res != null) {
      //   const isTeamName = res.label.includes("/")
      //   const githubUsername = res.label

      //   if (isTeamName) {
      //     const [org, name] = githubUsername.split(/\//)
      //     vscode.env.openExternal(
      //       vscode.Uri.parse(`https://github.com/orgs/${org}/teams/${name}`),
      //     )
      //   } else {
      //     vscode.env.openExternal(
      //       vscode.Uri.parse(`https://github.com/${githubUsername}`),
      //     )
      //   }
      // }
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
