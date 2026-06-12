---
title: "Pure Functions & Side Effects"
description: "Pure function và side effect trong JavaScript: hàm thuần khiết luôn cho cùng output với cùng input và không gây tác dụng phụ, referential transparency, các loại side effect (mutate biến ngoài, I/O, HTTP, DOM), vì sao mutate tham số object/array là side effect ẩn, lợi ích (test, cache, đoán trước), và cách cô lập side effect ra rìa chương trình. Kèm ví dụ chạy được và best practices."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Hai điều kiện của pure function](#hai-điều-kiện-của-pure-function)
- [Side effect là gì](#side-effect-là-gì)
- [Mutate tham số — side effect ẩn](#mutate-tham-số--side-effect-ẩn)
- [Referential transparency](#referential-transparency)
- [Lợi ích của pure function](#lợi-ích-của-pure-function)
- [Cô lập side effect](#cô-lập-side-effect)
- [Pitfalls](#pitfalls)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**Pure function (hàm thuần khiết)** là hàm mà với *cùng một input* sẽ *luôn* trả về *cùng một output*, và **không gây tác dụng phụ** (side effect) nào lên thế giới bên ngoài.

```js
function add(a, b) {
  return a + b;
}
add(1, 5);   // 6
add(1, 5);   // 6 — luôn cho cùng kết quả, không đụng gì bên ngoài
```

Đây là khái niệm trung tâm của lập trình hàm và là lý do code dễ test, dễ đoán, dễ cache.

---

## Hai điều kiện của pure function

Một hàm là *pure* khi thoả **cả hai**:

1. **Deterministic** — cùng input → cùng output, mọi lúc. Không phụ thuộc trạng thái ngoài (biến global, thời gian, random, I/O).
2. **No side effect** — không thay đổi gì ngoài phạm vi của nó (không sửa biến ngoài, không ghi DOM, không gọi mạng, không log...).

```js
// PURE ✅
const double = (x) => x * 2;

// KHÔNG pure ❌ — phụ thuộc biến ngoài (vi phạm điều kiện 1)
let factor = 2;
const mul = (x) => x * factor;   // đổi factor → đổi output dù cùng x

// KHÔNG pure ❌ — phụ thuộc thứ thay đổi (Date.now, Math.random)
const now = () => Date.now();    // mỗi lần gọi một kết quả
```

---

## Side effect là gì

**Side effect** là khi một hàm làm thay đổi (hoặc phụ thuộc vào) trạng thái *ngoài* phạm vi cục bộ của nó. Các dạng thường gặp:

- Sửa biến global / biến ngoài.
- Mutate tham số được truyền vào (object, array).
- Gọi I/O: HTTP request, đọc/ghi file, ghi database.
- Thao tác DOM, `console.log`, `alert`.
- Đọc/ghi thứ thay đổi: `Date.now()`, `Math.random()`.

```js
let total = 0;
function addToTotal(n) {
  total += n;     // side effect: sửa biến ngoài
}
addToTotal(5);    // total = 5 — gọi lại sẽ ra khác
```

> [!NOTE]
> Side effect **không xấu** — chương trình thực tế *phải* có side effect (hiển thị UI, lưu DB...). Vấn đề là *kiểm soát* chúng: giữ phần lõi logic thuần khiết, đẩy side effect ra rìa.

---

## Mutate tham số — side effect ẩn

Đây là cái bẫy hay gặp nhất: hàm nhận object/array rồi *sửa thẳng* lên nó. Vì object/array truyền theo **tham chiếu** (xem [Kiểu dữ liệu](/fundamentals/data-types/)), hàm vô tình thay đổi dữ liệu gốc của người gọi:

```js
const arr = [1, 2];
function addNumberToArr(arr, number) {
  arr.push(number);     // side effect: mutate mảng GỐC
}
addNumberToArr(arr, 1);
console.log(arr);        // [1, 2, 1] — mảng gốc đã bị đổi!

// PURE: trả về mảng MỚI, không đụng gốc
function withNumber(arr, number) {
  return [...arr, number];
}
const arr2 = [1, 2];
const result = withNumber(arr2, 3);   // result = [1,2,3]
console.log(arr2);                      // [1, 2] — gốc nguyên vẹn
```

```text
Mutate (side effect):              Pure (immutable):
  arr ─┐                             arr ─────────▶ [1,2]  (không đổi)
       ▼                             return ──────▶ [1,2,3] (mảng mới)
  push → [1,2,1]  ← cùng 1 mảng
```

> [!WARNING]
> Các method **mutate** mảng: `push`, `pop`, `shift`, `unshift`, `splice`, `sort`, `reverse`. Các method **trả mảng mới** (an toàn cho pure): `map`, `filter`, `slice`, `concat`, `[...spread]`. Khi viết hàm pure, ưu tiên nhóm sau.

---

## Referential transparency

Pure function có tính **referential transparency**: bạn có thể thay lời gọi hàm bằng *kết quả* của nó mà chương trình không đổi hành vi.

```js
const square = (x) => x * x;
// square(4) luôn = 16, nên:
const a = square(4) + square(4);   // tương đương 16 + 16
const b = 16 + 16;                  // hoàn toàn thay thế được
```

Chính nhờ tính chất này mà compiler/engine có thể tối ưu, và ta có thể **memoize** (cache) an toàn — xem [Higher-order Functions](/function-closure/higher-order-functions/).

---

## Lợi ích của pure function

| Lợi ích | Vì sao |
|---------|--------|
| Dễ test | Chỉ cần input → assert output, không cần mock/môi trường |
| Dễ đoán & debug | Không phụ thuộc trạng thái ẩn; lỗi tái hiện được |
| Cache/memoize an toàn | Cùng input luôn cùng output |
| Dễ song song hoá | Không tranh chấp trạng thái chia sẻ |
| Dễ tái sử dụng & compose | Ghép pipeline không lo tác dụng phụ |

---

## Cô lập side effect

Triết lý thực tế: **functional core, imperative shell** — giữ phần tính toán thuần khiết, dồn side effect ra biên (đầu vào/đầu ra của chương trình).

```js
// Lõi thuần khiết: chỉ tính toán
function calculateTotal(items) {
  return items.reduce((sum, item) => sum + item.price, 0);
}

// Vỏ có side effect: I/O, DOM tách riêng
function renderTotal(items) {
  const total = calculateTotal(items);   // gọi phần pure
  document.getElementById("total").textContent = total;  // side effect ở rìa
}
```

> [!TIP]
> Khi một hàm khó test (phải mock mạng, DOM, thời gian...), đó thường là dấu hiệu nó trộn logic với side effect. Tách phần tính toán ra thành hàm pure, để side effect ở lớp ngoài cùng.

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| `push`/`sort`/`splice` trên tham số | Mutate dữ liệu gốc của caller | Dùng `map`/`filter`/`slice`/spread |
| Đọc biến global trong hàm | Không deterministic | Truyền vào qua tham số |
| Dùng `Date.now()`/`Math.random()` trong lõi | Output thay đổi | Truyền giá trị vào từ ngoài |
| Trộn I/O với tính toán | Khó test, khó tái dùng | Tách pure core / impure shell |
| Tưởng `sort()` trả mảng mới | `sort` mutate tại chỗ | `[...arr].sort()` |

---

## Bài liên quan

- [Higher-order Functions](/function-closure/higher-order-functions/)
- [Kiểu dữ liệu & null/undefined/NaN](/fundamentals/data-types/)
- [Hàm cơ bản](/function-closure/function-basics/)
- [Factory Functions](/function-closure/factory-functions/)
- [Object](/objects-prototypes/object/)
