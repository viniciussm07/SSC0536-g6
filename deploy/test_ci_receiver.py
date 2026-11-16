"""Testes isolados do receptor SSH; não acessam Docker, rede ou banco."""
import io
import os
from pathlib import Path
import subprocess
import tarfile
import tempfile
import unittest


class ReceiverTest(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.app = self.root / 'oto'
        (self.app / 'deploy' / 'backups').mkdir(parents=True)
        (self.app / 'deploy' / '.env').write_text('segredo existente')
        self.operations = self.root / 'operations'
        self.command = '''#!/bin/bash
set -eu
printf '%s\\n' "$1" >> "$OPERATIONS"
if [[ "$1" == backup && "${FAIL_BACKUP:-}" == 1 ]]; then exit 1; fi
'''
        (self.app / 'deploy' / 'oto.sh').write_text(self.command)
        binary = self.root / 'bin'
        binary.mkdir()
        # macOS não fornece flock; este teste verifica fluxo sequencial.
        for name in ['curl', 'flock']:
            target = binary / name
            target.write_text('#!/bin/sh\nexit 0\n')
            target.chmod(0o700)
        self.env = {**os.environ, 'PATH': f'{binary}:{os.environ["PATH"]}',
                    'OPERATIONS': str(self.operations)}
        source = Path(__file__).with_name('ci-receiver.sh').read_text()
        source = source.replace('/opt/oto', str(self.app)).replace(
            '/var/lock/oto-deploy.lock', str(self.root / 'lock'))
        self.script = self.root / 'receiver.sh'
        self.script.write_text(source)

    def archive(self, extra=None):
        stream = io.BytesIO()
        entries = {'deploy/oto.sh': self.command, 'deploy/compose.yaml': 'services: {}'}
        entries.update(extra or {})
        with tarfile.open(fileobj=stream, mode='w') as archive:
            for name, text in entries.items():
                item = tarfile.TarInfo(name)
                data = text.encode()
                item.size = len(data)
                archive.addfile(item, io.BytesIO(data))
        return stream.getvalue()

    def run_receiver(self, command, payload=b'', **env):
        return subprocess.run(['bash', str(self.script)], input=payload,
                              env={**self.env, 'SSH_ORIGINAL_COMMAND': command, **env},
                              capture_output=True)

    def test_only_expected_commands(self):
        self.assertEqual(self.run_receiver('check').returncode, 0)
        for command in ['bash', 'deploy main', 'deploy ' + 'a' * 40 + '; id']:
            self.assertNotEqual(self.run_receiver(command).returncode, 0)
        self.assertFalse(self.operations.exists())

    def test_release_backup_order_retry_and_preservation(self):
        sha = 'a' * 40
        for _ in range(2):
            result = self.run_receiver(f'deploy {sha}', self.archive())
            self.assertEqual(result.returncode, 0, result.stderr.decode())
        self.assertEqual(self.operations.read_text().splitlines(), ['backup', 'up'] * 2)
        self.assertEqual((self.app / 'current-release').read_text().strip(), sha)
        self.assertEqual((self.app / 'deploy' / '.env').read_text(), 'segredo existente')
        self.assertTrue((self.app / 'current').is_symlink())
        self.assertEqual(len(list((self.app / 'releases').iterdir())), 2)

    def test_backup_failure_prevents_deploy(self):
        result = self.run_receiver('deploy ' + 'b' * 40, self.archive(), FAIL_BACKUP='1')
        self.assertNotEqual(result.returncode, 0)
        self.assertEqual(self.operations.read_text().splitlines(), ['backup'])
        self.assertFalse((self.app / 'current-release').exists())

    def test_rejects_traversal_and_secrets(self):
        for name in ['../escape', '/tmp/escape', 'deploy/.env', 'deploy/.env.secret']:
            result = self.run_receiver('deploy ' + 'c' * 40, self.archive({name: 'x'}))
            self.assertNotEqual(result.returncode, 0, name)
        self.assertFalse(self.operations.exists())

    def test_rejects_symlinks(self):
        stream = io.BytesIO()
        with tarfile.open(fileobj=stream, mode='w') as archive:
            item = tarfile.TarInfo('link')
            item.type = tarfile.SYMTYPE
            item.linkname = '/etc'
            archive.addfile(item)
        result = self.run_receiver('deploy ' + 'd' * 40, stream.getvalue())
        self.assertNotEqual(result.returncode, 0)
        self.assertFalse(self.operations.exists())


if __name__ == '__main__':
    unittest.main()
