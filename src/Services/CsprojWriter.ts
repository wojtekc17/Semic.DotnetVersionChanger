import * as vscode from "vscode";
import iconv from "iconv-lite";
import {
  type OptionsState,
  type ProjectUpdateResult,
  type UpdateFieldValues
} from "../Types/SharedTypes";
import { CreateProjectId } from "../Utils/PathUtils";
import { ParseXmlDocument, SerializeXmlDocument, UpdateVersionProperties } from "../Utils/XmlUtils";
import { CsprojReader } from "./CsprojReader";

export class CsprojWriter {
  public constructor(private readonly csprojReader: CsprojReader) {}

  public async UpdateProject(
    projectPath: string,
    values: UpdateFieldValues,
    options: OptionsState
  ): Promise<ProjectUpdateResult> {
    const projectUri = vscode.Uri.file(projectPath);

    try {
      const stat = await vscode.workspace.fs.stat(projectUri);

      if ((stat.permissions ?? 0) & vscode.FilePermission.Readonly) {
        return {
          projectId: CreateProjectId(projectPath),
          path: projectPath,
          success: false,
          message: "File is read-only.",
          updatedFields: []
        };
      }

      const fileBytes = await vscode.workspace.fs.readFile(projectUri);
      const decoded = this.csprojReader.DecodeXmlFile(fileBytes);
      const document = ParseXmlDocument(decoded.content);

      let backupPath: string | undefined;

      if (options.backupBeforeSave) {
        backupPath = `${projectPath}.bak`;
        await vscode.workspace.fs.writeFile(vscode.Uri.file(backupPath), fileBytes);
      }

      const updateResult = UpdateVersionProperties(document, values, options);

      if (updateResult.updatedFields.length === 0) {
        return {
          projectId: CreateProjectId(projectPath),
          path: projectPath,
          success: false,
          message: "No matching properties were updated.",
          backupPath,
          updatedFields: []
        };
      }

      const xmlText = SerializeXmlDocument(document, {
        lineEnding: decoded.lineEnding,
        preserveFormatting: options.preserveFormatting
      });
      const encodedBuffer = iconv.encode(xmlText, decoded.encoding, {
        addBOM: decoded.hasBom
      });

      await vscode.workspace.fs.writeFile(projectUri, Uint8Array.from(encodedBuffer));

      return {
        projectId: CreateProjectId(projectPath),
        path: projectPath,
        success: true,
        message: `Updated ${updateResult.updatedFields.length} field(s).`,
        backupPath,
        updatedFields: updateResult.updatedFields
      };
    } catch (error) {
      return {
        projectId: CreateProjectId(projectPath),
        path: projectPath,
        success: false,
        message: error instanceof Error ? error.message : "Unexpected save error.",
        updatedFields: []
      };
    }
  }
}
