"""Gera a trilha do loop (16 s, 120 BPM, 8 compassos) e os sons de interface.

Tudo sintetizado aqui, sem amostras externas. Saída: assets/audio/mix.wav.
O loop é renderizado duas vezes e guardamos a segunda volta, para que caudas
de reverb e sons que atravessam o fim entrem no começo: o loop fecha sem emenda.
Os sons de interface são posicionados pelo pico medido de cada som.
Uso: python -I scripts/make_audio.py <pasta-do-projeto>
"""
import json
import sys
import wave
from pathlib import Path

import numpy as np

SR = 48000
BPM = 120
BEAT = 60 / BPM
LOOP = 16.0
N = int(SR * LOOP)
rng = np.random.default_rng(7)


def t_axis(dur):
    return np.arange(int(SR * dur)) / SR


def env_exp(dur, decay, attack=0.002):
    t = t_axis(dur)
    a = np.clip(t / attack, 0, 1)
    return a * np.exp(-t / decay)


def note_hz(midi):
    return 440.0 * 2 ** ((midi - 69) / 12)


def lowpass(x, cutoff):
    # one-pole, enough for taming noise and bass harmonics
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    return y


def highpass(x, cutoff):
    return x - lowpass(x, cutoff)


def bandpass(x, lo, hi):
    return lowpass(highpass(x, lo), hi)


# ---------- instrumentos ----------
def kick():
    t = t_axis(0.45)
    f = 45 + 85 * np.exp(-t / 0.045)
    phase = 2 * np.pi * np.cumsum(f) / SR
    body = np.sin(phase) * env_exp(0.45, 0.16, 0.001)
    click = highpass(rng.standard_normal(len(t)), 3000) * env_exp(0.45, 0.004) * 0.25
    return np.tanh(1.6 * (body + click)) * 0.9


def clap():
    t = t_axis(0.35)
    noise = bandpass(rng.standard_normal(len(t)), 900, 3200)
    e = np.zeros(len(t))
    for off in (0.0, 0.011, 0.022):
        i = int(off * SR)
        burst = env_exp(0.35, 0.012 if off < 0.02 else 0.09, 0.0008)[: len(t) - i]
        e[i:] += burst
    return noise * e * 0.55


def hat(open_=False):
    dur = 0.3 if open_ else 0.08
    n = highpass(rng.standard_normal(int(SR * dur)), 7000)
    return n * env_exp(dur, 0.09 if open_ else 0.018, 0.0005) * (0.22 if open_ else 0.16)


def shaker():
    n = bandpass(rng.standard_normal(int(SR * 0.07)), 5000, 11000)
    return n * env_exp(0.07, 0.02, 0.006) * 0.07


def ep(midi, dur=1.2, vel=1.0):
    """Piano elétrico em FM: portadora e moduladora 1:1, índice que cai."""
    t = t_axis(dur)
    f = note_hz(midi)
    index = 1.8 * np.exp(-t / 0.25) + 0.25
    mod = np.sin(2 * np.pi * f * t) * index
    tone = np.sin(2 * np.pi * f * t + mod) + 0.25 * np.sin(2 * np.pi * 2 * f * t) * np.exp(-t / 0.15)
    trem = 1 + 0.06 * np.sin(2 * np.pi * 4.5 * t)
    return tone * env_exp(dur, 0.55, 0.004) * trem * 0.11 * vel


def bass(midi, dur):
    t = t_axis(dur)
    f = note_hz(midi)
    tone = np.sin(2 * np.pi * f * t) + 0.35 * np.sin(2 * np.pi * 2 * f * t) + 0.12 * np.sin(2 * np.pi * 3 * f * t)
    e = np.clip(t / 0.006, 0, 1) * np.exp(-t / 0.5) * np.clip((dur - t) / 0.03, 0, 1)
    return np.tanh(1.3 * tone) * e * 0.32


