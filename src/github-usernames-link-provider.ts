import vscode from "vscode"
import { findUsernameRanges } from "./owner-name-completion-item-provider"

function githubUserToUrl(username: string): vscode.Uri {
  const isTeamName = username.includes("/")
  const gitHubUrl = getGitHubUrl()

  if (isTeamName) {
    const [org, name] = username.split(/\//)
    return vscode.Uri.parse(gitHubUrl + `/orgs/${org}/teams/${name}`)
  }
  return vscode.Uri.parse(gitHubUrl + `/${username}`)
}

function getGitHubUrl(): string {
  /*
   * When using GitHub Enterprise Server, you should have a 'github-enterprise.uri'
   * configuration setting. Let's see if we have one of those.
   */
  const setting = vscode.workspace.getConfiguration().get<string>('github-enterprise.uri')
  if (!setting) {
    // Doesn't appear to be a GHES workspace
    return 'https://github.com'
  }

  return setting
}

/**
 * Add links to usernames in CODEOWNERS file that open on GitHub.
 */
export class GitHubUsernamesLinkProvider
  implements vscode.DocumentLinkProvider
{
  provideDocumentLinks(
    document: vscode.TextDocument,
  ): vscode.ProviderResult<vscode.DocumentLink[]> {
    const links = []
    for (const range of findUsernameRanges(document)) {
      if (range) {
        const username = document.getText(range)

        // don't make emails clickable
        // e.g. docs@example.com
        if (!username.startsWith("@")) {
          continue
        }
        const link = new vscode.DocumentLink(
          range,
          githubUserToUrl(username.replace(/^@/, "")),
        )
        link.tooltip = `View ${username} on Github`

        links.push(link)
      }
    }
    return links
  }
}
