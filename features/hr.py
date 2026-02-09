"""
features/hr.py — Heart Rate estimation
========================================
Two complementary methods are provided and their results are combined:

1. **FFT (frequency-domain)**
   Fast and robust even when individual peaks are noisy.  We zero-pad
   the pulse signal, compute the power spectrum, and find the dominant
   frequency in the cardiac band (0.7–4.0 Hz).

2. **Peak detection (time-domain)**
   Uses `scipy.signal.find_peaks` on the filtered pulse.  The median
   inter-peak interval is converted to BPM.  This method is more
   sensitive to individual beat morphology but can fail if the SNR is
   low.

The final HR estimate is the *average* of both methods, weighted by a
simple confidence heuristic (spectral SNR for FFT, peak regularity for
peak-detection).  If one method fails its weight is set to 0.

Clipping
--------
The result is hard-clipped to [30, 200] BPM — physiologically
implausible values are almost certainly artefacts.
"""

import numpy as np
from scipy.signal import find_peaks
from config import BP_LOW_HZ, BP_HIGH_HZ
from utils.logger import get_logger

logger = get_logger("features.hr")

# Physiological BPM bounds (hard clip)
HR_MIN_BPM = 30.0
HR_MAX_BPM = 200.0


def estimate_hr_fft(pulse: np.ndarray, fs: float) -> tuple[float, float]:
    """
    Estimate heart rate from the dominant frequency in the pulse spectrum.

    Parameters
    ----------
    pulse : ndarray, shape (N,)   Bandpass-filtered pulse waveform.
    fs    : float                 Sampling frequency (Hz).

    Returns
    -------
    hr_bpm     : float   Estimated heart rate in BPM.
    confidence : float   Spectral SNR in [0, 1] (higher = more confident).
    """
    # Zero-pad to next power of 2 for efficient FFT
    n_fft = max(1024, 1 << (len(pulse) - 1).bit_length())   # next power of 2 ≥ len
    freqs = np.fft.rfftfreq(n_fft, d=1.0 / fs)
    spectrum = np.abs(np.fft.rfft(pulse, n=n_fft)) ** 2      # power spectrum

    # Restrict to cardiac band
    cardiac_mask = (freqs >= BP_LOW_HZ) & (freqs <= BP_HIGH_HZ)
    if not cardiac_mask.any():
        return 72.0, 0.0   # Fallback

    cardiac_power = spectrum.copy()
    cardiac_power[~cardiac_mask] = 0.0

    # Dominant frequency
    peak_idx = np.argmax(cardiac_power)
    dominant_freq = freqs[peak_idx]   # Hz
    hr_bpm = dominant_freq * 60.0     # convert to BPM
    
    # Harmonic/Subharmonic detection and correction
    # Issue 1: If HR too low (<45 BPM), likely missing beats - check for 2x harmonic
    if hr_bpm < 45.0:
        # Check if double frequency (2x) is in cardiac band
        harmonic_freq = dominant_freq * 2.0
        if BP_LOW_HZ <= harmonic_freq <= BP_HIGH_HZ:
            harmonic_idx = np.argmin(np.abs(freqs - harmonic_freq))
            # If 2x harmonic has significant power (>15% of peak), use it instead
            if spectrum[harmonic_idx] > 0.15 * spectrum[peak_idx]:
                dominant_freq = harmonic_freq
                hr_bpm = dominant_freq * 60.0
                logger.info("Low HR detected, using 2x harmonic: %.1f Hz (%.1f BPM)", dominant_freq, hr_bpm)
    
    # Issue 2: If HR too high (>120 BPM), likely detecting harmonic - check for subharmonic
    elif hr_bpm > 120.0:
        # Check if subharmonic (half frequency) is in cardiac band
        subharmonic_freq = dominant_freq / 2.0
        if BP_LOW_HZ <= subharmonic_freq <= BP_HIGH_HZ:
            subharmonic_idx = np.argmin(np.abs(freqs - subharmonic_freq))
            # If subharmonic has significant power (>20% of peak), use it instead
            if spectrum[subharmonic_idx] > 0.2 * spectrum[peak_idx]:
                dominant_freq = subharmonic_freq
                hr_bpm = dominant_freq * 60.0
                logger.info("High HR detected, using subharmonic: %.1f Hz (%.1f BPM)", dominant_freq, hr_bpm)

    # Confidence: ratio of peak power to total cardiac-band power (spectral SNR)
    total_cardiac = spectrum[cardiac_mask].sum()
    if total_cardiac > 0:
        snr = spectrum[peak_idx] / total_cardiac   # ∈ (0, 1]
    else:
        snr = 0.0

    hr_bpm = float(np.clip(hr_bpm, HR_MIN_BPM, HR_MAX_BPM))
    return hr_bpm, float(snr)


