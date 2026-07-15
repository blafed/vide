npm install
npx esbuild node_modules/mp4box/dist/mp4box.all.mjs \
    --bundle \
    --format=iife \
    --global-name=MP4Box \
    --minify \
    --outfile=mp4box.js
rm -r node_modules