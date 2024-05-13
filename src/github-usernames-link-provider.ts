import vscode from "vscode"
import { findUsernameRanges } from "./owner-name-completion-item-provider"
import {
  SlackMappingConfigurationItem,
  getGitHubUrl,
  getTeamMappingSlack,
} from "./configuration"

function githubUserToUrl(username: string): vscode.Uri {
  const isTeamName = username.includes("/")
  const gitHubUrl = getGitHubUrl()

  if (isTeamName) {
    const [org, name] = username.split(/\//)
    return vscode.Uri.parse(gitHubUrl + `/orgs/${org}/teams/${name}`)
  }
  return vscode.Uri.parse(gitHubUrl + `/${username}`)
}

function buildMappingSlack() {
  const setting = getTeamMappingSlack()
  const mapping: Record<string, SlackMappingConfigurationItem | undefined> = {}
  for (const team of setting) {
    mapping[team.username] = team
  }
  return mapping
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
    const slackTeamMapping = buildMappingSlack()
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
        link.tooltip = `Open ${username} on Github`
        links.push(link)

        const slackMapping = slackTeamMapping[username]
        if (slackMapping) {
          const linkslack = new vscode.DocumentLink(
            range,
            // https://api.slack.com/reference/deep-linking
            // https://acme-corp.slack.com/channels/eng-frontend
            vscode.Uri.parse(
              `https://${
                slackMapping.domain
              }/app_redirect?channel=${slackMapping.channel.replace(/^#/, "")}`,
            ),
          )
          linkslack.tooltip = `Open ${slackMapping.channel} on Slack`

          links.push(linkslack)
        }
      }
    }
    return links
  }
}
