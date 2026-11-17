#!/usr/bin/env python3
"""Create Fitovela's reporting schedules after a reviewed deployment.

Default is inspect/dry run. --apply writes only the two named Fitovela jobs.
Secrets are read from Secret Manager into memory, never argv or stdout.
No campaign mutation or payment action is performed.
"""
import argparse
import json
import subprocess
import urllib.error
import urllib.request

PROJECT = 'fitovela-prod'
REGION = 'asia-south1'
BASE = f'https://cloudscheduler.googleapis.com/v1/projects/{PROJECT}/locations/{REGION}/jobs'
JOBS = [('fitovela-hourly-report', '5 * * * *', 'report'),
        ('fitovela-order-alert-recovery', '*/5 * * * *', 'notifications')]

def gcloud(*args):
    return subprocess.run(['gcloud', *args], check=True, text=True, capture_output=True).stdout.strip()

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    access = gcloud('auth', 'print-access-token')
    secret = gcloud('secrets', 'versions', 'access', 'latest', '--secret=ops-report-secret', f'--project={PROJECT}')

    def call(url, method='GET', data=None):
        req = urllib.request.Request(url, method=method, data=json.dumps(data).encode() if data is not None else None,
            headers={'Authorization': f'Bearer {access}', 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(req, timeout=25) as response: return json.load(response)
        except urllib.error.HTTPError as err:
            if err.code == 404: return None
            raise RuntimeError(f'Scheduler request failed: HTTP {err.code}') from None

    for name, schedule, endpoint in JOBS:
        url = f'{BASE}/{name}'
        current = call(url)
        target = f'https://fitovela.com/api/ops/{endpoint}'
        spec = {
            'name': f'projects/{PROJECT}/locations/{REGION}/jobs/{name}',
            'description': 'Fitovela reporting only; never changes advertising delivery.',
            'schedule': schedule, 'timeZone': 'Asia/Kolkata', 'attemptDeadline': '180s',
            'retryConfig': {'retryCount': 2, 'minBackoffDuration': '60s', 'maxBackoffDuration': '300s'},
            'httpTarget': {'uri': target, 'httpMethod': 'POST', 'body': 'e30=',
                           'headers': {'Content-Type': 'application/json', 'Authorization': f'Bearer {secret}'}}
        }
        print(f'{name}: {schedule} Asia/Kolkata → {target}; existing={current is not None}')
        if not args.apply: continue
        if current:
            if current.get('httpTarget', {}).get('uri') != target:
                raise RuntimeError('Existing scheduler target differs; refusing overwrite')
            result = call(url + '?updateMask=description,schedule,timeZone,attemptDeadline,retryConfig,httpTarget', 'PATCH', spec)
        else:
            result = call(BASE, 'POST', spec)
        verified = call(url)
        if not result or verified.get('schedule') != schedule or verified.get('timeZone') != 'Asia/Kolkata' or verified.get('httpTarget', {}).get('uri') != target:
            raise RuntimeError('Scheduler verification failed')
        print(f'{name}: verified {verified.get("state")}')

if __name__ == '__main__':
    main()
