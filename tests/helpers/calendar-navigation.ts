import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { runInNewContext } from 'node:vm';
import * as date from '../../src/domain/date';
import type { useCalendarNavigation as NavigationHook } from '../../src/hooks/useCalendarNavigation';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const exports: any = {};
runInNewContext(
  ts.transpileModule(
    readFileSync(new URL('../../src/hooks/useCalendarNavigation.ts', import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS } },
  ).outputText,
  {
    exports,
    require: (name: string) =>
      name === 'react' ? { useCallback: (fn: Function) => fn } : date,
  },
);
export const useCalendarNavigation: typeof NavigationHook = exports.useCalendarNavigation;
