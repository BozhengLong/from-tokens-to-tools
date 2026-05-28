export type FileEntry = { size: number; mtime: string };
export type DirEntry = { name: string; size: number; mtime: string };

export class InMemoryFs {
  private readonly files: Map<string, FileEntry>;

  constructor(initial: Record<string, FileEntry>) {
    this.files = new Map(Object.entries(initial));
  }

  list(dirPath: string): DirEntry[] {
    const prefix = dirPath.endsWith('/') ? dirPath : dirPath + '/';
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
    const entry = this.files.get(filePath);
    if (!entry) throw new Error(`No such file: ${filePath}`);
    return entry;
  }
}
