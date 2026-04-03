/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  roots: [
    "./src",
  ],
  moduleFileExtensions: [
    "js",
    "ts"
  ],
  reporters: [
      ["jest-xunit", { "filename": "xunit.xml" }] // We can't pass options from CLI
  ],
  clearMocks: true,

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",
};
