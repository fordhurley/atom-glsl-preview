const scoreString = require("./score-string");

function splitLines(text) {
  return text.split(/\r?\n/);
}

function replaceLineNumberInMessage(text, newLineNumber) {
  const match = /^(ERROR: )\d+:(\d+)(.*)$/.exec(text);
  return `${match[1]}${newLineNumber}:1${match[3]}`;
}

// Translate line numbers in error message to map to lines in the editor.
//
// - errors is an array of {lineNumber, text} objects coming from shader-canvas
// - source is the code in the editor
// - compiledSource is after glslify, and what is provided to shader-canvas
// - lineNumbers are expected to map exactly to lines in compiledSource
// - prefix+compiledSource should be the actual shader provided to webgl
function translateShaderErrors(errors, source, compiledSource, prefix) {
  const sourceLines = splitLines(source);
  const compiledLines = splitLines(compiledSource);

  return errors.map((error) => {
    const compiledLine = compiledLines[error.lineNumber - 1];
    const scoredSourceLines = sourceLines.map((line, i) => {
      return {
        lineNumber: i + 1,
        score: scoreString(line, compiledLine, 0.5),
      };
    });
    let bestMatch = scoredSourceLines[0];
    scoredSourceLines.forEach((line) => {
      if (line.score > bestMatch.score) {
        bestMatch = line;
      }
    });
    return {
      lineNumber: bestMatch.lineNumber,
      text: replaceLineNumberInMessage(error.text, bestMatch.lineNumber),
    };
  });
}

module.exports = translateShaderErrors;
