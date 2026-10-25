"""Rebuild reports from frozen results without network calls or source writes."""
import json
from pathlib import Path
import shutil
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[2]


@pytest.mark.parametrize('script,metrics,report', [
    ('report.py', 'metrics.json', 'report.md'),
    ('live-report.py', 'live-metrics.json', 'live-report.md'),
])
def test_reports_reproduce_recorded_metrics(tmp_path, script, metrics, report):
    evaluation = tmp_path / 'evaluation'
    evaluation.mkdir()
    for source in (ROOT / 'evaluation').glob('*.json'):
        shutil.copy2(source, evaluation / source.name)
    shutil.copy2(ROOT / 'evaluation' / script, evaluation / script)
    (tmp_path / 'data').mkdir()
    shutil.copy2(ROOT / 'data/corpus.json', tmp_path / 'data/corpus.json')
    expected = json.loads((evaluation / metrics).read_text())
    (evaluation / metrics).unlink()

    result = subprocess.run(
        [sys.executable, str(evaluation / script)], cwd=tmp_path,
        capture_output=True, text=True, timeout=30,
    )

    assert result.returncode == 0, result.stderr
    assert json.loads((evaluation / metrics).read_text()) == expected
    rendered = (evaluation / report).read_text()
    assert rendered.startswith('# ')
    assert 'Q01' in rendered and 'Q20' in rendered
    assert (evaluation / report.replace('.md', '.txt')).read_text() == rendered