def bell(midi, dur=0.9, vel=1.0):
    t = t_axis(dur)
    f = note_hz(midi)
    tone = np.sin(2 * np.pi * f * t + 0.9 * np.exp(-t / 0.08) * np.sin(2 * np.pi * 3.5 * f * t))
    return tone * env_exp(dur, 0.32, 0.002) * 0.07 * vel


def pad(midis, dur):
    t = t_axis(dur)
    out = np.zeros(len(t))
    for m in midis:
        for det in (-0.07, 0.07):
            out += np.sin(2 * np.pi * note_hz(m + det) * t)
    e = np.clip(t / 0.4, 0, 1) * np.clip((dur - t) / 0.5, 0, 1)
    return lowpass(out, 1400) * e * 0.012


# ---------- sons de interface ----------
def sfx_tap():
    t = t_axis(0.09)
    body = np.sin(2 * np.pi * 1850 * t) * env_exp(0.09, 0.012, 0.0005)
    tick = highpass(rng.standard_normal(len(t)), 4000) * env_exp(0.09, 0.003, 0.0003)
    return (body * 0.5 + tick * 0.35) * 0.55


def sfx_release():
    return sfx_tap() * 0.45


def sfx_type():
    t = t_axis(0.03)
    return highpass(rng.standard_normal(len(t)), 2500) * env_exp(0.03, 0.004, 0.0003) * 0.12


def sfx_swish():
    t = t_axis(0.32)
    n = rng.standard_normal(len(t))
    shape = np.sin(np.pi * np.clip(t / 0.3, 0, 1)) ** 2
    return bandpass(n, 500, 2600) * shape * 0.07


def sfx_toggle():
    a = sfx_tap()
    t = t_axis(0.12)
    b = np.sin(2 * np.pi * 2600 * t) * env_exp(0.12, 0.02, 0.0005) * 0.25
    out = np.zeros(int(SR * 0.16))
    out[: len(a)] += a
    out[int(0.035 * SR): int(0.035 * SR) + len(b)] += b
    return out


def sfx_stamp():
    t = t_axis(0.6)
    f = 52 + 70 * np.exp(-t / 0.03)
    thump = np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(0.6, 0.14, 0.0008)
    slap = bandpass(rng.standard_normal(len(t)), 300, 2500) * env_exp(0.6, 0.02, 0.0005)
    return np.tanh(2.2 * (thump * 0.9 + slap * 0.5)) * 0.85


def sfx_ding():
    t = t_axis(1.0)
    tone = np.sin(2 * np.pi * 1318.5 * t) + 0.5 * np.sin(2 * np.pi * 1975.5 * t)
    return tone * env_exp(1.0, 0.28, 0.002) * 0.16


def sfx_pop():
    t = t_axis(0.12)
    f = 600 + 900 * np.exp(-t / 0.02)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(0.12, 0.03, 0.001) * 0.3


def sfx_chime():
    out = np.zeros(int(SR * 1.2))
    for off, m in ((0.0, 84), (0.09, 91)):
        b = bell(m, 1.0, 6.0)
        i = int(off * SR)
        out[i: i + len(b)] += b
    return out


def sfx_stretch():
    t = t_axis(0.5)
    f = 220 + 260 * (t / 0.5) ** 1.5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / 0.5) * 0.05


def sfx_thock():
    t = t_axis(0.2)
    f = 180 + 200 * np.exp(-t / 0.015)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * env_exp(0.2, 0.05, 0.0008) * 0.5


def sfx_tick():
    return sfx_tap() * 0.3


SFX = {
    "tap": sfx_tap, "release": sfx_release, "type": sfx_type, "swish": sfx_swish,
    "toggle": sfx_toggle, "stamp": sfx_stamp, "ding": sfx_ding, "pop": sfx_pop,
    "chime": sfx_chime, "stretch": sfx_stretch, "thock": sfx_thock, "tick": sfx_tick,
}

