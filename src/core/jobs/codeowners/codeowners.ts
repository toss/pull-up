interface CodeownersEntry {
  pattern: string;
  owners: string[];
}

export class Codeowners {
  private constructor(private entries: CodeownersEntry[]) {}

  static from(content: string): Codeowners {
    const entries = content
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
      .map((line) => {
        const [pattern = "", ...owners] = line.split(/\s+/);
        return { pattern, owners };
      });

    return new Codeowners(entries);
  }

  static merge(codeownersArray: Codeowners[]): Codeowners {
    return new Codeowners(codeownersArray.flatMap((c) => c.entries));
  }

  map(fn: (entry: CodeownersEntry) => CodeownersEntry): Codeowners {
    return new Codeowners(this.entries.map(fn));
  }

  isEmpty(): boolean {
    return this.entries.length === 0;
  }

  stringify(): string {
    if (this.isEmpty()) return "";

    return ensureEoL(
      this.entries.map((e) => `${e.pattern} ${e.owners.join(" ")}`).join("\n"),
    );
  }
}

const ensureEoL = (text: string) => (text.endsWith("\n") ? text : text + "\n");
