import vscode from "vscode"

import { GitHubUsernamesLinkProvider } from "./github-usernames-link-provider"
import { PathCompletionItemProvider } from "./path-completion-item-provider"
import { OwnerNameCompletionItemProvider } from "./owner-name-completion-item-provider"
import { showOwnersCommandHandler } from "./show-owners-command"
import { CodeownersHoverProvider } from "./codeowners-hover-provider"
import { statusBarTextEditorListener } from "./status-bar-text-editor-listener"

const COMMAND_ID = "github-code-owners.show-owners"

const STATUS_BAR_PRIORITY = 100

export function activate(context: vscode.ExtensionContext) {
  console.log("CODEOWNERS: activated")
  const outputChannel = vscode.window.createOutputChannel("Github Code Owners")

  vscode.languages.registerDocumentLinkProvider(
    "codeowners",
    new GitHubUsernamesLinkProvider(),
  )

  context.subscriptions.push(
    vscode.commands.registerCommand(COMMAND_ID, showOwnersCommandHandler),
  )

  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      "codeowners",
      new OwnerNameCompletionItemProvider(),
      "@",
    ),
  )
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(
      "codeowners",
      new PathCompletionItemProvider(outputChannel),
      "/",
    ),
  )
  context.subscriptions.push(
    vscode.languages.registerHoverProvider(
      "codeowners",
      new CodeownersHoverProvider(),
    ),
  )

  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Right,
    STATUS_BAR_PRIORITY,
  )
  statusBarItem.command = COMMAND_ID
  context.subscriptions.push(statusBarItem)

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(
      statusBarTextEditorListener(statusBarItem, outputChannel),
    ),
  )
}
