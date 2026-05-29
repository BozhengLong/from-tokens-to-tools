export type FileEntry = { size: number; mtime: string };
export type DirEntry = { name: string; size: number; mtime: string };

// Normalize a path so that the model's natural `~/Downloads` (echoing the task
// prompt) and a stored `/Downloads` key resolve to the same thing. We strip a
// leading `~` and collapse the home shorthand; everything else is left as-is.
const normalize = (p: string): string => {
  let n = p.trim();
  if (n.startsWith('~')) n = n.slice(1); // "~/Downloads" -> "/Downloads", "~" -> ""
  if (!n.startsWith('/')) n = '/' + n; // "Downloads" -> "/Downloads"
  return n;
};

export class InMemoryFs {
  private readonly files: Map<string, FileEntry>;

  constructor(initial: Record<string, FileEntry>) {
    this.files = new Map(Object.entries(initial).map(([k, v]) => [normalize(k), v]));
  }

  list(dirPath: string): DirEntry[] {
    const norm = normalize(dirPath);
    const prefix = norm.endsWith('/') ? norm : norm + '/';
    const entries: DirEntry[] = [];
    for (const [fullPath, file] of this.files) {
      if (!fullPath.startsWith(prefix)) continue;
      const rest = fullPath.slice(prefix.length);
      if (rest.includes('/')) continue;
      entries.push({ name: rest, size: file.size, mtime: file.mtime });
    }
    return entries;
  }

  stat(filePath: string): FileEntry {
    const entry = this.files.get(normalize(filePath));
    if (!entry) throw new Error(`No such file: ${filePath}`);
    return entry;
  }
}
