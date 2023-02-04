module.exports = {
    transform: { '^.+\\.ts?$': 'ts-jest' },
    testEnvironment: 'jsdom',
    testRegex: './src/.*\\.(test|spec)?\\.(ts|tsx)$',
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    preset: 'ts-jest',
    setupFilesAfterEnv: [
      "<rootDir>/setupTests.ts",
      'jest-canvas-mock'
    ],
    moduleDirectories: [
      'node_modules',
       'src/utils/test',
       'src',
      __dirname,
   ],
   moduleNameMapper: {
    "\\.(s)?css(.*)$": "identity-obj-proxy",    
    "\\$src(.*)": "<rootDir>/src/$1"
   }
};
