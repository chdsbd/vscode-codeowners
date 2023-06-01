import vscode from "vscode"
import _ from "lodash"

export function findUsersAndTeamsFromDocument(
  document: vscode.TextDocument,
): string[] {
  const docText = document.getText()

  const lines = docText.split("\n")

  const usernames = new Set<string>()
  for (const line of lines) {
    // ignore comments.
    if (line.match(/^\s*#/)) {
      continue
    }
    const pm = line.match(/^\s*([^\s]+)/)
    if (pm == null) {
      continue
    }
    const pattern = pm[1]
    if (pattern == null) {
      continue
    }
    for (const usernameMatch of line.matchAll(/\s(\S*@\S+)/g)) {
      const username = usernameMatch[1]
      if (username == null) {
        continue
      }
      usernames.add(username.replace(/^@/, ""))
    }
  }
  return _.sortBy(Array.from(usernames), (x) => {
    if (x.includes("/")) {
      // place groups first
      return " " + x
    }
    return x
  })
}
export class OwnerNameCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    return findUsersAndTeamsFromDocument(document).map((x, idx) => ({
      label: x,
      // special case for emails?. Maybe delete this?
      range: x.match(/\S+@\S+/)
        ? {
            inserting: new vscode.Range(
              position.with(undefined, position.character - 1),
              position.with(undefined, position.character - 1 + x.length - 1),
            ),
            replacing: new vscode.Range(
              position.with(undefined, position.character - 1),
              position,
            ),
          }
        : undefined,
      sortText: idx.toString(),
      kind: vscode.CompletionItemKind.User,
    }))
  }
}
