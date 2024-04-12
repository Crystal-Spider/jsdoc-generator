import glob from 'glob';
import Mocha from 'mocha';
import * as path from 'path';

/**
 * Run the extension.
 */
export function run(): Promise<void> {
  // Create the mocha test
  const mocha = new Mocha({
    ui: 'tdd',
    color: true
  });

  const testsRoot = path.resolve(__dirname, '..');

  return new Promise((c, e) => {
    glob('**/**.test.js', {cwd: testsRoot}, (err, files) => {
      if (err) {
        e(err);
      }

      // Add files to the test suite
      files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)));

      try {
        // Run the mocha test
        mocha.run(failures => {
          if (failures > 0) {
            e(new Error(`${failures} tests failed.`));
          } else {
            c();
          }
        });
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(error);
        e(error);
      }
    });
  });
}
