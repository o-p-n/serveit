import { expect, use } from "@x/expecto/index.ts";
import mocked, { mock } from "@x/expecto/mocked.ts";
import { FakeTime } from "@x/testing/time";

use(mocked);

export { expect, FakeTime, mock };
