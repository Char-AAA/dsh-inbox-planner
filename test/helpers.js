import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** dsh-sidebar-todo's lib/ (a devDependency). Its `exports` hides lib/, so go via the entry file. */
export function todoLib() {
  return join(dirname(fileURLToPath(import.meta.resolve('dsh-sidebar-todo'))), 'lib')
}
