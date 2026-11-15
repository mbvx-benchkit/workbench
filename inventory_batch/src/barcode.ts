/* WORKBENCH_ROLE_SPLIT_STAGE2: public facade. Keep existing import paths stable. */

import type { Ean13ValidationError, Ean13ValidationResult, BarcodeRenderResult } from "./barcode/barcode-internals.js";
export type { Ean13ValidationError, Ean13ValidationResult, BarcodeRenderResult } from "./barcode/barcode-internals.js";
import { normalizeEan13, isScientificNotation } from "./barcode/barcode-internals.js";
export { normalizeEan13 } from "./barcode/barcode-internals.js";
import { calculateEan13CheckDigit } from "./barcode/barcode-internals.js";
export { calculateEan13CheckDigit } from "./barcode/barcode-internals.js";

export { renderEan13Barcode } from "./barcode/svg.js";
export { validateEan13 } from "./barcode/validation.js";
export { isValidEan13 } from "./barcode/validation.js";
