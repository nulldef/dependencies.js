import type { Config } from "jest"
import { createDefaultPreset } from "ts-jest"

const config: Config = {
  ...createDefaultPreset({
    tsconfig: "<rootDir>/tsconfig.test.json",
  }),
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
}

export default config
