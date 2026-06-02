#!/bin/bash
set -e
cd "$(dirname "$0")/.."

echo '=== Building ==='
npm run build

echo '=== Packaging with electron-builder (unpacked only) ==='
npx electron-builder --linux dir --x64

echo '=== Building .deb with dpkg-deb ==='
APPNAME="commanddeck"
VERSION=$(node -p "require('./package.json').version")
MAINTAINER=$(node -p "require('./package.json').build.linux.maintainer")
INSTALLED_SIZE=$(du -sk release/linux-unpacked | cut -f1)

rm -rf /tmp/deb-build
mkdir -p /tmp/deb-build/${APPNAME}_${VERSION}_amd64/DEBIAN
mkdir -p /tmp/deb-build/${APPNAME}_${VERSION}_amd64/opt/CommandDeck
mkdir -p /tmp/deb-build/${APPNAME}_${VERSION}_amd64/usr/share/applications

cp -a release/linux-unpacked/* /tmp/deb-build/${APPNAME}_${VERSION}_amd64/opt/CommandDeck/

cat > /tmp/deb-build/${APPNAME}_${VERSION}_amd64/DEBIAN/control << EOF
Package: commanddeck
Version: ${VERSION}
Architecture: amd64
Maintainer: ${MAINTAINER}
Installed-Size: ${INSTALLED_SIZE}
Depends: libgtk-3-0, libnotify4, libnss3, libxss1, libxtst6, xdg-utils
Recommends: libappindicator3-1
Section: utils
Priority: optional
Homepage: https://github.com/Alexchen93/CommandDeck
Description: CommandDeck - Desktop Command Workspace
 CommandDeck is a desktop command workspace app for terminal
 blocks, toolkit actions, jobs, live output, authorized assets,
 and renderers. Built with Electron + React + node-pty + xterm.js.
EOF

cat > /tmp/deb-build/${APPNAME}_${VERSION}_amd64/usr/share/applications/commanddeck.desktop << 'DESK'
[Desktop Entry]
Name=CommandDeck
Comment=Desktop Command Workspace
Exec=/opt/CommandDeck/commanddeck --no-sandbox %U
Terminal=false
Type=Application
Icon=commanddeck
Categories=Development;Utility;
StartupWMClass=CommandDeck
DESK

dpkg-deb -Zgzip --build /tmp/deb-build/${APPNAME}_${VERSION}_amd64 release/commanddeck_${VERSION}_amd64.deb

echo "=== Done: release/commanddeck_${VERSION}_amd64.deb ==="
ls -lh release/commanddeck_*.deb
