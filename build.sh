#!/bin/bash
# main.js + head.html + fonts/note.woff2 를 하나의 index.html로 묶는다 (필요: node, npm i three esbuild)
set -e
npx esbuild main.js --bundle --minify --format=iife --outfile=dist-bundle.js --log-level=warning
python3 - <<'PY'
import base64
head = open('head.html', encoding='utf-8').read().replace('__NOTE_FONT_B64__', base64.b64encode(open('fonts/note.woff2','rb').read()).decode())
open('index.html','w',encoding='utf-8').write(head + '<script>\n' + open('dist-bundle.js',encoding='utf-8').read() + '\n</script>\n')
PY
echo "index.html 생성 완료"
