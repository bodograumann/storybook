import addons, { Parameters } from '@storybook/addons';
import { normalize, sep } from 'upath';
import { ADD_TESTS } from './shared';

interface AddonParameters extends Parameters {
  jest?: string | string[] | { disable: true };
}

const findTestResults = (
  testFiles: string[],
  jestTestResults: { testResults: { name: string }[] },
  jestTestFilesExt: string
) =>
  Object.values(testFiles).map((name) => {
    const fileName = `${sep}${name}${jestTestFilesExt}`;

    if (jestTestResults && jestTestResults.testResults) {
      const fileNamePattern = new RegExp(fileName);

      return {
        fileName,
        name,
        result: jestTestResults.testResults.find((test) =>
          Boolean(normalize(test.name).match(fileNamePattern))
        ),
      };
    }

    return { fileName, name };
  });

interface EmitAddTestsArg {
  kind: string;
  story: () => void;
  testFiles: string[];
  options: {
    results: { testResults: { name: string }[] };
    filesExt: string;
  };
}

const emitAddTests = ({ kind, story, testFiles, options }: EmitAddTestsArg) => {
  addons.getChannel().emit(ADD_TESTS, {
    kind,
    storyName: story,
    tests: findTestResults(testFiles, options.results, options.filesExt),
  });
};

export const withTests = (userOptions: { results: any; filesExt?: string }) => {
  const defaultOptions = {
    filesExt: '((\\.specs?)|(\\.tests?))?(\\.[jt]sx?)?$',
  };
  const options = { ...defaultOptions, ...userOptions };

  return (...args: any[]) => {
    const [storyFn, { kind, parameters = {} }] = args;
    let { jest: testFiles } = parameters;

    if (typeof testFiles === 'string') {
      testFiles = [testFiles];
    }

    if (testFiles && Array.isArray(testFiles)) {
      emitAddTests({ kind, story: storyFn, testFiles, options });
    } else if (testFiles === undefined) {
      const { fileName: filePath } = parameters;
      const fileName = filePath.split('/').pop().split('.')[0];
      emitAddTests({ kind, story: storyFn, testFiles: [fileName], options });
    }

    return storyFn();
  };
};

if (module && module.hot && module.hot.decline) {
  module.hot.decline();
}
