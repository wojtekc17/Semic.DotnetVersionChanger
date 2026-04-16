import * as vscode from "vscode";
import { VersionChangerPanel } from "./Panels/VersionChangerPanel";

export function activate(context: vscode.ExtensionContext): void {
  const versionChangerPanel = new VersionChangerPanel(context);

  context.subscriptions.push(
    versionChangerPanel,
    vscode.window.registerWebviewViewProvider(VersionChangerPanel.ViewId, versionChangerPanel, {
      webviewOptions: {
        retainContextWhenHidden: true
      }
    }),
    vscode.commands.registerCommand("semic-version-changer.open", async () => {
      await versionChangerPanel.Show();
    }),
    vscode.commands.registerCommand("semic-version-changer.refreshProjects", async () => {
      await versionChangerPanel.Show();
      await versionChangerPanel.RefreshProjects();
    }),
    vscode.commands.registerCommand("semic-version-changer.updateSelectedProjects", async () => {
      await versionChangerPanel.Show();
      await versionChangerPanel.UpdateSelectedProjects();
    })
  );
}

export function deactivate(): void {
  return;
}
