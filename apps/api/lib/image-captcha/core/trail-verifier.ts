import { VerifyTrailPayload } from '../types';

export function verifyHumanLikeTrail(data: VerifyTrailPayload) {
  const reasons: string[] = [];
  let score = 1.0; // start at 1.0, subtract penalties

  const { x: reportedX, sliderOffsetX, duration, trail } = data;

  // Basic sanity checks
  if (!Array.isArray(trail) || trail.length < 5) {
    reasons.push('trail_too_short');
    score -= 0.6;
  }
  if (!Number.isFinite(duration) || duration <= 100 || duration > 15000) {
    reasons.push('duration_out_of_range');
    score -= 0.3;
  }
  if (!Number.isFinite(sliderOffsetX) || Math.abs(sliderOffsetX) < 10) {
    reasons.push('slider_offset_too_small');
    score -= 0.2;
  }

  if (trail.length >= 2) {
    const xs = trail.map((p) => Number(p?.[0]) || 0);
    const startX = xs[0];
    const endX = xs[xs.length - 1];
    const totalDx = endX - startX;

    // End displacement consistency
    const dispDiff = Math.abs(totalDx - sliderOffsetX);
    if (dispDiff > 10) {
      reasons.push('displacement_mismatch');
      score -= Math.min(0.5, dispDiff / 100);
    }

    // Check reported final x consistency
    if (Number.isFinite(reportedX)) {
      const reportedDiff = Math.abs(reportedX - totalDx);
      if (reportedDiff > 10) {
        reasons.push('reported_x_mismatch');
        score -= Math.min(0.3, reportedDiff / 150);
      }
    }

    // Monotonicity check
    let backtrackCount = 0;
    let maxJump = 0;
    for (let i = 1; i < xs.length; i++) {
      const dx = xs[i] - xs[i - 1];
      if (dx < 0) backtrackCount++;
      const jump = Math.hypot(dx, (trail[i]?.[1] || 0) - (trail[i - 1]?.[1] || 0));
      if (jump > maxJump) maxJump = jump;
    }

    const backtrackRatio = backtrackCount / Math.max(1, xs.length - 1);
    if (backtrackRatio > 0.35) {
      reasons.push('too_many_backtracks');
      score -= 0.35;
    }

    // Teleport/jump check
    if (maxJump > 80) {
      reasons.push('teleport_jump_detected');
      score -= 0.5;
    }
  }

  // Clamp score
  if (score < 0) score = 0;
  if (score > 1) score = 1;

  const ok = score >= 0.5 && reasons.length <= 3;

  return { ok, score, reasons };
}