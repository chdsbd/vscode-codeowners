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
   * configuration setting.
   *
   * This configuration option is provided by built in "GitHub Authentication" extension
   * https://github.com/microsoft/vscode/blob/ccb95fd921349023027a0df25ed291b0992b9a18/extensions/github-authentication/src/extension.ts#L10
   */
  const setting = vscode.workspace
    .getConfiguration()
    .get<string>("github-enterprise.uri")
  if (!setting) {
    return "https://github.com"
  }
  return setting
}

type SlackMappingConfigurationItem = {
  domain: string
  channel: string
  username: string
}

function getTeamMappingSlack() {
  const setting =
    vscode.workspace
      .getConfiguration()
      .get<Array<SlackMappingConfigurationItem>>(
        "github-code-owners.team-mapping.slack",
      ) ?? []
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
    const slackTeamMapping = getTeamMappingSlack()
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
