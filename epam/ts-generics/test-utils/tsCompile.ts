import * as ts from "typescript";
import tsconfig from "../tsconfig.json";

export function tsCompile(fileNames: string[]) {
  // This change is required, cause tsconfig.json uses 
  // string values for "module" and "target" fields
  const tsConfigInternal = {
    ...tsconfig.compilerOptions,
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2016,
  };
  
  let program = ts.createProgram(fileNames, tsConfigInternal);
  let allDiagnostics = ts.getPreEmitDiagnostics(program);

  let diagnosticsResults: string = "";

  allDiagnostics.forEach((diagnostic) => {
    if (diagnostic.file) {
      // If we run compilation on file, it has line and character number info
      let { line, character } = ts.getLineAndCharacterOfPosition(
        diagnostic.file,
        diagnostic.start!
      );
      let message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );

      diagnosticsResults = `${diagnosticsResults}
        ${line}:${character}: ${message}
      `;
    } else {
      const message = ts.flattenDiagnosticMessageText(
        diagnostic.messageText,
        "\n"
      );

      diagnosticsResults += message;
    }
  });

  return diagnosticsResults;
}
