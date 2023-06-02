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
      // place groups like acme-corp/api-review ahead of individual usernames.
      return " " + x
    }
    return x
  })
}

/**
 * Provide autocomplete for usernames based on the codeowners files.
 *
 * The "GitHub Pull Requests and Issues" extension already provides
 * autocompletion here, so users will also see those results in their
 * suggestions.
 * https://github.com/microsoft/vscode-pull-request-github/blob/c52a9ccadce8c3c0238656f39e6cc268e344bbba/src/issues/userCompletionProvider.ts#LL15C1-L15C1
 */
export class OwnerNameCompletionItemProvider
  implements vscode.CompletionItemProvider
{
  provideCompletionItems(
    document: vscode.TextDocument,
    position: vscode.Position,
  ): vscode.ProviderResult<
    vscode.CompletionItem[] | vscode.CompletionList<vscode.CompletionItem>
  > {
    const items = findUsernames(document).map(
      (owner, idx): vscode.CompletionItem => {
        const isEmail = owner.match(/\S+@\S+/)
        return {
          label: owner,
          // replace the `@` trigger character.
          range: new vscode.Range(position.translate(undefined, -1), position),
          // need to add @ because our trigger character is used for filtering.
          filterText: "@" + owner,
          // emails won't have an @ in front of them.
          insertText: !isEmail ? "@" + owner : owner,
          // preserve our sorted order.
          sortText: idx.toString(),
          kind: vscode.CompletionItemKind.User,
        }
      },
    )

    return items
  }
}
