/**
 * scripts/lib/seededShocks.js
 * 検証スクリプト用の、固定シードで決定的に生成するショック列（標準正規乱数のZスコア行列）。
 * docs/fixes の verify-seed-stability・implementation_verify_seed.md。
 *
 * runMC()（src/lib/montecarlo.ts、ロックファイル）は第5引数 shockOverrides で外部からショック列を
 * 受け取れる。本番のUI・記事の数値算出は従来どおり Math.random() ベースの randNorm()（src/lib/helpers.ts）
 * で生成し、検証スクリプトだけがこのファイルで作った決定的なショック列を渡す。src/ には触れない。
 *
 * 乱数の土台は mulberry32（32bit状態の軽量PRNG）。正規分布への変換は helpers.ts の randNorm() と
 * 同じ Box–Muller 法（u・vが0のときは引き直し、±50でクリップ）をそのまま使う。
 */

// 32bitのシード値から、[0, 1) の一様乱数を返す関数を作る（mulberry32）
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// 文字列（シナリオ名など）から32bitのシード値を作る（FNV-1a）。同じ文字列なら常に同じ値になる
function seedFromString(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

// helpers.ts の randNorm(mean, std) と同じ変換を、決定的な一様乱数 rand の上で行う
function seededRandNorm(rand, mean, std) {
  let u = 0, v = 0;
  while (u === 0) u = rand();
  while (v === 0) v = rand();
  return Math.max(-50, Math.min(50, mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)));
}

/**
 * runMC() の shockOverrides に渡す、trials × years のZスコア行列を作る。
 * runMC() 内部の既定の生成（Array.from({length: N}, () => Array.from({length: years}, () => randNorm(0, 1))）
 * と同じ形・同じ順序（試行ごとに年数ぶん）で値を並べる。
 * @param {string} seedKey シードの元になる文字列（例：シナリオ名）。同じ文字列なら常に同じ行列になる
 * @param {number} trials 試行回数（runMC() の N と一致させること）
 * @param {number} years 年数（p.lifeEx - p.curAge + 1 と一致させること）
 */
function makeShockMatrix(seedKey, trials, years) {
  const rand = mulberry32(seedFromString(seedKey));
  return Array.from({ length: trials }, () =>
    Array.from({ length: years }, () => seededRandNorm(rand, 0, 1))
  );
}

module.exports = { mulberry32, seedFromString, seededRandNorm, makeShockMatrix };
