module.exports = {
    transform: { '^.+\\.ts?$': 'ts-jest' },
    testEnvironment: 'node',
    testRegex: './src/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    preset: 'ts-jest',
    setupFilesAfterEnv: [
      "<rootDir>/setupTests.ts"
    ],
    moduleDirectories: [
      'node_modules',
       'src/utils/test',
       'src',
      __dirname,
   ],
   moduleNameMapper: {
    "\\$src(.*)": "<rootDir>/src/$1"    
   }
};
