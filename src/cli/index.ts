import { Builtins, Cli } from 'clipanion';

import packageJson from '../../package.json' with { type: 'json' };
import { CheckCommand, SyncCommand } from './commands';

const [, , ...args] = process.argv;

const cli = new Cli({
  binaryLabel: 'pullup',
  binaryName: 'pullup',
  binaryVersion: packageJson.version,
});

cli.register(CheckCommand);
cli.register(SyncCommand);
cli.register(Builtins.HelpCommand);
cli.register(Builtins.VersionCommand);

cli.runExit(args);
