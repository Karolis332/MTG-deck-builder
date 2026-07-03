#!/usr/bin/env python3
"""Pipeline status dashboard — single-file Flask app on port 8090."""
from flask import Flask, jsonify
import re
import json
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
import subprocess

LOG = Path('/var/log/grimoire-pipeline.log')
TRAIN_ONLY_LOG = Path('/var/log/grimoire-train-only.log')
API_HEALTH = 'http://localhost:8000/health'

STEP_RE = re.compile(r'^([\d-]+ [\d:,]+).*Step (\d)/6: (.+)$')
TRAINING_RE = re.compile(r'(Sampling|Building matrix|RETRAINING|Saving)')

app = Flask(__name__)


def parse_log_state():
    """Read both pipeline and train-only logs, merge by timestamp."""
    all_lines = []
    for log_path in (LOG, TRAIN_ONLY_LOG):
        if not log_path.exists():
            continue
        try:
            out = subprocess.check_output(['tail', '-300', str(log_path)], text=True)
            all_lines.extend(out.splitlines())
        except Exception:
            continue
    if not all_lines:
        return {'step': 0, 'step_name': 'no log data', 'last_lines': []}
    # crude sort by timestamp prefix (YYYY-MM-DD HH:MM:SS at line start)
    def ts_key(line):
        m = re.match(r'^(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2})', line)
        return m.group(1) if m else ''
    all_lines.sort(key=ts_key)
    lines = all_lines[-500:]
    last_step = 0
    last_step_name = 'unknown'
    last_step_time = None
    last_failed = None
    last_training_state = None
    for line in lines:
        m = STEP_RE.search(line)
        if m:
            last_step = int(m.group(2))
            last_step_name = m.group(3)
            last_step_time = m.group(1)
        if 'Pipeline attempt' in line and 'failed' in line:
            last_failed = line.strip()[-120:]
        if TRAINING_RE.search(line):
            last_training_state = line.strip()[-120:]
        if 'Pipeline complete' in line.lower() or 'saved model artifact' in line.lower():
            last_step = 6
            last_step_name = 'COMPLETE'
    return {
        'step': last_step,
        'step_name': last_step_name,
        'step_time': last_step_time,
        'last_failed': last_failed,
        'last_training_state': last_training_state,
        'last_lines': lines[-15:],
    }


def fetch_health():
    try:
        req = urllib.request.Request(API_HEALTH, headers={'User-Agent': 'status-dash'})
        return json.loads(urllib.request.urlopen(req, timeout=3).read())
    except Exception as e:
        return {'error': str(e)}


def scrape_state():
    """Read the scrape_all_commanders state from the running container."""
    try:
        out = subprocess.check_output(
            ['docker', 'exec', 'grimoire-scrape-all', 'cat', '/app/data/scrape_all_state.json'],
            text=True, timeout=4,
        )
        data = json.loads(out)
        completed = len(data.get('completed', []))
        return {
            'running': True,
            'started_at': data.get('started_at'),
            'last_update': data.get('last_update'),
            'completed': completed,
            'last_commander': data.get('last_commander'),
            'total_new_decks': data.get('total_new_decks', 0),
        }
    except subprocess.CalledProcessError:
        return {'running': False}
    except Exception as e:
        return {'running': False, 'error': str(e)}


def docker_stats():
    try:
        out = subprocess.check_output([
            'docker', 'stats', '--no-stream', '--format',
            '{{.Name}}|{{.MemUsage}}|{{.MemPerc}}|{{.CPUPerc}}'
        ], text=True, timeout=5)
        rows = []
        for line in out.strip().split('\n'):
            parts = line.split('|')
            if len(parts) >= 4 and 'grimoire' in parts[0]:
                rows.append({'name': parts[0], 'mem': parts[1], 'mem_pct': parts[2], 'cpu_pct': parts[3]})
        return rows
    except Exception:
        return []


@app.route('/api/status')
def api_status():
    log_state = parse_log_state()
    health = fetch_health()
    docker = docker_stats()
    pct = (log_state['step'] / 6) * 100 if log_state['step'] else 0
    return jsonify({
        'now_utc': datetime.now(timezone.utc).isoformat(timespec='seconds'),
        'pipeline': log_state,
        'progress_pct': pct,
        'api': health,
        'containers': docker,
        'scrape': scrape_state(),
    })


