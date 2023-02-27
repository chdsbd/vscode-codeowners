const vscode = require('vscode');
const Codeowners = require('codeowners');
const path = require('path');

const COMMAND_ID = 'vscode-codeowners.show-owners';
const STATUS_BAR_PRIORITY = 100;

const getOwners = () => {
    if (!vscode.window.activeTextEditor) {
        return [];
    }

    const { fileName, uri } = vscode.window.activeTextEditor.document;

    const {
        uri: { fsPath: workspacePath }
    } = vscode.workspace.getWorkspaceFolder(uri);

    let folder;
    try {
        folder = new Codeowners(workspacePath);
    } catch {
        // no CODEOWNERS file
        return null;
    }

    const file = fileName.split(`${workspacePath}${path.sep}`)[1];

    return folder.getOwner(file);
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
                getOwners().map(owner => ({
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
        vscode.window.onDidChangeActiveTextEditor(() => {
            const owners = getOwners();

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
