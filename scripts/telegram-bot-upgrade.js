/**
 * Telegram bot for VPS administration.
 * Runs as a standalone process alongside geo-scraper.
 * Uses inline keyboard buttons for easy interaction.
 *
 * Grimoire CF API controls:
 * - Pipeline status, logs, trigger, restart
 * - Training history, player stats, deck stats
 * - Docker container management
 */
import { execSync, exec } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;
if (!TOKEN || !CHAT_ID) {
    console.error('TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID required');
    process.exit(1);
}
const API = `https://api.telegram.org/bot${TOKEN}`;
const DB_PATH = '/var/lib/geo-scraper/geo-scraper.db';

const CF_API = 'http://127.0.0.1:8000';
const CF_KEY = '97c1d0df913335761afde8d86ac568a061416fa96fdb467e6597e6d9cd9436c1';
const CF_COMPOSE = '/opt/grimoire-cf-api';

let offset = 0;

// ── Telegram helpers ──

async function send(text, keyboard, chatId = CHAT_ID) {
    const chunks = text.match(/[\s\S]{1,4000}/g) || ['(empty)'];
    let lastResult;
    for (let i = 0; i < chunks.length; i++) {
        const isLast = i === chunks.length - 1;
        const body = {
            chat_id: chatId,
            text: chunks[i],
            parse_mode: 'HTML',
        };
        if (isLast && keyboard) {
            body.reply_markup = { inline_keyboard: keyboard };
        }
        const res = await fetch(`${API}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        lastResult = await res.json();
    }
    return lastResult;
}

async function editMessage(chatId, messageId, text, keyboard) {
    const body = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: 'HTML',
    };
    if (keyboard) {
        body.reply_markup = { inline_keyboard: keyboard };
    }
    await fetch(`${API}/editMessageText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
}

async function answerCallback(callbackId, text) {
    await fetch(`${API}/answerCallbackQuery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ callback_query_id: callbackId, text }),
    });
}

function run(cmd, timeout = 15000) {
    try {
        return execSync(cmd, { encoding: 'utf-8', timeout, stdio: ['pipe', 'pipe', 'pipe'] }).trim();
    } catch (e) {
        return e.stderr?.trim() || e.stdout?.trim() || e.message || 'Command failed';
    }
}

function runAsync(cmd, timeout = 60000) {
    return new Promise((resolve) => {
        exec(cmd, { encoding: 'utf-8', timeout }, (err, stdout, stderr) => {
            if (err) resolve(stderr?.trim() || stdout?.trim() || err.message);
            else resolve(stdout?.trim() || '(no output)');
        });
    });
}

function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Query the geo-scraper DB safely */
function queryDb(script) {
    return run(`cd /opt/geo-scraper && node -e "
    try {
      const { JobDatabase } = require('./dist/web/database.js');
      const db = new JobDatabase('${DB_PATH}');
      ${script}
    } catch(e) { console.log('DB error: ' + e.message); }
  " 2>&1`);
}

// ── CF API helpers ──

function cfApi(endpoint, method = 'GET', body = null) {
    const args = [`-s`, `--max-time`, `5`, `-H`, `'X-API-Key: ${CF_KEY}'`];
    if (method === 'POST') {
        args.push(`-X POST`, `-H 'Content-Type: application/json'`);
        if (body) args.push(`-d '${JSON.stringify(body)}'`);
    }
    return run(`curl ${args.join(' ')} '${CF_API}${endpoint}'`);
}

function cfApiJson(endpoint, method = 'GET', body = null) {
    try {
        return JSON.parse(cfApi(endpoint, method, body));
    } catch {
        return null;
    }
}

function queryGrimoireDb(sql) {
    return run(
        'docker exec grimoire-cf-api-postgres-1 psql -U grimoire -d grimoire_cf -t -A -c ' +
        JSON.stringify(sql) + ' 2>&1',
        10000
    ).trim();
}

// ── Keyboards ──

const MAIN_MENU = [
    [{ text: '📊 Status', callback_data: 'status' }, { text: '⚙️ Services', callback_data: 'services' }],
    [{ text: '📋 Logs', callback_data: 'logs' }, { text: '🌐 Nginx', callback_data: 'nginx' }],
    [{ text: '🔒 SSL', callback_data: 'ssl' }, { text: '📦 Updates', callback_data: 'updates' }],
    [{ text: '📈 Report', callback_data: 'report' }, { text: '🔍 Recent scans', callback_data: 'scans' }],
    [{ text: '🃏 Grimoire', callback_data: 'grimoire' }],
];

const BACK_BTN = [
    [{ text: '◀️ Menu', callback_data: 'menu' }],
];

const STATUS_ACTIONS = [
    [{ text: '🔄 Restart app', callback_data: 'restart' }, { text: '📋 Logs', callback_data: 'logs' }],
    [{ text: '◀️ Menu', callback_data: 'menu' }],
];

const RESTART_CONFIRM = [
    [{ text: '✅ Yes, restart', callback_data: 'restart_confirm' }, { text: '❌ No', callback_data: 'menu' }],
];

const REBOOT_CONFIRM = [
    [{ text: '⚠️ Yes, reboot', callback_data: 'reboot_confirm' }, { text: '❌ No', callback_data: 'menu' }],
];

const LOGS_OPTIONS = [
    [{ text: '10 lines', callback_data: 'logs_10' }, { text: '30 lines', callback_data: 'logs_30' }, { text: '50 lines', callback_data: 'logs_50' }],
    [{ text: '🔴 Errors only', callback_data: 'logs_errors' }],
    [{ text: '◀️ Menu', callback_data: 'menu' }],
];

const AFTER_RESTART = [
    [{ text: '📊 Check status', callback_data: 'status' }, { text: '📋 Logs', callback_data: 'logs_10' }],
    [{ text: '◀️ Menu', callback_data: 'menu' }],
];

// ── Grimoire keyboards ──

const GRIMOIRE_MENU = [
    [{ text: '🔄 Refresh', callback_data: 'grimoire' }, { text: '📋 Pipeline', callback_data: 'grim_pipeline' }],
    [{ text: '🃏 Decks', callback_data: 'grim_decks' }, { text: '👤 Players', callback_data: 'grim_players' }],
    [{ text: '🧠 Training', callback_data: 'grim_training' }, { text: '🐳 Docker', callback_data: 'grim_docker' }],
    [{ text: '◀️ Menu', callback_data: 'menu' }],
];

const GRIM_PIPELINE_MENU = [
    [{ text: '🔄 Refresh', callback_data: 'grim_pipeline' }, { text: '📋 Worker logs', callback_data: 'grim_wlogs' }],
    [{ text: '▶️ Trigger pipeline', callback_data: 'grim_trigger' }, { text: '🔴 Errors', callback_data: 'grim_werrors' }],
    [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
];

const GRIM_DOCKER_MENU = [
    [{ text: '🔄 Restart API', callback_data: 'grim_restart_api' }, { text: '🔄 Restart worker', callback_data: 'grim_restart_worker' }],
    [{ text: '⚠️ Restart all', callback_data: 'grim_restart_all_ask' }, { text: '🐳 Containers', callback_data: 'grim_containers' }],
    [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
];

// ── VPS data builders ──

function buildStatus() {
    const uptime = run('uptime -p');
    const mem = run("free -h | grep Mem | awk '{print $3 \"/\" $2}'");
    const disk = run("df -h / | tail -1 | awk '{print $3 \"/\" $2 \" (\" $5 \")\"}'");
    const load = run('cat /proc/loadavg | cut -d" " -f1-3');
    const procs = run('ps aux --sort=-%mem | head -4 | tail -3');
    return (
        `<b>📊 Server Status</b>\n\n` +
        `⏱ <b>Uptime:</b>  ${esc(uptime)}\n` +
        `💾 <b>RAM:</b>  ${esc(mem)}\n` +
        `💿 <b>Disk:</b>  ${esc(disk)}\n` +
        `⚡ <b>CPU:</b>  ${esc(load)}\n\n` +
        `<b>Top processes:</b>\n<code>${esc(procs)}</code>`
    );
}

function buildServices() {
    const pm2 = run(
        `pm2 jlist 2>/dev/null | node -e "` +
        `const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));` +
        `d.forEach(p=>{` +
        `const ico=p.pm2_env.status==='online'?'🟢':'🔴';` +
        `const mem=Math.round(p.monit.memory/1024/1024);` +
        `const up=p.pm2_env.pm_uptime?Math.round((Date.now()-p.pm2_env.pm_uptime)/60000)+'m':'?';` +
        `console.log(ico+' '+p.name+' — '+mem+'MB, uptime '+up)` +
        `})" 2>/dev/null || echo "pm2 unavailable"`
    );
    const nginx = run('systemctl is-active nginx 2>/dev/null');
    const nginxIco = nginx === 'active' ? '🟢' : '🔴';
    const docker = run('docker ps --format "{{.Names}}: {{.Status}}" 2>/dev/null | head -10');
    return (
        `<b>⚙️ Services</b>\n\n` +
        `<b>PM2:</b>\n${esc(pm2)}\n\n` +
        `<b>Nginx:</b> ${nginxIco} ${esc(nginx)}\n\n` +
        `<b>Docker:</b>\n<code>${esc(docker)}</code>`
    );
}

function buildLogs(lines) {
    const logs = run(`pm2 logs geo-scraper --nostream --lines ${lines} 2>&1`);
    return `<b>📋 Last ${lines} lines</b>\n\n<code>${esc(logs.slice(-3800))}</code>`;
}

function buildErrorLogs() {
    const logs = run(`pm2 logs geo-scraper --nostream --lines 100 2>&1 | grep -i "error\\|ERR\\|fail" | tail -20`);
    return `<b>🔴 Errors</b>\n\n<code>${esc(logs || 'No errors found ✅')}</code>`;
}

function buildNginx() {
    const status = run('systemctl is-active nginx');
    const test = run('nginx -t 2>&1');
    const sites = run('ls /etc/nginx/sites-enabled/');
    const ico = status === 'active' ? '🟢' : '🔴';
    const testIco = test.includes('ok') ? '✅' : '❌';
    return (
        `<b>🌐 Nginx</b>\n\n` +
        `${ico} <b>Status:</b>  ${esc(status)}\n` +
        `${testIco} <b>Config:</b>  ${esc(test)}\n\n` +
        `<b>Active sites:</b>\n<code>${esc(sites)}</code>`
    );
}

function buildSsl() {
    const certs = run('certbot certificates 2>&1 | grep -E "Domain|Expiry" || echo "No certbot certs found"');
    return `<b>🔒 SSL Certificates</b>\n\n<code>${esc(certs)}</code>`;
}

async function buildUpdates() {
    const updates = await runAsync('apt update 2>/dev/null && apt list --upgradable 2>/dev/null | tail -20');
    const count = run('apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0');
    const ico = count === '0' ? '✅' : '📦';
    return `<b>${ico} Updates (${esc(count)})</b>\n\n<code>${esc(updates)}</code>`;
}

function buildScans() {
    const scans = queryDb(`
    const jobs = db.listCompletedJobsByType('scan').slice(0, 8);
    jobs.forEach(j => {
      const r = JSON.parse(j.result_json || '{}');
      const s = r.score || 0;
      const g = r.grade || '?';
      const ico = s >= 80 ? '🟢' : s >= 60 ? '🟡' : '🔴';
      const date = (j.completed_at || '').slice(0, 10);
      console.log(ico + ' ' + j.domain + ' — ' + s + '/100 (' + g + ') ' + date);
    });
    if (!jobs.length) console.log('No scans found');
  `);
    return `<b>🔍 Recent Scans</b>\n\n${esc(scans)}`;
}

function buildReport() {
    const uptime = run('uptime -p');
    const mem = run("free -h | grep Mem | awk '{print $3 \"/\" $2}'");
    const disk = run("df -h / | tail -1 | awk '{print $3 \"/\" $2 \" (\" $5 \")\"}'");
    const load = run('cat /proc/loadavg | cut -d" " -f1-3');
    const nginx = run('systemctl is-active nginx 2>/dev/null');
    const updates = run('apt list --upgradable 2>/dev/null | grep -c upgradable || echo 0');

    const pm2 = run(
        `pm2 jlist 2>/dev/null | node -e "` +
        `const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));` +
        `d.forEach(p=>{` +
        `const ico=p.pm2_env.status==='online'?'🟢':'🔴';` +
        `console.log(ico+' '+p.name+': '+p.pm2_env.status)` +
        `})" 2>/dev/null || echo "pm2 unavailable"`
    );

    const scans = queryDb(`
    const jobs = db.listCompletedJobsByType('scan').slice(0, 5);
    jobs.forEach(j => {
      const r = JSON.parse(j.result_json || '{}');
      const s = r.score || 0;
      const g = r.grade || '?';
      const ico = s >= 80 ? '🟢' : s >= 60 ? '🟡' : '🔴';
      console.log(ico + ' ' + j.domain + ': ' + s + '/100 (' + g + ')');
    });
    if (!jobs.length) console.log('  No scans found');
  `);

    // Grimoire summary
    const cfHealth = cfApiJson('/health');
    const cfLine = cfHealth
        ? `🃏 Grimoire: ${cfHealth.deck_count?.toLocaleString()} decks, model ${cfHealth.model_version}`
        : '🃏 Grimoire: unreachable';

    const nginxIco = nginx === 'active' ? '🟢' : '🔴';
    const updIco = updates === '0' ? '✅' : '⚠️';

    return (
        `<b>☀️ Morning Report</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>🖥 Server</b>\n` +
        `  ⏱ ${esc(uptime)}\n` +
        `  💾 RAM: ${esc(mem)}\n` +
        `  💿 Disk: ${esc(disk)}\n` +
        `  ⚡ CPU: ${esc(load)}\n\n` +
        `<b>🔧 Services</b>\n` +
        `${esc(pm2)}\n` +
        `  ${nginxIco} nginx: ${esc(nginx)}\n` +
        `  ${esc(cfLine)}\n\n` +
        `<b>📦 Updates:</b> ${updIco} ${esc(updates)} available\n\n` +
        `<b>📊 Recent Scans</b>\n` +
        `${esc(scans)}\n` +
        `━━━━━━━━━━━━━━━━━━━━`
    );
}

// ── Grimoire data builders ──

function buildGrimoireStatus() {
    const health = cfApiJson('/health');
    const scrapeStatus = cfApiJson('/admin/scrape-status');
    const playerCount = queryGrimoireDb('SELECT COUNT(*) FROM players');
    const matchCount = queryGrimoireDb('SELECT COUNT(*) FROM player_matches');

    // Training info
    const lastTrain = queryGrimoireDb(
        "SELECT trigger, deck_count_after, total_decks_trained, duration_s, status, created_at " +
        "FROM training_log ORDER BY created_at DESC LIMIT 1"
    );

    const apiIco = health ? '🟢' : '🔴';
    const pipeIco = scrapeStatus?.running ? '🔄' : '⏸';

    let statusText =
        `<b>🃏 Black Grimoire</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (health) {
        statusText +=
            `${apiIco} <b>API:</b> online\n` +
            `📦 <b>Decks:</b> ${Number(health.deck_count).toLocaleString()}\n` +
            `🧠 <b>Model:</b> ${esc(health.model_version)}\n` +
            `📅 <b>Last trained:</b> ${esc(health.last_retrained?.slice(0, 16) || 'never')}\n\n`;
    } else {
        statusText += `${apiIco} <b>API:</b> unreachable\n\n`;
    }

    if (scrapeStatus) {
        statusText +=
            `${pipeIco} <b>Pipeline:</b> ${scrapeStatus.running ? 'RUNNING' : 'idle'}\n` +
            `🧩 <b>Partitions:</b> ${scrapeStatus.partitions}\n`;
        if (scrapeStatus.last_run) {
            statusText += `🕐 <b>Last run:</b> ${esc(scrapeStatus.last_run.slice(0, 16))}\n`;
        }
        statusText += '\n';
    }

    statusText +=
        `👤 <b>Players:</b> ${esc(playerCount)}\n` +
        `⚔️ <b>Matches tracked:</b> ${esc(matchCount)}\n\n`;

    if (lastTrain && lastTrain !== '' && !lastTrain.includes('0 rows')) {
        const parts = lastTrain.split('|');
        if (parts.length >= 5) {
            const trainIco = parts[4] === 'success' ? '✅' : '❌';
            statusText +=
                `<b>Last training:</b>\n` +
                `  ${trainIco} ${esc(parts[0])} — ${Number(parts[2]).toLocaleString()} decks\n` +
                `  ⏱ ${esc(parts[3])}s, ${esc(parts[5]?.slice(0, 16) || '')}\n\n`;
        }
    }

    statusText += `━━━━━━━━━━━━━━━━━━━━`;

    return statusText;
}

function buildGrimPipelineStatus() {
    const scrapeStatus = cfApiJson('/admin/scrape-status');
    const workerLogs = run(
        'docker logs grimoire-cf-api-worker-1 --since 10m 2>&1 | grep -E "Step|RETRAIN|trained|complete|Sleeping|Pipeline|expansion progress|Decks|Training|Models|VW|stale|popularity|error|failed" | tail -20'
    );

    const pipeIco = scrapeStatus?.running ? '🔄 RUNNING' : '⏸ Idle';

    let text =
        `<b>📋 Pipeline Status</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `<b>Status:</b> ${pipeIco}\n`;

    if (scrapeStatus) {
        text += `<b>Decks:</b> ${Number(scrapeStatus.decks_total).toLocaleString()}\n`;
        text += `<b>Partitions:</b> ${scrapeStatus.partitions}\n`;
        if (scrapeStatus.last_run) {
            text += `<b>Last run:</b> ${esc(scrapeStatus.last_run.slice(0, 16))}\n`;
        }
    }

    text += `\n<b>Recent activity:</b>\n<code>${esc(workerLogs || 'No recent activity')}</code>`;

    return text;
}

function buildGrimWorkerLogs() {
    const logs = run('docker logs grimoire-cf-api-worker-1 --tail 40 2>&1');
    return `<b>📋 Worker Logs (last 40)</b>\n\n<code>${esc(logs.slice(-3500))}</code>`;
}

function buildGrimWorkerErrors() {
    const logs = run('docker logs grimoire-cf-api-worker-1 2>&1 | grep -iE "error|failed|exception|traceback" | tail -20');
    return `<b>🔴 Worker Errors</b>\n\n<code>${esc(logs || 'No errors found ✅')}</code>`;
}

function buildGrimDecks() {
    const bySource = queryGrimoireDb(
        'SELECT source, COUNT(*) as n FROM decks GROUP BY source ORDER BY n DESC'
    );
    const topCmdr = queryGrimoireDb(
        'SELECT commander_name, COUNT(*) as n FROM decks WHERE commander_name IS NOT NULL AND commander_name != \'\' GROUP BY commander_name ORDER BY n DESC LIMIT 10'
    );
    const byColor = queryGrimoireDb(
        'SELECT color_identity, COUNT(*) as n FROM decks GROUP BY color_identity ORDER BY n DESC LIMIT 15'
    );
    const recent24h = queryGrimoireDb(
        "SELECT COUNT(*) FROM decks WHERE scraped_at > NOW() - INTERVAL '24 hours'"
    );

    return (
        `<b>🃏 Deck Stats</b>\n\n` +
        `📦 <b>Last 24h:</b> +${esc(recent24h)} decks\n\n` +
        `<b>By source:</b>\n<code>${esc(bySource)}</code>\n\n` +
        `<b>Top commanders:</b>\n<code>${esc(topCmdr)}</code>\n\n` +
        `<b>By color identity:</b>\n<code>${esc(byColor)}</code>`
    );
}

function buildGrimPlayers() {
    const players = queryGrimoireDb(
        "SELECT username, total_matches, total_wins, total_losses, favorite_commander, " +
        "ROUND(total_wins::numeric / GREATEST(total_matches, 1) * 100, 1) as wr " +
        "FROM players ORDER BY last_seen_at DESC LIMIT 15"
    );

    const totalPlayers = queryGrimoireDb('SELECT COUNT(*) FROM players');
    const totalMatches = queryGrimoireDb('SELECT COUNT(*) FROM player_matches');
    const activeLast24h = queryGrimoireDb(
        "SELECT COUNT(*) FROM players WHERE last_seen_at > NOW() - INTERVAL '24 hours'"
    );

    let text =
        `<b>👤 Player Stats</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `👤 <b>Total:</b> ${esc(totalPlayers)}\n` +
        `⚔️ <b>Matches:</b> ${esc(totalMatches)}\n` +
        `🟢 <b>Active (24h):</b> ${esc(activeLast24h)}\n\n`;

    if (players && players.trim()) {
        text += `<b>Players:</b>\n<code>`;
        const rows = players.split('\n');
        for (const row of rows) {
            const cols = row.split('|');
            if (cols.length >= 6) {
                const name = cols[0].trim();
                const matches = cols[1].trim();
                const wins = cols[2].trim();
                const wr = cols[5].trim();
                const cmd = cols[4].trim();
                text += `${esc(name)}: ${esc(matches)} games, ${esc(wr)}% WR`;
                if (cmd) text += ` (${esc(cmd)})`;
                text += '\n';
            }
        }
        text += '</code>';
    } else {
        text += '<i>No players yet</i>';
    }

    return text;
}

function buildGrimTraining() {
    const logs = queryGrimoireDb(
        "SELECT trigger, deck_count_before, deck_count_after, new_decks_since_last, " +
        "partitions_trained, total_decks_trained, duration_s, status, error_message, " +
        "to_char(created_at, 'YYYY-MM-DD HH24:MI') " +
        "FROM training_log ORDER BY created_at DESC LIMIT 10"
    );

    // Current state
    const totalDecks = queryGrimoireDb('SELECT COUNT(*) FROM decks');
    const lastTrainedCount = queryGrimoireDb(
        "SELECT deck_count_after FROM training_log WHERE status = 'success' ORDER BY created_at DESC LIMIT 1"
    );
    const newSince = lastTrainedCount
        ? Number(totalDecks) - Number(lastTrainedCount)
        : Number(totalDecks);

    let text =
        `<b>🧠 Training History</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n` +
        `📦 <b>Total decks:</b> ${Number(totalDecks).toLocaleString()}\n` +
        `📊 <b>New since last train:</b> ${newSince.toLocaleString()}\n` +
        `🎯 <b>Retrain threshold:</b> 50,000\n`;

    if (newSince >= 50000) {
        text += `⚡ <b>Retrain will trigger on next pipeline run!</b>\n`;
    } else {
        const remaining = 50000 - newSince;
        text += `⏳ <b>Next retrain in:</b> ~${remaining.toLocaleString()} more decks\n`;
    }

    text += '\n';

    if (logs && logs.trim() && !logs.includes('0 rows')) {
        text += `<b>Recent runs:</b>\n<code>`;
        const rows = logs.split('\n');
        for (const row of rows) {
            const cols = row.split('|');
            if (cols.length >= 10) {
                const trigger = cols[0].trim();
                const decksBefore = Number(cols[1]).toLocaleString();
                const decksAfter = Number(cols[2]).toLocaleString();
                const partitions = cols[4].trim();
                const totalTrained = Number(cols[5]).toLocaleString();
                const duration = cols[6].trim();
                const status = cols[7].trim();
                const date = cols[9].trim();
                const ico = status === 'success' ? '✅' : '❌';
                text += `${ico} ${esc(date)} [${esc(trigger)}]\n`;
                text += `   ${esc(totalTrained)} decks, ${esc(partitions)} parts, ${esc(duration)}s\n`;
                if (status !== 'success' && cols[8]?.trim()) {
                    text += `   Error: ${esc(cols[8].trim().slice(0, 100))}\n`;
                }
            }
        }
        text += '</code>';
    } else {
        text += '<i>No training runs recorded yet.\nFirst pipeline run will trigger initial training.</i>';
    }

    return text;
}

function buildGrimDocker() {
    const containers = run(
        'docker ps -a --filter "name=grimoire" --format "{{.Names}}|{{.Status}}|{{.Ports}}" 2>/dev/null'
    );
    const mem = run(
        'docker stats --no-stream --format "{{.Name}}|{{.CPUPerc}}|{{.MemUsage}}" 2>/dev/null | grep grimoire'
    );

    let text =
        `<b>🐳 Docker Containers</b>\n` +
        `━━━━━━━━━━━━━━━━━━━━\n\n`;

    if (containers) {
        for (const line of containers.split('\n')) {
            const [name, status] = line.split('|');
            if (!name) continue;
            const ico = status?.includes('Up') ? '🟢' : '🔴';
            const short = name.replace('grimoire-cf-api-', '');
            text += `${ico} <b>${esc(short)}:</b> ${esc(status)}\n`;
        }
    }

    if (mem) {
        text += `\n<b>Resources:</b>\n<code>`;
        for (const line of mem.split('\n')) {
            const [name, cpu, memUsage] = line.split('|');
            if (!name) continue;
            const short = name.replace('grimoire-cf-api-', '');
            text += `${esc(short)}: CPU ${esc(cpu)}, RAM ${esc(memUsage)}\n`;
        }
        text += '</code>';
    }

    return text;
}

// ── Callback handler ──

async function handleCallback(callbackId, data, chatId, messageId) {
    if (chatId !== CHAT_ID) return;

    switch (data) {
        case 'menu':
            await answerCallback(callbackId);
            await editMessage(chatId, messageId, '<b>🖥 VPS Admin</b>\n\nChoose an action:', MAIN_MENU);
            break;

        case 'status':
            await answerCallback(callbackId, '📊 Loading...');
            await editMessage(chatId, messageId, buildStatus(), STATUS_ACTIONS);
            break;

        case 'services':
            await answerCallback(callbackId, '⚙️ Loading...');
            await editMessage(chatId, messageId, buildServices(), [
                [{ text: '🔄 Restart app', callback_data: 'restart' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'logs':
            await answerCallback(callbackId);
            await editMessage(chatId, messageId, '<b>📋 How many lines?</b>', LOGS_OPTIONS);
            break;

        case 'logs_10':
            await answerCallback(callbackId, '📋 Loading...');
            await editMessage(chatId, messageId, buildLogs(10), [
                [{ text: '30 lines', callback_data: 'logs_30' }, { text: '🔴 Errors', callback_data: 'logs_errors' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'logs_30':
            await answerCallback(callbackId, '📋 Loading...');
            await editMessage(chatId, messageId, buildLogs(30), [
                [{ text: '50 lines', callback_data: 'logs_50' }, { text: '🔴 Errors', callback_data: 'logs_errors' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'logs_50':
            await answerCallback(callbackId, '📋 Loading...');
            await editMessage(chatId, messageId, buildLogs(50), BACK_BTN);
            break;

        case 'logs_errors':
            await answerCallback(callbackId, '🔴 Loading...');
            await editMessage(chatId, messageId, buildErrorLogs(), [
                [{ text: '📋 All logs', callback_data: 'logs_30' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'nginx':
            await answerCallback(callbackId, '🌐 Loading...');
            await editMessage(chatId, messageId, buildNginx(), [
                [{ text: '🔄 Restart nginx', callback_data: 'nginx_restart' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'nginx_restart':
            await answerCallback(callbackId, '🔄 Restarting...');
            run('systemctl restart nginx');
            await editMessage(chatId, messageId, buildNginx(), BACK_BTN);
            break;

        case 'ssl':
            await answerCallback(callbackId, '🔒 Loading...');
            await editMessage(chatId, messageId, buildSsl(), BACK_BTN);
            break;

        case 'updates':
            await answerCallback(callbackId, '📦 Checking...');
            await editMessage(chatId, messageId, await buildUpdates(), [
                [{ text: '⬆️ Install updates', callback_data: 'updates_install' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'updates_install':
            await answerCallback(callbackId, '⬆️ Installing...');
            await editMessage(chatId, messageId, '<b>⬆️ Installing updates...</b>\n\nThis may take a while.', []);
            runAsync('apt upgrade -y 2>&1 | tail -15', 300000)
                .then(async (result) => {
                    await send(`<b>✅ Updates installed</b>\n\n<code>${esc(result)}</code>`, [
                        [{ text: '🔄 Reboot', callback_data: 'reboot' }, { text: '📊 Status', callback_data: 'status' }],
                        [{ text: '◀️ Menu', callback_data: 'menu' }],
                    ]);
                })
                .catch(async (err) => {
                    await send(`<b>❌ Update failed</b>\n\n<code>${esc(String(err))}</code>`, BACK_BTN);
                });
            break;

        case 'restart':
            await answerCallback(callbackId);
            await editMessage(chatId, messageId, '<b>🔄 Restart geo-scraper?</b>', RESTART_CONFIRM);
            break;

        case 'restart_confirm':
            await answerCallback(callbackId, '🔄 Restarting...');
            run('pm2 restart geo-scraper 2>&1');
            await new Promise((r) => setTimeout(r, 2000));
            const geoHealth = run('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/');
            const geoOk = geoHealth === '200' || geoHealth === '302';
            await editMessage(
                chatId,
                messageId,
                `<b>🔄 Restart</b>\n\n` +
                `${geoOk ? '✅' : '❌'} HTTP: ${esc(geoHealth)}\n` +
                `${geoOk ? 'Service is running!' : 'Problem — check logs!'}`,
                AFTER_RESTART
            );
            break;

        case 'reboot':
            await answerCallback(callbackId);
            await editMessage(chatId, messageId, '<b>⚠️ Reboot the VPS?</b>\n\nBot will be offline for ~1 min.', REBOOT_CONFIRM);
            break;

        case 'reboot_confirm':
            await answerCallback(callbackId, '⚠️ Rebooting...');
            await editMessage(chatId, messageId, '<b>⚠️ VPS rebooting...</b>\n\nBack in ~1 min.', []);
            exec('sleep 3 && reboot', { encoding: 'utf-8' });
            break;

        case 'report':
            await answerCallback(callbackId, '📈 Loading...');
            await editMessage(chatId, messageId, buildReport(), [
                [{ text: '📊 Status', callback_data: 'status' }, { text: '🔍 Scans', callback_data: 'scans' }],
                [{ text: '◀️ Menu', callback_data: 'menu' }],
            ]);
            break;

        case 'scans':
            await answerCallback(callbackId, '🔍 Loading...');
            await editMessage(chatId, messageId, buildScans(), BACK_BTN);
            break;

        // ── Grimoire callbacks ──

        case 'grimoire':
            await answerCallback(callbackId, '🃏 Loading...');
            await editMessage(chatId, messageId, buildGrimoireStatus(), GRIMOIRE_MENU);
            break;

        case 'grim_pipeline':
            await answerCallback(callbackId, '📋 Loading...');
            await editMessage(chatId, messageId, buildGrimPipelineStatus(), GRIM_PIPELINE_MENU);
            break;

        case 'grim_wlogs':
            await answerCallback(callbackId, '📋 Loading...');
            await editMessage(chatId, messageId, buildGrimWorkerLogs(), [
                [{ text: '🔄 Refresh', callback_data: 'grim_wlogs' }, { text: '🔴 Errors', callback_data: 'grim_werrors' }],
                [{ text: '◀️ Pipeline', callback_data: 'grim_pipeline' }],
            ]);
            break;

        case 'grim_werrors':
            await answerCallback(callbackId, '🔴 Loading...');
            await editMessage(chatId, messageId, buildGrimWorkerErrors(), [
                [{ text: '📋 All logs', callback_data: 'grim_wlogs' }],
                [{ text: '◀️ Pipeline', callback_data: 'grim_pipeline' }],
            ]);
            break;

        case 'grim_trigger': {
            await answerCallback(callbackId, '▶️ Triggering...');
            const triggerResult = cfApiJson('/admin/trigger-pipeline', 'POST');
            if (triggerResult?.status === 'already_running') {
                await editMessage(chatId, messageId, '<b>⚠️ Pipeline already running!</b>\n\nCheck pipeline status for progress.', [
                    [{ text: '📋 Pipeline', callback_data: 'grim_pipeline' }],
                    [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
                ]);
            } else if (triggerResult?.status === 'started') {
                await editMessage(chatId, messageId, `<b>▶️ Pipeline triggered!</b>\n\nTask ID: <code>${esc(triggerResult.task_id)}</code>\n\nCheck pipeline logs in a few minutes.`, [
                    [{ text: '📋 Pipeline', callback_data: 'grim_pipeline' }, { text: '📋 Worker logs', callback_data: 'grim_wlogs' }],
                    [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
                ]);
            } else {
                await editMessage(chatId, messageId, `<b>❌ Failed to trigger pipeline</b>\n\n<code>${esc(JSON.stringify(triggerResult))}</code>`, [
                    [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
                ]);
            }
            break;
        }

        case 'grim_decks':
            await answerCallback(callbackId, '🃏 Loading...');
            await editMessage(chatId, messageId, buildGrimDecks(), [
                [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
            ]);
            break;

        case 'grim_players':
            await answerCallback(callbackId, '👤 Loading...');
            await editMessage(chatId, messageId, buildGrimPlayers(), [
                [{ text: '🔄 Refresh', callback_data: 'grim_players' }],
                [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
            ]);
            break;

        case 'grim_training':
            await answerCallback(callbackId, '🧠 Loading...');
            await editMessage(chatId, messageId, buildGrimTraining(), [
                [{ text: '🔄 Refresh', callback_data: 'grim_training' }],
                [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
            ]);
            break;

        case 'grim_docker':
            await answerCallback(callbackId, '🐳 Loading...');
            await editMessage(chatId, messageId, buildGrimDocker(), GRIM_DOCKER_MENU);
            break;

        case 'grim_containers':
            await answerCallback(callbackId, '🐳 Loading...');
            await editMessage(chatId, messageId, buildGrimDocker(), GRIM_DOCKER_MENU);
            break;

        case 'grim_restart_api': {
            await answerCallback(callbackId, '🔄 Restarting API...');
            await editMessage(chatId, messageId, '<b>🔄 Restarting Grimoire API...</b>', []);
            const apiRestart = await runAsync(`cd ${CF_COMPOSE} && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart api 2>&1`, 60000);
            await new Promise((r) => setTimeout(r, 3000));
            const apiCheck = run(`curl -s -o /dev/null -w "%{http_code}" --max-time 5 ${CF_API}/health`);
            const apiOk = apiCheck === '200';
            await editMessage(chatId, messageId,
                `<b>🔄 API Restart</b>\n\n` +
                `${apiOk ? '✅' : '❌'} HTTP: ${esc(apiCheck)}\n` +
                `<code>${esc(apiRestart.slice(-500))}</code>`,
                GRIM_DOCKER_MENU
            );
            break;
        }

        case 'grim_restart_worker': {
            await answerCallback(callbackId, '🔄 Restarting worker...');
            await editMessage(chatId, messageId, '<b>🔄 Restarting Grimoire Worker...</b>\n\n⚠️ This will interrupt any running pipeline.', []);
            const wRestart = await runAsync(`cd ${CF_COMPOSE} && docker compose -f docker-compose.yml -f docker-compose.prod.yml restart worker 2>&1`, 60000);
            await new Promise((r) => setTimeout(r, 3000));
            const wCheck = run('docker ps --filter "name=grimoire-cf-api-worker" --format "{{.Status}}" 2>/dev/null');
            const wOk = wCheck.includes('Up');
            await editMessage(chatId, messageId,
                `<b>🔄 Worker Restart</b>\n\n` +
                `${wOk ? '✅' : '❌'} Status: ${esc(wCheck)}\n` +
                `<code>${esc(wRestart.slice(-500))}</code>`,
                GRIM_DOCKER_MENU
            );
            break;
        }

        case 'grim_restart_all_ask':
            await answerCallback(callbackId);
            await editMessage(chatId, messageId,
                '<b>⚠️ Restart ALL Grimoire containers?</b>\n\n' +
                'This will restart API, worker, Postgres, and Redis.\n' +
                'Pipeline will be interrupted. API will be down for ~30s.',
                [
                    [{ text: '✅ Yes, restart all', callback_data: 'grim_restart_all_confirm' }, { text: '❌ No', callback_data: 'grim_docker' }],
                ]
            );
            break;

        case 'grim_restart_all_confirm': {
            await answerCallback(callbackId, '⚠️ Restarting everything...');
            await editMessage(chatId, messageId, '<b>⚠️ Restarting all Grimoire containers...</b>\n\nThis will take ~30s.', []);
            const allRestart = await runAsync(
                `cd ${CF_COMPOSE} && docker compose -f docker-compose.yml -f docker-compose.prod.yml down && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d 2>&1`,
                120000
            );
            await new Promise((r) => setTimeout(r, 5000));
            const allCheck = run(`curl -s -o /dev/null -w "%{http_code}" --max-time 10 ${CF_API}/health`);
            const allOk = allCheck === '200';
            await editMessage(chatId, messageId,
                `<b>🔄 Full Restart</b>\n\n` +
                `${allOk ? '✅' : '❌'} API: HTTP ${esc(allCheck)}\n\n` +
                `<code>${esc(allRestart.slice(-800))}</code>`,
                GRIM_DOCKER_MENU
            );
            break;
        }

        default:
            await answerCallback(callbackId, 'Unknown action');
    }
}

// ── Text command handler ──

async function handleText(text, chatId) {
    if (chatId !== CHAT_ID) return;

    const [cmd, ...args] = text.trim().split(/\s+/);
    const arg = args.join(' ');

    switch (cmd) {
        case '/start':
        case '/help':
        case '/menu':
            await send('<b>🖥 VPS Admin</b>\n\nChoose an action:', MAIN_MENU);
            break;

        case '/grimoire':
        case '/grim':
            await send(buildGrimoireStatus(), GRIMOIRE_MENU);
            break;

        case '/pipeline':
            await send(buildGrimPipelineStatus(), GRIM_PIPELINE_MENU);
            break;

        case '/players':
            await send(buildGrimPlayers(), [
                [{ text: '🔄 Refresh', callback_data: 'grim_players' }],
                [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
            ]);
            break;

        case '/training':
            await send(buildGrimTraining(), [
                [{ text: '🔄 Refresh', callback_data: 'grim_training' }],
                [{ text: '◀️ Grimoire', callback_data: 'grimoire' }],
            ]);
            break;

        case '/sh':
            if (!arg) {
                await send('Usage: /sh &lt;command&gt;');
                return;
            }
            await send(`⚡ <code>${esc(arg)}</code>`);
            const output = await runAsync(arg, 30000);
            await send(`<code>${esc(output)}</code>`, BACK_BTN);
            break;

        case '/scan': {
            if (!arg) {
                await send('Usage: /scan domain.lt');
                return;
            }
            const safe = arg.replace(/'/g, '');
            const scanInfo = queryDb(`
        const jobs = db.listCompletedJobsByType('scan').filter(j => j.domain === '${safe}');
        if (!jobs.length) { console.log('No scans found for: ${safe}'); process.exit(); }
        const j = jobs[0];
        const r = JSON.parse(j.result_json || '{}');
        const s = r.score || 0;
        const g = r.grade || '?';
        const ico = s >= 80 ? '🟢' : s >= 60 ? '🟡' : '🔴';
        console.log(ico + ' ' + j.domain);
        console.log('Score: ' + s + '/100 (' + g + ')');
        console.log('Date: ' + (j.completed_at || '?'));
        console.log('Pages: ' + (r.pages?.length || '?'));
      `);
            await send(`<b>🔍 Scan</b>\n\n${esc(scanInfo)}`, BACK_BTN);
            break;
        }

        default:
            if (text.startsWith('/')) {
                await send('Unknown command. Try /help, /grimoire, /pipeline, /players, /training', MAIN_MENU);
            } else {
                await send('<b>🖥 VPS Admin</b>\n\nChoose an action:', MAIN_MENU);
            }
    }
}

// ── Morning report ──

async function sendMorningReport() {
    await send(buildReport(), [
        [{ text: '📊 Status', callback_data: 'status' }, { text: '🃏 Grimoire', callback_data: 'grimoire' }],
        [{ text: '📋 Logs', callback_data: 'logs' }, { text: '📦 Updates', callback_data: 'updates' }],
    ]);
}

function scheduleMorningReport() {
    const check = () => {
        const now = new Date();
        const vilnius = new Date(now.toLocaleString('en-US', { timeZone: 'Europe/Vilnius' }));
        if (vilnius.getHours() === 8 && vilnius.getMinutes() === 0) {
            sendMorningReport().catch(console.error);
        }
    };
    setInterval(check, 60_000);
}

// ── Grimoire hourly status ──

const GRIMOIRE_STATE = '/tmp/grimoire_tg_state.json';

function loadGrimoireState() {
    try {
        return JSON.parse(readFileSync(GRIMOIRE_STATE, 'utf-8'));
    } catch {
        return {};
    }
}

function saveGrimoireState(state) {
    try {
        writeFileSync(GRIMOIRE_STATE, JSON.stringify(state));
    } catch {}
}

async function sendOrEditGrimoireStatus(existingMessageId) {
    const text = buildGrimoireStatus();
    if (existingMessageId) {
        try {
            await editMessage(CHAT_ID, existingMessageId, text, GRIMOIRE_MENU);
            return existingMessageId;
        } catch {}
    }
    const result = await send(text, GRIMOIRE_MENU);
    return result?.result?.message_id;
}

function scheduleHourlyGrimoireStatus() {
    const runHourly = async () => {
        const state = loadGrimoireState();
        const msgId = await sendOrEditGrimoireStatus(state.messageId);
        if (msgId) saveGrimoireState({ messageId: msgId });
    };
    const now = new Date();
    const msToNextHour = (60 - now.getMinutes()) * 60_000 - now.getSeconds() * 1000;
    setTimeout(() => {
        runHourly().catch(console.error);
        setInterval(() => runHourly().catch(console.error), 60 * 60_000);
    }, msToNextHour);
}

// ── Long polling ──

async function poll() {
    while (true) {
        try {
            const res = await fetch(
                `${API}/getUpdates?offset=${offset}&timeout=30&allowed_updates=["message","callback_query"]`,
                { signal: AbortSignal.timeout(35000) }
            );
            const data = await res.json();
            if (data.ok && data.result.length > 0) {
                for (const update of data.result) {
                    offset = update.update_id + 1;
                    if (update.callback_query) {
                        const cb = update.callback_query;
                        handleCallback(cb.id, cb.data, String(cb.message?.chat?.id || CHAT_ID), cb.message?.message_id).catch(console.error);
                        continue;
                    }
                    const msg = update.message;
                    if (msg?.text && msg?.chat?.id) {
                        handleText(msg.text, String(msg.chat.id)).catch(console.error);
                    }
                }
            }
        } catch (e) {
            if (e.name !== 'TimeoutError') {
                console.error('Poll error:', e.message);
                await new Promise((r) => setTimeout(r, 5000));
            }
        }
    }
}

// ── Start ──

console.log('🤖 Telegram admin bot starting...');

// Notify on startup
const startUptime = run('uptime -p');
const startHealth = run('curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3000/');
const startOk = startHealth === '200' || startHealth === '302';
const cfStartHealth = cfApiJson('/health');
const cfStartOk = cfStartHealth != null;

send(
    `<b>🟢 VPS bot restarted</b>\n\n` +
    `⏱ ${esc(startUptime)}\n` +
    `${startOk ? '✅' : '❌'} geo-scraper: HTTP ${esc(startHealth)}\n` +
    `${cfStartOk ? '✅' : '❌'} grimoire: ${cfStartOk ? Number(cfStartHealth.deck_count).toLocaleString() + ' decks' : 'unreachable'}`,
    MAIN_MENU
).catch(console.error);

scheduleMorningReport();
scheduleHourlyGrimoireStatus();
poll();
