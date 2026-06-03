#!/bin/bash
# 소스 PNG 하나를 macOS 앱 아이콘(icon.icns)으로 변환합니다.
# 사용법: ./make-icns.sh <소스PNG경로>
# 예:    ./make-icns.sh squoosh/c/icon-large-maskable.png
set -e

SRC="$1"
if [ -z "$SRC" ] || [ ! -f "$SRC" ]; then
  echo "소스 PNG 경로를 인자로 주세요. 예: ./make-icns.sh squoosh/c/some-icon.png"
  exit 1
fi

ICONSET="icon.iconset"
rm -rf "$ICONSET"
mkdir "$ICONSET"

sips -z 16 16     "$SRC" --out "$ICONSET/icon_16x16.png"      >/dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_16x16@2x.png"   >/dev/null
sips -z 32 32     "$SRC" --out "$ICONSET/icon_32x32.png"      >/dev/null
sips -z 64 64     "$SRC" --out "$ICONSET/icon_32x32@2x.png"   >/dev/null
sips -z 128 128   "$SRC" --out "$ICONSET/icon_128x128.png"    >/dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$SRC" --out "$ICONSET/icon_256x256.png"    >/dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$SRC" --out "$ICONSET/icon_512x512.png"    >/dev/null
sips -z 1024 1024 "$SRC" --out "$ICONSET/icon_512x512@2x.png" >/dev/null

iconutil -c icns "$ICONSET" -o icon.icns
rm -rf "$ICONSET"
echo "✅ icon.icns 생성 완료"
