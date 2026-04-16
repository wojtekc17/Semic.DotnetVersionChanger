import { DOMParser, XMLSerializer, type Document, type Element, type Node } from "@xmldom/xmldom";
import xmlFormatter from "xml-formatter";
import {
  type OptionsState,
  type ProjectKind,
  type VersionFieldKey,
  VersionFieldTagMap
} from "../Types/SharedTypes";

export interface UpdateXmlPropertyResult {
  updatedFields: VersionFieldKey[];
}

export interface SerializeOptions {
  lineEnding: string;
  preserveFormatting: boolean;
}

export function ParseXmlDocument(xmlText: string): Document {
  return new DOMParser({
    onError: (level, message) => {
      if (level !== "warning") {
        throw new Error(message);
      }
    }
  }).parseFromString(xmlText, "application/xml");
}

export function InferProjectKind(document: Document): ProjectKind {
  const projectElement = GetProjectElement(document);
  const sdkAttribute = projectElement.getAttribute("Sdk")?.toLowerCase() ?? "";
  const targetFrameworks = GetFirstPropertyValue(document, "TargetFrameworks")
    .concat(";", GetFirstPropertyValue(document, "TargetFramework"))
    .toLowerCase();
  const useMaui = GetFirstPropertyValue(document, "UseMaui").toLowerCase() === "true";

  if (useMaui || sdkAttribute.includes("maui") || targetFrameworks.includes("maccatalyst")) {
    return "maui";
  }

  if (sdkAttribute.length > 0) {
    if (
      targetFrameworks.includes("xamarin") ||
      targetFrameworks.includes("monoandroid") ||
      targetFrameworks.includes("xamarinios")
    ) {
      return "xamarin";
    }

    return "sdk-style";
  }

  if (projectElement.getAttribute("ToolsVersion")) {
    return "legacy";
  }

  return "unknown";
}

export function ExtractVersionValues(document: Document): Record<VersionFieldKey, string> {
  return {
    version: GetFirstPropertyValue(document, "Version"),
    assemblyVersion: GetFirstPropertyValue(document, "AssemblyVersion"),
    fileVersion: GetFirstPropertyValue(document, "FileVersion")
  };
}

export function GetProjectDisplayName(document: Document, fallbackName: string): string {
  return (
    GetFirstPropertyValue(document, "AssemblyName") ||
    GetFirstPropertyValue(document, "RootNamespace") ||
    GetFirstPropertyValue(document, "PackageId") ||
    fallbackName
  );
}

export function UpdateVersionProperties(
  document: Document,
  values: Partial<Record<VersionFieldKey, string>>,
  options: OptionsState
): UpdateXmlPropertyResult {
  const updatedFields: VersionFieldKey[] = [];

  (Object.entries(values) as Array<[VersionFieldKey, string]>).forEach(([field, value]) => {
    if (value.trim().length === 0) {
      return;
    }

    const tagName = VersionFieldTagMap[field];
    const propertyElements = GetPropertyElements(document, tagName);

    if (propertyElements.length === 0) {
      if (!options.createMissingTags) {
        return;
      }

      const targetGroup = EnsureWritablePropertyGroup(document);
      const propertyElement = document.createElement(tagName);
      propertyElement.appendChild(document.createTextNode(value));
      targetGroup.appendChild(propertyElement);
      updatedFields.push(field);
      return;
    }

    const targets = options.updateDuplicateEntries ? propertyElements : [propertyElements[0]];

    targets.forEach((element) => {
      ReplaceElementText(document, element, value);
    });

    updatedFields.push(field);
  });

  return { updatedFields };
}

export function SerializeXmlDocument(document: Document, options: SerializeOptions): string {
  const rawXml = new XMLSerializer().serializeToString(document);

  return xmlFormatter(rawXml, {
    indentation: "  ",
    collapseContent: true,
    lineSeparator: options.lineEnding
  });
}

export function GetFirstPropertyValue(document: Document, tagName: string): string {
  const element = GetPropertyElements(document, tagName)[0];
  return element?.textContent?.trim() ?? "";
}

function GetPropertyElements(document: Document, tagName: string): Element[] {
  const projectElement = GetProjectElement(document);
  const propertyGroups = Array.from(projectElement.childNodes as ArrayLike<Node>).filter(
    (node): node is Element => node.nodeType === node.ELEMENT_NODE && node.nodeName === "PropertyGroup"
  );
  const matches: Element[] = [];

  propertyGroups.forEach((group) => {
    Array.from(group.childNodes as ArrayLike<Node>).forEach((child) => {
      if (child.nodeType === child.ELEMENT_NODE && child.nodeName === tagName) {
        matches.push(child as Element);
      }
    });
  });

  return matches;
}

function EnsureWritablePropertyGroup(document: Document): Element {
  const projectElement = GetProjectElement(document);
  const propertyGroups = Array.from(projectElement.childNodes as ArrayLike<Node>).filter(
    (node): node is Element => node.nodeType === node.ELEMENT_NODE && node.nodeName === "PropertyGroup"
  );
  const unconditionalPropertyGroup = propertyGroups.find((group) => !group.getAttribute("Condition"));

  if (unconditionalPropertyGroup) {
    return unconditionalPropertyGroup;
  }

  if (propertyGroups[0]) {
    return propertyGroups[0];
  }

  const propertyGroup = document.createElement("PropertyGroup");
  projectElement.appendChild(propertyGroup);
  return propertyGroup;
}

function ReplaceElementText(document: Document, element: Element, value: string): void {
  while (element.firstChild) {
    element.removeChild(element.firstChild);
  }

  element.appendChild(document.createTextNode(value));
}

function GetProjectElement(document: Document): Element {
  const projectElement = document.documentElement;

  if (!projectElement) {
    throw new Error("XML document does not contain a root element.");
  }

  return projectElement;
}
