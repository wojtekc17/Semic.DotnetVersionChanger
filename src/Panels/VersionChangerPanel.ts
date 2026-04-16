import * as path from "node:path";
import * as vscode from "vscode";
import {
  DefaultOptionsState,
  type ExtensionToWebviewMessage,
  type PanelClientState,
  type UpdateRequest,
  type WebviewToExtensionMessage
} from "../Types/SharedTypes";
import { CsprojReader } from "../Services/CsprojReader";
import { CsprojWriter } from "../Services/CsprojWriter";
import { VersionService } from "../Services/VersionService";
import { WorkspaceScanner } from "../Services/WorkspaceScanner";

export class VersionChangerPanel implements vscode.WebviewViewProvider, vscode.Disposable {
  public static readonly ViewId = "semicVersionChangerView";

  private readonly versionService: VersionService;
  private readonly disposables: vscode.Disposable[] = [];
  private webviewView: vscode.WebviewView | undefined;
  private clientState: PanelClientState = {
    projects: [],
    options: { ...DefaultOptionsState },
    draftValues: {}
  };

  public constructor(private readonly context: vscode.ExtensionContext) {
    const reader = new CsprojReader();
    const writer = new CsprojWriter(reader);
    const scanner = new WorkspaceScanner(reader);
    this.versionService = new VersionService(scanner, writer);
  }

  public async Show(): Promise<void> {
    await vscode.commands.executeCommand("workbench.view.extension.semicVersionChangerPanelContainer");
  }

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    this.webviewView = webviewView;
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview"))]
    };
    webviewView.webview.html = this.GetHtmlForWebview(webviewView.webview);

    webviewView.webview.onDidReceiveMessage(
      (message: WebviewToExtensionMessage) => {
        void this.HandleMessage(message);
      },
      undefined,
      this.disposables
    );

    webviewView.onDidDispose(
      () => {
        this.webviewView = undefined;
      },
      undefined,
      this.disposables
    );
  }

  public async RefreshProjects(): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    await this.PostMessage({
      type: "busyState",
      payload: {
        status: "loading",
        message: "Scanning workspace for .csproj files..."
      }
    });

    const loaded = await this.versionService.LoadProjects(
      this.clientState.options,
      new Set(this.clientState.projects.filter((project) => project.selected).map((project) => project.id)),
      this.clientState.lastSelectedProjectId
    );

    this.clientState.projects = loaded.projects.map((project) => ({
      id: project.id,
      selected: project.selected
    }));
    this.clientState.lastSelectedProjectId = loaded.lastSelectedProjectId;

    await this.PostMessage({
      type: "projectsLoaded",
      payload: loaded
    });
  }

  public async UpdateSelectedProjects(): Promise<void> {
    await this.RunUpdate({
      projectIds: this.clientState.projects.filter((project) => project.selected).map((project) => project.id),
      values: this.clientState.draftValues,
      options: this.clientState.options
    });
  }

  public dispose(): void {
    this.webviewView = undefined;

    while (this.disposables.length > 0) {
      this.disposables.pop()?.dispose();
    }
  }

  private async HandleMessage(message: WebviewToExtensionMessage): Promise<void> {
    switch (message.type) {
      case "ready":
        await this.PostMessage({ type: "stateChanged", payload: this.clientState });
        await this.RefreshProjects();
        break;
      case "loadProjects":
      case "refreshProjects":
        await this.RefreshProjects();
        break;
      case "syncState":
        this.clientState = message.payload;
        break;
      case "updateProjects":
        this.clientState = {
          ...this.clientState,
          projects: this.clientState.projects.map((project) => ({
            ...project,
            selected: message.payload.projectIds.includes(project.id)
          })),
          options: message.payload.options,
          draftValues: message.payload.values
        };
        await this.RunUpdate(message.payload);
        break;
    }
  }

  private async RunUpdate(request: UpdateRequest): Promise<void> {
    if (!this.webviewView) {
      return;
    }

    const validations = this.versionService.ValidateUpdateRequest(request);

    if (validations.length > 0) {
      await this.PostMessage({
        type: "error",
        payload: {
          message: validations.map((validation) => validation.message).join(" ")
        }
      });
      return;
    }

    const confirmed = await this.versionService.ConfirmUpdate(request.options, request.projectIds.length);

    if (!confirmed) {
      return;
    }

    await this.PostMessage({
      type: "busyState",
      payload: {
        status: "saving",
        message: "Updating selected projects..."
      }
    });

    const currentProjects = await this.versionService.LoadProjects(
      request.options,
      new Set(this.clientState.projects.filter((project) => project.selected).map((project) => project.id)),
      this.clientState.lastSelectedProjectId
    );
    const updateResult = await this.versionService.UpdateProjects(
      request,
      currentProjects.projects,
      this.clientState.lastSelectedProjectId
    );

    this.clientState.projects = updateResult.projects.map((project) => ({
      id: project.id,
      selected: project.selected
    }));
    this.clientState.lastSelectedProjectId = updateResult.lastSelectedProjectId;

    await this.PostMessage({
      type: "updateResult",
      payload: updateResult
    });
  }

  private GetHtmlForWebview(webview: vscode.Webview): string {
    const nonce = CreateNonce();
    const scriptUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview", "assets", "App.js")));
    const styleUri = webview.asWebviewUri(vscode.Uri.file(path.join(this.context.extensionPath, "dist", "webview", "assets", "App.css")));

    return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src ${webview.cspSource}; font-src ${webview.cspSource}; script-src 'nonce-${nonce}';" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Semic Version Changer (.NET)</title>
    <link href="${styleUri}" rel="stylesheet" />
  </head>
  <body>
    <div id="root"></div>
    <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
  </body>
</html>`;
  }

  private async PostMessage(message: ExtensionToWebviewMessage): Promise<void> {
    await this.webviewView?.webview.postMessage(message);
  }
}

function CreateNonce(): string {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let nonce = "";

  for (let index = 0; index < 32; index += 1) {
    nonce += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
  }

  return nonce;
}
