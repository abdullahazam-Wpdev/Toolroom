#!/usr/bin/env python3
"""Interactive, read-only Prisma 6 status check. Secrets never written or echoed."""
import getpass
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import warnings
from urllib.parse import parse_qs, unquote, urlsplit

ROOT = Path(__file__).resolve().parents[2]


def valid_target(value, expected_user, expected_database):
    try:
        url = urlsplit(value)
        return (
            url.scheme in ('postgres', 'postgresql')
            and url.hostname == 'db.prisma.io'
            and url.port in (None, 5432)
            and bool(url.password)
            and not url.fragment
            and unquote(url.username or '') == expected_user
            and unquote(url.path.lstrip('/')) == expected_database
            and parse_qs(url.query).get('sslmode') == ['require']
            and '[sensitive]' not in value.lower()
            and 'placeholder' not in value.lower()
        )
    except ValueError:
        return False


def run_status(value, expected_user, expected_database):
    node = shutil.which('node')
    if not node:
        print('Node.js 24 must be on PATH. No connection attempted.')
        return 2
    # Do not inherit debug/tracing/config override flags or unrelated credentials.
    env = {key: os.environ[key] for key in ('PATH', 'HOME', 'LANG', 'TMPDIR') if key in os.environ}
    env.update(DATABASE_URL=value, EXPECTED_DB_USER=expected_user,
               EXPECTED_DB_NAME=expected_database, PRISMA_HIDE_UPDATE_MESSAGE='true')
    check = '''
const {PrismaClient}=require('@prisma/client');
const db=new PrismaClient({log:[]});
(async()=>{try{
 const rows=await db.$queryRaw`SELECT current_user AS identity, current_database() AS name`;
 const matched=rows.length===1 && rows[0].identity===process.env.EXPECTED_DB_USER && rows[0].name===process.env.EXPECTED_DB_NAME;
 process.exitCode=matched?0:3;
}catch{process.exitCode=2;}finally{await db.$disconnect();}})();
'''
    try:
        verified = subprocess.run([node, '-e', check], cwd=ROOT, env=env,
                                  capture_output=True, timeout=45)
        if verified.returncode != 0:
            print('Authenticated target verification failed or did not match the dashboard identity. Status not run; raw output withheld.')
            return 2
        print('Authenticated SELECT succeeded; database/user match your dashboard entries.')
        status = subprocess.run([node, str(ROOT / 'node_modules/prisma/build/index.js'),
                                 'migrate', 'status', '--schema', 'infra/schema.prisma'],
                                cwd=ROOT, env=env, capture_output=True, timeout=60)
        # Summarize only known status messages and local migration names. Never
        # echo raw errors, hosts, roles, connection URLs or provider output.
        output = (status.stdout + status.stderr).decode('utf-8', errors='replace')
        print('Prisma migrate status exit:', status.returncode)
        print('Migration status:', 'up to date' if 'Database schema is up to date' in output
              else 'review required (pending/missing/divergent/failed history or a status-check error)')
        section = output.split('Following migration', 1)[-1] if 'Following migration' in output else ''
        names = [p.name for p in (ROOT / 'infra/migrations').iterdir()
                 if p.is_dir() and re.fullmatch(r'\d+_[A-Za-z0-9_]+', p.name)]
        for name in sorted(names):
            if name in section:
                print('Migration referenced by status:', name)
        print('No migrations were applied. No connection details or raw logs were saved.')
        return status.returncode
    except (OSError, subprocess.TimeoutExpired):
        print('Read-only check failed or timed out. Details withheld to protect credentials.')
        return 2


def main():
    if not sys.stdin.isatty():
        print('Run from your own interactive terminal. No credentials accepted over redirected stdin.')
        return 2
    if input('Confirm the dashboard resource prisma-postgres-carmine-island is connected to norax1/toolroom Production (type production): ').strip() != 'production':
        print('Stopped. No connection attempted.')
        return 2
    # Fail closed rather than falling back to echoed input when TTY control fails.
    warnings.simplefilter('error', getpass.GetPassWarning)
    try:
        expected_user = getpass.getpass('Database user from that dashboard (hidden): ')
        expected_database = getpass.getpass('Database name from that dashboard (hidden): ')
        value = getpass.getpass('Paste its generated DIRECT PostgreSQL URL (hidden): ')
    except (getpass.GetPassWarning, EOFError, KeyboardInterrupt):
        print('\nStopped. Secure terminal input unavailable.')
        return 2
    if not expected_user or not expected_database or not valid_target(value, expected_user, expected_database):
        print('URL/identity/TLS validation failed. Copy the direct URL unchanged from the confirmed database; no connection attempted.')
        return 2
    return run_status(value, expected_user, expected_database)


if __name__ == '__main__':
    sys.exit(main())
