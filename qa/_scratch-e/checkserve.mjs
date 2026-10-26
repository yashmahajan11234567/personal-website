import http from 'http';
http.get('http://[::1]:4173/', r => { let d = ''; r.on('data', c => d += c); r.on('end', () => { const m = d.match(/assets\/index-[^"]*\.js/); console.log('served:', m && m[0]); }); }).on('error', e => console.log('ERR', e.message));
