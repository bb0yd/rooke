// Glicko-2 Rating System Implementation
// Based on Mark Glickman's Glicko-2 algorithm
// http://www.glicko.net/glicko/glicko2.pdf

const TAU = 0.5; // System constant (constrains volatility change)
const CONVERGENCE_TOLERANCE = 0.000001;

interface RatingData {
  rating: number;
  rd: number; // Rating Deviation
  volatility: number;
}

interface GameResult {
  opponentRating: number;
  opponentRd: number;
  score: number; // 1 = win, 0.5 = draw, 0 = loss
}

// Convert to/from Glicko-2 scale
const MU_FACTOR = 173.7178;
function toGlicko2(rating: number): number {
  return (rating - 1500) / MU_FACTOR;
}
function fromGlicko2(mu: number): number {
  return mu * MU_FACTOR + 1500;
}
function toGlicko2Rd(rd: number): number {
  return rd / MU_FACTOR;
}
function fromGlicko2Rd(phi: number): number {
  return phi * MU_FACTOR;
}

function g(phi: number): number {
  return 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
}

function E(mu: number, muj: number, phij: number): number {
  return 1 / (1 + Math.exp(-g(phij) * (mu - muj)));
}

export function calculateNewRating(
  player: RatingData,
  results: GameResult[]
): RatingData {
  if (results.length === 0) {
    // No games: only RD increases over time
    const phi = toGlicko2Rd(player.rd);
    const newPhi = Math.sqrt(phi * phi + player.volatility * player.volatility);
    return {
      rating: player.rating,
      rd: Math.min(fromGlicko2Rd(newPhi), 350),
      volatility: player.volatility,
    };
  }

  const mu = toGlicko2(player.rating);
  const phi = toGlicko2Rd(player.rd);
  const sigma = player.volatility;

  // Step 3: Compute v (estimated variance)
  let vInv = 0;
  for (const result of results) {
    const muj = toGlicko2(result.opponentRating);
    const phij = toGlicko2Rd(result.opponentRd);
    const gVal = g(phij);
    const eVal = E(mu, muj, phij);
    vInv += gVal * gVal * eVal * (1 - eVal);
  }
  const v = 1 / vInv;

  // Step 4: Compute delta
  let deltaSum = 0;
  for (const result of results) {
    const muj = toGlicko2(result.opponentRating);
    const phij = toGlicko2Rd(result.opponentRd);
    deltaSum += g(phij) * (result.score - E(mu, muj, phij));
  }
  const delta = v * deltaSum;

  // Step 5: Determine new volatility (Illinois algorithm)
  const a = Math.log(sigma * sigma);
  const phiSq = phi * phi;
  const deltaSq = delta * delta;

  function f(x: number): number {
    const ex = Math.exp(x);
    const d = phiSq + v + ex;
    return (ex * (deltaSq - phiSq - v - ex)) / (2 * d * d) - (x - a) / (TAU * TAU);
  }

  let A = a;
  let B: number;
  if (deltaSq > phiSq + v) {
    B = Math.log(deltaSq - phiSq - v);
  } else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }

  let fA = f(A);
  let fB = f(B);

  while (Math.abs(B - A) > CONVERGENCE_TOLERANCE) {
    const C = A + ((A - B) * fA) / (fB - fA);
    const fC = f(C);

    if (fC * fB <= 0) {
      A = B;
      fA = fB;
    } else {
      fA = fA / 2;
    }
    B = C;
    fB = fC;
  }

  const newSigma = Math.exp(A / 2);

  // Step 6: Update rating deviation
  const phiStar = Math.sqrt(phiSq + newSigma * newSigma);

  // Step 7: Update rating and RD
  const newPhi = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const newMu = mu + newPhi * newPhi * deltaSum;

  return {
    rating: Math.round(fromGlicko2(newMu)),
    rd: Math.round(fromGlicko2Rd(newPhi) * 10) / 10,
    volatility: Math.round(newSigma * 10000) / 10000,
  };
}

export function getExpectedScore(
  playerRating: number,
  playerRd: number,
  opponentRating: number,
  opponentRd: number
): number {
  const mu = toGlicko2(playerRating);
  const muj = toGlicko2(opponentRating);
  const phij = toGlicko2Rd(opponentRd);
  return E(mu, muj, phij);
}

export const DEFAULT_RATING: RatingData = {
  rating: 1500,
  rd: 350,
  volatility: 0.06,
};
