import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  it,
} from "jsr:@std/testing@^0.225.3/bdd";
import { expect, use } from "https://deno.land/x/expecto@v0.1.4/mod/index.ts";
import mocked, { mock } from "https://deno.land/x/expecto@v0.1.4/mod/mocked.ts";
import { FakeTime } from "https://deno.land/std@0.210.0/testing/time.ts";

use(mocked);

export {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  FakeTime,
  it,
  mock,
};
