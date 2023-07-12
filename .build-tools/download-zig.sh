
set -eo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJECT_DIR=$(dirname "${SCRIPT_DIR}")

ARCH=$(uname -m)
OS=$(uname -o)

case "${ARCH}" in
"arm64")
  ARCH="aarch64"
  ;;
"amd64")
  ARCH="x86_64"
  ;;
esac

case "${OS}" in
"Darwin")
  OS="macos"
  ;;
"Linux")
  OS="linux"
  ;;
esac

ZIG_PATH="${PROJECT_DIR}/.zig"

if [ ! -f "${ZIG_PATH}/zig" ] || [ ! -d "${ZIG_PATH}/lib" ] ; then
  echo "download zig ..."
  mkdir -p "${ZIG_PATH}"

  ZIG_DOWNLOAD_PATH="zig-${OS}-${ARCH}-0.10.1"
  curl -s "https://ziglang.org/download/0.10.1/${ZIG_DOWNLOAD_PATH}.tar.xz" | tar -xf - -C "${ZIG_PATH}"
  mv "${ZIG_PATH}/${ZIG_DOWNLOAD_PATH}/zig" "${ZIG_PATH}/zig"
  mv "${ZIG_PATH}/${ZIG_DOWNLOAD_PATH}/lib" "${ZIG_PATH}/lib"
  rm -rf ".zig/${ZIG_DOWNLOAD_PATH}"
  echo "zig downloaded to ${ZIG_PATH}"
else
  echo "zig already downloaded"
fi
