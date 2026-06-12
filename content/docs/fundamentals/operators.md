---
title: "Toán tử & == vs ==="
description: "Toán tử trong JavaScript: so sánh == (abstract equality, type coercion) vs === (strict equality), thuật toán ép kiểu khi so sánh, optional chaining ?., nullish coalescing ?? và ??=, &&= / ||=, spread vs rest (...), toán tử đặc biệt typeof / instanceof / in / void / delete, operator precedence, và các pitfall kinh điển như [] == ![]. Kèm bảng quy tắc coercion, ví dụ chạy được và best practices."
---

## Mục lục

- [Tổng quan & phân nhóm](#tổng-quan--phân-nhóm)
- [== vs === (coercion)](#-vs---coercion)
- [Quy tắc ép kiểu khi so sánh](#quy-tắc-ép-kiểu-khi-so-sánh)
- [Optional chaining `?.`](#optional-chaining-)
- [Nullish coalescing `??` và `??=`](#nullish-coalescing--và-)
- [Logical assignment `&&=` `||=`](#logical-assignment--)
- [Spread vs Rest `...`](#spread-vs-rest-)
- [Toán tử đặc biệt: typeof, instanceof, in, void, delete](#toán-tử-đặc-biệt-typeof-instanceof-in-void-delete)
- [Operator precedence](#operator-precedence)
- [Đào sâu internal: `+` và ToPrimitive](#đào-sâu-internal--và-toprimitive)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan & phân nhóm

Toán tử là "động từ" của JavaScript. Ngoài các nhóm quen thuộc (số học, gán, so sánh, logic), JS có nhiều toán tử đặc biệt mà hiểu sai sẽ dẫn tới bug khó truy.

| Nhóm | Toán tử |
|------|---------|
| Số học | `+ - * / % ** ++ --` |
| Gán | `= += -= *= /= **=` |
| So sánh | `== === != !== > < >= <=` |
| Logic | `&& || ! ??` |
| Truy cập an toàn | `?.` |
| Gán logic | `&&= ||= ??=` |
| Trải/gom | `...` (spread / rest) |
| Đặc biệt | `typeof instanceof in void delete` |

> [!NOTE]
> Nguồn bug kinh điển nhất trong nhóm này là **`==` với type coercion**. Quy tắc số 1: mặc định luôn dùng `===`.

---

## == vs === (coercion)

- `===` (**strict equality**): so sánh **không** ép kiểu. Khác kiểu → luôn `false`.
- `==` (**abstract / loose equality**): **ép kiểu** hai vế về cùng kiểu *rồi mới* so sánh.

```js
console.log(1 === 1);      // true
console.log(1 === "1");    // false — khác kiểu, không ép
console.log(1 == "1");     // true  — "1" được ép thành số 1
console.log(0 == false);   // true  — false ép thành 0
console.log(null == undefined);  // true  (trường hợp đặc biệt)
console.log(null === undefined); // false — khác kiểu
```

> [!IMPORTANT]
> **Mặc định luôn dùng `===` và `!==`.** Ngoại lệ hữu ích duy nhất của `==`: `x == null` để kiểm tra "null *hoặc* undefined" cùng lúc (vì `null == undefined` là `true`).

---

## Quy tắc ép kiểu khi so sánh

Khi `==` gặp hai kiểu khác nhau, engine áp các quy tắc của thuật toán *Abstract Equality Comparison*:

| Vế trái | Vế phải | Cách xử lý |
|---------|---------|-----------|
| `null` | `undefined` | → `true` (và ngược lại) |
| number | string | string → number rồi so sánh |
| boolean | bất kỳ | boolean → number (`true`→1, `false`→0) rồi so sánh |
| object | primitive | object → primitive (gọi `valueOf`/`toString`) rồi so sánh |
| `NaN` | bất kỳ | luôn `false` |

```js
console.log("" == 0);        // true  — "" → 0
console.log("0" == 0);       // true  — "0" → 0
console.log("" == "0");      // false — cả hai là string, so sánh trực tiếp
console.log(true == 1);      // true  — true → 1
console.log(true == 2);      // false — true → 1, khác 2
console.log([] == 0);        // true  — [] → "" → 0
console.log([1] == 1);       // true  — [1] → "1" → 1
```

```text
[] == ![]   →   ?
  ├─ ![]      = false           (array truthy → ![] = false)
  ├─ [] == false
  ├─ false    → 0               (boolean → number)
  ├─ []       → "" → 0          (object → primitive → number)
  └─ 0 == 0   → true            ← kết quả gây sốc nhưng đúng quy tắc
```

> [!WARNING]
> `[] == ![]` trả về `true` — minh hoạ vì sao coercion của `==` khó lường. Tránh hoàn toàn bằng cách dùng `===`.

---

## Optional chaining `?.`

`?.` đọc property trong chuỗi mà **không cần kiểm tra `null`/`undefined` ở từng bước**. Nếu vế trái là `null`/`undefined`, biểu thức **dừng và trả về `undefined`** thay vì ném lỗi.

```js
const user = { profile: { name: "Hiệp" } };

console.log(user.profile?.name);        // "Hiệp"
console.log(user.account?.balance);     // undefined (không lỗi)
console.log(user.account.balance);      // ❌ TypeError: Cannot read properties of undefined

// Gọi hàm an toàn
user.sayHi?.();                          // không lỗi nếu sayHi không tồn tại

// Truy cập phần tử động
user.tags?.[0];                          // undefined nếu tags không tồn tại
```

> [!TIP]
> `?.` chỉ "ngắn mạch" khi gặp `null`/`undefined` — *không* nuốt mọi lỗi. `obj?.a.b` vẫn ném lỗi nếu `obj.a` tồn tại nhưng là `undefined` và bạn truy cập `.b`. Đặt `?.` đúng mắt xích có thể nullish.

---

## Nullish coalescing `??` và `??=`

`a ?? b` trả về `b` **chỉ khi** `a` là `null` hoặc `undefined`. Khác với `||` (vốn xét toàn bộ falsy).

```js
const port = 0;
console.log(port ?? 3000);   // 0    — 0 hợp lệ, không phải nullish
console.log(port || 3000);   // 3000 — 0 falsy

const name = null;
console.log(name ?? "Khách"); // "Khách"
```

`??=` (nullish assignment): gán giá trị **chỉ khi** biến hiện đang nullish — dùng để set giá trị mặc định.

```js
const config = { timeout: 0 };
config.timeout ??= 5000;     // giữ 0 (không nullish)
config.retries ??= 3;        // gán 3 (vốn undefined)
console.log(config);         // { timeout: 0, retries: 3 }
```

---

## Logical assignment `&&=` `||=`

Toán tử gán kết hợp logic, đánh giá short-circuit:

```js
let a = 1;
a &&= 5;     // a truthy → gán: a = 5
let b = 0;
b &&= 5;     // b falsy → giữ nguyên: b = 0

let c = 0;
c ||= 10;    // c falsy → gán: c = 10
let d = 2;
d ||= 10;    // d truthy → giữ nguyên: d = 2
```

| Toán tử | Gán khi vế trái... | Tương đương |
|---------|--------------------|-------------|
| `a ||= b` | falsy | `a || (a = b)` |
| `a &&= b` | truthy | `a && (a = b)` |
| `a ??= b` | nullish (`null`/`undefined`) | `a ?? (a = b)` |

---

## Spread vs Rest `...`

Cùng ký hiệu `...` nhưng **ngược nhau** tuỳ ngữ cảnh:

- **Spread** — *trải* một iterable/object thành các phần tử rời.
- **Rest** — *gom* nhiều phần tử rời thành một mảng/object.

```js
// SPREAD — trải ra
const arr = [1, 2, 3];
const copy = [...arr, 4];           // [1, 2, 3, 4]
const merged = { ...{a:1}, b: 2 };  // { a: 1, b: 2 }
Math.max(...arr);                   // 3 — trải mảng thành tham số

// REST — gom lại
function sum(...nums) {             // gom tham số thành mảng
  return nums.reduce((a, b) => a + b, 0);
}
sum(1, 2, 3);                       // 6

const [first, ...others] = [10, 20, 30];  // first=10, others=[20,30]
const { id, ...info } = { id: 1, name: "A", age: 2 }; // info={name,age}
```

| | Vị trí | Vai trò |
|---|--------|---------|
| Spread | Khi *gọi*/tạo array/object | Trải phần tử ra |
| Rest | Khi *khai báo* tham số / destructuring | Gom phần tử lại |

> [!WARNING]
> Spread chỉ copy **nông** (shallow). `{...obj}` không nhân bản object lồng bên trong — chúng vẫn dùng chung tham chiếu. Xem [Kiểu dữ liệu](/fundamentals/data-types/).

---

## Toán tử đặc biệt: typeof, instanceof, in, void, delete

```js
// typeof — trả về string tên kiểu (xem bài Kiểu dữ liệu)
typeof 42;             // "number"
typeof undeclaredVar;  // "undefined" — KHÔNG ném lỗi dù biến chưa khai báo

// instanceof — kiểm tra object có nằm trong prototype chain của constructor
[] instanceof Array;       // true
[] instanceof Object;      // true
({}) instanceof Array;     // false

// in — kiểm tra property có tồn tại trong object (kể cả kế thừa)
"name" in { name: "A" };   // true
0 in [10, 20];             // true  — index 0 tồn tại
"length" in [];            // true  — kế thừa từ Array.prototype

// delete — xoá property của object
const o = { a: 1, b: 2 };
delete o.a;                // true; o = { b: 2 }

// void — luôn trả về undefined, bất kể biểu thức đi kèm trả về gì
void 0;                    // undefined
void (2);                  // undefined
void function () { return 5; }();  // undefined — nuốt cả giá trị return

// void + function expression: chạy IIFE một lần ngay lập tức
void function () {
  console.log("chạy ngay, không để lại tên hàm");
}();
```

| Toán tử | Dùng để | Trả về |
|---------|---------|--------|
| `typeof` | Lấy tên kiểu | string |
| `instanceof` | Kiểm tra prototype chain | boolean |
| `in` | Kiểm tra property tồn tại | boolean |
| `delete` | Xoá property | boolean |
| `void` | Ép biểu thức về `undefined` | `undefined` |

---

## Operator precedence

Toán tử có **độ ưu tiên** khác nhau — quyết định thứ tự đánh giá khi không có ngoặc. Một vài mức hay gặp (cao → thấp):

```text
()  ?.  []           ← truy cập / nhóm (cao nhất)
**                   ← luỹ thừa
*  /  %
+  -
<  <=  >  >=
==  ===  !=  !==
&&
||  ??
=  +=  ...            ← gán (thấp nhất)
```

```js
console.log(2 + 3 * 4);      // 14 — * trước +
console.log(2 ** 3 ** 2);    // 512 — ** kết hợp phải: 2 ** (3 ** 2)
console.log(true || false && false);  // true — && trước ||
```

> [!TIP]
> Đừng cố nhớ hết bảng precedence — **dùng ngoặc `()`** khi biểu thức phức tạp. Code rõ ràng quan trọng hơn ngắn gọn. JS còn cấm trộn `??` với `||`/`&&` mà không có ngoặc (`a ?? b || c` → SyntaxError) chính vì lý do dễ nhầm này.

---

## Đào sâu internal: `+` và ToPrimitive

Toán tử `+` gây bối rối nhất vì nó vừa là *cộng số* vừa là *nối chuỗi*. Engine quyết định theo thuật toán: trước hết **ép cả hai vế về primitive** (gọi `ToPrimitive`), rồi:

- Nếu **một trong hai** vế là **string** → nối chuỗi.
- Ngược lại → ép cả hai về number rồi cộng.

```js
1 + 2        // 3      (number + number)
'1' + 2      // '12'   (có string → nối)
1 + '2'      // '12'
1 + 2 + '3'  // '33'   (trái→phải: (1+2)=3, rồi 3+'3'='33')
'1' + 2 + 3  // '123'  ('1'+2='12', rồi '12'+3='123')
```

`ToPrimitive(obj)` gọi `obj.valueOf()` rồi `obj.toString()` (theo "hint"). Với hầu hết object, `valueOf` trả chính nó (không primitive) nên rơi xuống `toString`:

```text
 []  + 1
  ├ ToPrimitive([]) → valueOf trả [] (không primitive) → toString() = ""
  └ "" + 1 → "1"             (có string → nối)

 {} + []  → phụ thuộc ngữ cảnh (statement vs expression), dễ gây nhầm
```

Các toán tử số học khác (`-`, `*`, `/`, `%`) **không** có nghĩa nối chuỗi → luôn ép về number:

```js
'5' - 1   // 4    ('5' → 5)
'5' * 2   // 10
'abc' - 1 // NaN  (không ép được)
```

> [!IMPORTANT]
> Đây cũng là cơ chế phía sau `==` khi so object với primitive (bảng ở [Quy tắc ép kiểu](#quy-tắc-ép-kiểu-khi-so-sánh)) và sau trò `[] == ![]`. Hiểu `ToPrimitive` là hiểu gốc rễ của mọi "coercion magic".

---

## Pitfalls

| Pitfall | Kết quả bất ngờ | Cách tránh |
|---------|-----------------|------------|
| `1 == "1"` | `true` | Dùng `===` |
| `[] == ![]` | `true` | Dùng `===`, tránh coercion |
| `null == undefined` | `true` | Biết & tận dụng cho `x == null` |
| `count || default` khi `count=0` | mất giá trị `0` | Dùng `??` |
| `obj?.a.b` đặt `?.` sai chỗ | vẫn `TypeError` | Đặt `?.` đúng mắt xích nullish |
| `{...obj}` với object lồng | shallow copy, dùng chung ref | `structuredClone` nếu cần deep |
| `a ?? b || c` không ngoặc | `SyntaxError` | Thêm `()` rõ ràng |
| `2 ** 3 ** 2` tưởng `64` | thực ra `512` (kết hợp phải) | Dùng ngoặc |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** Output?
> ```js
> console.log(1 + 2 + '3');
> console.log('1' + 2 + 3);
> console.log('5' - 1);
> ```

> [!TIP]
> **Đáp án:** `'33'`, `'123'`, `4`. `+` tính trái→phải: `1+2=3` rồi `3+'3'='33'`; `'1'+2='12'` rồi `'12'+3='123'`. Còn `-` không nối chuỗi nên ép `'5'→5` → `4`.

> [!NOTE]
> **Câu 2:** Vì sao `obj?.a.b` vẫn có thể ném `TypeError`?
> ```js
> const obj = { a: undefined };
> console.log(obj?.a.b);
> ```

> [!TIP]
> **Đáp án:** Ném `TypeError`. `obj?.a` → `undefined` (không ngắn mạch vì `obj` *tồn tại*), nhưng rồi truy cập `.b` trên `undefined` → lỗi. `?.` chỉ bảo vệ **đúng mắt xích** đặt nó; cần `obj?.a?.b`.

---

## Cheat sheet

> [!IMPORTANT]
> 1. **Mặc định `===`/`!==`**; ngoại lệ hữu ích: `x == null` (bắt cả `null` và `undefined`).
> 2. `==` **ép kiểu** trước khi so → `[] == ![]` ra `true`. Tránh hoàn toàn bằng `===`.
> 3. `+` có string → **nối chuỗi**; các toán tử số khác luôn **ép number** (qua `ToPrimitive`).
> 4. `?.` ngắn mạch khi vế trái `null`/`undefined`; đặt đúng mắt xích nullish.
> 5. `||` xét falsy, `??` chỉ xét null/undefined; `??=`/`||=`/`&&=` là gán short-circuit.
> 6. `...` = **spread** (trải, khi gọi/tạo) vs **rest** (gom, khi khai báo/destructure); spread copy **nông**.
> 7. Biểu thức phức tạp → **dùng `()`** thay vì nhớ bảng precedence (`2 ** 3 ** 2 = 512`, kết hợp phải).

---

## Bài liên quan

- [Truthy & Falsy](/fundamentals/truthy-falsy/)
- [Kiểu dữ liệu & null / undefined / NaN](/fundamentals/data-types/)
- [var, let, const](/fundamentals/var-let-const/)