HTML = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Grimoire Pipeline Status</title>
<meta http-equiv="Cache-Control" content="no-store, no-cache, must-revalidate">
<style>
body { background:#0a0810; color:#d4d4d8; font-family:Consolas,monospace; padding:20px; max-width:980px; margin:auto; line-height:1.5; }
h1 { color:#c9a84c; letter-spacing:2px; border-bottom:1px solid #5a4520; padding-bottom:8px; }
.card { background:#1a1410; border:1px solid #3a2a18; border-radius:8px; padding:14px 18px; margin:10px 0; }
.bar-wrap { background:#2a1c10; border-radius:6px; height:28px; overflow:hidden; margin:8px 0; position:relative; }
.bar-fill { height:100%; background:linear-gradient(90deg,#8b6914,#c9a84c); transition:width 0.5s; }
.bar-text { position:absolute; top:0; left:0; right:0; line-height:28px; text-align:center; color:#fff; font-weight:bold; }
.step { font-size:18px; color:#c9a84c; }
.stat { display:inline-block; padding:4px 10px; background:#2a1c10; border-radius:4px; margin:3px; font-size:13px; }
.ok { color:#86efac; }
.warn { color:#fbbf24; }
.err { color:#fca5a5; }
pre { background:#0f0c14; padding:10px; border-radius:4px; font-size:11px; max-height:280px; overflow:auto; color:#a8a29e; white-space:pre-wrap; }
table { width:100%; border-collapse:collapse; font-size:13px; }
td { padding:4px 8px; border-bottom:1px solid #2a1c10; }
.muted { color:#71717a; font-size:11px; }
</style>
</head>
<body>
<h1>The Black Grimoire - Pipeline Status</h1>
<div class="card">
  <div class="step" id="step-name">Loading...</div>
  <div class="bar-wrap"><div class="bar-fill" id="bar-fill" style="width:0%"></div><div class="bar-text" id="bar-text">0%</div></div>
  <div class="muted" id="step-time"></div>
  <div class="muted" id="training-state" style="margin-top:6px"></div>
</div>
<div class="card">
  <strong>Commander scrape (long-running)</strong>
  <div id="scrape" style="margin-top:6px">--</div>
</div>
<div class="card"><strong>API health</strong><div id="health">...</div></div>
<div class="card"><strong>Containers</strong><table id="containers"></table></div>
<div class="card"><strong>Recent log</strong><pre id="log"></pre></div>
<div class="muted">auto-refresh every 5s &middot; last update <span id="tick">--</span></div>
<script>
function refresh() {
  var url = '/training/api/status?t=' + Date.now();
  var xhr = new XMLHttpRequest();
  xhr.open('GET', url, true);
  xhr.setRequestHeader('Cache-Control', 'no-cache');
  xhr.onreadystatechange = function() {
    if (xhr.readyState !== 4) return;
    if (xhr.status !== 200) {
      document.getElementById('step-name').textContent = 'Status error: HTTP ' + xhr.status;
      return;
    }
    try { render(JSON.parse(xhr.responseText)); }
    catch (e) { document.getElementById('step-name').textContent = 'Parse error: ' + e.message; }
  };
  xhr.onerror = function() { document.getElementById('step-name').textContent = 'Network error'; };
  xhr.send();
}
function render(d) {
  document.getElementById('step-name').textContent = 'Step ' + d.pipeline.step + '/6 - ' + d.pipeline.step_name;
  document.getElementById('bar-fill').style.width = d.progress_pct + '%';
  document.getElementById('bar-text').textContent = Math.round(d.progress_pct) + '%';
  document.getElementById('step-time').textContent = d.pipeline.step_time ? 'started ' + d.pipeline.step_time : '';
  document.getElementById('training-state').textContent = d.pipeline.last_training_state || '';
  var a = d.api || {};
  var h = '';
  if (a.error) {
    h = '<span class="err">API offline: ' + a.error + '</span>';
  } else {
    h += '<span class="stat">deck count: <b>' + (a.deck_count || 0) + '</b></span>';
    h += '<span class="stat">model: ' + (a.model_version || '?') + '</span>';
    h += '<span class="stat">last retrain: ' + String(a.last_retrained || '?').substring(0, 16) + '</span>';
    h += '<span class="stat">VW: ' + (a.vw_model_active ? '<span class="ok">active</span>' : '<span class="warn">inactive</span>') + '</span>';
  }
  document.getElementById('health').innerHTML = h;
  var s = d.scrape || {};
  var sh = '';
  if (!s.running) {
    sh = '<span class="muted">scraper not running</span>';
  } else {
    var TOTAL_COMMANDERS = 3177;
    var pct = Math.round((s.completed / TOTAL_COMMANDERS) * 100);
    sh += '<div class="bar-wrap"><div class="bar-fill" style="width:' + pct + '%"></div><div class="bar-text">' + s.completed + ' / ' + TOTAL_COMMANDERS + ' (' + pct + '%)</div></div>';
    sh += '<span class="stat">last: <b>' + (s.last_commander || '?') + '</b></span>';
    sh += '<span class="stat">new decks this run: <b>' + (s.total_new_decks || 0) + '</b></span>';
    sh += '<span class="stat muted">started ' + (String(s.started_at || '').replace('T', ' ').replace('+00:00', 'Z')) + '</span>';
  }
  document.getElementById('scrape').innerHTML = sh;
  var ct = '';
  for (var i = 0; i < d.containers.length; i++) {
    var c = d.containers[i];
    var pct = parseFloat(c.mem_pct);
    var cls = pct > 90 ? 'err' : pct > 75 ? 'warn' : 'ok';
    ct += '<tr><td>' + c.name + '</td><td>' + c.mem + '</td><td class="' + cls + '">' + c.mem_pct + '</td><td>' + c.cpu_pct + '</td></tr>';
  }
  document.getElementById('containers').innerHTML = ct;
  document.getElementById('log').textContent = (d.pipeline.last_lines || []).join('\\n');
  document.getElementById('tick').textContent = String(d.now_utc).replace('T', ' ').replace('+00:00', 'Z');
}
refresh();
setInterval(refresh, 5000);
</script>
</body>
</html>"""


@app.route('/')
def dashboard():
    response = app.make_response(HTML)
    response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    response.headers['Pragma'] = 'no-cache'
    response.headers['Expires'] = '0'
    return response


@app.after_request
def add_cors_and_nocache(response):
    if response.mimetype == 'application/json':
        response.headers['Cache-Control'] = 'no-store, no-cache, must-revalidate, max-age=0'
    return response


if __name__ == '__main__':
    app.run(host='127.0.0.1', port=8090, debug=False)
