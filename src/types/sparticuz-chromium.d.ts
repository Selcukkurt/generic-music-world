/**
 * Ensures `import("@sparticuz/chromium")` type-checks in environments where
 * `package.json` "exports" resolution is stricter (e.g. some CI runners).
 * Augments the official typings when the package is installed.
 */
declare module "@sparticuz/chromium" {
  interface Chromium {
    readonly args: string[];
    executablePath(): Promise<string | undefined>;
  }

  const chromium: Chromium;
  export default chromium;
}
