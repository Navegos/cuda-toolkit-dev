import fs from 'fs'
import path from 'path'
import * as core from '@actions/core'

export async function getFilesRecursive(dir: string): Promise<string[]> {
  const results: string[] = []
  async function walk(current: string) {
    const entries = await fs.promises.readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const fullPath = path.join(current, entry.name)
      if (entry.isDirectory()) {
        await walk(fullPath)
      } else if (entry.isFile()) {
        results.push(fullPath)
      }
    }
  }
  try {
    await walk(dir)
  } catch (e) {
    core.debug(`Error reading files from ${dir}: ${e}`)
    return []
  }
  return results
}

export async function filterReadable(paths: string[]): Promise<string[]> {
  const readable: string[] = []
  for (const p of paths) {
    try {
      await fs.promises.access(p, fs.constants.R_OK)
      readable.push(p)
    } catch (e) {
      core.debug(`Path not readable: ${p} - ${e}`)
    }
  }
  return readable
}
