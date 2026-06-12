---
title: "Getter & Setter"
description: "Getter/setter trong JavaScript: dùng get/set để bind hàm khi đọc/ghi property (accessor property), this trong getter/setter trỏ về object chứa, quy tắc (getter 0 tham số, setter 1 tham số, không trùng getter, không getter cho property đã có), getter trong class, định nghĩa bằng Object.defineProperty, computed property cache, backing field, xoá getter. So sánh accessor vs data property. Kèm ví dụ chạy được, bảng và pitfalls."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Getter: get](#getter-get)
- [Setter: set](#setter-set)
- [this trong getter/setter](#this-trong-gettersetter)
- [Quy tắc của getter/setter](#quy-tắc-của-gettersetter)
- [Getter/Setter trong class](#gettersetter-trong-class)
- [Định nghĩa bằng Object.defineProperty](#định-nghĩa-bằng-objectdefineproperty)
- [Accessor property vs data property](#accessor-property-vs-data-property)
- [Pitfalls](#pitfalls)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

Bình thường property là **data property** — đọc/ghi trực tiếp giá trị. **Getter/setter** biến một property thành **accessor property**: đọc nó sẽ *gọi một hàm*, ghi nó cũng *gọi một hàm*. Bên ngoài nhìn như property thường, nhưng bên trong là logic.

```js
const obj = {
  log: ["a", "b", "c"],
  get latest() {                       // truy cập obj.latest → chạy hàm này
    return this.log[this.log.length - 1];
  },
};

obj.latest;   // "c" — gọi như property, KHÔNG có dấu ()
```

Dùng để: tính giá trị suy ra (derived), kiểm tra/validate khi gán, đóng gói logic mà vẫn giữ cú pháp property gọn gàng.

---

## Getter: get

Từ khoá `get` gắn một hàm chạy mỗi khi **đọc** property đó:

```js
const person = {
  firstName: "Hiệp",
  lastName: "Trần",
  get fullName() {
    return `${this.firstName} ${this.lastName}`;
  },
};

person.fullName;   // "Trần" → "Hiệp Trần" — đọc như property thường, không gọi ()
```

> [!NOTE]
> Theo ghi chú gốc: khi khai báo `get`, tên ngay sau nó được hiểu như **một property** của object và truy cập bằng `obj.tenProperty` (không có `()`). Mỗi lần đọc, hàm getter được gọi lại.

---

## Setter: set

Từ khoá `set` gắn một hàm chạy mỗi khi **gán** property đó. Hàm nhận đúng **1 tham số** là giá trị được gán:

```js
const language = {
  log: [],
  set current(name) {        // gán language.current = ... → chạy hàm này
    this.log.push(name);
  },
};

language.current = "EN";     // gọi setter với name = "EN"
language.current = "FA";
language.log;                // ["EN", "FA"]
```

Cặp get/set thường đi với một **backing field** (thường đặt tên có `_` hoặc `#`) để lưu giá trị thật và chèn logic validate:

```js
const account = {
  _balance: 0,
  get balance() { return this._balance; },
  set balance(value) {
    if (value < 0) throw new Error("Số dư không được âm");
    this._balance = value;
  },
};

account.balance = 100;   // OK
account.balance;         // 100
account.balance = -5;    // ❌ Error — setter chặn giá trị không hợp lệ
```

---

## this trong getter/setter

`this` bên trong getter/setter luôn trỏ về **object chứa property đó** — nên truy cập được các field khác của object:

```js
const rect = {
  width: 4,
  height: 3,
  get area() {
    return this.width * this.height;   // this = rect
  },
};
rect.area;   // 12
```

---

## Quy tắc của getter/setter

Theo ghi chú gốc, getter/setter phải tuân thủ:

| Quy tắc | Ví dụ sai |
|---------|-----------|
| Getter là hàm **0 tham số** | `get x(a) {}` ❌ |
| Setter là hàm **đúng 1 tham số** | `set x() {}` ❌ |
| Không khai báo **hai getter** cho cùng property | `{ get x(){}, get x(){} }` ❌ |
| Không tạo getter cho property **đã tồn tại** dưới dạng data | `{ x: 1, get x(){} }` ❌ |

Xoá một accessor property dùng `delete` như property thường:

```js
delete obj.latest;
```

---

## Getter/Setter trong class

Trong class, getter/setter đặt trên `prototype` (chia sẻ giữa instance), khai báo y như object literal:

```js
class Temperature {
  #celsius = 0;

  get celsius() { return this.#celsius; }
  set celsius(value) { this.#celsius = value; }

  get fahrenheit() { return this.#celsius * 1.8 + 32; }
  set fahrenheit(value) { this.#celsius = (value - 32) / 1.8; }
}

const t = new Temperature();
t.celsius = 25;
t.fahrenheit;     // 77 — tính từ celsius
t.fahrenheit = 212;
t.celsius;        // 100
```

> [!TIP]
> Getter/setter rất hợp với [private field](/objects-prototypes/class/) `#x`: ẩn dữ liệu thật, chỉ phơi bày qua accessor có kiểm soát — đóng gói đúng kiểu OOP.

---

## Định nghĩa bằng Object.defineProperty

Cách "thủ công" để thêm accessor vào object có sẵn:

```js
const obj = { _x: 1 };
Object.defineProperty(obj, "x", {
  get() { return this._x; },
  set(value) { this._x = value; },
  enumerable: true,
  configurable: true,
});

obj.x;        // 1
obj.x = 42;
obj._x;       // 42
```

---

## Accessor property vs data property

| | Data property | Accessor property (get/set) |
|---|---------------|-----------------------------|
| Lưu trữ | Có `value` thật | Không lưu value, chạy hàm |
| Đọc | Trả thẳng giá trị | Gọi getter |
| Ghi | Gán thẳng | Gọi setter |
| Descriptor | `value`, `writable` | `get`, `set` |
| Dùng cho | Dữ liệu tĩnh | Giá trị suy ra, validate, đóng gói |

> [!WARNING]
> Một property **không thể vừa là data vừa là accessor**. Khai báo cả `value` lẫn `get` cho cùng key sẽ lỗi. Cũng đừng để getter gọi chính property của nó (`get x(){ return this.x }`) → đệ quy vô hạn → stack overflow.

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| Gọi getter có `()` | `obj.latest()` → lỗi (nó không phải hàm) | Đọc như property: `obj.latest` |
| Getter trỏ về chính nó | `get x(){return this.x}` → đệ quy vô hạn | Dùng backing field `_x`/`#x` |
| Setter không lưu đâu cả | Gán "mất" giá trị | Lưu vào backing field |
| Quên setter, chỉ có getter | Gán bị bỏ qua (lỗi ở strict) | Thêm setter nếu cần ghi |
| Trùng tên data + accessor | Lỗi định nghĩa | Chỉ chọn một loại cho mỗi key |

---

## Bài liên quan

- [Object](/objects-prototypes/object/)
- [Class](/objects-prototypes/class/)
- [Prototype & kế thừa](/objects-prototypes/prototype/)
- [Từ khoá this](/functions/this-keyword/)
