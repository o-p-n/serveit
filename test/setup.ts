import sinon from "sinon";
import { expect, use } from "chai";
import chaiSinon from "sinon-chai-es";
import chaiPromised from "chai-as-promised";

use(chaiSinon);
use(chaiPromised);

export {
  expect,
  sinon,
};
