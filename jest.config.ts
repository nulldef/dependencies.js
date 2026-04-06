import type { Config } from "jest"
import { createDefaultPreset } from "ts-jest"

const config: Config = {
  ...createDefaultPreset({
    tsconfig: "<rootDir>/tsconfig.test.json",
  }),
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverageFrom: ["index.ts"],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov", "html", "json-summary"],
  coverageThreshold: {
    global: {
      branches: 100,
      functions: 100,
      lines: 100,
      statements: 100,
    },
  },
}

export default config
