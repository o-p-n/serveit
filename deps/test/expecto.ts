/**
 * @copyright 2023 Matthew A. Miller
 */

import { expect, use } from "https://deno.land/x/expecto@v0.0.1/mod/index.ts";
import mocked, { mock } from "https://deno.land/x/expecto@v0.0.1/mod/mocked.ts";

use(mocked);

export { expect, mock };
