// Maps a UTF-8 byte range (as produced by the tokenizer) to a JS string
// [startChar, endChar) slice range. JS strings are UTF-16, so we walk the
// string accumulating each character's UTF-8 byte length.
export function byteToCharRange(text: string, byteRange: [number, number]): [number, number] {
  const [startByte, endByte] = byteRange;
  const enc = new TextEncoder();
  let byteCursor = 0;
  let startChar = 0;
  let endChar = text.length;
  let foundStart = false;
  const chars = [...text]; // code-point aware
  let utf16Index = 0;
  for (const ch of chars) {
    if (!foundStart && byteCursor >= startByte) {
      startChar = utf16Index;
      foundStart = true;
    }
    if (byteCursor >= endByte) {
      endChar = utf16Index;
      break;
    }
    byteCursor += enc.encode(ch).length;
    utf16Index += ch.length;
  }
  if (!foundStart) startChar = Math.min(utf16Index, text.length);
  if (byteCursor < endByte) endChar = text.length;
  return [Math.min(startChar, text.length), Math.min(endChar, text.length)];
}
