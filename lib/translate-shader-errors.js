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
  const compiledLines = splitLines(compiledSource);
  const glslifyLineNumber = compiledLines.findIndex(s => s === "#define GLSLIFY 1");

  return errors.map((error) => {
    const out = {
      lineNumber: error.lineNumber,
      text: error.text,
    };
    if (glslifyLineNumber !== -1 && out.lineNumber > glslifyLineNumber) {
      out.lineNumber -= 1;
      out.text = replaceLineNumberInMessage(out.text, out.lineNumber);
    }
    return out;
  });
}

module.exports = translateShaderErrors;
