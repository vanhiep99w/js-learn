---
title: "Class"
description: "Class trong JavaScript: syntactic sugar trên constructor function + prototype, class declaration vs expression, hoisting của class khác function (TDZ), constructor, method đặt trên prototype, instance field vs method (field là arrow gây nhân bản), public/private field (#), static method/property/block, kế thừa với extends và super, getter/setter trong class. Đào sâu cách class biên dịch về prototype. Kèm ví dụ chạy được, bảng và pitfalls."
---

## Mục lục

- [Tổng quan](#tổng-quan)
- [Khai báo class: declaration vs expression](#khai-báo-class-declaration-vs-expression)
- [Hoisting của class khác function](#hoisting-của-class-khác-function)
- [class chỉ là sugar trên prototype](#class-chỉ-là-sugar-trên-prototype)
- [Field vs method: bẫy nhân bản](#field-vs-method-bẫy-nhân-bản)
- [Public & private field](#public--private-field)
- [Static method, property, block](#static-method-property-block)
- [Kế thừa: extends & super](#kế-thừa-extends--super)
- [Pitfalls](#pitfalls)
- [Bài liên quan](#bài-liên-quan)

---

## Tổng quan

`class` (ES6) là **template để tạo object** — cú pháp hiện đại, gọn gàng cho mô hình [constructor function + prototype](/objects-prototypes/constructor-function/). Bản chất class vẫn là **"special function"**, và engine "hạ" nó về constructor function bên dưới.

```js
class Rectangle {
  constructor(height, width) {
    this.height = height;
    this.width = width;
  }
  area() {
    return this.height * this.width;
  }
}

const r = new Rectangle(3, 4);
r.area();   // 12
```

---

## Khai báo class: declaration vs expression

Giống hàm, class có hai dạng:

```js
// Class declaration
class Rectangle {
  constructor(h, w) { this.h = h; this.w = w; }
}

// Class expression (gán vào biến)
const Rect = class {                       // unnamed
  constructor(h, w) { this.h = h; this.w = w; }
};

const Rect2 = class Named {                // named (tên chỉ thấy bên trong)
  constructor(h, w) { this.h = h; this.w = w; }
};
Rect2.name;   // "Named"
```

---

## Hoisting của class khác function

Đây là khác biệt quan trọng với function declaration. Function declaration được hoist *toàn bộ* (gọi trước khi định nghĩa vẫn chạy). Class thì bị hoist nhưng nằm trong **Temporal Dead Zone (TDZ)** — *không* dùng được trước dòng khai báo:

```js
new Foo();                 // ❌ ReferenceError — class trong TDZ
class Foo {}

sayHi();                   // ✅ chạy được — function declaration hoist toàn bộ
function sayHi() { return "hi"; }
```

> [!NOTE]
> Về hoisting, `class` cư xử giống [`let`/`const`](/fundamentals/var-let-const/) hơn là `function`: tên được "biết" nhưng chưa khởi tạo cho tới dòng khai báo (TDZ). Xem [Hoisting](/fundamentals/hoisting/).

---

## class chỉ là sugar trên prototype

Method khai báo trong class **tự động được đặt lên `prototype`** — chia sẻ giữa mọi instance, đúng như cách tối ưu của constructor function:

```js
class Person {
  constructor(name) { this.name = name; }
  talk() { return "talking"; }
}

const a = new Person("A");
const b = new Person("B");

a.talk === b.talk;                              // true — chung 1 hàm trên prototype
Object.getPrototypeOf(a) === Person.prototype;  // true
typeof Person;                                   // "function" — class vẫn là function!
```

Tương đương hoàn toàn với:

```js
function Person(name) { this.name = name; }
Person.prototype.talk = function () { return "talking"; };
```

> [!IMPORTANT]
> Đây là lý do nên ưu tiên `class` (hoặc đặt method lên prototype) khi tạo nhiều instance: method không bị nhân bản. Cơ chế lookup xem [Prototype & kế thừa](/objects-prototypes/prototype/).

---

## Field vs method: bẫy nhân bản

Cẩn thận phân biệt **method** (đặt trên prototype, chia sẻ) với **field gán arrow function** (đặt trên *mỗi instance*, nhân bản):

```js
class Person {
  constructor(name) { this.name = name; }

  talk() { return "talking"; }          // METHOD → trên prototype (chia sẻ) ✅

  talkArrow = () => "talking";          // FIELD = arrow → mỗi instance một bản ❌
}

const a = new Person("A");
const b = new Person("B");
a.talk === b.talk;             // true  — chia sẻ
a.talkArrow === b.talkArrow;   // false — nhân bản mỗi instance
```

> [!WARNING]
> Theo ghi chú gốc: tránh viết method dạng **field arrow** (`talk = () => {}`) trong class trừ khi bạn *cần* `this` cố định (vd callback). Vì nó được hiểu như property của instance → khởi tạo riêng cho từng instance → lãng phí bộ nhớ. Method thường (`talk() {}`) mới được đặt lên prototype.

---

## Public & private field

```js
class Rectangle {
  height = 0;        // public field (mặc định)
  width;             // public, khởi tạo undefined
  #area;             // PRIVATE field — chỉ truy cập trong class

  constructor(height, width) {
    this.height = height;
    this.width = width;
    this.#area = height * width;
  }

  getArea() { return this.#area; }   // truy cập private bên trong: OK
}

const r = new Rectangle(3, 4);
r.getArea();   // 12
r.#area;       // ❌ SyntaxError — không truy cập private từ ngoài
```

> [!NOTE]
> Field khai báo *ngoài* constructor thực chất vẫn được engine chuyển *vào* constructor (và đặt sau `super()` nếu có `extends`). Private field `#x` (ES2022) là cách đóng gói thật sự ở cấp ngôn ngữ — khác với closure-private của [factory function](/function-closure/factory-functions/).

---

## Static method, property, block

`static` gắn thành viên lên **chính class**, không lên instance — dùng mà không cần `new`:

```js
class MathUtil {
  static PI = 3.14159;                       // static property
  static square(x) { return x * x; }         // static method

  static {                                   // static block — chạy 1 lần khi class định nghĩa
    console.log("class đã sẵn sàng");
  }
}

MathUtil.square(5);   // 25 — gọi trên class, không cần new
MathUtil.PI;          // 3.14159
new MathUtil().square; // undefined — static KHÔNG thuộc instance
```

Static block chạy *ngay sau khi class được định nghĩa*, theo thứ tự khai báo cùng static field — hữu ích để khởi tạo static phức tạp.

---

## Kế thừa: extends & super

```js
class Animal {
  constructor(name) { this.name = name; }
  speak() { return `${this.name} kêu`; }
}

class Dog extends Animal {
  constructor(name) {
    super(name);          // BẮT BUỘC gọi trước khi dùng this
    this.legs = 4;
  }
  speak() {               // override
    return `${this.name} sủa gâu gâu`;
  }
  parentSpeak() {
    return super.speak(); // gọi method lớp cha
  }
}

const d = new Dog("Mực");
d.speak();        // "Mực sủa gâu gâu"
d.parentSpeak();  // "Mực kêu"
d instanceof Animal;   // true — chuỗi prototype nối tới Animal
```

> [!IMPORTANT]
> Trong constructor của class con có `extends`, **phải gọi `super()` trước khi truy cập `this`** — nếu không sẽ `ReferenceError`. `super(...)` chạy constructor lớp cha; `super.method()` gọi method lớp cha. Cơ chế bên dưới chính là nối `Dog.prototype.__proto__ = Animal.prototype` (xem [Prototype](/objects-prototypes/prototype/)).

```text
d ──▶ Dog.prototype ──▶ Animal.prototype ──▶ Object.prototype ──▶ null
       (speak override)   (speak, constructor)
```

---

## Pitfalls

| Pitfall | Vấn đề | Cách đúng |
|---------|--------|-----------|
| Dùng class trước dòng khai báo | TDZ → `ReferenceError` | Khai báo trước khi dùng |
| Method dạng field arrow | Nhân bản mỗi instance | Dùng method thường `m() {}` |
| Quên `super()` trong class con | `ReferenceError` khi dùng `this` | Gọi `super()` đầu constructor |
| Tưởng `static` dùng được trên instance | `undefined` | Gọi qua tên class |
| Gọi class thiếu `new` | `TypeError` | Class bắt buộc `new` |
| Truy cập `#private` từ ngoài | `SyntaxError` | Chỉ truy cập trong class |

---

## Bài liên quan

- [Constructor Function](/objects-prototypes/constructor-function/)
- [Prototype & kế thừa](/objects-prototypes/prototype/)
- [Getter & Setter](/objects-prototypes/getter-setter/)
- [Hoisting](/fundamentals/hoisting/)