# Momento de cada som: o pico do som cai exatamente aqui (s). Mesma grade do index.html.
EVENTS = [
    (0.50, "tap"), (1.00, "release"), (1.00, "swish"),
    *[(1.50 + i * 0.055, "type") for i in range(6)],          # Marina
    *[(2.00 + i * 0.017, "type") for i in range(26)],         # Bolo de chocolate · 1,5 kg
    (2.50, "swish"), (3.00, "tap"), (3.50, "pop"),
    (4.00, "swish"), (5.00, "toggle"), (5.50, "pop"),
    (6.00, "stamp"), (6.50, "swish"), (7.00, "tap"), (7.50, "ding"),
    (8.00, "swish"), (8.50, "tap"), (9.00, "stretch"), (9.50, "thock"),
    (10.00, "swish"), *[(10.50 + i * 0.05, "tick") for i in range(7)],
    (11.00, "tick"), (11.50, "tick"),
    (12.00, "swish"), (12.50, "tap"), (13.00, "pop"), (13.50, "chime"),
    (14.00, "tap"), (15.00, "tap"), (15.00, "swish"), (15.50, "pop"),
]

SFX_GAIN = {"type": 0.8, "tick": 0.9, "swish": 0.9}


def place(buf, sample, at, gain=1.0):
    peak = int(np.argmax(np.abs(sample)))  # pico medido do som
    start = int(round(at * SR)) - peak
    end = start + len(sample)
    s0, e0 = max(start, 0), min(end, len(buf))
    if e0 > s0:
        buf[s0:e0] += sample[s0 - start: e0 - start] * gain


def reverb(x, seconds=1.4, mix=0.18):
    n = int(SR * seconds)
    t = np.arange(n) / SR
    ir = rng.standard_normal(n) * np.exp(-t / (seconds / 5))
    ir = lowpass(ir, 5000)
    ir /= np.sqrt(np.sum(ir ** 2))
    size = 1 << int(np.ceil(np.log2(len(x) + n)))
    wet = np.fft.irfft(np.fft.rfft(x, size) * np.fft.rfft(ir, size), size)[: len(x)]
    return x + wet * mix


