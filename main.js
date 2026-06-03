const { app, BrowserWindow, protocol, net, session } = require('electron');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Squoosh의 정적 빌드 결과물을 이 폴더에 넣어주세요 (아래 README 참고).
const BUNDLE_DIR = path.join(__dirname, 'squoosh');
const SCHEME = 'app';

// SharedArrayBuffer / 멀티스레드 WASM 코덱이 돌아가려면
// 출처(origin)가 "안전"하고 fetch/worker를 지원하는 커스텀 스킴이 필요합니다.
protocol.registerSchemesAsPrivileged([
  {
    scheme: SCHEME,
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// 일부 mime이 잘못 잡히면 WebAssembly 스트리밍 컴파일이나 모듈 로딩이 깨지므로
// 핵심 확장자는 직접 지정해 둡니다.
const MIME = {
  '.wasm': 'application/wasm',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
};

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 860,
    backgroundColor: '#1d1d1d',
    title: 'Squoosh',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.loadURL(`${SCHEME}://bundle/index.html`);

  // 인트로 화면에서 데모 모음 / 설명 섹션(Small·Simple·Secure) / 푸터를 숨김.
  // 클래스의 해시 부분(_vzxu7_)은 빌드마다 바뀌므로, 안 바뀌는 읽을 수 있는
  // 부분만 부분일치(*=)로 잡습니다. CSS라 나중에 그려지는 요소에도 자동 적용됩니다.
  win.webContents.on('did-finish-load', () => {
    win.webContents.insertCSS(`
      [class*="demos-container"],
      [class*="bottom-wave"],
      section[class*="_info_"],
      footer[class*="_footer_"] {
        display: none !important;
      }
    `).catch(() => {});
  });
}

app.whenReady().then(() => {
  // 구글 애널리틱스/추적 요청 차단 (완전 오프라인 동작)
  session.defaultSession.webRequest.onBeforeRequest(
    {
      urls: [
        '*://*.google-analytics.com/*',
        '*://*.analytics.google.com/*',
        '*://*.googletagmanager.com/*',
        '*://*.doubleclick.net/*',
      ],
    },
    (_details, callback) => callback({ cancel: true })
  );

  protocol.handle(SCHEME, async (request) => {
    const { pathname } = new URL(request.url);
    let rel = decodeURIComponent(pathname);
    if (rel === '/' || rel === '') rel = '/index.html';

    let filePath = path.join(BUNDLE_DIR, rel);

    // 번들 밖 경로 접근 차단 (path traversal 방어)
    if (!filePath.startsWith(BUNDLE_DIR)) {
      return new Response('Forbidden', { status: 403 });
    }

    let response;
    try {
      response = await net.fetch(pathToFileURL(filePath).toString());
    } catch {
      // 라우팅 fallback: 없는 경로는 index.html로
      filePath = path.join(BUNDLE_DIR, 'index.html');
      response = await net.fetch(pathToFileURL(filePath).toString());
    }

    const headers = new Headers(response.headers);
    // 이 두 줄이 핵심 — cross-origin isolation을 켜서 SharedArrayBuffer 활성화
    headers.set('Cross-Origin-Opener-Policy', 'same-origin');
    headers.set('Cross-Origin-Embedder-Policy', 'require-corp');
    headers.set('Cross-Origin-Resource-Policy', 'same-origin');

    const ext = path.extname(filePath).toLowerCase();
    if (MIME[ext]) headers.set('Content-Type', MIME[ext]);

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
