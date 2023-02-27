const vscode = require('vscode');
const Codeowners = require('codeowners');
const findUp = require('find-up');
const path = require('path');
const GitHubCodeowners = require('@snyk/github-codeowners/dist/lib/ownership');

const COMMAND_ID = 'vscode-codeowners.show-owners';
const STATUS_BAR_PRIORITY = 100;

const getOwners = async () => {
    if (!vscode.window.activeTextEditor) {
        return [];
    }

    const { fileName, uri } = vscode.window.activeTextEditor.document;

    const {
        uri: { fsPath: workspacePath }
    } = vscode.workspace.getWorkspaceFolder(uri);

    const codeownersFilePath = findUp.sync('CODEOWNERS', { cwd: workspacePath });
    console.log({ codeownersFilePath });

    const file = fileName.split(`${workspacePath}${path.sep}`)[1];

    try {
        const res = await GitHubCodeowners.getOwnership(codeownersFilePath, [file]);

        console.log({ res });
        if (res.length > 0) {
            return res[0].owners;
        }
        return [];
    } catch (e) {
        console.error(err);
        return [];
    }
};

const activate = context => {
    console.log('CODEOWNERS: activated');

    const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, STATUS_BAR_PRIORITY);

    statusBarItem.command = COMMAND_ID;
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(
        vscode.commands.registerCommand(COMMAND_ID, async () => {
            // string | undefined
            const res = await vscode.window.showQuickPick(
                await getOwners().map(owner => ({
                    label: owner,
                    description: 'Open in GitHub'
                }))
            );
            if (res != null) {
                const isTeamName = res.label.includes('/');
                const githubUsername = res.label.split(/^@/)[1];
                console.log({ res, isTeamName, githubUsername });

                if (isTeamName) {
                    const [org, name] = githubUsername.split(/\//);
                    vscode.env.openExternal(vscode.Uri.parse(`https://github.com/orgs/${org}/teams/${name}`));
                } else {
                    vscode.env.openExternal(vscode.Uri.parse(`https://github.com/${githubUsername}`));
                }
            }
        })
    );

    context.subscriptions.push(
        vscode.window.onDidChangeActiveTextEditor(async () => {
            const owners = await getOwners();

            if (!owners) {
                statusBarItem.hide();
                return;
            }

            if (owners.length > 2) {
                statusBarItem.text = `$(account) ${owners[0]} & ${owners.length - 1} others`;
            } else if (owners.length === 2) {
                statusBarItem.text = `$(account) ${owners[0]} & 1 other`;
            } else if (owners.length === 1) {
                statusBarItem.text = `$(account) ${owners[0]}`;
            } else {
                statusBarItem.text = '$(account) None';
            }

            statusBarItem.tooltip = owners.join(', ');
            statusBarItem.show();
        })
    );
};

exports.activate = activate;

const deactivate = () => {};
exports.deactivate = deactivate;
