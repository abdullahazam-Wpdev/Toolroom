import contextlib
import importlib.util
import io
from pathlib import Path
import subprocess
import unittest
from unittest.mock import patch

spec = importlib.util.spec_from_file_location('secure_status', Path(__file__).parents[1] / 'scripts/backend/secure-migration-status.py')
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class SecureStatusTests(unittest.TestCase):
    def test_identity_tls_and_direct_host_are_required(self):
        fixture = 'postgres://test-user:test-only@db.prisma.io:5432/postgres?sslmode=require'
        self.assertTrue(module.valid_target(fixture, 'test-user', 'postgres'))
        self.assertFalse(module.valid_target(fixture, 'other-user', 'postgres'))
        self.assertFalse(module.valid_target(fixture.replace('db.prisma.io', 'pooled.db.prisma.io'), 'test-user', 'postgres'))
        self.assertFalse(module.valid_target(fixture.replace('sslmode=require', 'sslmode=disable'), 'test-user', 'postgres'))
        self.assertFalse(module.valid_target('[SENSITIVE]', 'test-user', 'postgres'))

    def test_failed_identity_check_prevents_status(self):
        out = io.StringIO()
        with patch.object(module.shutil, 'which', return_value='/test/node'), patch.object(module.subprocess, 'run', return_value=subprocess.CompletedProcess([], 3, b'private-value', b'private-error')) as run, contextlib.redirect_stdout(out):
            self.assertEqual(module.run_status('private-connection', 'user', 'db'), 2)
        self.assertEqual(run.call_count, 1)
        self.assertNotIn('private-value', out.getvalue())
        self.assertNotIn('private-connection', out.getvalue())

    def test_only_status_runs_after_verified_read(self):
        out = io.StringIO()
        results = [subprocess.CompletedProcess([], 0, b'', b''), subprocess.CompletedProcess([], 0, b'Database schema is up to date\nprivate-connection', b'')]
        with patch.object(module.shutil, 'which', return_value='/test/node'), patch.object(module.subprocess, 'run', side_effect=results) as run, contextlib.redirect_stdout(out):
            self.assertEqual(module.run_status('private-connection', 'user', 'db'), 0)
        command = run.call_args_list[1].args[0]
        self.assertEqual(command[-4:], ['migrate', 'status', '--schema', 'infra/schema.prisma'])
        self.assertNotIn('private-connection', out.getvalue())
        self.assertNotIn('private-connection', ' '.join(command))
        self.assertIn('up to date', out.getvalue())

    def test_timeout_does_not_dump_provider_errors(self):
        out = io.StringIO()
        with patch.object(module.shutil, 'which', return_value='/test/node'), patch.object(module.subprocess, 'run', side_effect=subprocess.TimeoutExpired('node', 45, output=b'private-value')), contextlib.redirect_stdout(out):
            self.assertEqual(module.run_status('private-connection', 'user', 'db'), 2)
        self.assertNotIn('private-value', out.getvalue())


if __name__ == '__main__':
    unittest.main()
