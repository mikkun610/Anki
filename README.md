# Anki

オフラインで使える暗記カードのPWA。GitHub Pages でそのまま公開できる。

- `index.html` — アプリ本体（画面・出題・保存の仕組み。科目には依存しない）
- `decks/index.json` — 単語帳の一覧。ここに載せたものが右上のメニューに出る
- `decks/*.json` — 単語帳1冊につき1ファイル
- `service-worker.js` — オフライン用。単語帳と、その中で使う画像も自動でキャッシュする

学習記録は端末内（localStorage と IndexedDB）に単語帳ごとに保存する。

## 単語帳を追加する

1. `decks/<id>.json` を作る（形式は下）
2. `decks/index.json` に `{"id": "<id>", "title": "表示名", "file": "<id>.json"}` を足す
3. 画像を使うなら `decks/<id>/` に置き、カードにはサイトのトップからのパスを書く（例 `decks/chem/ethanol.svg`）
4. 中身を変えたら `service-worker.js` の `CACHE` の番号を上げる

## 単語帳の形式

```json
{
  "format": 1,
  "id": "kobun",
  "title": "古文単語",
  "description": "右上に単語帳が1つしかないときに表示する説明",
  "labels": {"item": "単語", "counter": "語", "list": "単語一覧"},
  "fields": [
    {"key": "word", "label": "単語"},
    {"key": "meaning", "label": "意味"},
    {"key": "structure", "label": "構造式", "type": "image"}
  ],
  "section": {"field": "chapter", "label": "出題範囲", "all": "全範囲"},
  "category": {"field": "group", "label": "品詞", "all": "全品詞"},
  "choiceGroup": "group",
  "choiceFallback": true,
  "modes": [
    {"id": "main", "label": "単語→意味", "prompt": "word", "ask": ["meaning"]}
  ],
  "choiceExclusions": {"meaning": [[3, 8]]},
  "cards": [
    {"id": 1, "chapter": "1章", "group": "動詞", "word": "あくがる", "meaning": "さまよい出る"}
  ]
}
```

| 項目 | 意味 |
| --- | --- |
| `fields` | カードの項目。1つ目が見出し（一覧・同じ語のまとめ方に使う）。`type` は `text`（省略時）か `image`。`hidden: true` は画面に出さない |
| `modes` | 出題のしかた。`prompt` に見せる項目、`ask` に答えさせる項目を順に書く。複数あると「学習モード」で切り替えられ、習熟度は別管理 |
| `section` / `category` | 絞り込み用。カードのどの値で分けるか（省略可） |
| `choiceGroup` | 四択の誤答を同じ値のカードから選ぶ（品詞など）。足りないとき `choiceFallback: true` なら他から補う |
| `choiceExclusions` | 項目ごとに、互いを誤答にしないカードIDの組（意味が近すぎるものなど） |
| `cards[].id` | 学習記録と結びつく番号。**一度決めたら変えない**。追加は末尾に新しい番号で |
| `storageKey` | 保存キーを固定したいときだけ（漢文は旧版の記録を引き継ぐために使用） |
| `examples` / `exampleReveal` | 例文モード用（漢文で使用）。`modes` に `"prompt": "example"` を置く |

出題ルール：四択で正解 → 次から自己採点（思い出せたか）。`ask` の項目をすべて自力で正解した日に定着+1。復習は 翌日 → 1週間後 → 以後1か月ごと。間違えたら0回に戻る。日付は日本時間の朝4時で切り替わる。

## ロック解除（iPhoneのショートカットと連携）

「解除」タブに、ショートカットのロックで出た4桁の解除番号を入れる。テストで100問答えると6文字の解除コードが出る。
コードは `SHA-256("anki-line-lock:" + 解除番号)` の16進数の先頭6文字を大文字にしたもの（`index.html` の `UNLOCK_SECRET` / `UNLOCK_GOAL`）。
問題数は単語帳の学習記録とは別に、端末内の `anki_unlock` に保存する。
