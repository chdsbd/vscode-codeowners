/* eslint-disable init-declarations */
// That is how the tests are supposed to be written ¯\_(ツ)_/¯
import vscode from "vscode"
import { AlignOwnersFormattingProvider } from "../../src/align-codeowners"
import assert from "assert"
import fs from "fs"
import { beforeEach, afterEach } from "mocha"

import path from "path"

const repoRoot = path.resolve(__dirname, "../../..")

async function createMockDocument(
  testFilePath: string,
): Promise<vscode.TextDocument> {
  const resolvedTestFilePath = path.join(repoRoot, testFilePath)
  const mockDocument = await vscode.workspace.openTextDocument(
    resolvedTestFilePath,
  )
  if (mockDocument === undefined) {
    throw Error(`Test file at path ${resolvedTestFilePath} was not found`)
  }
  return mockDocument
}

suite("AlignOwnersFormattingProvider", () => {
  vscode.window.showInformationMessage("Start formatting tests.")
  let provider: AlignOwnersFormattingProvider
  // Ignored anyway
  let mockOptions: vscode.FormattingOptions
  let mockToken: vscode.CancellationToken
  const badOffSetValues = ["invalid", -1, 0] as const

  beforeEach(() => {
    provider = new AlignOwnersFormattingProvider()
    // Ignored anyway
    mockOptions = { insertSpaces: true, tabSize: 2 }
    mockToken = {
      isCancellationRequested: false,
      // eslint-disable-next-line
      onCancellationRequested: () => false as any,
    }
  })

  afterEach(async () => {
    // restore default config
    const settings = vscode.workspace.getConfiguration("github-code-owners")
    await settings.update(
      "format.enabled",
      true,
      vscode.ConfigurationTarget.Global,
    )
    await settings.update(
      "format.alignment-offset",
      4,
      vscode.ConfigurationTarget.Global,
    )
  })

  test("should never edit this document due to the grammar", async () => {
    const testDocument = await createMockDocument(
      "test/data/align-codeowners/should-never-change",
    )

    const result = await provider.provideDocumentFormattingEdits(
      testDocument,
      mockOptions,
      mockToken,
    )

    assert(Array.isArray(result))
    assert.strictEqual(result.length, 0)
  })

  test("should not edit when formatting is disabled", async () => {
    const settings = vscode.workspace.getConfiguration("github-code-owners")
    await settings.update(
      "format.enabled",
      false,
      vscode.ConfigurationTarget.Global,
    )
    const testDocument = await createMockDocument(
      "test/data/align-codeowners/input-to-format",
    )

    const result = await provider.provideDocumentFormattingEdits(
      testDocument,
      mockOptions,
      mockToken,
    )
    assert(Array.isArray(result))
    assert.strictEqual(result.length, 0)
  })

  badOffSetValues.forEach((badOffSetValue) => {
    test(`should throw an error when alignment offset is not a positive number: ${badOffSetValue}`, async () => {
      const settings = vscode.workspace.getConfiguration("github-code-owners")
      await settings.update(
        "format.alignment-offset",
        badOffSetValue,
        vscode.ConfigurationTarget.Global,
      )
      const testDocument = await createMockDocument(
        "test/data/align-codeowners/input-to-format",
      )
      await assert.rejects(
        () =>
          provider.provideDocumentFormattingEdits(
            testDocument,
            mockOptions,
            mockToken,
          ),
        Error,
      )
    })
  })

  test("should create same output as 'expected-formatted-with-offset-4'", async () => {
    const testDocument = await createMockDocument(
      "test/data/align-codeowners/input-to-format",
    )
    const result = await provider.provideDocumentFormattingEdits(
      testDocument,
      mockOptions,
      mockToken,
    )
    const workEdits = new vscode.WorkspaceEdit()
    await workEdits.set(testDocument.uri, result)
    await vscode.workspace.applyEdit(workEdits)

    const expected = fs.readFileSync(
      path.join(
        repoRoot,
        "test/data/align-codeowners/expected-formatted-with-offset-4",
      ),
    )
    assert.strictEqual(testDocument.getText(), expected.toString())
  })

  test("should create same output as 'expected-formatted-with-offset-8'", async () => {
    const settings = vscode.workspace.getConfiguration("github-code-owners")
    await settings.update(
      "format.alignment-offset",
      8,
      vscode.ConfigurationTarget.Global,
    )
    const testDocument = await createMockDocument(
      "test/data/align-codeowners/input-to-format",
    )

    const result = await provider.provideDocumentFormattingEdits(
      testDocument,
      mockOptions,
      mockToken,
    )
    const workEdits = new vscode.WorkspaceEdit()
    await workEdits.set(testDocument.uri, result)
    await vscode.workspace.applyEdit(workEdits)

    const expected = fs.readFileSync(
      path.join(
        repoRoot,
        "test/data/align-codeowners/expected-formatted-with-offset-8",
      ),
    )
    assert.strictEqual(testDocument.getText(), expected.toString())
  })
})
