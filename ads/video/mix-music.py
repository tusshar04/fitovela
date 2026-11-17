#!/usr/bin/env python3
"""Create the two approved local music versions without altering video frames.

Usage: python3 ads/video/mix-music.py --video-dir /path/to/ads/video/out \
    --music-dir '/Users/tushar/Desktop/new songs'

Requires ffmpeg/ffprobe. Source recordings and rendered MP4s are not committed.
Timing applies only to the SHA-256-pinned recordings/video renders below.
"""

import argparse
import hashlib
import json
from pathlib import Path
import re
import subprocess


CUTS = [
    {
        'video': 'fitovela-types-en.mp4',
        'video_sha256': '9439cdaf9958cb32468a720020d61e6da380bf2421c7a55d2f8113f2342c2929',
        'music': 'Iktara Lyric Video - Wake Up Sid Ranbir Kapoor, Konkona Sen Sharma Kavita Seth Amit Trivedi.mp3',
        'music_sha256': '90f5264fcd8ef9a94c99caa6ba52feb8c8f9d5ab2c1cdab93598e0ac564014bf',
        'output': 'fitovela-types-en-iktara.mp4',
        'duration': 15.0,
        'source_start': 69.5318,
        'source_end': 84.5318,
        'tail': False,
        'sync': [
            {'video_s': 0.0, 'cue': 'First chorus / percussion onset'},
            {'video_s': 4.1215, 'cue': 'Percussion during first card reveal'},
            {'video_s': 5.625, 'cue': 'Percussion during second card reveal'},
            {'video_s': 7.1343, 'cue': 'Percussion during third card reveal'},
            {'video_s': 11.2559, 'cue': 'Beat aligns with purple outro entering at 11.25s'},
            {'video_s': 13.1309, 'cue': 'Beat as CTA finishes appearing'},
        ],
    },
    {
        'video': 'fitovela-tried-en.mp4',
        'video_sha256': 'cceb60b20b0613f9ea73f8abd6c2c10d6ce1f6411ed110c4cf02b01ee139f91b',
        'music': 'Love You Zindagi Full Video - Dear Zindagi Alia Bhatt Shah Rukh Khan Jasleen Royal Amit T.mp3',
        'music_sha256': 'f5ae91db970e813530d0355d678cf76ea62e8666c4d3c6ebe0befd9a62967c6e',
        'output': 'fitovela-tried-en-love-you-zindagi.mp4',
        'duration': 15.5,
        'source_start': 53.6906,
        'source_end': 67.58,
        'tail': True,
        'sync': [
            {'video_s': 0.0, 'cue': 'Farewell phrase under crossed-out attempts'},
            {'video_s': 5.6694, 'cue': 'ASR-estimated title refrain begins'},
            {'video_s': 5.7, 'cue': 'Chorus percussion onset at reassurance scene'},
            {'video_s': 8.3412, 'cue': 'Beat near hidden-causes scene at 8.4s'},
            {'video_s': 13.0549, 'cue': 'Beat near CTA appearing at 13.1s'},
            {'video_s': 13.8894, 'cue': 'End after second complete refrain, before third; fading tail follows'},
        ],
    },
]


def run(args):
    return subprocess.run(args, check=True, capture_output=True, text=True)


def digest(path):
    with path.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()


def probe(path):
    return json.loads(run(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(path)]).stdout)


def audio_graph(cut):
    duration = cut['duration']
    length = cut['source_end'] - cut['source_start']
    graph = (
        f"[1:a]atrim=start={cut['source_start']}:end={cut['source_end']},"
        f"asetpts=PTS-STARTPTS,aresample=48000,afade=t=in:st=0:d={0.35 if cut['tail'] else 0.06}"
    )
    if not cut['tail']:
        return graph + f',afade=t=out:st={duration - 0.55}:d=0.55[bed]'
    # Preserve the whole second refrain. Only its last 650ms feeds a quiet
    # decaying tail; no third lyric is started or chopped at the end of the ad.
    send_start = length - 0.65
    return graph + (
        '[base];[base]asplit=2[dry][send];'
        f'[dry]afade=t=out:st={length - 0.3}:d=0.3[d];'
        f'[send]atrim=start={send_start},asetpts=PTS-STARTPTS,'
        'afade=t=in:st=0:d=0.12,'
        'aecho=0.8:0.8:120|240|400|700|1050|1500:0.6|0.42|0.3|0.21|0.14|0.08,'
        f'adelay={round(send_start * 1000)}:all=1[w];'
        '[d][w]amix=inputs=2:weights=1 0.7:normalize=0:duration=longest,'
        f'apad,atrim=duration={duration},afade=t=out:st={duration - 0.75}:d=0.75[bed]'
    )


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--video-dir', type=Path, default=Path(__file__).parent / 'out')
    parser.add_argument('--music-dir', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path)
    args = parser.parse_args()
    out = args.output_dir or args.video_dir
    out.mkdir(parents=True, exist_ok=True)
    report = []
    for cut in CUTS:
        video, music = args.video_dir / cut['video'], args.music_dir / cut['music']
        dest = out / cut['output']
        if dest.exists():
            raise SystemExit(f'Output already exists; refusing to overwrite: {dest}')
        for path, expected in [(video, cut['video_sha256']), (music, cut['music_sha256'])]:
            if digest(path) != expected:
                raise SystemExit(f'Source changed; recheck timing before mixing: {path}')
        graph = audio_graph(cut)
        inputs = ['ffmpeg', '-hide_banner', '-nostdin', '-i', str(video), '-i', str(music)]
        # Two-pass loudness normalization keeps both music beds at the same
        # perceived level with true-peak headroom, without changing song pitch.
        measurement = run(inputs + ['-filter_complex', graph + ';[bed]loudnorm=I=-18:TP=-1.5:LRA=11:print_format=json[measured]', '-map', '[measured]', '-f', 'null', '-'])
        measured = json.loads(re.findall(r'\{[^{}]+\}', measurement.stderr)[-1])
        normalize = (
            'loudnorm=I=-18:TP=-1.5:LRA=11:'
            f"measured_I={measured['input_i']}:measured_TP={measured['input_tp']}:"
            f"measured_LRA={measured['input_lra']}:measured_thresh={measured['input_thresh']}:"
            f"offset={measured['target_offset']}:linear=true:print_format=summary"
        )
        result = run(inputs + ['-filter_complex', graph + f';[bed]{normalize},aresample=48000[a]', '-map', '0:v:0', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ac', '2', '-t', str(cut['duration']), '-map_metadata', '-1', '-movflags', '+faststart', str(dest)])
        meta = probe(dest)
        streams = meta['streams']
        v = next(s for s in streams if s['codec_type'] == 'video')
        a = next(s for s in streams if s['codec_type'] == 'audio')
        assert (v['width'], v['height'], v['r_frame_rate']) == (1080, 1920, '30/1')
        assert abs(float(meta['format']['duration']) - cut['duration']) < 0.04
        assert a['codec_name'] == 'aac' and a['channels'] == 2
        report.append({**cut, 'output_sha256': digest(dest), 'audio_measurement': measured, 'validation': {'video': '1080x1920, 30fps, stream copied', 'audio': 'AAC stereo 48kHz', 'duration_s': float(meta['format']['duration'])}, 'normalization_log': result.stderr.split('Output Integrated:')[-1].strip()})
        print(dest, flush=True)
    (out / 'music-mix-manifest.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
