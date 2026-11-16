/** Web: downloads the backup through the browser. */
export async function saveBackupFile(name: string, json: string): Promise<boolean> {
  const blob = new Blob([json], { type: 'application/json' }); const url = URL.createObjectURL(blob);
  const link = document.createElement('a'); link.href = url; link.download = name; link.click();
  URL.revokeObjectURL(url); return true;
}

/** Web: reads a file chosen with the browser's file input. */
export function pickBackupFile(): Promise<string | null> {
  return new Promise(resolve => {
    const input = document.createElement('input'); input.type = 'file'; input.accept = 'application/json,.json,text/plain';
    input.onchange = () => { const file = input.files?.[0]; if (!file) { resolve(null); return; } file.text().then(resolve, () => resolve(null)); };
    input.click();
  });
}
