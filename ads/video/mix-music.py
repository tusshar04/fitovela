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
        'output': 'fitovela-types-en-iktara-v2.mp4',
        'duration': 15.0,
        'source_start': 69.6332,
        'tempo': 0.935,
        'loudness_lufs': -21,
        'fade_in': 0.06,
        'sync': [
            {'video_s': 0.0, 'cue': 'Chorus excerpt, slightly slower with original pitch'},
            {'video_s': 3.9209, 'cue': 'Percussion near first card entering at 3.9s'},
            {'video_s': 5.4979, 'cue': 'Percussion near second card entering at 5.5s'},
            {'video_s': 7.0935, 'cue': 'Percussion near third card entering at 7.1s'},
            {'video_s': 11.5387, 'cue': 'Beat during purple outro reveal'},
            {'video_s': 12.5384, 'cue': 'Percussion near CTA entering at 12.6s'},
        ],
    },
    {
        'video': 'fitovela-tried-en.mp4',
        'video_sha256': 'cceb60b20b0613f9ea73f8abd6c2c10d6ce1f6411ed110c4cf02b01ee139f91b',
        'music': 'Love You Zindagi Full Video - Dear Zindagi Alia Bhatt Shah Rukh Khan Jasleen Royal Amit T.mp3',
        'music_sha256': 'f5ae91db970e813530d0355d678cf76ea62e8666c4d3c6ebe0befd9a62967c6e',
        'output': 'fitovela-tried-en-love-you-zindagi-v2.mp4',
        'duration': 15.5,
        'source_start': 53.6906,
        'tempo': 1.0,
        'loudness_lufs': -18,
        'fade_in': 0.35,
        'sync': [
            {'video_s': 0.0, 'cue': 'Farewell phrase under crossed-out attempts'},
            {'video_s': 5.6694, 'cue': 'ASR-estimated title refrain begins'},
            {'video_s': 5.7, 'cue': 'Chorus percussion onset at reassurance scene'},
            {'video_s': 8.3412, 'cue': 'Beat near hidden-causes scene at 8.4s'},
            {'video_s': 13.0549, 'cue': 'Beat near CTA appearing at 13.1s'},
            {'video_s': 15.5, 'cue': 'Continuous chorus through final frame; no fading tail'},
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
    # Give atempo spare samples, then trim to the exact video duration. Only
    # the final 5ms is de-clicked: music stays at full level through the ending.
    source_end = cut['source_start'] + duration * cut['tempo'] + 0.5
    return (
        f"[1:a]atrim=start={cut['source_start']}:end={source_end},"
        f"asetpts=PTS-STARTPTS,aresample=48000,atempo={cut['tempo']},"
        f"atrim=duration={duration},afade=t=in:st=0:d={cut['fade_in']},"
        f'afade=t=out:st={duration - 0.005}:d=0.005[bed]'
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
        # Iktara is 3 LU quieter on the founder's revision; Zindagi keeps its
        # original target. Tempo changes preserve pitch.
        target = cut['loudness_lufs']
        measurement = run(inputs + ['-filter_complex', graph + f';[bed]loudnorm=I={target}:TP=-1.5:LRA=11:print_format=json[measured]', '-map', '[measured]', '-f', 'null', '-'])
        measured = json.loads(re.findall(r'\{[^{}]+\}', measurement.stderr)[-1])
        normalize = (
            f'loudnorm=I={target}:TP=-1.5:LRA=11:'
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
    (out / 'music-mix-manifest-v2.json').write_text(json.dumps(report, indent=2) + '\n')


if __name__ == '__main__':
    main()
