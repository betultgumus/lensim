import { Directory, File } from 'expo-file-system';

/** Lets the user choose a folder (Android document picker) and writes the backup there. Returns false if cancelled. */
export async function saveBackupFile(name: string, json: string): Promise<boolean> {
  let directory: Directory;
  try { directory = await Directory.pickDirectoryAsync(); } catch { return false; }
  if (!directory) return false;
  const file = directory.createFile(name, 'application/json');
  file.write(json);
  return true;
}

/** Opens the system file picker and returns the chosen backup's text, or null if cancelled. */
export async function pickBackupFile(): Promise<string | null> {
  const picked = await File.pickFileAsync({ mimeTypes: ['application/json', 'text/plain', '*/*'] });
  if (picked.canceled || !picked.result) return null;
  return await picked.result.text();
}
