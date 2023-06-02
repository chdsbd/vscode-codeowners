import vscode from "vscode"
import _ from "lodash"

// Finds the following:
// @chdsbd
// @acme-corp/api-review
// j.doe@example.com
const USERNAME_REGEX = /\S*@\S+/g

export function* findUsernameRanges(document: vscode.TextDocument) {
  for (const lineNum of _.range(0, document.lineCount)) {
    const line = document.lineAt(lineNum)

    // remove comments.
    const text = line.text.split("#", 2)[0]

    // modified from https://github.com/microsoft/vscode-extension-samples/blob/dfb20f12d425bad2ede0f1faae25e0775ca750eb/codelens-sample/src/CodelensProvider.ts#L24-L37
    const matches = text.matchAll(USERNAME_REGEX)
    for (const match of matches) {
      const indexOf = text.indexOf(match[0])
      const position = new vscode.Position(line.lineNumber, indexOf)
      const range = document.getWordRangeAtPosition(position, USERNAME_REGEX)

      if (range != null) {
        yield range
      }
    }
  }
}

function findUsernames(document: vscode.TextDocument) {
  const usernames = new Set<string>()
  for (const usernameRange of findUsernameRanges(document)) {
    const username = document.getText(usernameRange)
    usernames.add(username.replace(/^@/, ""))
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
    return findUsernames(document).map((owner, idx) => ({
      label: owner,
      // special case for emails to remove the `@` prefix.
      range: owner.match(/\S+@\S+/)
        ? {
            inserting: new vscode.Range(
              position.with(undefined, position.character - 1),
              position.with(
                undefined,
                position.character - 1 + owner.length - 1,
              ),
            ),
            replacing: new vscode.Range(
              position.with(undefined, position.character - 1),
              position,
            ),
          }
        : undefined,
      // preserve our sorted order.
      sortText: idx.toString(),
      kind: vscode.CompletionItemKind.User,
    }))
  }
}
