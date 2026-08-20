// このツールの公開パス（basePath適用前の相対パス）。src/app/hitori-hojin/assets/ の
// フォルダ構成と一致させること。このリポジトリはbasePath: '/asset-simulator'固定のため、
// 実際の公開URLは/asset-simulator/hitori-hojin/assetsになる（hitori-hojin LP実装時に
// 確定した「src/app/asset-simulator/配下に置くと二重パスになる」注意点と同じ理由で、
// src/app/hitori-hojin/assets/に配置する）。
export const HOJIN_ASSET_MANAGEMENT_PATH = '/hitori-hojin/assets';