def build():
    total = 2 * N  # duas voltas; a segunda é o loop final
    drums = np.zeros(total)
    keys = np.zeros(total)
    low = np.zeros(total)
    sfx = np.zeros(total)

    # F – Dm – Bb – C, dois compassos cada (fá maior, quente)
    chords = [
        (53, [65, 69, 72, 76, 79]),   # Fmaj9
        (50, [62, 65, 69, 72, 76]),   # Dm9
        (46, [58, 62, 65, 69, 72]),   # Bbmaj9
        (48, [60, 64, 67, 69, 74]),   # C6/9
    ]
    k, c, oh = kick(), clap(), hat(True)
    melody = {0: [79, 77, 76], 1: [77, 76, 72], 2: [77, 74, 72], 3: [76, 74, 79]}

    for loop in range(3):  # a terceira volta só deixa o ataque do primeiro bumbo no fim
        base = loop * LOOP
        for bar in range(8):
            bt = base + bar * 4 * BEAT
            root, voicing = chords[bar // 2]
            for beat in range(4):
                t0 = bt + beat * BEAT
                if beat in (0, 2):
                    place(drums, k, t0, 1.0)
                if beat in (1, 3):
                    place(drums, c, t0, 0.9)
                place(drums, hat(), t0 + BEAT / 2, 1.0)
                place(drums, hat(), t0, 0.45)
                for s in range(4):
                    place(drums, shaker(), t0 + s * BEAT / 4, 1.0 if s % 2 else 0.6)
            if bar % 2 == 1:
                place(drums, oh, bt + 3.5 * BEAT, 1.0)
            # baixo: 1, "e" do 2, 3 e um passo de aproximação no fim de cada par de compassos
            for at, dur, m in ((0, 1.0, root), (1.5, 0.5, root + 12), (2, 1.25, root), (3.5, 0.5, root + 7)):
                place(low, bass(m - 12, dur * BEAT), bt + at * BEAT, 1.0)
            # piano elétrico: acorde no 1 e resposta no "e" do 2
            for at, vel in ((0, 1.0), (1.5, 0.7), (3, 0.55)):
                for m in voicing:
                    place(keys, ep(m, 1.6 * BEAT * 2, vel), bt + at * BEAT + 0.004 * (m % 3), 1.0)
            if bar % 2 == 0:
                place(keys, pad(voicing[:4], 8 * BEAT), bt + 0.02, 1.0)
            # melodia curta em sino, um motivo a cada dois compassos
            if bar % 2 == 1:
                for i, m in enumerate(melody[bar // 2]):
                    place(keys, bell(m, 0.8, 0.9), bt + (2 + i * 0.5) * BEAT, 1.0)
        for at, name in EVENTS:
            place(sfx, SFX[name](), base + at, SFX_GAIN.get(name, 1.0))

    # bombeia levemente o piano com o bumbo, para respirar com a batida
    pump = np.ones(total)
    for i in range(int(total / SR / BEAT)):
        if i % 2 == 0:
            s = int(i * BEAT * SR)
            seg = 1 - 0.35 * np.exp(-np.arange(int(BEAT * SR)) / (0.12 * SR))
            pump[s: s + len(seg)] = seg[: max(0, min(len(seg), total - s))]
    keys = reverb(keys * pump, 1.6, 0.22)
    drums = reverb(drums, 0.9, 0.08)

    music = drums * 0.9 + keys + low * 0.9
    mix = music * 0.82 + sfx
    loop = mix[N:]
    loop = np.tanh(loop * 1.15) / np.tanh(1.15)
    loop *= 0.89 / np.max(np.abs(loop))  # pico em -1 dBFS
    return loop, music[N:]


def analyze(music):
    """Grade de batidas medida com numpy (fluxo espectral) contra a grade teórica."""
    hop, win = 256, 1024
    frames = (len(music) - win) // hop
    window = np.hanning(win)
    spec = np.abs(np.array([np.fft.rfft(music[i * hop: i * hop + win] * window) for i in range(frames)]))
    flux = np.maximum(spec[1:] - spec[:-1], 0)[:, :40].sum(axis=1)  # graves: bumbo
    times = (np.arange(1, frames) * hop + win / 2) / SR
    found = []
    for b in range(0, 32, 2):  # batidas 1 e 3, onde está o bumbo
        target = b * BEAT
        mask = np.abs(times - target) < 0.08
        if mask.any():
            found.append(times[mask][np.argmax(flux[mask])] - target)
    tempo_bins = np.correlate(flux - flux.mean(), flux - flux.mean(), "full")[len(flux) - 1:]
    lag_range = (int(0.4 * SR / hop), int(0.6 * SR / hop))
    lag = lag_range[0] + np.argmax(tempo_bins[lag_range[0]: lag_range[1]])
    bpm = 60 / (lag * hop / SR)
    return {"bpm_measured": round(float(bpm), 2), "kick_offsets_ms": [round(float(x) * 1000, 1) for x in found]}


def write_wav(path, x):
    stereo = np.stack([x, x], axis=1)
    data = (np.clip(stereo, -1, 1) * 32767).astype("<i2")
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(data.tobytes())


if __name__ == "__main__":
    project = Path(sys.argv[1])
    out = project / "assets" / "audio"
    out.mkdir(parents=True, exist_ok=True)
    loop, music = build()
    write_wav(out / "mix.wav", loop)
    report = analyze(music)
    # emenda: a diferença entre o fim e o começo deve parecer com a de duas amostras vizinhas
    report["seam_jump"] = round(float(abs(loop[0] - loop[-1])), 4)
    report["typical_step_p99"] = round(float(np.percentile(np.abs(np.diff(loop)), 99)), 4)
    report["duration_s"] = len(loop) / SR
    (out / "analysis.json").write_text(json.dumps(report, indent=2))
    print(json.dumps(report))
