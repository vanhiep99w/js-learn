---
title: "Symbol"
description: "Symbol trong JavaScript đi sâu: primitive thứ 7 tạo giá trị tuyệt đối duy nhất, dùng làm property key không đụng độ, vì sao Symbol bị bỏ qua khi for...in/JSON.stringify (ẩn property), well-known symbols (Symbol.iterator, Symbol.toPrimitive, Symbol.toStringTag...), global registry với Symbol.for/Symbol.keyFor. Kèm ví dụ chạy được, bảng, tự kiểm tra và cheat sheet."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Trực giác: chìa khoá không ai sao chép được](#trực-giác-chìa-khoá-không-ai-sao-chép-được)
- [Tạo & tính duy nhất](#tạo--tính-duy-nhất)
- [Symbol làm property key](#symbol-làm-property-key)
- [Symbol property là "ẩn"](#symbol-property-là-ẩn)
- [Well-known symbols](#well-known-symbols)
- [Global registry: Symbol.for / Symbol.keyFor](#global-registry-symbolfor--symbolkeyfor)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**Symbol** là kiểu **primitive** thứ 7 (cùng nhóm với `string`, `number`, `boolean`, `null`, `undefined`, `bigint`). Mỗi `Symbol()` tạo ra một giá trị **tuyệt đối duy nhất** — không bao giờ trùng với bất kỳ symbol nào khác, kể cả symbol có *cùng mô tả*.

```js
const a = Symbol("id");
const b = Symbol("id");
a === b;          // false — hai symbol khác nhau dù cùng mô tả "id"
typeof a;         // "symbol"
```

Công dụng chính: làm **property key** không bao giờ đụng độ với key khác, và làm "hook" để tuỳ biến hành vi ngôn ngữ (well-known symbols).

---

## Trực giác: chìa khoá không ai sao chép được

Hình dung mỗi `Symbol()` như một chiếc chìa khoá khắc riêng: dù hai chìa có *nhãn dán* giống nhau ("id"), răng cưa của chúng vẫn khác nhau hoàn toàn. Bạn khoá một property bằng chìa này thì *chỉ ai cầm đúng chìa* (tham chiếu tới đúng symbol đó) mới mở được — code khác vô tình đặt key `"id"` không thể đè lên.

---

## Tạo & tính duy nhất

`Symbol()` là một **hàm**, không phải constructor — gọi `new Symbol()` sẽ lỗi:

```js
const s = Symbol();           // ok
const s2 = Symbol("mô tả");   // mô tả chỉ để debug, không ảnh hưởng giá trị
s2.description;               // "mô tả"
s2.toString();                // "Symbol(mô tả)"

new Symbol();                 // ❌ TypeError — Symbol không phải constructor
```

> [!WARNING]
> Symbol **không tự ép sang string** trong template/nối chuỗi: `` `${sym}` `` ném `TypeError`. Phải gọi `String(sym)` hoặc `sym.description` rõ ràng.

---

## Symbol làm property key

Đây là use case phổ biến nhất: thêm property vào object mà **chắc chắn không ghi đè** property có sẵn (kể cả của thư viện bên thứ ba):

```js
const ID = Symbol("id");

const user = {
  name: "Hiệp",
  [ID]: 12345,          // dùng symbol làm key (bracket bắt buộc)
};

user[ID];               // 12345
user["id"];             // undefined — key "id" (string) KHÁC key ID (symbol)
```

Vì `ID` là duy nhất, không đoạn code nào khác có thể tạo lại đúng key đó để vô tình đọc/ghi đè — hữu ích cho metadata nội bộ.

---

## Symbol property là "ẩn"

Property dùng symbol key **không xuất hiện** trong hầu hết cơ chế duyệt thông thường — gần như "tàng hình":

```js
const ID = Symbol("id");
const obj = { name: "Hiệp", [ID]: 1 };

Object.keys(obj);            // ["name"]        — bỏ qua symbol
Object.values(obj);          // ["Hiệp"]
JSON.stringify(obj);         // '{"name":"Hiệp"}' — bỏ qua symbol
for (const k in obj) {}      // chỉ "name"

// Muốn lấy symbol key phải dùng API riêng:
Object.getOwnPropertySymbols(obj);   // [Symbol(id)]
Reflect.ownKeys(obj);                // ["name", Symbol(id)]
```

> [!NOTE]
> "Ẩn" ở đây **không phải bảo mật** — symbol vẫn lấy được qua `Object.getOwnPropertySymbols`. Nó chỉ giúp tránh *vô tình* đụng độ/serialize, không phải để giấu dữ liệu nhạy cảm. Đóng gói thật sự dùng [`#private`](/objects-prototypes/class/) hoặc [closure](/function-closure/factory-functions/).

---

## Well-known symbols

JS định nghĩa sẵn một số symbol "nổi tiếng" trên object `Symbol`, dùng làm **hook tuỳ biến hành vi ngôn ngữ**. Bạn cài method với các key này để thay đổi cách object tương tác với cú pháp built-in:

| Well-known symbol | Điều khiển |
| --- | --- |
| `Symbol.iterator` | Cách object được lặp (`for...of`, spread) |
| `Symbol.asyncIterator` | Cách lặp bất đồng bộ (`for await...of`) |
| `Symbol.toPrimitive` | Cách object ép sang primitive (`+`, so sánh...) |
| `Symbol.toStringTag` | Nhãn trong `Object.prototype.toString` |
| `Symbol.hasInstance` | Tuỳ biến `instanceof` |

```js
// Symbol.iterator — làm object thành iterable
const range = {
  from: 1, to: 3,
  [Symbol.iterator]() {
    let cur = this.from;
    const to = this.to;
    return { next: () => cur <= to ? { value: cur++, done: false } : { value: undefined, done: true } };
  },
};
[...range];   // [1, 2, 3]

// Symbol.toPrimitive — tuỳ biến ép kiểu
const money = {
  amount: 100,
  [Symbol.toPrimitive](hint) {
    return hint === "string" ? `$${this.amount}` : this.amount;
  },
};
+money;            // 100        (hint "number")
`${money}`;        // "$100"     (hint "string")

// Symbol.toStringTag — nhãn tuỳ biến
const custom = { [Symbol.toStringTag]: "MyType" };
Object.prototype.toString.call(custom);   // "[object MyType]"
```

> [!TIP]
> `Symbol.iterator` chính là cầu nối giữa bài này và [Generators & Iterators](/advanced/generators-iterators/): generator function dùng làm `[Symbol.iterator]()` cho cách viết gọn nhất.

---

## Global registry: Symbol.for / Symbol.keyFor

`Symbol()` luôn tạo symbol *mới*. Đôi khi ta muốn **chia sẻ cùng một symbol** xuyên suốt nhiều file/realm theo *tên chung* — dùng **global symbol registry**:

```js
const a = Symbol.for("app.id");   // tạo (hoặc lấy lại) symbol toàn cục tên "app.id"
const b = Symbol.for("app.id");   // lấy LẠI đúng symbol đó
a === b;                          // true — cùng một symbol từ registry

Symbol.keyFor(a);                 // "app.id" — lấy tên trong registry

// Khác hẳn Symbol() thường:
Symbol("app.id") === Symbol("app.id");   // false — không qua registry
Symbol.keyFor(Symbol("x"));               // undefined — symbol thường không trong registry
```

| | `Symbol(desc)` | `Symbol.for(key)` |
| --- | --- | --- |
| Mỗi lần gọi | Tạo symbol **mới** | Lấy lại symbol **chung** theo key |
| Phạm vi | Cục bộ | Toàn cục (cross-file/realm) |
| Tra ngược tên | Không | `Symbol.keyFor` |

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
| --- | --- | --- |
| `new Symbol()` | `TypeError` | Gọi `Symbol()` (không `new`) |
| `` `${sym}` `` | `TypeError` ép string | `String(sym)` / `sym.description` |
| Tưởng symbol key bảo mật | Lấy được qua `getOwnPropertySymbols` | Dùng `#private` cho đóng gói thật |
| Mong `Object.keys` thấy symbol | Bị bỏ qua | `Reflect.ownKeys` / `getOwnPropertySymbols` |
| `Symbol("x") === Symbol("x")` | Luôn `false` | Dùng `Symbol.for("x")` nếu cần chia sẻ |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Output?
> ```js
> const obj = { [Symbol("id")]: 1, name: "Hiệp" };
> console.log(Object.keys(obj).length);
> console.log(JSON.stringify(obj));
> ```

> [!TIP]
> **Đáp án:** `1` và `'{"name":"Hiệp"}'`. Symbol key bị **bỏ qua** bởi cả `Object.keys` lẫn `JSON.stringify` — chỉ còn property `name`.

> [!NOTE]
> **Câu 2:** `a === b` và `c === d` cho gì?
> ```js
> const a = Symbol("x"), b = Symbol("x");
> const c = Symbol.for("x"), d = Symbol.for("x");
> ```

> [!TIP]
> **Đáp án:** `false` rồi `true`. `Symbol("x")` luôn tạo symbol **mới** (a ≠ b). `Symbol.for("x")` lấy lại symbol **chung** từ global registry theo key (c === d).

---

## Cheat sheet

> [!IMPORTANT]
> 1. `Symbol` là **primitive** tạo giá trị **tuyệt đối duy nhất**; mô tả chỉ để debug, không ảnh hưởng tính duy nhất.
> 2. Gọi `Symbol()` (không `new`); symbol không tự ép sang string → dùng `String(sym)`.
> 3. Dùng làm **property key không đụng độ**; viết `obj[SYM]` (bracket).
> 4. Symbol key **ẩn** với `Object.keys`/`for...in`/`JSON.stringify`; lấy qua `getOwnPropertySymbols`/`Reflect.ownKeys`. **Không phải** bảo mật.
> 5. **Well-known symbols** (`Symbol.iterator`, `Symbol.toPrimitive`...) = hook tuỳ biến hành vi ngôn ngữ.
> 6. `Symbol.for(key)` chia sẻ symbol toàn cục theo tên; `Symbol.keyFor` tra ngược tên.

---

## Bài liên quan

- [Generators & Iterators](/advanced/generators-iterators/)
- [Kiểu dữ liệu](/fundamentals/data-types/)
- [Object](/objects-prototypes/object/)
- [Class](/objects-prototypes/class/)
