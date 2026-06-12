---
title: "call / apply / bind"
description: "call, apply, bind trong JavaScript: ba cách set this tường minh, khác biệt giữa gọi-ngay (call/apply) và trả-hàm-mới (bind), call truyền tham số rời còn apply truyền mảng, partial application với bind, bind không tác dụng lên arrow function, và tự cài đặt lại bind/call để hiểu internal. Kèm bảng so sánh, ví dụ chạy được và pitfalls."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [call — gọi ngay, tham số rời](#call--gọi-ngay-tham-số-rời)
- [apply — gọi ngay, tham số mảng](#apply--gọi-ngay-tham-số-mảng)
- [bind — trả về hàm mới](#bind--trả-về-hàm-mới)
- [Partial application với bind](#partial-application-với-bind)
- [Bảng so sánh](#bảng-so-sánh)
- [Không tác dụng lên arrow function](#không-tác-dụng-lên-arrow-function)
- [Tự cài đặt để hiểu internal](#tự-cài-đặt-để-hiểu-internal)
- [Pitfalls](#pitfalls)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

`call`, `apply`, `bind` là ba method có sẵn trên *mọi* hàm (`Function.prototype`) cho phép bạn **chỉ định `this` một cách tường minh** — thay vì để JS tự suy theo call-site. Chúng giải quyết đúng vấn đề "[`this` bị mất khi tách method](/functions/this-keyword/)".

```js
const module = {
  x: 42,
  getX: function () { return this.x; },
};

const unboundGetX = module.getX;
unboundGetX();                       // undefined — this = global

const boundGetX = unboundGetX.bind(module);
boundGetX();                         // 42 — this = module
```

Khác biệt mấu chốt: **`call`/`apply` gọi hàm *ngay lập tức***, còn **`bind` *trả về một hàm mới*** (chưa gọi) với `this` đã "khoá".

---

## call — gọi ngay, tham số rời

`fn.call(thisArg, arg1, arg2, ...)` — set `this = thisArg` rồi gọi hàm ngay, tham số truyền **rời từng cái**.

```js
function intro(greeting, punct) {
  return `${greeting}, tôi là ${this.name}${punct}`;
}
const user = { name: "Hiệp" };

intro.call(user, "Xin chào", "!");   // "Xin chào, tôi là Hiệp!"
```

---

## apply — gọi ngay, tham số mảng

`fn.apply(thisArg, [arg1, arg2])` — giống `call` hoàn toàn, **chỉ khác**: tham số truyền dưới dạng **một mảng**.

```js
intro.apply(user, ["Hi", "."]);      // "Hi, tôi là Hiệp."

// apply tiện khi tham số đã ở dạng mảng:
const nums = [5, 1, 8, 3];
Math.max.apply(null, nums);          // 8
// (ngày nay dùng spread gọn hơn: Math.max(...nums))
```

> [!TIP]
> Mẹo nhớ: **a**pply → **a**rray (mảng), **c**all → **c**ommas (tham số ngăn cách bởi dấu phẩy). Từ ES6, spread `...` thường thay được `apply`.

---

## bind — trả về hàm mới

`fn.bind(thisArg, ...args)` **không gọi hàm**, mà trả về một **hàm mới** với `this` (và tham số đầu) đã được "khoá" sẵn. Gọi lúc nào tuỳ bạn.

```js
function getX() { return this.x; }
const obj = { x: 42 };

const bound = getX.bind(obj);   // chưa chạy, chỉ tạo hàm mới
bound();                        // 42 — chạy khi bạn muốn
```

Đây là lý do `bind` lý tưởng cho callback (truyền hàm đi nơi khác mà vẫn giữ đúng `this`):

```js
class Timer {
  constructor() { this.seconds = 0; }
  tick() { this.seconds++; }
  start() {
    setInterval(this.tick.bind(this), 1000);  // giữ this = instance
  }
}
```

---

## Partial application với bind

`bind` còn cho phép **khoá sẵn tham số đầu** (partial application). Tham số truyền khi *gọi* hàm bound sẽ **nối thêm vào sau**, không thay thế:

```js
function add(a, b) { return a + b; }

const add5 = add.bind(null, 5);   // khoá a = 5 (this = null vì không dùng)
add5(10);                          // 15  — b = 10 nối vào sau
add5(20);                          // 25
```

> [!NOTE]
> Lưu ý từ ghi chú gốc: khi `bind` đã truyền sẵn vài tham số, lúc gọi hàm mới mà truyền thêm tham số thì chúng **được nối thêm vào sau** các tham số đã bind — chứ *không* ghi đè. Đây chính là cơ chế của partial application.

---

## Bảng so sánh

| | Gọi ngay? | Tham số | Trả về | Dùng khi |
|---|:---:|---------|--------|----------|
| `call` | ✅ | rời (`a, b, c`) | kết quả hàm | gọi ngay với `this` chỉ định |
| `apply` | ✅ | mảng (`[a, b]`) | kết quả hàm | tham số đã ở dạng mảng |
| `bind` | ❌ | rời (khoá sẵn) | **hàm mới** | callback / partial application |

```text
call/apply:  fn ──set this──▶ CHẠY NGAY ──▶ kết quả
bind:        fn ──set this──▶ HÀM MỚI (chờ gọi) ──gọi sau──▶ kết quả
```

---

## Không tác dụng lên arrow function

Arrow function lấy `this` theo lexical context và **không thể bị đổi** bởi `call`/`apply`/`bind`. Tham số vẫn truyền được, nhưng `thisArg` bị bỏ qua:

```js
const arrow = () => this.x;
const obj = { x: 42 };

arrow.call(obj);    // KHÔNG phải 42 — this của arrow không đổi được
```

> [!WARNING]
> Nếu cần đổi `this`, hàm đó **phải là function thường**. Đừng cố `bind` một arrow function — vô tác dụng. Xem [Từ khoá this](/functions/this-keyword/).

---

## Tự cài đặt để hiểu internal

Viết lại `call` và `bind` giúp thấy rõ cơ chế "gắn hàm như method tạm thời của object":

```js
// myCall: gắn fn thành method tạm của thisArg rồi gọi
Function.prototype.myCall = function (thisArg, ...args) {
  thisArg = thisArg || globalThis;
  const key = Symbol("fn");
  thisArg[key] = this;          // this ở đây = hàm đang được gọi myCall
  const result = thisArg[key](...args);  // gọi như method → this = thisArg
  delete thisArg[key];
  return result;
};

// myBind: trả về hàm mới, dùng myCall bên trong, nối tham số
Function.prototype.myBind = function (thisArg, ...bound) {
  const fn = this;
  return function (...args) {
    return fn.myCall(thisArg, ...bound, ...args);  // nối bound + args
  };
};

function greet(g) { return `${g}, ${this.name}`; }
greet.myCall({ name: "An" }, "Hi");          // "Hi, An"
const b = greet.myBind({ name: "Bình" });
b("Chào");                                    // "Chào, Bình"
```

Bản chất: gọi `obj.method()` thì `this = obj`; `call` lợi dụng đúng điều đó bằng cách tạm gắn hàm làm property của `thisArg`.

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| Dùng `call` nhưng tham số là mảng | Truyền nhầm 1 mảng làm 1 tham số | Dùng `apply` hoặc spread |
| Quên `bind` không gọi ngay | Tưởng hàm đã chạy | Nhớ `bind` trả *hàm mới* |
| `bind`/`call` lên arrow function | Không đổi được `this` | Dùng function thường |
| `bind` nhiều lần | Lần bind sau không ghi đè lần đầu | `this` đã khoá ở lần `bind` đầu |
| Truyền tham số kỳ vọng ghi đè bound | Thực ra nối thêm vào sau | Hiểu rõ partial application |

---

## Bài liên quan

- [Từ khoá this](/functions/this-keyword/)
- [Hàm cơ bản](/functions/function-basics/)
- [Higher-order Functions](/functions/higher-order-functions/)
- [Factory Functions](/functions/factory-functions/)
