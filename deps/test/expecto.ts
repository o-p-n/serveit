/**
 * @copyright 2023 Matthew A. Miller
 */

import { expect, use } from "https://deno.land/x/expecto@v0.1.0/mod/index.ts";
import mocked, { mock } from "https://deno.land/x/expecto@v0.1.0/mod/mocked.ts";

use(mocked);

export { expect, mock };