def estimate_hr_peaks(pulse: np.ndarray, fs: float) -> tuple[float, float]:
    """
    Estimate heart rate from inter-peak intervals in the time domain.

    Parameters
    ----------
    pulse : ndarray, shape (N,)   Bandpass-filtered pulse waveform.
    fs    : float                 Sampling frequency (Hz).

    Returns
    -------
    hr_bpm     : float   Estimated heart rate in BPM.
    confidence : float   Regularity score in [0, 1].
    """
    # Adaptive prominence: use 0.35× the signal range for balanced detection
    # High enough to avoid false peaks, low enough to detect real heartbeats
    prominence_threshold = 0.35 * (pulse.max() - pulse.min())
    peaks, _ = find_peaks(pulse, prominence=prominence_threshold, distance=int(fs * 0.3))
    # distance guard: minimum 0.3 s between peaks  →  max 200 BPM

    if len(peaks) < 2:
        return 72.0, 0.0   # Fallback — not enough peaks

    # Inter-peak intervals in seconds
    rr_intervals = np.diff(peaks) / fs   # shape (num_peaks - 1,)

    # Median is more robust than mean to outlier intervals
    median_rr = np.median(rr_intervals)
    hr_bpm = 60.0 / (median_rr + 1e-8)

    # Confidence: 1 − CV (coefficient of variation) of RR intervals,
    # clipped to [0, 1].  A perfectly regular signal has CV = 0 → conf = 1.
    cv = rr_intervals.std() / (rr_intervals.mean() + 1e-8)
    confidence = float(np.clip(1.0 - cv, 0.0, 1.0))

    hr_bpm = float(np.clip(hr_bpm, HR_MIN_BPM, HR_MAX_BPM))
    return hr_bpm, confidence


def estimate_hr(pulse: np.ndarray, fs: float) -> dict:
    """
    Fuse FFT and peak-detection HR estimates into a single best estimate.

    Returns
    -------
    dict with keys:
        hr_bpm          : float   Final heart-rate estimate.
        hr_fft          : float   FFT-only estimate.
        hr_peaks        : float   Peak-detection estimate.
        confidence_fft  : float
        confidence_peaks: float
        rr_intervals    : list[float]   Raw RR intervals (seconds) from peak detection.
    """
    hr_fft, conf_fft = estimate_hr_fft(pulse, fs)
    hr_peaks, conf_peaks = estimate_hr_peaks(pulse, fs)

    # Also extract RR intervals for HRV (use same parameters as peak detection)
    prominence_threshold = 0.35 * (pulse.max() - pulse.min())
    peaks, _ = find_peaks(pulse, prominence=prominence_threshold, distance=int(fs * 0.3))
    rr_intervals = list(np.diff(peaks) / fs) if len(peaks) >= 2 else []

    # Weighted average
    total_conf = conf_fft + conf_peaks
    if total_conf > 0:
        hr_bpm = (hr_fft * conf_fft + hr_peaks * conf_peaks) / total_conf
    else:
        hr_bpm = 72.0   # Default resting HR if both methods fail

    hr_bpm = float(np.clip(hr_bpm, HR_MIN_BPM, HR_MAX_BPM))

    logger.info(
        "HR estimate: %.1f BPM  (FFT=%.1f [conf=%.2f], Peaks=%.1f [conf=%.2f])",
        hr_bpm, hr_fft, conf_fft, hr_peaks, conf_peaks,
    )

    return {
        "hr_bpm": round(hr_bpm, 1),
        "hr_fft": round(hr_fft, 1),
        "hr_peaks": round(hr_peaks, 1),
        "confidence_fft": round(conf_fft, 3),
        "confidence_peaks": round(conf_peaks, 3),
        "rr_intervals": [round(x, 4) for x in rr_intervals],
    }
