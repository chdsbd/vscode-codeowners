import vscode from "vscode"
import trimStart from "lodash/trimStart"
import trimEnd from "lodash/trimEnd"
import trim from "lodash/trim"
import range from "lodash/range"
import isNumber from "lodash/isNumber"

interface LineToAlign {
  lineNum: number
  ownersStartIndex: number
  filePatternLength: number
}
/**
 * Determines whether the line is a comment or empty
 * @param lineText - Text of a given line
 * @returns true if comment or empty line
 */
function isCommentOrEmptyLine(lineText: string): boolean {
  return trimStart(lineText).indexOf("#") === 0 || trim(lineText).length === 0
}

/**
 * Finds the sting index of the first owner in a line.
 * @param lineText - Text of a given line.
 * @returns Sting start index of the first owner.
 */
function findOwnerStartIndex(lineText: string): number {
  return lineText.indexOf("@")
}
/**
 * Finds the sting index of the file pattern length
 * @param lineText - Text of a given line.
 * @param Sting start index of the first owner.
 * @returns Sting index of the file pattern length
 */
function findFilePatternLength(
  lineText: string,
  ownersStartIndex: number,
): number {
  return trimEnd(lineText.substring(0, ownersStartIndex - 1)).length
}
/**
 * Formats `lineText` given the `filePatternLength`, `lineOffSet`
 * @typedef {Object} args - Argument collection object to make calls less error prawn.
 * @param {string} args.lineText - Text of the line tp format.
 * @param {string} args.filePatternLength - Sting index of the file pattern length.
 * @param {string} args.perLineOffSet - Offset between the end of the file pattern and code owner.
 * @param {string} args.ownersStartIndex - Sting start index of the first owner.
 * @returns line: Formatted line
 */
function formatLine({
  lineText,
  filePatternLength,
  perLineOffSet,
  ownersStartIndex,
}: {
  lineText: string
  filePatternLength: number
  perLineOffSet: number
  ownersStartIndex: number
}): string {
  return (
    lineText.substring(0, filePatternLength) +
    " ".repeat(perLineOffSet) +
    lineText.substring(ownersStartIndex)
  )
}

/**
 * Provide Formatting using the ``tabSize`` the user provided.
 */
export class AlignOwnersFormattingProvider
  implements vscode.DocumentFormattingEditProvider
{
  async provideDocumentFormattingEdits(
    document: vscode.TextDocument,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    options: vscode.FormattingOptions,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    token: vscode.CancellationToken,
  ): Promise<vscode.TextEdit[]> {
    // Early exit if formatting is disabled or set to a bad value
    if (
      vscode.workspace
        .getConfiguration()
        .get("github-code-owners.format.enabled") !== true
    ) {
      return []
    }
    const alinementOffset = vscode.workspace
      .getConfiguration()
      .get("github-code-owners.format.alignment-offset")

    // Check that config value for `alinementOffset` is valid before breaking things
    if (!isNumber(alinementOffset) || alinementOffset < 1) {
      throw Error(
        `Expected number greater 1 for 'github-code-owners.format.alignment-offset' but got ${alinementOffset}!`,
      )
    }
    // Find the `maxFilePatternLength` and which lines to potentially edit
    const editLines: LineToAlign[] = []
    let maxFilePatternLength = 0
    for (const lineNum of range(0, document.lineCount)) {
      const { text } = document.lineAt(lineNum)
      if (isCommentOrEmptyLine(text)) {
        continue
      }
      const ownersStartIndex = findOwnerStartIndex(text)
      const filePatternLength = findFilePatternLength(text, ownersStartIndex)
      if (filePatternLength > maxFilePatternLength) {
        maxFilePatternLength = filePatternLength
      }
      editLines.push({ lineNum, ownersStartIndex, filePatternLength })
    }

    // Issue the line replacement if needed
    return editLines.reduce((acc: vscode.TextEdit[], editLine: LineToAlign) => {
      const { lineNum, ownersStartIndex, filePatternLength } = editLine
      // We need the + 1 because we want `alinementOffset` spaces to be between the end of the
      // File pattern an before the first owner starts
      const newOwnersStartIndex = maxFilePatternLength + alinementOffset + 1
      const line = document.lineAt(lineNum)
      if (ownersStartIndex !== newOwnersStartIndex) {
        acc.push(
          vscode.TextEdit.replace(
            line.range,
            formatLine({
              lineText: line.text,
              filePatternLength,
              perLineOffSet: newOwnersStartIndex - filePatternLength,
              ownersStartIndex,
            }),
          ),
        )
      }
      return acc
    }, [])
  }
}
