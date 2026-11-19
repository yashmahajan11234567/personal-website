#!/usr/bin/env python3
"""Batch image generation via local ComfyUI (API format) for Cloud World assets.

Usage:
  python3 scripts/ai_assets/gen.py manifest.json [--only name1,name2]

Writes PNGs to scripts/ai_assets/out/<name>.png and a progress log to
scripts/ai_assets/progress.log. Skips names that already have an output file.
"""
import copy, json, os, sys, time, urllib.request, urllib.error

BASE = 'http://127.0.0.1:8188'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
TEMPLATE = '/Users/yashsiphone/.hermes/skills/creative/comfyui/workflows/sdxl_txt2img.json'
NEG_DEFAULT = ("ugly, blurry, lowres, low quality, deformed, distorted, watermark, text, letters, "
               "signature, cropped, out of frame, extra limbs, extra heads, mutation, jpeg artifacts, "
               "photo, 3d render, realistic shading, dark moody, multiple separate objects floating")


def post(path, payload):
    req = urllib.request.Request(BASE + path, data=json.dumps(payload).encode(),
                                 headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())


def get(path, timeout=30):
    with urllib.request.urlopen(BASE + path, timeout=timeout) as r:
        return r.read()


def build_workflow(tpl, name, prompt, neg, w, h, seed, steps=28, cfg=7.0):
    wf = copy.deepcopy(tpl)
    wf['3']['inputs']['seed'] = seed
    wf['3']['inputs']['steps'] = steps
    wf['3']['inputs']['cfg'] = cfg
    wf['5']['inputs']['width'] = w
    wf['5']['inputs']['height'] = h
    wf['6']['inputs']['text'] = prompt
    wf['7']['inputs']['text'] = neg or NEG_DEFAULT
    wf['9']['inputs']['filename_prefix'] = 'ai_' + name
    return wf


def run_one(tpl, asset, style, neg):
    name = asset['name']
    dest = os.path.join(OUT, name + '.png')
    if os.path.exists(dest):
        return name, 'skip'
    prompt = style + ', ' + asset['prompt']
    seed = asset.get('seed', 1234 + (abs(hash(name)) % 100000))
    wf = build_workflow(tpl, name, prompt, neg, asset['w'], asset['h'], seed)
    try:
        res = post('/prompt', {'prompt': wf})
    except urllib.error.HTTPError as e:
        return name, 'HTTP %s %s' % (e.code, e.read()[:200])
    pid = res['prompt_id']
    for _ in range(600):  # up to 20 min per image
        time.sleep(2)
        try:
            hist = json.loads(get('/history/' + pid))
        except Exception:
            continue
        if pid in hist:
            entry = hist[pid]
            if entry.get('status', {}).get('completed'):
                outs = entry.get('outputs', {})
                for node, o in outs.items():
                    for img in o.get('images', []):
                        data = get('/view?filename=%s&subfolder=%s&type=%s' % (
                            img['filename'], img.get('subfolder', ''), img.get('type', 'output')), timeout=120)
                        with open(dest, 'wb') as f:
                            f.write(data)
                        return name, 'ok (%d bytes)' % len(data)
                return name, 'no images: %s' % json.dumps(outs)[:200]
            msgs = entry.get('status', {}).get('messages', [])
            if any(m[0] == 'execution_error' for m in msgs):
                return name, 'exec error: %s' % json.dumps(msgs)[:300]
    return name, 'timeout'


def main():
    manifest_path = sys.argv[1]
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    man = json.load(open(manifest_path))
    style = man.get('style', '')
    neg = man.get('neg', NEG_DEFAULT)
    tpl = json.load(open(TEMPLATE))
    tpl = {k: v for k, v in tpl.items() if not k.startswith('_')}  # ComfyUI 0.44 rejects non-node keys
    os.makedirs(OUT, exist_ok=True)
    log = open(os.path.join(HERE, 'progress.log'), 'a')
    assets = man.get('assets', [])
    if 'dirs' in man:  # character manifest expands to dir x pose images
        for d, dlabel in man['dirs'].items():
            for p, plabel in man['poses'].items():
                assets.append({'name': '%s_dir%s' % (p, d), 'w': 384, 'h': 512,
                               'prompt': 'character %s, %s' % (plabel, dlabel),
                               'seed': 5000 + int(d) * 100 + (abs(hash(p)) % 50)})
    if only:
        assets = [a for a in assets if a['name'] in only]
    t0 = time.time()
    for i, a in enumerate(assets):
        name, status = run_one(tpl, a, style, neg)
        line = '[%d/%d] %s -> %s (%.0fs)' % (i + 1, len(assets), name, status, time.time() - t0)
        print(line, flush=True)
        log.write(line + '\n'); log.flush()
    print('DONE %d assets' % len(assets))


if __name__ == '__main__':
    main()
