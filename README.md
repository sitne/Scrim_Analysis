# Scrim Analyzer

VALORANTスクリム分析ツール - チームのマッチデータを分析・共有

## 機能

- ✅ **チーム認証**: Supabase Authによるログイン/サインアップ
- ✅ **チーム管理**: チーム作成、招待コードでの参加
- ✅ **データ共有**: チーム内でのみマッチデータを共有
- ✅ **マッチ分析**: ラウンド別統計、プレイヤー統計
- ✅ **Web UI**: ドラッグ&ドロップでJSONファイルをアップロード

## 技術スタック

- **フロントエンド**: Next.js 16 + React 19 + TypeScript
- **スタイリング**: Tailwind CSS 4
- **認証**: Supabase Auth
- **データベース**: Supabase PostgreSQL + Prisma ORM
- **ホスティング**: Vercel

## セットアップ

### 1. Supabaseプロジェクト作成

1. [Supabase](https://supabase.com) でプロジェクトを作成
2. Project Settings > API から以下を取得:
   - Project URL
   - anon public key
3. Database > Connection string から接続文字列を取得

### 2. 環境変数設定

`.env.local` ファイルを作成:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."
```

### 3. 依存関係インストール

```bash
npm install
```

### 4. データベースセットアップ

```bash
npm run db:push
```

### 5. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) でアクセス

## Vercelデプロイ

1. GitHubリポジトリをVercelに接続
2. 環境変数を設定:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `DATABASE_URL`
   - `DIRECT_URL`
3. デプロイ

## スクリプト

| コマンド | 説明 |
|---------|------|
| `npm run dev` | 開発サーバー起動 |
| `npm run build` | プロダクションビルド |
| `npm run db:push` | スキーマをDBに反映 |
| `npm run db:migrate` | マイグレーション作成 |
| `npm run db:studio` | Prisma Studio起動 |
