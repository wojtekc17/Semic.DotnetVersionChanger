import * as vscode from "vscode";
import iconv from "iconv-lite";
import * as jschardet from "jschardet";
import {
  DefaultProjectVersionInfo,
  type ProjectError,
  type ProjectInfo
} from "../Types/SharedTypes";
import { CreateProjectId, GetDirectoryName, GetProjectName, GetRelativeProjectPath } from "../Utils/PathUtils";
import { ExtractVersionValues, GetProjectDisplayName, InferProjectKind, ParseXmlDocument } from "../Utils/XmlUtils";

export interface ReadProjectResult {
  project?: ProjectInfo;
  error?: ProjectError;
}

export interface DecodedXmlContent {
  content: string;
  encoding: string;
  hasBom: boolean;
  lineEnding: string;
}

export class CsprojReader {
  public async ReadProject(projectUri: vscode.Uri): Promise<ReadProjectResult> {
    try {
      const fileBytes = await vscode.workspace.fs.readFile(projectUri);
      const decoded = this.DecodeXmlFile(fileBytes);
      const document = ParseXmlDocument(decoded.content);
      const fallbackName = GetProjectName(projectUri.fsPath);

      return {
        project: {
          id: CreateProjectId(projectUri.fsPath),
          name: GetProjectDisplayName(document, fallbackName),
          path: projectUri.fsPath,
          relativePath: GetRelativeProjectPath(projectUri),
          directoryName: GetDirectoryName(projectUri.fsPath),
          selected: false,
          projectKind: InferProjectKind(document),
          versions: {
            ...DefaultProjectVersionInfo,
            ...ExtractVersionValues(document)
          }
        }
      };
    } catch (error) {
      return {
        error: {
          projectPath: projectUri.fsPath,
          message: error instanceof Error ? error.message : "Unknown error"
        }
      };
    }
  }

  public DecodeXmlFile(fileBytes: Uint8Array): DecodedXmlContent {
    const buffer = Buffer.from(fileBytes);
    const hasUtf8Bom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
    const hasUtf16LeBom = buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe;
    const hasUtf16BeBom = buffer.length >= 2 && buffer[0] === 0xfe && buffer[1] === 0xff;
    const xmlHeaderProbe = buffer.toString("latin1", 0, Math.min(buffer.length, 256));
    const xmlEncoding = xmlHeaderProbe.match(/encoding=["']([^"']+)["']/i)?.[1];
    const detectedEncoding =
      (hasUtf8Bom && "utf8") ||
      (hasUtf16LeBom && "utf16-le") ||
      (hasUtf16BeBom && "utf16-be") ||
      (xmlEncoding ? xmlEncoding.toLowerCase() : undefined) ||
      jschardet.detect(buffer).encoding?.toLowerCase() ||
      "utf8";
    const normalizedEncoding = detectedEncoding === "utf-8" ? "utf8" : detectedEncoding;
    const content = iconv.decode(buffer, normalizedEncoding);

    return {
      content,
      encoding: normalizedEncoding,
      hasBom: hasUtf8Bom || hasUtf16LeBom || hasUtf16BeBom,
      lineEnding: content.includes("\r\n") ? "\r\n" : "\n"
    };
  }
}
