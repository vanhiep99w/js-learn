---
title: "Object"
description: "Object trong JavaScript: tạo object (literal, computed key, shorthand), truy cập property (dot vs bracket), thêm/sửa/xoá property, thứ tự property (key số bị sắp xếp), property descriptor (writable/enumerable/configurable), Object.keys/values/entries, copy nông & sâu, so sánh tham chiếu, đóng băng với Object.freeze. Kèm ví dụ chạy được, bảng và best practices."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Tạo object](#tạo-object)
- [Truy cập property: dot vs bracket](#truy-cập-property-dot-vs-bracket)
- [Thêm / sửa / xoá property](#thêm--sửa--xoá-property)
- [Thứ tự property](#thứ-tự-property)
- [Property descriptor](#property-descriptor)
- [Duyệt object](#duyệt-object)
- [Copy & so sánh object](#copy--so-sánh-object)
- [Đóng băng object](#đóng-băng-object)
- [Pitfalls](#pitfalls)
- [Tự kiểm tra](#tự-kiểm-tra)
- [Cheat sheet](#cheat-sheet)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

**Object** là cấu trúc dữ liệu cốt lõi của JavaScript: một tập hợp các cặp **key → value** (property). Gần như mọi thứ trong JS không phải [primitive](/fundamentals/data-types/) đều là object — kể cả mảng và hàm.

```js
const person = {
  name: "Hiệp",
  age: 25,
  greet() {
    return `Xin chào, tôi là ${this.name}`;
  },
};
```

Object được lưu và truyền theo **tham chiếu** (reference) — điểm này chi phối cách copy và so sánh, sẽ bàn bên dưới.

---

## Tạo object

```js
// 1. Object literal (phổ biến nhất)
const a = { name: "oc", age: 10 };

// 2. Key đặc biệt (có dấu gạch, khoảng trắng) → để trong nháy
const b = { "first-name": "Trần", "full name": "Trần Oc" };

// 3. Shorthand: biến trùng tên key
const name = "Hiệp";
const c = { name };          // tương đương { name: "Hiệp" }

// 4. Computed key: tên property tính từ biến
const key = "level";
const d = { [key]: 15 };     // { level: 15 }

// 5. Method shorthand
const e = { eat() { return "ăn"; } };
```

> [!NOTE]
> **Computed key** `[expr]` cho phép đặt tên property động từ một biến/biểu thức tại thời điểm tạo object — rất hữu ích khi key không cố định.

---

## Truy cập property: dot vs bracket

```js
const person = { name: "oc", "first-name": "Trần", age: 10 };

// Dot notation — key là tên hợp lệ, biết trước
person.name;            // "oc"

// Bracket notation — key đặc biệt hoặc động
person["first-name"];   // "Trần"  (dot không dùng được với gạch ngang)

const prop = "age";
person[prop];           // 10  — key lấy từ biến
```

| | Dùng khi |
|---|----------|
| `obj.key` | Key cố định, là tên hợp lệ (không gạch/khoảng trắng) |
| `obj["key"]` | Key có ký tự đặc biệt, hoặc tên key nằm trong biến |

Truy cập property không tồn tại trả về `undefined` (không lỗi):

```js
person.notExist;   // undefined
```

---

## Thêm / sửa / xoá property

```js
const p = { name: "oc" };

p.tall = "1.7m";        // THÊM property mới
p.name = "Hiệp";        // SỬA property có sẵn
delete p.tall;          // XOÁ hoàn toàn property
```

> [!WARNING]
> Gán `undefined` hoặc `null` **không xoá** property — key vẫn còn trong object (vẫn hiện khi `Object.keys`/`console.log`). Muốn xoá hẳn key phải dùng `delete`.

```js
const o = { a: 1 };
o.a = undefined;
"a" in o;        // true  — key vẫn tồn tại!
delete o.a;
"a" in o;        // false — đã xoá hẳn
```

---

## Thứ tự property

Thứ tự property thường **giữ nguyên thứ tự khai báo** — *trừ* các key dạng **số nguyên**, vốn bị tự động sắp xếp tăng dần và đứng trước:

```js
const obj = { b: 1, a: 2, 2: "x", 1: "y" };
Object.keys(obj);   // ["1", "2", "b", "a"]
//                      ↑số được sắp tăng dần & đẩy lên trước
//                              ↑chuỗi giữ thứ tự khai báo
```

> [!TIP]
> Nếu cần **giữ chính xác thứ tự chèn** với key bất kỳ (kể cả số), dùng `Map` thay cho object thường — `Map` không sắp xếp lại key.

---

## Property descriptor

Mỗi property thực ra có các "thuộc tính ẩn" (descriptor) điều khiển hành vi của nó:

| Descriptor | Ý nghĩa |
|------------|---------|
| `value` | Giá trị |
| `writable` | Có gán đè được không |
| `enumerable` | Có hiện khi duyệt (`for...in`, `Object.keys`) không |
| `configurable` | Có xoá / đổi descriptor được không |

```js
const obj = {};
Object.defineProperty(obj, "id", {
  value: 42,
  writable: false,      // không cho sửa
  enumerable: false,    // ẩn khi duyệt
});
obj.id = 99;            // (silent fail ở sloppy mode)
obj.id;                 // 42
Object.keys(obj);       // [] — id bị ẩn
```

Property tạo theo cách thường (`obj.x = 1`) mặc định có cả ba cờ là `true`.

---

## Duyệt object

```js
const user = { name: "Hiệp", age: 25 };

Object.keys(user);     // ["name", "age"]
Object.values(user);   // ["Hiệp", 25]
Object.entries(user);  // [["name","Hiệp"], ["age",25]]

for (const [key, value] of Object.entries(user)) {
  console.log(key, value);
}

// for...in duyệt cả property kế thừa từ prototype → cẩn thận
for (const key in user) {
  if (Object.hasOwn(user, key)) {   // lọc property của riêng object
    console.log(key);
  }
}
```

> [!NOTE]
> `for...in` duyệt cả property **kế thừa** qua [prototype chain](/objects-prototypes/prototype/). Dùng `Object.hasOwn(obj, key)` (hoặc `obj.hasOwnProperty`) để chỉ lấy property của riêng object. `Object.keys` thì chỉ trả property own + enumerable.

---

## Copy & so sánh object

Object so sánh theo **tham chiếu**, không theo nội dung:

```js
{ a: 1 } === { a: 1 };          // false — hai object khác địa chỉ
const x = { a: 1 };
const y = x;
x === y;                         // true — cùng tham chiếu
```

Copy nông (shallow) vs sâu (deep) — xem chi tiết ở [Kiểu dữ liệu](/fundamentals/data-types/):

```js
const original = { a: 1, nested: { b: 2 } };

const shallow = { ...original };          // nested vẫn DÙNG CHUNG
shallow.nested.b = 99;
original.nested.b;                         // 99 — bị ảnh hưởng!

const deep = structuredClone(original);    // copy sâu, độc lập hoàn toàn
```

---

## Đóng băng object

```js
const config = Object.freeze({ apiUrl: "/api", retries: 3 });
config.retries = 5;       // bị bỏ qua (lỗi ở strict mode)
config.retries;           // 3 — không đổi được

Object.isFrozen(config);  // true
```

> [!WARNING]
> `Object.freeze` chỉ đóng băng **một cấp** (shallow). Object lồng bên trong vẫn sửa được. Muốn đóng băng sâu phải freeze đệ quy.

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| Gán `undefined` để "xoá" property | Key vẫn còn | Dùng `delete` |
| So sánh object bằng `===` theo nội dung | Luôn `false` (khác tham chiếu) | So sánh từng field hoặc deep-equal |
| Spread `{...obj}` để copy object lồng | Chỉ copy nông | `structuredClone` cho copy sâu |
| Kỳ vọng key số giữ thứ tự chèn | Key số bị sắp tăng dần | Dùng `Map` |
| `for...in` lấy luôn property kế thừa | Lẫn property prototype | Lọc bằng `Object.hasOwn` |

---

## Tự kiểm tra

> [!NOTE]
> **Câu 1:** `Object.keys` trả về gì, theo thứ tự nào?
> ```js
> const o = { b: 1, 2: "x", a: 2, 1: "y" };
> console.log(Object.keys(o));
> ```

> [!TIP]
> **Đáp án:** `["1", "2", "b", "a"]`. Key dạng **số nguyên** bị sắp tăng dần và đẩy lên trước; key chuỗi giữ thứ tự khai báo. Cần giữ đúng thứ tự chèn → dùng `Map`.

> [!NOTE]
> **Câu 2:** Sau đoạn này, `original.nested.b` bằng bao nhiêu?
> ```js
> const original = { a: 1, nested: { b: 2 } };
> const copy = { ...original };
> copy.nested.b = 99;
> ```

> [!TIP]
> **Đáp án:** `99`. Spread `{...}` chỉ copy **nông** → `copy.nested` và `original.nested` vẫn là cùng một object. Cần độc lập → `structuredClone(original)`.

---

## Cheat sheet

> [!IMPORTANT]
> 1. Object = tập **key → value**, lưu & truyền theo **tham chiếu**.
> 2. `obj.key` cho key cố định hợp lệ; `obj["key"]`/`obj[bien]` cho key đặc biệt hoặc động.
> 3. Gán `undefined` **không xóa** key → dùng `delete`.
> 4. Key số bị sắp tăng dần; cần giữ thứ tự chèn → `Map`.
> 5. `===` so sánh **tham chiếu**, không so nội dung. Copy: `{...}`/`Object.assign` (nông), `structuredClone` (sâu).
> 6. `for...in` lấy cả property **kế thừa** → lọc bằng `Object.hasOwn`. `Object.freeze` chỉ đóng băng **1 cấp**.

---

## Bài liên quan

- [Prototype & kế thừa](/objects-prototypes/prototype/)
- [Getter & Setter](/objects-prototypes/getter-setter/)
- [Kiểu dữ liệu & null/undefined/NaN](/fundamentals/data-types/)
- [Constructor Function](/objects-prototypes/constructor-function/)
