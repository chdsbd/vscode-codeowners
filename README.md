# vscode-codeowners

VS Code extension to display the GitHub Code Owners for the current file, as defined in the [CODEOWNERS](https://help.github.com/articles/about-codeowners/) file.

This repository is forked from https://github.com/jasonnutter/vscode-codeowners, with UI changes and better CODEOWNERS compliance.

## Features

### Syntax highlighting

![](./img/syntax_highlighting.png)

### Status bar

![](./img/status_bar_none.png)
![](./img/status_bar_one.png)
![](./img/status_bar_two.png)
![](./img/status_bar_three.png)

The first code owners for an open file will be displayed in the right side of the status bar. Clicking the status bar item will open a menu displaying all of the code owners.

### Command

![](./img/command.gif)

Use the command palette to run the `CODEOWNERS: Show owners of current file` command, which will display all code owners for the current file.

## Related

### CODEOWNERS libraries that handle sub folder matching

-   https://github.com/jjmschofield/github-codeowners/blob/master/src/lib/ownership/OwnershipEngine.ts#L90
-   https://github.com/snyk/github-codeowners/blob/375f896d8cc72b7ac99401e3d925970a1ac6900e/src/lib/ownership/OwnershipEngine.ts#L90

### broken CODEOWNERS files using .gitignore matching

-   https://github.com/jamiebuilds/codeowners-utils
-   https://github.com/beaugunderson/codeowners (broken. See https://github.com/beaugunderson/codeowners/issues/15)
    -   (fork) https://www.npmjs.com/package/@nmann/codeowners

### VScode extensions

-   https://marketplace.visualstudio.com/items?itemName=noahm.codeowners-extended
-   https://marketplace.visualstudio.com/items?itemName=dtangren.vs-codeowners
-   https://marketplace.visualstudio.com/items?itemName=fmenezes.vscode-codeowners-linter
-   https://marketplace.visualstudio.com/items?itemName=HCoban.codeowners
-   https://marketplace.visualstudio.com/items?itemName=jasonnutter.vscode-codeowners
