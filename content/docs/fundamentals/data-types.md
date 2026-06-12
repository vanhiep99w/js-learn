---
title: "Kiểu dữ liệu & null / undefined / NaN"
description: "Kiểu dữ liệu trong JavaScript: 7 primitive (string, number, boolean, null, undefined, symbol, bigint) vs object/reference type, lưu theo giá trị vs theo tham chiếu, pass-by-value vs pass-by-reference, phân biệt null/undefined/NaN, typeof và các cách kiểm tra kiểu chính xác, đặc thù số floating point IEEE-754, MAX_SAFE_INTEGER và BigInt. Kèm sơ đồ bộ nhớ stack/heap, bảng typeof và pitfalls."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Primitive vs Reference](#primitive-vs-reference)
- [Lưu trong bộ nhớ: stack vs heap](#lưu-trong-bộ-nhớ-stack-vs-heap)
- [Copy & so sánh](#copy--so-sánh)
- [null vs undefined vs NaN](#null-vs-undefined-vs-nan)
- [typeof & kiểm tra kiểu đúng cách](#typeof--kiểm-tra-kiểu-đúng-cách)
- [Đặc thù của Number](#đặc-thù-của-number)
- [Đào sâu internal: primitive "có method" như thế nào](#đào-sâu-internal-primitive-có-method-như-thế-nào)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

JavaScript có **8 kiểu dữ liệu**: 7 kiểu *primitive* và 1 kiểu *object*.

| Nhóm | Kiểu | Ví dụ |
|------|------|-------|
| Primitive | `string` | `"hello"` |
| Primitive | `number` | `42`, `3.14`, `NaN`, `Infinity` |
| Primitive | `boolean` | `true`, `false` |
| Primitive | `null` | `null` |
| Primitive | `undefined` | `undefined` |
| Primitive | `symbol` (ES6) | `Symbol("id")` |
| Primitive | `bigint` (ES2020) | `9007199254740993n` |
| Object | `object` | `{}`, `[]`, `function(){}`, `new Date()` |

Điểm mấu chốt: **primitive lưu theo giá trị, object lưu theo tham chiếu (reference)**. Toàn bộ hành vi copy, so sánh, truyền tham số đều bắt nguồn từ khác biệt này.

---

## Primitive vs Reference

- **Primitive** là **immutable** (bất biến) và được **copy theo giá trị**. Khi gán hoặc truyền đi, JS sao chép *bản thân giá trị*.
- **Reference type** (object, array, function) được **copy theo tham chiếu**. Biến không chứa object — nó chứa một *con trỏ* tới object nằm trong heap.

```js
// Primitive: copy giá trị
let a = 10;
let b = a;     // b nhận BẢN SAO của 10
b = 20;
console.log(a); // 10 — a không đổi

// Reference: copy tham chiếu
let o1 = { x: 1 };
let o2 = o1;   // o2 trỏ TỚI CÙNG object với o1
o2.x = 99;
console.log(o1.x); // 99 — cùng một object!
```

---

## Lưu trong bộ nhớ: stack vs heap

```text
        STACK (giá trị + tham chiếu)          HEAP (object thực)
        ────────────────────────────          ──────────────────
  a  →  10                                
  b  →  20                                
  o1 →  ref#001 ───────────────────────▶   ┌──────────────┐
  o2 →  ref#001 ───────────────────────▶   │ { x: 99 }    │  ← o1 & o2 cùng trỏ vào
                                            └──────────────┘
```

- `a`, `b` chứa trực tiếp giá trị số trên stack → độc lập nhau.
- `o1`, `o2` chứa *cùng* một tham chiếu `ref#001` → cùng trỏ vào một object trong heap. Sửa qua biến nào cũng đổi chung object.

> [!IMPORTANT]
> Đây là gốc rễ của rất nhiều bug "tôi sửa biến này sao biến kia cũng đổi". Khi truyền object vào hàm rồi mutate nó, thay đổi *thoát ra ngoài* hàm vì cả hai cùng trỏ một object.

---

## Copy & so sánh

### So sánh

Primitive so sánh theo **giá trị**; object so sánh theo **danh tính tham chiếu** (có cùng trỏ một object không), *không* phải theo nội dung.

```js
console.log(1 === 1);                 // true
console.log("a" === "a");             // true
console.log({} === {});               // false — hai object khác nhau
console.log([1,2] === [1,2]);         // false — khác tham chiếu

const x = { id: 1 };
const y = x;
console.log(x === y);                 // true — cùng tham chiếu
```

### Shallow copy vs Deep copy

Sao chép object cần cẩn thận vì spread/`Object.assign` chỉ copy **nông** (một cấp):

```js
const original = { a: 1, nested: { b: 2 } };

// Shallow copy — nested vẫn dùng chung
const shallow = { ...original };
shallow.nested.b = 99;
console.log(original.nested.b);  // 99  — bị ảnh hưởng!

// Deep copy — tách hoàn toàn (structuredClone, ES2022)
const deep = structuredClone(original);
deep.nested.b = 7;
console.log(original.nested.b);  // 99  — không ảnh hưởng từ deep
```

| Cách | Mức copy | Ghi chú |
|------|----------|---------|
| `=` | Không copy (cùng ref) | Hai biến trỏ cùng object |
| `{...obj}` / `Object.assign` | Shallow (1 cấp) | Object lồng vẫn dùng chung |
| `structuredClone(obj)` | Deep | Hỗ trợ Date, Map, Set... (không copy function) |
| `JSON.parse(JSON.stringify())` | Deep (hạn chế) | Mất `undefined`, `Date` thành string, không có function |

---

## null vs undefined vs NaN

Ba "giá trị vắng mặt" hay bị nhầm:

| Giá trị | Ý nghĩa | Ai gán | `typeof` |
|---------|---------|--------|----------|
| `undefined` | Chưa có giá trị / chưa khởi tạo | JS (mặc định) | `"undefined"` |
| `null` | "Cố ý không có giá trị" / rỗng | Lập trình viên | `"object"` (bug lịch sử) |
| `NaN` | "Not a Number" — kết quả số không hợp lệ | JS | `"number"` |

```js
let a;                       // undefined — chưa gán
let b = null;                // null — cố ý rỗng
let c = "abc" * 2;           // NaN — phép số vô nghĩa
let d = {};
console.log(d.notExist);     // undefined — property không tồn tại

console.log(null == undefined);   // true  (loose — coi như "tương đương rỗng")
console.log(null === undefined);  // false (strict — khác kiểu)
```

### NaN — kẻ kỳ dị

`NaN` là giá trị **duy nhất trong JS không bằng chính nó**:

```js
console.log(NaN === NaN);        // false (!!!)
console.log(Number.isNaN(NaN));  // true  — cách kiểm tra đúng
```

> [!WARNING]
> Vì `NaN !== NaN`, đừng bao giờ kiểm tra `x === NaN` (luôn `false`). Dùng `Number.isNaN(x)`. Tránh `isNaN()` toàn cục vì nó ép kiểu trước (`isNaN("abc")` trả `true` gây hiểu nhầm).

> [!TIP]
> Quy ước thực tế giữa `null` và `undefined`: **đừng tự tay gán `undefined`** cho biến — đó vốn là giá trị *mặc định* JS dùng cho "chưa khởi tạo". Khi bạn muốn **chủ động** xoá/reset một biến (báo hiệu "tôi cố tình để trống chỗ này"), hãy gán `null`. Nhờ vậy `undefined` luôn mang nghĩa "JS chưa đụng tới", còn `null` mang nghĩa "lập trình viên cố ý làm rỗng".

---

## typeof & kiểm tra kiểu đúng cách

`typeof` nhanh nhưng có hai cái bẫy: `typeof null === "object"` và `typeof []` cũng là `"object"`.

```js
typeof "hi"        // "string"
typeof 42          // "number"
typeof true        // "boolean"
typeof undefined   // "undefined"
typeof 10n         // "bigint"
typeof Symbol()    // "symbol"
typeof function(){} // "function"  — đặc biệt
typeof null        // "object"     ← BUG lịch sử, không sửa được
typeof []          // "object"     — array vẫn là object
typeof {}          // "object"
```

Cách kiểm tra **chính xác** cho từng nhu cầu:

```js
Array.isArray([1,2]);                       // true  — phân biệt array
value === null;                             // true  — kiểm tra null
Number.isNaN(value);                        // kiểm tra NaN an toàn
Number.isInteger(value);                    // kiểm tra số nguyên
Object.prototype.toString.call(value);      // "[object Date]", "[object Null]"...
```

> [!TIP]
> `Object.prototype.toString.call(x)` là cách "vạn năng" để lấy kiểu chính xác: trả về `"[object Array]"`, `"[object Null]"`, `"[object Date]"`... — vượt qua mọi giới hạn của `typeof`.

---

## Đặc thù của Number

JavaScript chỉ có **một** kiểu số: `number`, lưu dưới dạng **floating point 64-bit (IEEE-754)**. Hệ quả:

### 1. Sai số dấu phẩy động

```js
console.log(0.1 + 0.2);            // 0.30000000000000004
console.log(0.1 + 0.2 === 0.3);    // false
// Cách so sánh an toàn:
console.log(Math.abs((0.1 + 0.2) - 0.3) < Number.EPSILON);  // true
```

**Vì sao?** Số nguyên đổi sang nhị phân gọn gàng, nhưng nhiều số thập phân lại lặp vô hạn trong hệ nhị phân — máy buộc phải cắt bớt, sinh sai số:

```js
(4).toString(2);     // "100"  — số nguyên: gọn
(0.2).toString(2);   // "0.001100110011001100110011001100110011001100110011001101"
                     //          ↑ chuỗi "0011" lặp mãi → phải làm tròn
```

Khi *hiển thị* (không phải so sánh), dùng `toFixed(n)` để cắt số chữ số thập phân:

```js
(0.1 + 0.2).toFixed(2);   // "0.30"  — trả về string, đã làm tròn
```

> [!NOTE]
> `toFixed` trả về **string**, không phải number, và chỉ nên dùng để hiển thị. Để *so sánh* hai số float, vẫn dùng `Number.EPSILON` như trên — đừng so sánh các chuỗi `toFixed`.

### 2. Giới hạn số nguyên an toàn

```js
console.log(Number.MAX_SAFE_INTEGER);     // 9007199254740991 (2^53 - 1)
console.log(9007199254740991 + 1);        // 9007199254740992
console.log(9007199254740991 + 2);        // 9007199254740992 ← sai!
```

### 3. BigInt cho số nguyên lớn

```js
const big = 9007199254740991n + 2n;       // hậu tố n
console.log(big);                          // 9007199254740993n  — chính xác
console.log(typeof big);                   // "bigint"
// Lưu ý: không trộn BigInt với Number trong cùng phép tính
// 1n + 1  → TypeError
```

### 4. Các giá trị số đặc biệt

```js
console.log(1 / 0);        // Infinity
console.log(-1 / 0);       // -Infinity
console.log(0 / 0);        // NaN
console.log(typeof Infinity); // "number"
```

---

## Đào sâu internal: primitive "có method" như thế nào

Một câu hỏi hay gây bối rối: nếu `"hello"` là *primitive* (không phải object), tại sao lại gọi được `"hello".toUpperCase()`? Câu trả lời: **autoboxing** (bọc tự động).

Khi bạn truy cập property/method trên một primitive, engine *tạm thời* bọc nó trong object wrapper tương ứng (`String`, `Number`, `Boolean`, `Symbol`, `BigInt`), gọi method, rồi **vứt bỏ** wrapper ngay:

```text
 "hello".toUpperCase()
   │ 1. tạo tạm new String("hello")   (wrapper object)
   │ 2. gọi .toUpperCase() trên wrapper → "HELLO"
   └ 3. hủy wrapper, trả về "HELLO"
```

Hệ quả: không thể gán thêm property cho primitive (vì wrapper bị vứt ngay):

```js
let s = "hi";
s.custom = 123;       // tạo wrapper tạm, gán, rồi vứt
console.log(s.custom); // undefined — wrapper cũ đã biến mất
```

> [!WARNING]
> Đừng *tự tay* dùng `new Number(5)`, `new String("x")`. Chúng tạo **object** (`typeof === "object"`), so sánh `===` với primitive luôn `false`, và `new Boolean(false)` là... **truthy**. Luôn dùng primitive trực tiếp; để engine lo việc boxing.

Cũng vì primitive **immutable**: mọi method như `toUpperCase`, `slice`, `trim` đều **trả về giá trị mới**, không sửa chuỗi gốc.

---

## Pitfalls

| Pitfall | Kết quả | Giải thích / Cách đúng |
|---------|---------|------------------------|
| `typeof null` | `"object"` | Bug lịch sử; dùng `x === null` |
| `typeof []` | `"object"` | Array là object; dùng `Array.isArray` |
| `NaN === NaN` | `false` | Dùng `Number.isNaN` |
| `0.1 + 0.2 === 0.3` | `false` | Sai số IEEE-754; so sánh với `Number.EPSILON` |
| `{...obj}` rồi sửa nested | Ảnh hưởng bản gốc | Shallow copy; dùng `structuredClone` |
| Truyền object vào hàm rồi mutate | Đổi cả bên ngoài | Copy trước khi sửa nếu cần |
| `1n + 1` | `TypeError` | Không trộn BigInt với Number |
| `isNaN("abc")` | `true` (gây nhầm) | Dùng `Number.isNaN` |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Output?
> ```js
> function tang(obj, n) { obj.x++; n++; }
> const o = { x: 1 };
> let num = 1;
> tang(o, num);
> console.log(o.x, num);
> ```

> [!TIP]
> **Đáp án:** `2 1`. `o` truyền **tham chiếu** → `obj.x++` sửa đúng object ngoài (`o.x = 2`). `num` là **primitive copy theo giá trị** → `n++` chỉ đổi bản sao bên trong hàm, `num` ngoài vẫn `1`.

> [!NOTE]
> **Câu 2:** Vì sao cả hai dòng đều `false`?
> ```js
> console.log(NaN === NaN);
> console.log([1,2] === [1,2]);
> ```

> [!TIP]
> **Đáp án:** `NaN` là giá trị duy nhất **không bằng chính nó** (theo IEEE-754) — dùng `Number.isNaN`. Hai `[1,2]` là **hai object khác tham chiếu** → `===` so danh tính, không so nội dung.

---

## Cheat sheet

> [!IMPORTANT]
> 1. **7 primitive** (copy theo giá trị, immutable) + **object** (copy theo tham chiếu).
> 2. Primitive so sánh theo **giá trị**; object so theo **danh tính tham chiếu** (không theo nội dung).
> 3. `{...obj}`/`Object.assign` = **shallow** (1 cấp); deep thì dùng `structuredClone`.
> 4. `null` = cố ý rỗng (lập trình viên gán); `undefined` = chưa khởi tạo (JS gán); `NaN !== NaN` → dùng `Number.isNaN`.
> 5. `typeof null === "object"` và `typeof [] === "object"` — dùng `x === null` / `Array.isArray`.
> 6. Number là **IEEE-754 64-bit** → `0.1 + 0.2 !== 0.3` (so bằng `Number.EPSILON`); số nguyên lớn dùng **BigInt**.

---

## Bài liên quan

- [Truthy & Falsy](/fundamentals/truthy-falsy/)
- [Toán tử & == vs ===](/fundamentals/operators/)
- [var, let, const](/fundamentals/var-let-const/)
