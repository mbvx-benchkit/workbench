/* WORKBENCH_ROLE_SPLIT_STAGE2: public facade. Keep existing import paths stable. */

import type { JanSuccessResult, JanEmptyResult, JanErrorResult, JanResult } from "./jan/jan-internals.js";
export type { JanSuccessResult, JanEmptyResult, JanErrorResult, JanResult } from "./jan/jan-internals.js";
import { removeAllWhitespace, convertFullWidthDigitsToHalfWidth, clearJanBarcode } from "./jan/jan-internals.js";
export { clearJanBarcode } from "./jan/jan-internals.js";
import { isHalfWidthDigitsOnly, isGuardBarModule } from "./jan/jan-internals.js";

export { normalizeJan } from "./jan/normalization.js";
export { calculateJanCheckDigit } from "./jan/normalization.js";
export { formatJanForDisplay } from "./jan/normalization.js";
export { drawJan13Barcode } from "./jan/svg.js";
export { encodeJan13 } from "./jan/encoding.js";
export { processJanInput } from "./jan/input.js";
