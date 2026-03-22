const http = require('http');
const https = require('https');
const fs = require('fs');

const PORT = 8080;
const STANDARD_API_HOST = "generativelanguage.googleapis.com";

const modelMapping = {
    'gemini-3-pro-preview': 'gemini-1.5-pro-latest',
    'gemini-3-flash-preview': 'gemini-1.5-flash-latest',
    'gemini-3-pro-preview-high': 'gemini-1.5-pro-latest',
    'gemini-3-flash-preview-high': 'gemini-1.5-flash-latest',
    'gemini-3-pro-high': 'gemini-1.5-pro-latest',
    'gemini-3-flash-high': 'gemini-1.5-flash-latest'
};

function log(msg) {
    try {
        fs.appendFileSync('/tmp/switcher.log', `[PROXY] [${new Date().toISOString()}] ${msg}\n`);
    } catch(e) {}
}

function getAuth() {
    try {
        return JSON.parse(fs.readFileSync("/home/salmen/.gemini/oauth_creds.json", "utf-8"));
    } catch(e) { return null; }
}

const server = http.createServer((req, res) => {
    let url;
    try {
        // Handle both relative and absolute URLs from HTTPS_PROXY
        url = req.url.startsWith('http') ? new URL(req.url) : new URL(req.url, `https://${STANDARD_API_HOST}`);
    } catch(e) {
        res.writeHead(400);
        return res.end("Invalid URL");
    }

    log(`Intercepted: ${url.hostname}${url.pathname}`);

    if (url.hostname.includes("googleapis.com")) {
        let targetPath = url.pathname.replace("/v1beta/", "/v1/");
        
        // Map Models
        for (const [key, value] of Object.entries(modelMapping)) {
            if (targetPath.includes(`/models/${key}`)) {
                targetPath = targetPath.replace(`/models/${key}`, `/models/${value}`);
                log(`Mapping Model: ${key} -> ${value}`);
            }
        }

        const auth = getAuth();
        const headers = { ...req.headers };
        
        // Use Host from URL
        headers['host'] = STANDARD_API_HOST;
        delete headers['proxy-connection'];
        
        if (auth?.access_token) {
            headers['authorization'] = `Bearer ${auth.access_token}`;
            log(`Injecting Auth: ${auth.access_token.substring(0, 10)}...`);
        }

        const proxyReq = https.request({
            hostname: STANDARD_API_HOST,
            port: 443,
            path: targetPath + url.search,
            method: req.method,
            headers: headers
        }, (proxyRes) => {
            res.writeHead(proxyRes.statusCode, proxyRes.headers);
            proxyRes.pipe(res);
        });

        req.pipe(proxyReq);
        proxyReq.on('error', (e) => {
            log(`Proxy Error: ${e.message}`);
            res.writeHead(502);
            res.end();
        });
    } else {
        res.writeHead(502);
        res.end("Only Google API Proxy Supported");
    }
});

server.listen(PORT, '127.0.0.1', () => {
    log(`Universal Gemini Proxy listening on port ${PORT}`);
});
